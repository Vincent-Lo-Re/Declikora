import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as api from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { sendFile, TransferError } from "@/lib/media/transfer"
import { rejectReasonText } from "@/lib/media/upload"
import { getUploadQueue } from "@/lib/media/upload-queue"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

// La base, le stockage et la fonction « files » sont simulés.
vi.mock("@/lib/media/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    listMedia: vi.fn(),
    getStorageUsed: vi.fn(),
    getLatestAudit: vi.fn(),
    getPreviewUrls: vi.fn(),
    getMediaUses: vi.fn(),
    updateMedia: vi.fn(),
    trashMedia: vi.fn(),
    restoreMedia: vi.fn(),
    callFiles: vi.fn(),
    kickFiles: vi.fn(),
    createMedia: vi.fn(),
    confirmMedia: vi.fn(),
    discardUpload: vi.fn(),
    getMediaVerdicts: vi.fn(),
  }
})
vi.mock("@/lib/media/transfer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/media/transfer")>()),
  sendFile: vi.fn(),
}))

const MB = 1024 * 1024

function media(overrides: Partial<Media>): Media {
  return {
    id: "00000000-0000-4000-8000-00000000000a",
    kind: "image",
    name: "photo.jpg",
    path: "00000000-0000-4000-8000-00000000000a/photo.webp",
    mime: "image/webp",
    size_bytes: 245 * 1024,
    width: 2000,
    height: 1500,
    duration_s: null,
    alt: null,
    transcript: null,
    status: "ready",
    status_changed_at: "2026-09-27T12:30:00Z",
    reject_reason: null,
    check_attempts: 0,
    is_public: false,
    sync_error: null,
    sync_failed_at: null,
    created_at: "2026-09-27T12:30:00Z",
    created_by: null,
    deleted_at: null,
    deleted_by: null,
    purge_requested_at: null,
    purge_error: null,
    ...overrides,
  }
}

const photo = media({})
const logo = media({
  id: "00000000-0000-4000-8000-00000000000b",
  kind: "svg",
  name: "logo.svg",
  path: "00000000-0000-4000-8000-00000000000b/logo.svg",
  mime: "image/svg+xml",
  status: "checking",
})
const animation = media({
  id: "00000000-0000-4000-8000-00000000000c",
  kind: "lottie",
  name: "vague.json",
  path: "00000000-0000-4000-8000-00000000000c/vague.json",
  mime: "application/json",
  status: "rejected",
  reject_reason: "lottie_invalide",
})
const voice = media({
  id: "00000000-0000-4000-8000-00000000000d",
  kind: "audio",
  name: "episode.m4a",
  path: "00000000-0000-4000-8000-00000000000d/episode.m4a",
  mime: "audio/mp4",
  width: null,
  height: null,
  duration_s: 185,
})

beforeEach(() => {
  vi.mocked(api.listMedia).mockResolvedValue([photo, logo, animation, voice])
  vi.mocked(api.getStorageUsed).mockResolvedValue(120 * MB)
  vi.mocked(api.getLatestAudit).mockResolvedValue(null)
  vi.mocked(api.getPreviewUrls).mockResolvedValue({})
  vi.mocked(api.getMediaUses).mockResolvedValue([])
  vi.mocked(api.kickFiles).mockResolvedValue()
})

afterEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  getUploadQueue().clearFinished()
})

