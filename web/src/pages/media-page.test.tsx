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
    getMediaOutdated: vi.fn(),
    pushMediaTexts: vi.fn(),
    updateMedia: vi.fn(),
    trashMedia: vi.fn(),
    restoreMedia: vi.fn(),
    callFiles: vi.fn(),
    kickFiles: vi.fn(),
    createMedia: vi.fn(),
    confirmMedia: vi.fn(),
    discardUpload: vi.fn(),
    getMediaVerdicts: vi.fn(),
    getMedia: vi.fn(),
    replaceMedia: vi.fn(),
    replaceMediaLive: vi.fn(),
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
  vi.mocked(api.getMediaOutdated).mockResolvedValue([])
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

    // L'état en pastille : une coche ou une croix, l'état exact dans l'infobulle.
    expect(await screen.findByText(photo.name)).toBeVisible()
    expect(
      screen.getByRole("img", { name: texts.media.status.checking })
    ).toBeVisible()
    expect(
      screen.getByRole("img", {
        name: texts.media.rejectedBecause(
          texts.media.rejectReasons.lottie_invalide
        ),
      })
    ).toBeVisible()
    expect(
      screen.getAllByRole("img", { name: texts.media.status.ready })
    ).toHaveLength(2)
    expect(
      screen.getByText(`${texts.media.kinds.audio} · 245 Ko`)
    ).toBeVisible()
  })

  it("filtre par type et cherche par nom", async () => {
    renderApp("/mediatheque")
    await screen.findByText(photo.name)

    // « Tout » garde son texte ; les types n'ont qu'une icône, nommée pour les lecteurs d'écran.
    const filters = screen.getByRole("group", {
      name: texts.media.filters.label,
    })
    expect(
      within(filters).getByRole("button", { name: texts.media.filters.all })
    ).toHaveTextContent(texts.media.filters.all)
    const audios = within(filters).getByRole("button", {
      name: texts.media.filters.audio,
    })
    expect(audios).toHaveTextContent("")

    fireEvent.click(audios)
    await waitFor(() =>
      expect(api.listMedia).toHaveBeenLastCalledWith({
        kind: "audio",
        search: "",
        unused: false,
      })
    )

    fireEvent.change(screen.getByLabelText(texts.media.search), {
      target: { value: "épisode" },
    })
    await waitFor(() =>
      expect(api.listMedia).toHaveBeenLastCalledWith({
        kind: "audio",
        search: "épisode",
        unused: false,
      })
    )
  })

  it("« Non utilisés » : filtre dans la base, et pastille d'utilisation sur chaque fichier", async () => {
    vi.mocked(api.listMedia).mockResolvedValue([
      { ...photo, media_in_use: true },
      { ...voice, media_in_use: false },
    ])
    renderApp("/mediatheque")
    await screen.findByText(photo.name)

    // Une pastille « Non utilisé » pour le fichier qui ne sert nulle part, « Utilisé » sinon.
    const unused = screen.getAllByRole("img", { name: texts.media.unused })
    expect(unused).toHaveLength(1)
    expect(
      screen.getByRole("button", { name: texts.media.open(voice.name) })
    ).toContainElement(unused[0])
    expect(
      screen.getByRole("button", { name: texts.media.open(photo.name) })
    ).toContainElement(screen.getByRole("img", { name: texts.media.used }))

    vi.mocked(api.listMedia).mockResolvedValue([])
    const toggle = screen.getByRole("button", {
      name: texts.media.filters.unused,
    })
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-pressed", "true")
    await waitFor(() =>
      expect(api.listMedia).toHaveBeenLastCalledWith({
        kind: "all",
        search: "",
        unused: true,
      })
    )
    // Rien à montrer : tout sert, ce n'est pas une recherche ratée.
    expect(await screen.findByText(texts.media.noUnused.title)).toBeVisible()
  })

  it("bascule en liste : poids, et l'état et l'utilisation en icônes", async () => {
    vi.mocked(api.listMedia).mockResolvedValue([
      { ...photo, media_in_use: true },
      { ...voice, media_in_use: false },
    ])
    renderApp("/mediatheque")
    await screen.findByText(photo.name)

    // Une icône seule : son nom s'affiche dans une infobulle au survol.
    const listButton = screen.getByRole("button", {
      name: texts.media.view.list,
    })
    expect(listButton).toHaveTextContent("")
    fireEvent.pointerEnter(listButton, { pointerType: "mouse" })
    fireEvent.mouseEnter(listButton)
    expect(await screen.findByText(texts.media.view.list)).toBeVisible()

    fireEvent.click(listButton)

    // État et utilisation : des icônes, nommées par leur infobulle.
    const row = screen.getByRole("row", { name: new RegExp(voice.name) })
    expect(
      within(row).getByRole("img", { name: texts.media.status.ready })
    ).toBeVisible()
    expect(
      within(row).getByRole("img", { name: texts.media.unused })
    ).toBeVisible()
    const used = screen.getByRole("row", { name: new RegExp(photo.name) })
    expect(
      within(used).getByRole("img", { name: texts.media.used })
    ).toBeVisible()
    // Ni dimensions ni durée dans la liste.
    expect(within(row).queryByText("3 min 05 s")).toBeNull()
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
      within(sheet).getByRole("button", { name: texts.common.save })
    )

    expect(await screen.findByText(texts.media.detail.saved)).toBeVisible()
    expect(api.updateMedia).toHaveBeenCalledWith(photo.id, {
      name: photo.name,
      alt: "Un chat au soleil",
    })
  })

  it("« Utilisé dans » distingue l'app et les brouillons, et met à jour les textes figés ([D30])", async () => {
    const PAGE = "00000000-0000-4000-8000-0000000000aa"
    const HELP = "00000000-0000-4000-8000-0000000000ab"
    vi.mocked(api.getMediaUses).mockResolvedValue([
      {
        content_id: PAGE,
        kind: "page",
        title: "Mentions légales",
        parent_title: null,
        in_draft: true,
        in_app: true,
      },
      {
        content_id: HELP,
        kind: "page",
        title: "Aide",
        parent_title: null,
        in_draft: true,
        in_app: false,
      },
    ])
    vi.mocked(api.getMediaOutdated)
      .mockResolvedValueOnce([
        {
          content_id: PAGE,
          kind: "page",
          title: "Mentions légales",
          version_id: "00000000-0000-4000-8000-0000000000ac",
          version_number: 2,
          published_at: "2026-09-27T12:30:00Z",
        },
      ])
      .mockResolvedValue([])
    vi.mocked(api.pushMediaTexts).mockResolvedValue(1)
    renderApp("/mediatheque")

    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.open(photo.name) })
    )
    const sheet = await screen.findByRole("dialog")
    const outdated = texts.media.detail.outdated
    expect(await within(sheet).findByText(outdated.title(1))).toBeVisible()
    expect(within(sheet).getByText(texts.media.detail.usesLive)).toBeVisible()
    expect(within(sheet).getByText(texts.media.detail.usesDrafts)).toBeVisible()
    // En ligne : la page publiée ; en brouillon : les deux.
    expect(within(sheet).getAllByText(texts.media.detail.inApp)).toHaveLength(1)
    expect(within(sheet).getAllByText(texts.media.detail.inDraft)).toHaveLength(
      2
    )
    expect(
      within(sheet).getByText(
        `(${outdated.version(2, "27 sept. 2026 à 14h30")})`,
        { exact: false }
      )
    ).toBeVisible()

    fireEvent.click(
      within(sheet).getByRole("button", { name: outdated.push(1) })
    )
    expect(await screen.findByText(outdated.pushed(1))).toBeVisible()
    expect(api.pushMediaTexts).toHaveBeenCalledWith(photo.id)
    await waitFor(() =>
      expect(within(sheet).queryByText(outdated.title(1))).toBeNull()
    )
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

  it("« Utilisé dans » ouvre l'éditeur d'un article ou d'un épisode (étape 7)", async () => {
    const ARTICLE = "00000000-0000-4000-8000-0000000000a1"
    const EPISODE = "00000000-0000-4000-8000-0000000000e1"
    vi.mocked(api.getMediaUses).mockResolvedValue([
      {
        content_id: ARTICLE,
        kind: "article",
        title: "Bien dormir",
        parent_title: null,
        in_draft: true,
        in_app: false,
      },
      {
        content_id: EPISODE,
        kind: "episode",
        title: "Entretien",
        parent_title: null,
        in_draft: true,
        in_app: false,
      },
    ])
    renderApp("/mediatheque")
    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.open(photo.name) })
    )
    const sheet = await screen.findByRole("dialog")
    expect(
      await within(sheet).findByRole("link", { name: "Bien dormir" })
    ).toHaveAttribute("href", `/blog/${ARTICLE}`)
    expect(
      within(sheet).getByRole("link", { name: "Entretien" })
    ).toHaveAttribute("href", `/podcasts/${EPISODE}`)
  })

  it("« /mediatheque?fichier=<id> » ouvre la fiche de ce fichier (lien de l'éditeur, [D46])", async () => {
    vi.mocked(api.getMedia).mockResolvedValue(voice)
    const { router } = renderApp(`/mediatheque?fichier=${voice.id}`)
    const sheet = await screen.findByRole("dialog")
    expect(within(sheet).getByText(voice.name)).toBeVisible()
    expect(
      within(sheet).getByLabelText(texts.media.detail.transcript)
    ).toBeVisible()
    expect(api.getMedia).toHaveBeenCalledWith(voice.id)
    // Fermer la fiche retire le fichier de l'adresse.
    fireEvent.keyDown(sheet, { key: "Escape" })
    await waitFor(() => expect(router.state.location.search).toBe(""))
  })

  it("un fichier introuvable dans l'adresse est signalé", async () => {
    vi.mocked(api.getMedia).mockResolvedValue(null)
    const { router } = renderApp(
      "/mediatheque?fichier=00000000-0000-4000-8000-0000000000ff"
    )
    expect(
      await screen.findByText(texts.media.errors.fichier_introuvable)
    ).toBeVisible()
    await waitFor(() => expect(router.state.location.search).toBe(""))
    expect(screen.queryByRole("dialog")).toBeNull()
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

describe("Sélection en masse", () => {
  const selection = { ...texts.selection, ...texts.media.selection }
  const box = (name: string) =>
    screen.getByRole("checkbox", { name: selection.select(name) })

  it("coche en grille : un clic sur une vignette coche au lieu d'ouvrir la fiche", async () => {
    renderApp("/mediatheque")
    await screen.findByText(photo.name)
    expect(
      screen.queryByRole("button", { name: selection.trash(1) })
    ).toBeNull()

    fireEvent.click(box(photo.name))
    expect(
      screen.getByRole("button", { name: selection.trash(1) })
    ).toBeVisible()
    expect(
      screen.getByRole("button", { name: selection.trash(1) })
    ).toBeVisible()

    // Pendant la sélection, la vignette entière coche le fichier.
    fireEvent.click(
      screen.getByRole("button", { name: selection.select(logo.name) })
    )
    expect(box(logo.name)).toBeChecked()
    expect(
      screen.getByRole("button", { name: selection.trash(2) })
    ).toBeVisible()
    expect(screen.queryByRole("dialog")).toBeNull()

    // Tout décoché : un clic ouvre de nouveau la fiche.
    fireEvent.click(box(photo.name))
    fireEvent.click(box(logo.name))
    fireEvent.click(
      screen.getByRole("button", { name: texts.media.open(photo.name) })
    )
    expect(await screen.findByRole("dialog")).toBeVisible()
  })

  it("« Tout sélectionner » ne coche que les fichiers affichés", async () => {
    renderApp("/mediatheque")
    await screen.findByText(photo.name)

    vi.mocked(api.listMedia).mockResolvedValue([voice])
    fireEvent.click(screen.getByRole("button", { name: /Audios/ }))
    await waitFor(() => expect(screen.queryByText(photo.name)).toBeNull())

    fireEvent.click(screen.getByRole("checkbox", { name: selection.selectAll }))
    expect(box(voice.name)).toBeChecked()
    expect(
      screen.getByRole("button", { name: selection.trash(1) })
    ).toBeVisible()
  })

  it("met la sélection à la corbeille, garde les fichiers utilisés, et propose d'annuler", async () => {
    vi.mocked(api.trashMedia).mockImplementation(async (id) => {
      if (id === logo.id) {
        throw new api.MediaError(
          "fichier_utilise",
          "Ce fichier est utilisé dans : Recette du pain."
        )
      }
      return { ...photo, id, deleted_at: "2026-09-27T13:00:00Z" }
    })
    vi.mocked(api.restoreMedia).mockResolvedValue(photo)
    // En liste : les mêmes cases, dans la première colonne.
    localStorage.setItem("declikora:mediatheque:affichage", "list")
    renderApp("/mediatheque")
    await screen.findByText(photo.name)

    fireEvent.click(box(photo.name))
    fireEvent.click(box(logo.name))
    fireEvent.click(box(voice.name))
    fireEvent.click(screen.getByRole("button", { name: selection.trash(3) }))

    expect(await screen.findByText(selection.trashed(2))).toBeVisible()
    expect(vi.mocked(api.trashMedia).mock.calls.map(([id]) => id)).toEqual([
      photo.id,
      logo.id,
      voice.id,
    ])
    expect(api.kickFiles).toHaveBeenCalled()
    // Le fichier utilisé est gardé, reste coché, et le message dit où il sert.
    expect(screen.getByText(selection.keptTitle(1))).toBeVisible()
    expect(
      screen.getByText(
        selection.keptItem(
          logo.name,
          "Ce fichier est utilisé dans : Recette du pain."
        )
      )
    ).toBeVisible()
    expect(
      screen.getByRole("button", { name: selection.trash(1) })
    ).toBeVisible()

    // Le message de cette mise à la corbeille (un autre test peut en avoir laissé un).
    const toastItem = screen
      .getByText(selection.trashed(2))
      .closest<HTMLElement>("[data-sonner-toast]")
    fireEvent.click(
      within(toastItem!).getByRole("button", { name: texts.media.detail.undo })
    )
    expect(await screen.findByText(selection.restored(2))).toBeVisible()
    expect(vi.mocked(api.restoreMedia).mock.calls.map(([id]) => id)).toEqual([
      photo.id,
      voice.id,
    ])

    fireEvent.click(screen.getByRole("button", { name: selection.closeKept }))
    expect(screen.queryByText(selection.keptTitle(1))).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole("checkbox", { name: selection.selectAll })
    )
  })

  it("après la corbeille, le focus va sur « Tout sélectionner »", async () => {
    vi.mocked(api.trashMedia).mockResolvedValue({
      ...photo,
      deleted_at: "2026-09-27T13:00:00Z",
    })
    renderApp("/mediatheque")
    await screen.findByText(photo.name)

    fireEvent.click(box(photo.name))
    vi.mocked(api.listMedia).mockResolvedValue([logo, animation, voice])
    fireEvent.click(screen.getByRole("button", { name: selection.trash(1) }))

    expect(await screen.findByText(selection.trashed(1))).toBeVisible()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("checkbox", { name: selection.selectAll })
      )
    )
    await waitFor(() => expect(screen.queryByText(photo.name)).toBeNull())
    expect(
      screen.queryByRole("button", { name: selection.trash(1) })
    ).toBeNull()
  })
})

