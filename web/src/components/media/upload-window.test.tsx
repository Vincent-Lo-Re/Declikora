import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { UploadWindow } from "@/components/media/upload-window"
import * as api from "@/lib/media/api"
import { UPLOAD_WINDOW_SPACE, type Media } from "@/lib/media/constants"
import { formatPercent } from "@/lib/media/format"
import { PrepareError } from "@/lib/media/prepare"
import { TransferError } from "@/lib/media/transfer"
import type { UploadContext } from "@/lib/media/upload"
import { UploadQueue } from "@/lib/media/upload-queue"
import { texts } from "@/texts"

// Le statut relu dans la base (vérification des SVG et des Lottie) est simulé.
vi.mock("@/lib/media/api", async (importOriginal) => ({
  ...(await importOriginal<typeof api>()),
  getMediaVerdicts: vi.fn(),
}))

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: "00000000-0000-4000-8000-00000000000a",
    kind: "pdf",
    name: "guide.pdf",
    path: "00000000-0000-4000-8000-00000000000a/guide.pdf",
    mime: "application/pdf",
    size_bytes: 1024,
    width: null,
    height: null,
    duration_s: null,
    alt: null,
    transcript: null,
    status: "ready",
    status_changed_at: "2026-09-28T12:30:00Z",
    reject_reason: null,
    check_attempts: 0,
    is_public: false,
    sync_error: null,
    sync_failed_at: null,
    created_at: "2026-09-28T12:30:00Z",
    created_by: null,
    deleted_at: null,
    deleted_by: null,
    purge_requested_at: null,
    purge_error: null,
    ...overrides,
  }
}

// Un envoi dont le test décide la fin (réussite ou échec) et les étapes.
type Run = {
  context: UploadContext
  resolve: (media: Media) => void
  reject: (error: unknown) => void
}

/** Une file d'envoi simulée et la fenêtre, qui se ferme dès le premier tour une fois tout prêt. */
function setup() {
  const runs: Run[] = []
  const queue = new UploadQueue({
    runner: (_job, context) =>
      new Promise<Media>((resolve, reject) => {
        runs.push({ context, resolve, reject })
      }),
    discard: vi.fn().mockResolvedValue(undefined),
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <button type="button">Avant</button>
      <UploadWindow queue={queue} closeDelayMs={0} />
    </QueryClientProvider>
  )
  return { queue, runs, queryClient }
}

function file(name = "guide.pdf") {
  return new File(["%PDF-1.4"], name, { type: "application/pdf" })
}

function uploadWindow() {
  return screen.queryByRole("region", { name: texts.media.uploads.title })
}

function wait(ms: number) {
  return act(() => new Promise((resolve) => setTimeout(resolve, ms)))
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  document.documentElement.style.removeProperty(UPLOAD_WINDOW_SPACE)
})