describe("Médiathèque", () => {
  it("montre chaque fichier avec son état", async () => {
    renderApp("/mediatheque", fakeAuth({ role: "editor" }))

    expect(await screen.findByText(photo.name)).toBeVisible()
    expect(screen.getByText(texts.media.status.checking)).toBeVisible()
    expect(
      screen.getByText(
        texts.media.rejectedBecause(texts.media.rejectReasons.lottie_invalide)
      )
    ).toBeVisible()
    expect(screen.getAllByText(texts.media.status.ready)).toHaveLength(2)
    expect(
      screen.getByText(`${texts.media.kinds.audio} · 245 Ko`)
    ).toBeVisible()
  })

  it("filtre par type et cherche par nom", async () => {
    renderApp("/mediatheque")
    await screen.findByText(photo.name)

    fireEvent.click(screen.getByRole("button", { name: /Audios/ }))
    await waitFor(() =>
      expect(api.listMedia).toHaveBeenLastCalledWith({
        kind: "audio",
        search: "",
      })
    )

    fireEvent.change(screen.getByLabelText(texts.media.search), {
      target: { value: "épisode" },
    })
    await waitFor(() =>
      expect(api.listMedia).toHaveBeenLastCalledWith({
        kind: "audio",
        search: "épisode",
      })
    )
  })

  it("bascule en liste, avec poids, dimensions et durée", async () => {
    renderApp("/mediatheque")
    await screen.findByText(photo.name)

    fireEvent.click(screen.getByRole("button", { name: texts.media.view.list }))

    const row = screen.getByRole("row", { name: new RegExp(voice.name) })
    expect(within(row).getByText("3 min 05 s")).toBeVisible()
    expect(
      screen.getByRole("columnheader", { name: texts.media.columns.size })
    ).toBeVisible()
    // La préférence est gardée pour la prochaine visite.
    expect(localStorage.getItem("declikora:mediatheque:affichage")).toBe("list")
  })

  it("dit quand la médiathèque est vide", async () => {
    vi.mocked(api.listMedia).mockResolvedValue([])
    renderApp("/mediatheque")
    expect(await screen.findByText(texts.media.empty.title)).toBeVisible()
  })

  it("alerte quand le stockage dépasse 800 Mo", async () => {
    vi.mocked(api.getStorageUsed).mockResolvedValue(850 * MB)
    renderApp("/mediatheque")

    expect(
      await screen.findByText(texts.media.storage.alertTitle)
    ).toBeVisible()
    expect(screen.getByText(texts.media.storage.alert("850 Mo"))).toBeVisible()
  })

  it("montre les fichiers orphelins et les nettoie (toute l'équipe)", async () => {
    vi.mocked(api.getLatestAudit).mockResolvedValue({
      checked_at: "2026-09-27T12:30:00Z",
      orphan_paths: [
        "files-protected/00000000-0000-4000-8000-0000000000ff/reste.jpg",
      ],
    })
    vi.mocked(api.callFiles).mockResolvedValue({
      mode: "clean",
      removed: 1,
      orphans: 0,
    })
    renderApp("/mediatheque", fakeAuth({ role: "editor" }))

    expect(await screen.findByText(texts.media.orphans.title(1))).toBeVisible()
    fireEvent.click(
      screen.getByRole("button", { name: texts.media.orphans.clean })
    )

    expect(
      await screen.findByText(texts.media.orphans.cleaned(1))
    ).toBeVisible()
    expect(api.callFiles).toHaveBeenCalledWith("clean")
  })

  it("ouvre la fiche d'une image : texte alternatif et « Utilisé dans »", async () => {
    vi.mocked(api.updateMedia).mockResolvedValue({
      ...photo,
      alt: "Un chat au soleil",
    })
    renderApp("/mediatheque")

    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.open(photo.name) })
    )
    const sheet = await screen.findByRole("dialog")
    expect(
      await within(sheet).findByText(texts.media.detail.notUsed)
    ).toBeVisible()
    expect(within(sheet).getByText("2000 × 1500 px")).toBeVisible()
    expect(
      within(sheet).queryByLabelText(texts.media.detail.transcript)
    ).toBeNull()

    fireEvent.change(within(sheet).getByLabelText(texts.media.detail.alt), {
      target: { value: "  Un chat au soleil " },
    })
    fireEvent.click(
      within(sheet).getByRole("button", { name: texts.media.detail.save })
    )

    expect(await screen.findByText(texts.media.detail.saved)).toBeVisible()
    expect(api.updateMedia).toHaveBeenCalledWith(photo.id, {
      name: photo.name,
      alt: "Un chat au soleil",
    })
  })

  it("propose la transcription pour un audio", async () => {
    renderApp("/mediatheque")
    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.open(voice.name) })
    )
    const sheet = await screen.findByRole("dialog")
    expect(
      within(sheet).getByLabelText(texts.media.detail.transcript)
    ).toBeVisible()
    expect(within(sheet).queryByLabelText(texts.media.detail.alt)).toBeNull()
  })

  it("met un fichier à la corbeille, puis appelle la fonction « files »", async () => {
    vi.mocked(api.trashMedia).mockResolvedValue({
      ...photo,
      deleted_at: "2026-09-27T13:00:00Z",
    })
    renderApp("/mediatheque")

    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.open(photo.name) })
    )
    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.detail.trash })
    )

    expect(await screen.findByText(texts.media.detail.trashed)).toBeVisible()
    expect(api.trashMedia).toHaveBeenCalledWith(photo.id)
    expect(api.kickFiles).toHaveBeenCalled()
  })

  it("après la corbeille, donne le focus au fichier suivant (et non à la page)", async () => {
    vi.mocked(api.trashMedia).mockResolvedValue({
      ...photo,
      deleted_at: "2026-09-27T13:00:00Z",
    })
    renderApp("/mediatheque")

    const opener = await screen.findByRole("button", {
      name: texts.media.open(photo.name),
    })
    opener.focus()
    fireEvent.click(opener)
    // Relue après la corbeille : la photo (et son bouton) quitte la liste.
    vi.mocked(api.listMedia).mockResolvedValue([logo, animation, voice])
    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.detail.trash })
    )

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: texts.media.open(photo.name) })
      ).toBeNull()
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: texts.media.open(logo.name) })
      )
    )
  })

  it("refuse proprement la corbeille d'un fichier encore utilisé", async () => {
    vi.mocked(api.trashMedia).mockRejectedValue(
      new api.MediaError(
        "fichier_utilise",
        "Ce fichier est utilisé dans : Recette du pain."
      )
    )
    renderApp("/mediatheque")

    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.open(photo.name) })
    )
    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.detail.trash })
    )

    expect(await screen.findByText(texts.media.detail.used)).toBeVisible()
    expect(
      screen.getByText("Ce fichier est utilisé dans : Recette du pain.")
    ).toBeVisible()
    expect(api.kickFiles).not.toHaveBeenCalled()
  })
})