describe("Remplacer un fichier", () => {
  const words = texts.media.replace
  const oldPdf = media({
    id: "00000000-0000-4000-8000-0000000000f0",
    kind: "pdf",
    name: "ancien.pdf",
    path: "00000000-0000-4000-8000-0000000000f0/ancien.pdf",
    mime: "application/pdf",
    width: null,
    height: null,
  })
  const newPdf = media({
    id: "00000000-0000-4000-8000-0000000000f1",
    kind: "pdf",
    name: "nouveau.pdf",
    path: "00000000-0000-4000-8000-0000000000f1/nouveau.pdf",
    mime: "application/pdf",
    width: null,
    height: null,
    status: "pending",
  })

  // Ouvre la fiche de l'ancien PDF, puis choisit le nouveau fichier.
  async function replaceWithNewPdf() {
    vi.mocked(api.listMedia).mockResolvedValue([oldPdf])
    vi.mocked(api.createMedia).mockResolvedValue(newPdf)
    vi.mocked(sendFile).mockResolvedValue()
    vi.mocked(api.confirmMedia).mockResolvedValue({
      ...newPdf,
      status: "ready",
    })
    vi.mocked(api.getMedia).mockResolvedValue({ ...newPdf, status: "ready" })
    renderApp("/mediatheque")
    fireEvent.click(
      await screen.findByRole("button", { name: texts.media.open(oldPdf.name) })
    )
    const sheet = await screen.findByRole("dialog", { name: oldPdf.name })
    fireEvent.change(within(sheet).getByLabelText(words.input), {
      target: {
        files: [
          new File(["%PDF-1.7 nouveau"], "nouveau.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    })
    return sheet
  }

  it("le nouveau fichier prend la place de l'ancien dans les brouillons ; l'ancien, inutilisé, part à la corbeille", async () => {
    vi.mocked(api.replaceMedia).mockResolvedValue({ replaced: 2, kept: [] })
    vi.mocked(api.trashMedia).mockResolvedValue({ ...oldPdf, deleted_at: "x" })
    await replaceWithNewPdf()

    await waitFor(() =>
      expect(api.replaceMedia).toHaveBeenCalledWith(oldPdf.id, newPdf.id)
    )
    // Les messages (hors de la fiche, que la fiche ouverte rend inertes).
    expect(await screen.findByText(words.replaced(2))).toBeInTheDocument()
    await waitFor(() => expect(api.trashMedia).toHaveBeenCalledWith(oldPdf.id))
    expect(await screen.findByText(words.oldTrashed)).toBeInTheDocument()
    // La fiche passe au nouveau fichier.
    expect(
      await screen.findByRole("dialog", { name: newPdf.name })
    ).toBeVisible()
  })

  it("ce qui est en ligne ne change que sur « Mettre à jour… » ; un brouillon qu'on écrit est gardé", async () => {
    vi.mocked(api.replaceMedia).mockResolvedValue({
      replaced: 1,
      kept: [{ id: "c1", title: "Guide", holder: "Claire Martin" }],
    })
    vi.mocked(api.getMediaUses).mockResolvedValue([
      {
        content_id: "c2",
        kind: "page",
        title: "Aide",
        parent_title: null,
        in_draft: false,
        in_app: true,
      },
    ])
    vi.mocked(api.replaceMediaLive).mockResolvedValue(1)
    const sheet = await replaceWithNewPdf()

    expect(await within(sheet).findByText(words.kept(1))).toBeVisible()
    expect(
      within(sheet).getByText(words.keptItem("Guide", "Claire Martin"))
    ).toBeVisible()
    fireEvent.click(
      await within(sheet).findByRole("button", { name: words.push(1) })
    )
    await waitFor(() =>
      expect(api.replaceMediaLive).toHaveBeenCalledWith(oldPdf.id, newPdf.id)
    )
    expect(
      (await screen.findAllByText(words.pushed(1))).length
    ).toBeGreaterThan(0)
    expect(api.trashMedia).not.toHaveBeenCalled()
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

  it("la fenêtre des envois suit sur les autres pages, et reste ouverte après un échec", async () => {
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
    const uploads = await screen.findByRole("region", {
      name: texts.media.uploads.title,
    })
    await within(uploads).findByText(texts.media.uploads.stages.done)
    await within(uploads).findByText(texts.media.prepareErrors.type_refuse)
    expect(
      within(uploads).getByText(texts.media.uploads.summary.failed(1))
    ).toBeVisible()

    await act(() => router.navigate("/corbeille"))

    const elsewhere = await screen.findByRole("region", {
      name: texts.media.uploads.title,
    })
    expect(within(elsewhere).getByText("guide.pdf")).toBeVisible()
    expect(within(elsewhere).getByText("notes.txt")).toBeVisible()

    fireEvent.click(
      within(elsewhere).getByRole("button", {
        name: texts.media.uploads.close,
      })
    )
    expect(
      screen.queryByRole("region", { name: texts.media.uploads.title })
    ).toBeNull()
  })
})
