import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  resumableEndpoint,
  sendFile,
  shouldUseResumable,
  TransferError,
  type TransferRequest,
} from "@/lib/media/transfer"

// tus-js-client simulé : on garde les réglages de chaque envoi reprenable.
const tus = vi.hoisted(() => ({
  uploads: [] as { file: Blob; options: Record<string, unknown> }[],
  outcome: "success" as "success" | { status: number },
}))

vi.mock("tus-js-client", () => ({
  Upload: class {
    options: Record<string, unknown>
    constructor(file: Blob, options: Record<string, unknown>) {
      this.options = options
      tus.uploads.push({ file, options })
    }
    findPreviousUploads = async () => []
    resumeFromPreviousUpload() {}
    abort = vi.fn(async () => {})
    start() {
      const { onProgress, onSuccess, onError } = this.options as {
        onProgress: (sent: number, total: number) => void
        onSuccess: () => void
        onError: (error: unknown) => void
      }
      queueMicrotask(() => {
        onProgress(6, 12)
        if (tus.outcome === "success") onSuccess()
        else {
          const { status } = tus.outcome
          onError({ originalResponse: { getStatus: () => status } })
        }
      })
    }
  },
}))

// XMLHttpRequest simulé pour l'envoi standard.
class FakeXhr {
  static last: FakeXhr | null = null
  static status = 200
  method = ""
  url = ""
  headers: Record<string, string> = {}
  body: unknown = null
  status = 0
  responseText = ""
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
    onprogress: null,
  }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  constructor() {
    FakeXhr.last = this
  }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }
  send(body: unknown) {
    this.body = body
    queueMicrotask(() => {
      this.status = FakeXhr.status
      this.responseText = JSON.stringify({ statusCode: String(FakeXhr.status) })
      this.onload?.()
    })
  }
  abort() {
    this.onabort?.()
  }
}

const MB = 1024 * 1024

function request(size: number, overrides: Partial<TransferRequest> = {}) {
  return {
    supabaseUrl: "http://127.0.0.1:54321",
    publishableKey: "sb_publishable_tests",
    getAccessToken: async () => "jeton",
    path: "0b7e4c1e-0000-4000-8000-000000000001/voix.m4a",
    blob: new Blob([new Uint8Array(size)], { type: "audio/mp4" }),
    onProgress: vi.fn(),
    signal: new AbortController().signal,
    ...overrides,
  } satisfies TransferRequest
}

beforeEach(() => {
  tus.uploads = []
  tus.outcome = "success"
  FakeXhr.last = null
  FakeXhr.status = 200
  vi.stubGlobal("XMLHttpRequest", FakeXhr)
})

afterEach(() => vi.unstubAllGlobals())

describe("choix de l'envoi", () => {
  it("passe à l'envoi reprenable au-delà de 6 Mo", () => {
    expect(shouldUseResumable(6 * MB)).toBe(false)
    expect(shouldUseResumable(6 * MB + 1)).toBe(true)
  })

  it("vise le nom d'hôte direct du stockage en ligne, la passerelle en local", () => {
    expect(resumableEndpoint("https://kajocxepxgaquculhrky.supabase.co")).toBe(
      "https://kajocxepxgaquculhrky.storage.supabase.co/storage/v1/upload/resumable"
    )
    expect(resumableEndpoint("http://127.0.0.1:54321")).toBe(
      "http://127.0.0.1:54321/storage/v1/upload/resumable"
    )
  })

  it("envoie un fichier de 7 Mo par TUS, au chemin exact, avec cacheControl 60", async () => {
    const sent = request(7 * MB)
    await sendFile(sent)

    expect(FakeXhr.last).toBeNull()
    expect(tus.uploads).toHaveLength(1)
    const { options } = tus.uploads[0]
    expect(options).toMatchObject({
      endpoint: "http://127.0.0.1:54321/storage/v1/upload/resumable",
      chunkSize: 6 * MB,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: { apikey: "sb_publishable_tests", "x-upsert": "false" },
      metadata: {
        bucketName: "files-protected",
        objectName: sent.path,
        contentType: "audio/mp4",
        cacheControl: "60",
      },
    })
    expect(sent.onProgress).toHaveBeenCalledWith(6, 12)
  })

  it("envoie un fichier de 2 Mo en une seule requête, avec progression", async () => {
    const sent = request(2 * MB)
    await sendFile(sent)

    expect(tus.uploads).toHaveLength(0)
    const xhr = FakeXhr.last!
    expect(xhr.method).toBe("POST")
    expect(xhr.url).toBe(
      `http://127.0.0.1:54321/storage/v1/object/files-protected/${sent.path}`
    )
    expect(xhr.headers).toEqual({
      authorization: "Bearer jeton",
      apikey: "sb_publishable_tests",
      "content-type": "audio/mp4",
      "cache-control": "max-age=60",
      "x-upsert": "false",
    })
    expect(xhr.body).toBe(sent.blob)
    expect(sent.onProgress).toHaveBeenLastCalledWith(2 * MB, 2 * MB)
  })

  it("traduit un refus du stockage", async () => {
    FakeXhr.status = 413
    await expect(sendFile(request(MB))).rejects.toMatchObject({
      code: "fichier_trop_lourd",
    })
    tus.outcome = { status: 415 }
    await expect(sendFile(request(8 * MB))).rejects.toMatchObject({
      code: "type_refuse",
    })
  })

  it("s'arrête quand on annule", async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      sendFile(request(MB, { signal: controller.signal }))
    ).rejects.toEqual(new TransferError("annule"))
  })
})