describe("Envoi", () => {
  const input = () => screen.getByLabelText(texts.media.uploadInput)
  const pdfFile = () =>
    new File(["%PDF-1.7 contenu"], "guide.pdf", { type: "application/pdf" })
  const createdPdf = media({
    id: "00000000-0000-4000-8000-0000000000e0",
    kind: "pdf",
    name: "guide.pdf",
    path: "00000000-0000-4000-8000-0000000000e0/guide.pdf",
    mime: "application/pdf",
    width: null,
    height: null,
    status: "pending",
  })

  it("annonce chaque étape et met la ligne à jour quand le serveur refuse le SVG", async () => {
    const created = media({
      id: "00000000-0000-4000-8000-0000000000e1",
      kind: "svg",
      name: "dessin.svg",
      path: "00000000-0000-4000-8000-0000000000e1/dessin.svg",
      mime: "image/svg+xml",
      status: "pending",
    })
    vi.mocked(api.createMedia).mockResolvedValue(created)
    vi.mocked(sendFile).mockResolvedValue()
    vi.mocked(api.confirmMedia).mockResolvedValue({
      ...created,
      status: "checking",
    })
    // La fonction « files » a tranché entre-temps.
    vi.mocked(api.getMediaVerdicts).mockResolvedValue([
      {
        id: created.id,
        status: "rejected",
        reject_reason: "svg_element_interdit",
      },
    ])
    renderApp("/mediatheque")
    await screen.findByText(photo.name)
    // Zone d'annonce présente AVANT l'envoi (sinon les lecteurs d'écran ne la lisent pas).
    const announcer = screen.getByRole("status", {
      name: texts.media.uploads.announcerLabel,
    })
    expect(announcer).toBeEmptyDOMElement()

    fireEvent.change(input(), {
      target: {
        files: [
          new File(
            ['<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'],
            "dessin.svg",
            { type: "image/svg+xml" }
          ),
        ],
      },
    })

    const reason = rejectReasonText("svg_element_interdit")
    const panel = await screen.findByRole("region", {
      name: texts.media.uploads.title,
    })
    // La ligne ne reste pas sur « vérification en cours ».
    expect(
      await within(panel).findByText(texts.media.rejectedBecause(reason))
    ).toBeVisible()
    await waitFor(() =>
      expect(announcer).toHaveTextContent(
        texts.media.uploads.announce.rejected("dessin.svg", reason)
      )
    )
    expect(api.getMediaVerdicts).toHaveBeenCalledWith([created.id])
  })

  it("prévient avant de quitter la page pendant un envoi, même hors de la médiathèque", async () => {
    vi.mocked(api.createMedia).mockResolvedValue(createdPdf)
    // Un envoi qui dure, jusqu'à son annulation.
    vi.mocked(sendFile).mockImplementation(
      ({ signal }) =>
        new Promise((_, reject) =>
          signal.addEventListener("abort", () =>
            reject(new TransferError("annule"))
          )
        )
    )
    renderApp("/nulle-part")
    await screen.findByRole("status", {
      name: texts.media.uploads.announcerLabel,
    })
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(leave()).toBe(false)

    const queue = getUploadQueue()
    queue.add([pdfFile()])
    await waitFor(() => expect(sendFile).toHaveBeenCalled())
    expect(leave()).toBe(true)

    queue.cancel(queue.getSnapshot()[0].id)
    expect(leave()).toBe(false)
  })

  it("refuse un format inconnu avec un message clair", async () => {
    renderApp("/mediatheque")
    await screen.findByText(photo.name)

    fireEvent.change(input(), {
      target: { files: [new File(["bonjour"], "notes.txt")] },
    })

    const panel = await screen.findByRole("region", {
      name: texts.media.uploads.title,
    })
    expect(
      await within(panel).findByText(texts.media.prepareErrors.type_refuse)
    ).toBeVisible()
    expect(api.createMedia).not.toHaveBeenCalled()
  })

  it("envoie un PDF au chemin donné par la base, puis relit la liste", async () => {
    const created = createdPdf
    vi.mocked(api.createMedia).mockResolvedValue(created)
    vi.mocked(sendFile).mockResolvedValue()
    vi.mocked(api.confirmMedia).mockResolvedValue({
      ...created,
      status: "ready",
    })
    renderApp("/mediatheque")
    await screen.findByText(photo.name)
    const listCalls = vi.mocked(api.listMedia).mock.calls.length

    fireEvent.change(input(), {
      target: { files: [pdfFile()] },
    })

    const panel = await screen.findByRole("region", {
      name: texts.media.uploads.title,
    })
    expect(
      await within(panel).findByText(texts.media.uploads.stages.done)
    ).toBeVisible()
    expect(api.createMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "pdf",
        name: "guide.pdf",
        mime: "application/pdf",
      })
    )
    expect(vi.mocked(sendFile).mock.calls[0][0]).toMatchObject({
      path: created.path,
    })
    expect(vi.mocked(sendFile).mock.calls[0][0].blob.type).toBe(
      "application/pdf"
    )
    expect(api.confirmMedia).toHaveBeenCalledWith(created.id)
    await waitFor(() =>
      expect(vi.mocked(api.listMedia).mock.calls.length).toBeGreaterThan(
        listCalls
      )
    )
  })

  it("en quittant la Médiathèque, retire les envois réussis et garde les échecs", async () => {
    vi.mocked(api.createMedia).mockResolvedValue(createdPdf)
    vi.mocked(sendFile).mockResolvedValue()
    vi.mocked(api.confirmMedia).mockResolvedValue({
      ...createdPdf,
      status: "ready",
    })
    const { router } = renderApp("/mediatheque")
    await screen.findByText(photo.name)

    fireEvent.change(input(), {
      target: { files: [pdfFile(), new File(["bonjour"], "notes.txt")] },
    })
    const panel = await screen.findByRole("region", {
      name: texts.media.uploads.title,
    })
    await within(panel).findByText(texts.media.uploads.stages.done)
    await within(panel).findByText(texts.media.prepareErrors.type_refuse)

    await act(() => router.navigate("/corbeille"))
    // Le retrait attend la fin de la tâche en cours (voir UploadPanel).
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    await act(() => router.navigate("/mediatheque"))

    const back = await screen.findByRole("region", {
      name: texts.media.uploads.title,
    })
    expect(within(back).getByText("notes.txt")).toBeVisible()
    expect(within(back).queryByText("guide.pdf")).toBeNull()
  })
})
