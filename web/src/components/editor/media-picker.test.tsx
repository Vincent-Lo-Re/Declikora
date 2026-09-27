import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MediaPicker } from "@/components/editor/media-picker"
import * as api from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import type { UploadRunner } from "@/lib/media/upload"
import { UploadQueue } from "@/lib/media/upload-queue"
import { texts } from "@/texts"

const labels = texts.editor.picker

vi.mock("@/lib/media/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/media/api")>()),
  listMedia: vi.fn(),
  getPreviewUrls: vi.fn(),
}))

const media = (fields: Partial<Media>) =>
  ({
    id: "00000000-0000-4000-8000-0000000000a1",
    kind: "image",
    status: "ready",
    name: "vitrail.jpg",
    path: "00000000-0000-4000-8000-0000000000a1/vitrail.jpg",
    mime: "image/webp",
    deleted_at: null,
    ...fields,
  }) as Media

/** Un envoi simulé, qu'on termine à la main. */
function controlledQueue() {
  let finish: (result: Media) => void = () => {}
  let fail: (error: unknown) => void = () => {}
  const runner: UploadRunner = (_job, { update }) =>
    new Promise((resolve, reject) => {
      update({ stage: "sending", progress: 0.4 })
      finish = resolve
      fail = reject
    })
  const queue = new UploadQueue({ runner, discard: vi.fn(async () => {}) })
  return {
    queue,
    finish: (result: Media) => finish(result),
    fail: (error: unknown) => fail(error),
  }
}

function renderPicker(queue: UploadQueue, onChoose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MediaPicker
        open
        onOpenChange={() => {}}
        onChoose={onChoose}
        queue={queue}
      />
    </QueryClientProvider>
  )
  return onChoose
}

const choose = (name: string, type = "image/jpeg") =>
  fireEvent.change(screen.getByLabelText(labels.uploadInput), {
    target: { files: [new File(["x"], name, { type })] },
  })

beforeEach(() => {
  vi.mocked(api.listMedia).mockResolvedValue([])
  vi.mocked(api.getPreviewUrls).mockResolvedValue({})
})

describe("choix d'une image : envoyer une image", () => {
  it("envoie l'image et la choisit dès qu'elle est prête", async () => {
    const { queue, finish } = controlledQueue()
    const onChoose = renderPicker(queue)
    await screen.findByText(labels.empty)

    choose("vitrail.jpg")
    expect(
      await screen.findByText(labels.uploadingProgress("vitrail.jpg", "40 %"))
    ).toBeVisible()
    expect(screen.getByRole("button", { name: labels.upload })).toBeDisabled()

    const ready = media({})
    finish(ready)
    await waitFor(() => expect(onChoose).toHaveBeenCalledWith(ready))
    // L'envoi réussi ne reste pas dans la liste de la Médiathèque.
    expect(queue.getSnapshot()).toEqual([])
  })

  it("dit qu'un fichier qui n'est pas une image ne va pas dans le bloc Image", async () => {
    const { queue, finish } = controlledQueue()
    const onChoose = renderPicker(queue)
    await screen.findByText(labels.empty)

    choose("logo.svg", "image/svg+xml")
    finish(media({ kind: "svg", status: "checking", name: "logo.svg" }))

    expect(await screen.findByText(labels.notImage("logo.svg"))).toBeVisible()
    expect(onChoose).not.toHaveBeenCalled()
  })

  it("montre l'échec et permet d'envoyer une autre image", async () => {
    const { queue, fail } = controlledQueue()
    const onChoose = renderPicker(queue)
    await screen.findByText(labels.empty)

    choose("vitrail.jpg")
    fail(new Error("réseau"))

    expect(
      await screen.findByText((text) =>
        text.startsWith(labels.uploadFailed("vitrail.jpg", ""))
      )
    ).toBeVisible()
    expect(screen.getByRole("button", { name: labels.upload })).toBeEnabled()
    expect(onChoose).not.toHaveBeenCalled()
  })
})