describe("fenêtre des envois", () => {
  it("montre chaque fichier avec sa progression, sans « Fermer » pendant l'envoi", () => {
    const { queue, runs } = setup()
    expect(uploadWindow()).toBeNull()

    act(() => {
      queue.add([file("guide.pdf"), file("notes.pdf")])
    })
    act(() => runs[0].context.update({ stage: "sending", progress: 0.5 }))

    const region = screen.getByRole("region", {
      name: texts.media.uploads.title,
    })
    expect(
      within(region).getByText(texts.media.uploads.summary.active(2))
    ).toBeVisible()
    expect(
      within(region).getByText(
        `${texts.media.uploads.stages.sending} ${formatPercent(0.5)}`
      )
    ).toBeVisible()
    expect(
      within(region).getByRole("progressbar", { name: "guide.pdf" })
    ).toBeVisible()
    expect(
      within(region).queryByRole("button", {
        name: texts.media.uploads.close,
      })
    ).toBeNull()
  })

  it("se ferme toute seule quand tout est prêt", async () => {
    const { queue, runs } = setup()
    act(() => {
      queue.add([file()])
    })
    await act(async () => runs[0].resolve(media()))

    expect(screen.getByText(texts.media.uploads.summary.ready(1))).toBeVisible()
    expect(screen.getByText(texts.media.uploads.stages.done)).toBeVisible()
    await waitFor(() => expect(uploadWindow()).toBeNull())
    expect(queue.getSnapshot()).toEqual([])
  })

  it("attend la vérification du serveur avant de se fermer", async () => {
    const svg = media({
      kind: "svg",
      name: "logo.svg",
      path: "00000000-0000-4000-8000-00000000000a/logo.svg",
      mime: "image/svg+xml",
      status: "checking",
    })
    vi.mocked(api.getMediaVerdicts).mockResolvedValue([
      { id: svg.id, status: "checking", reject_reason: null },
    ])
    const { queue, runs, queryClient } = setup()
    act(() => {
      queue.add([file("logo.svg")])
    })
    await act(async () => runs[0].resolve(svg))

    expect(await screen.findByText(texts.media.uploads.checking)).toBeVisible()
    expect(
      screen.getByText(texts.media.uploads.summary.active(1))
    ).toBeVisible()
    // Bien plus longtemps que le délai de fermeture : elle attend le serveur.
    await wait(500)
    expect(uploadWindow()).not.toBeNull()

    vi.mocked(api.getMediaVerdicts).mockResolvedValue([
      { id: svg.id, status: "ready", reject_reason: null },
    ])
    await act(() => queryClient.invalidateQueries())
    expect(await screen.findByText(texts.media.uploads.checked)).toBeVisible()
    await waitFor(() => expect(uploadWindow()).toBeNull())
  })

  it("reste ouverte après un échec, et « Fermer » rend le focus où il était", async () => {
    const { queue, runs } = setup()
    const before = screen.getByRole("button", { name: "Avant" })
    act(() => {
      queue.add([file("notes.txt")])
    })
    await act(async () => runs[0].reject(new PrepareError("type_refuse")))

    const region = screen.getByRole("region", {
      name: texts.media.uploads.title,
    })
    expect(
      within(region).getByText(texts.media.uploads.summary.failed(1))
    ).toBeVisible()
    expect(
      within(region).getByText(texts.media.prepareErrors.type_refuse)
    ).toBeVisible()
    await wait(500)
    expect(uploadWindow()).not.toBeNull()

    // Arrivée dans la fenêtre depuis « Avant » (au clavier), puis « Fermer ».
    act(() => before.focus())
    const close = within(region).getByRole("button", {
      name: texts.media.uploads.close,
    })
    act(() => close.focus())
    fireEvent.click(close)

    expect(uploadWindow()).toBeNull()
    expect(before).toHaveFocus()
    expect(queue.getSnapshot()).toEqual([])
  })

  it("« Réessayer » relance l'envoi et passe le focus à « Annuler »", async () => {
    const { queue, runs } = setup()
    act(() => {
      queue.add([file()])
    })
    await act(async () => runs[0].reject(new TransferError("envoi_interrompu")))

    fireEvent.click(
      screen.getByRole("button", {
        name: texts.media.uploads.retry("guide.pdf"),
      })
    )

    expect(runs).toHaveLength(2)
    expect(
      screen.getByRole("button", {
        name: texts.media.uploads.cancel("guide.pdf"),
      })
    ).toHaveFocus()
  })

  it("retirer une ligne garde le focus dans la fenêtre", async () => {
    const { queue, runs } = setup()
    act(() => {
      queue.add([file("notes.txt"), file("guide.pdf")])
    })
    await act(async () => runs[0].reject(new PrepareError("type_refuse")))

    fireEvent.click(
      screen.getByRole("button", {
        name: texts.media.uploads.dismiss("notes.txt"),
      })
    )

    expect(screen.queryByText("notes.txt")).toBeNull()
    expect(
      screen.getByRole("button", { name: texts.media.uploads.collapse })
    ).toHaveFocus()
  })

  it("ne se ferme pas tant que le focus est dedans", async () => {
    const { queue, runs } = setup()
    act(() => {
      queue.add([file()])
    })
    act(() =>
      screen.getByRole("button", { name: texts.media.uploads.collapse }).focus()
    )
    await act(async () => runs[0].resolve(media()))

    await wait(500)
    expect(uploadWindow()).not.toBeNull()

    act(() => screen.getByRole("button", { name: "Avant" }).focus())
    await waitFor(() => expect(uploadWindow()).toBeNull())
  })

  it("se réduit à son titre, puis se déplie", () => {
    const { queue } = setup()
    act(() => {
      queue.add([file()])
    })

    fireEvent.click(
      screen.getByRole("button", { name: texts.media.uploads.collapse })
    )
    const expand = screen.getByRole("button", {
      name: texts.media.uploads.expand,
    })
    expect(expand).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("listitem")).toBeNull()

    fireEvent.click(expand)
    expect(
      screen.getByRole("button", { name: texts.media.uploads.collapse })
    ).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("listitem")).toBeVisible()
  })

  it("laisse sa place en bas de la page tant qu'elle est ouverte", async () => {
    // jsdom ne mesure rien : un faux ResizeObserver appelle tout de suite (hauteur 0).
    class FakeResizeObserver {
      callback: ResizeObserverCallback

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }

      observe() {
        this.callback([], this as unknown as ResizeObserver)
      }

      unobserve() {}

      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver)
    const { queue, runs } = setup()
    const space = () =>
      document.documentElement.style.getPropertyValue(UPLOAD_WINDOW_SPACE)

    act(() => {
      queue.add([file()])
    })
    expect(space()).toBe("12px")

    await act(async () => runs[0].resolve(media()))
    await waitFor(() => expect(uploadWindow()).toBeNull())
    expect(space()).toBe("")
  })
})
