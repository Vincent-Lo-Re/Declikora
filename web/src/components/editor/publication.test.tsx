import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Draft } from "@/blocks/types"
import * as levelsApi from "@/lib/access-levels"
import * as api from "@/lib/contents/api"
import * as publicationApi from "@/lib/contents/publication"
import { formatDateTime } from "@/lib/dates"
import * as mediaApi from "@/lib/media/api"
import { renderApp, testProfile } from "@/test/render"
import { texts } from "@/texts"

// La base et Realtime sont simulés : la barre de publication de l'éditeur (étape 5).
vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    // Une adresse libre : aucune autre page ne l'a.
    findPageBySlug: vi.fn(async () => null),
    getContent: vi.fn(),
    getMediaByIds: vi.fn(async () => []),
    saveDraft: vi.fn(),
    lockTake: vi.fn(),
    lockStatus: vi.fn(),
    lockHeartbeat: vi.fn(async () => true),
    lockRelease: vi.fn(async () => true),
    lockReleaseOnExit: vi.fn(),
    subscribeLock: vi.fn(() => () => {}),
  }
})

vi.mock("@/lib/contents/publication", async (importOriginal) => {
  const actual = await importOriginal<typeof publicationApi>()
  return {
    ...actual,
    getPublication: vi.fn(),
    listVersions: vi.fn(async () => []),
    publishContent: vi.fn(),
    scheduleContent: vi.fn(),
    unscheduleContent: vi.fn(),
    unpublishContent: vi.fn(),
    revertToVersion: vi.fn(),
  }
})

vi.mock("@/lib/access-levels", async (importOriginal) => {
  const actual = await importOriginal<typeof levelsApi>()
  return { ...actual, listAccessLevels: vi.fn() }
})

vi.mock("@/lib/media/api", async (importOriginal) => {
  const actual = await importOriginal<typeof mediaApi>()
  return { ...actual, kickFiles: vi.fn(async () => {}) }
})

const PAGE_ID = "00000000-0000-4000-8000-0000000000aa"
const PREMIUM = "00000000-0000-4000-8000-0000000000f1"
const labels = texts.publication

const draft: Draft = {
  v: 1,
  title: "Aide",
  cover: null,
  audio: null,
  blocks: [],
}

const content: api.Content = {
  id: PAGE_ID,
  kind: "page",
  title: "Aide",
  draft,
  draft_rev: 4,
  draft_saved_at: "2026-09-27T12:30:00Z",
  deleted_at: null,
  parent_id: null,
  access_chosen: true,
  access_level_id: null,
  slug: "aide",
  template_sort: null,
  template_for: null,
  in_app: false,
  is_free: false,
  category_ids: [],
}

const publication: publicationApi.Publication = {
  id: PAGE_ID,
  draft_rev: 4,
  first_published_at: null,
  scheduled_at: null,
  scheduled_by_name: null,
  schedule_error: null,
  deleted_at: null,
  live: null,
}

const liveVersion: publicationApi.LiveVersion = {
  id: "00000000-0000-4000-8000-0000000000v1",
  number: 1,
  draft_rev: 4,
  published_at: "2026-09-27T12:30:00Z",
  published_by_name: "Anne Admin",
  slug: "aide",
  access_level_id: null,
  outline: null,
}

const mineRow: api.LockRow = {
  mine: true,
  holder_id: testProfile.id,
  holder_name: testProfile.full_name,
  taken_at: "2026-09-27T12:30:00Z",
  heartbeat_at: "2026-09-27T12:30:00Z",
  is_active: true,
  draft_rev: 4,
}

async function open(
  changes: Partial<api.Content> = {},
  pub: Partial<publicationApi.Publication> = {}
) {
  vi.mocked(api.getContent).mockResolvedValue({ ...content, ...changes })
  vi.mocked(publicationApi.getPublication).mockResolvedValue({
    ...publication,
    ...pub,
  })
  return await renderApp(`/pages/${PAGE_ID}`)
}

/** L'éditeur a la main (le titre devient modifiable). */
async function ready() {
  const title = await screen.findByLabelText(texts.editor.title.label)
  await waitFor(() => expect(title).not.toHaveAttribute("readonly"))
}

function publishButton() {
  return screen.getByRole("button", { name: labels.actions.publish })
}

/** La carte « Adresse de la page », dans la colonne de droite (éditeur du Fil), et son champ. */
function addressCard() {
  return screen.getByRole("region", { name: labels.settings.slug.label })
}
function addressField() {
  return within(addressCard()).getByRole("textbox", {
    name: labels.settings.slug.label,
  })
}

/** Choisit le niveau d'accès dans sa carte (Base UI ne retient un clic que s'il commence sur l'option). */
async function pickLevel(name: RegExp) {
  fireEvent.click(
    within(
      screen.getByRole("region", { name: labels.settings.access.label })
    ).getByRole("combobox")
  )
  const option = await screen.findByRole("option", { name })
  fireEvent.pointerDown(option, { pointerType: "mouse" })
  fireEvent.click(option)
}

beforeEach(() => {
  vi.mocked(api.lockTake).mockResolvedValue(mineRow)
  vi.mocked(api.lockStatus).mockResolvedValue(mineRow)
  vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([
    { id: PREMIUM, name: "Premium", rank: 1 },
  ])
})

afterEach(() => vi.clearAllMocks())

describe("barre de publication", () => {
  it("brouillon jamais publié : « Brouillon », Publier possible", async () => {
    await open()
    await ready()
    expect(
      await screen.findByText(labels.status.draft, { selector: "span" })
    ).toBeVisible()
    await waitFor(() => expect(publishButton()).toBeEnabled())
  })

  it("en ligne tel quel : « En ligne », Publier grisé ; modifié : Publier possible", async () => {
    await open(
      {},
      { live: liveVersion, first_published_at: "2026-09-27T12:30:00Z" }
    )
    await ready()
    expect(await screen.findByText(labels.status.live)).toBeVisible()
    expect(publishButton()).toBeDisabled()
  })

  it("modifié depuis la publication", async () => {
    await open(
      { draft_rev: 6 },
      {
        draft_rev: 6,
        live: liveVersion,
        first_published_at: "2026-09-27T12:30:00Z",
      }
    )
    vi.mocked(api.lockTake).mockResolvedValue({ ...mineRow, draft_rev: 6 })
    await ready()
    // Une pastille courte, la phrase entière pour les lecteurs d'écran.
    expect(await screen.findByText(labels.short.modified)).toBeVisible()
    expect(
      document.querySelector('[data-publication="modified"]')
    ).toHaveTextContent(labels.status.modified)
    await waitFor(() => expect(publishButton()).toBeEnabled())
  })

  it("demande le niveau d'accès s'il n'a jamais été choisi ([D41]), l'enregistre, puis publie", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-27T12:31:00Z",
    })
    vi.mocked(publicationApi.publishContent).mockResolvedValue({
      versionId: liveVersion.id,
      versionNumber: 1,
      publishedAt: "2026-09-27T12:31:00Z",
      needsFileSync: true,
    })
    await open({ access_chosen: false })
    await ready()
    await waitFor(() => expect(publishButton()).toBeEnabled())

    fireEvent.click(publishButton())
    const dialog = await screen.findByRole("dialog", {
      name: labels.publishDialog.title,
    })
    expect(within(dialog).getByText(labels.levelRequired)).toBeVisible()
    const confirm = within(dialog).getByRole("button", {
      name: labels.publishDialog.confirm,
    })
    // Aucun niveau coché par défaut : on ne peut pas publier.
    expect(
      within(dialog)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("aria-checked"))
    ).toEqual(["false", "false"])
    expect(confirm).toBeDisabled()

    fireEvent.click(
      within(dialog).getByRole("radio", {
        name: new RegExp(labels.settings.access.free),
      })
    )
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)

    // Le niveau part avec le brouillon (save_draft, sous le verrou), puis la publication, sur
    // la révision que l'enregistrement vient de donner.
    await waitFor(() =>
      expect(publicationApi.publishContent).toHaveBeenCalled()
    )
    const [id, baseRev, , , settings] = vi.mocked(api.saveDraft).mock.calls[0]
    expect([id, baseRev, settings]).toEqual([
      PAGE_ID,
      4,
      { access_level_id: null },
    ])
    expect(publicationApi.publishContent).toHaveBeenCalledWith(PAGE_ID, 5)
    expect(await screen.findByText(labels.published(1))).toBeVisible()
    // Des fichiers changent d'emplacement : la fonction « files » tout de suite.
    expect(mediaApi.kickFiles).toHaveBeenCalled()
  })

  it("formules pas chargées : pas de « Gratuit » par défaut, Publier grisé, « Réessayer » ([D41])", async () => {
    vi.mocked(levelsApi.listAccessLevels).mockRejectedValueOnce(
      new Error("réseau")
    )
    await open({ access_chosen: false })
    await ready()
    await waitFor(() => expect(publishButton()).toBeEnabled())
    fireEvent.click(publishButton())
    const dialog = await screen.findByRole("dialog", {
      name: labels.publishDialog.title,
    })
    expect(
      await within(dialog).findByText(labels.settings.access.loadFailed)
    ).toBeVisible()
    expect(within(dialog).queryAllByRole("radio")).toHaveLength(0)
    const confirm = within(dialog).getByRole("button", {
      name: labels.publishDialog.confirm,
    })
    expect(confirm).toBeDisabled()

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.common.retry,
      })
    )
    expect(
      await within(dialog).findByRole("radio", { name: /Premium/ })
    ).toBeVisible()
    expect(confirm).toBeDisabled()
  })

  it("formules pas chargées : le récapitulatif ne dit pas « formule supprimée »", async () => {
    vi.mocked(levelsApi.listAccessLevels).mockRejectedValueOnce(
      new Error("réseau")
    )
    await open({ access_level_id: PREMIUM })
    await ready()
    await waitFor(() => expect(publishButton()).toBeEnabled())
    fireEvent.click(publishButton())
    const dialog = await screen.findByRole("dialog", {
      name: labels.publishDialog.title,
    })
    expect(
      await within(dialog).findByText(labels.settings.access.loadFailed)
    ).toBeVisible()
    expect(
      within(dialog).queryByText(labels.settings.access.deleted)
    ).toBeNull()
    expect(
      within(dialog).getByRole("button", { name: labels.publishDialog.confirm })
    ).toBeDisabled()
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.common.retry,
      })
    )
    expect(await within(dialog).findByText("Premium")).toBeVisible()
    expect(
      within(dialog).getByRole("button", { name: labels.publishDialog.confirm })
    ).toBeEnabled()
  })

  it("une page sans adresse : « Publier » allume la carte de l'adresse au lieu de publier", async () => {
    Element.prototype.scrollIntoView = vi.fn()
    await open({ slug: null })
    await ready()
    await waitFor(() => expect(publishButton()).toBeEnabled())
    expect(
      screen.getByRole("button", {
        name: texts.editor.article.ready.todo(labels.settings.slug.label),
      })
    ).toBeVisible()

    fireEvent.click(publishButton())
    expect(
      await screen.findByText(labels.settings.slug.missing)
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).toBeNull()
    await waitFor(() => expect(addressField()).toHaveFocus())
    expect(addressCard()).toHaveAttribute("data-highlight")
    expect(publicationApi.publishContent).not.toHaveBeenCalled()
  })

  it("refus [D14] : quelqu'un d'autre écrit, « Reprendre la main » force le verrou", async () => {
    vi.mocked(publicationApi.publishContent).mockRejectedValue(
      new api.ContentError("verrou_tenu", { hint: "Claire Martin" })
    )
    await open()
    await ready()
    await waitFor(() => expect(publishButton()).toBeEnabled())

    fireEvent.click(publishButton())
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: labels.publishDialog.confirm,
      })
    )
    const held = await screen.findByRole("alertdialog")
    expect(held).toHaveTextContent(labels.lockHeld.description("Claire Martin"))
    fireEvent.click(
      within(held).getByRole("button", { name: labels.lockHeld.take })
    )
    await waitFor(() =>
      expect(api.lockTake).toHaveBeenLastCalledWith(
        PAGE_ID,
        true,
        expect.any(String)
      )
    )
  })

  it("programmé : le bandeau prévient que ce qu'on écrit partira à cette heure", async () => {
    await open({}, { scheduled_at: "2099-10-03T06:00:00Z" })
    await ready()
    expect(
      await screen.findByText(labels.banner.scheduled("3 oct. 2099 à 08h00"))
    ).toBeVisible()
  })

  it("programmation en attente : c'est moi qui écris, le bandeau me dit de quitter l'éditeur ([D31])", async () => {
    await open({}, { scheduled_at: "2020-01-01T08:00:00Z" })
    await ready()
    const banner = (
      await screen.findByText(labels.banner.waitingMine("1 janv. 2020 à 09h00"))
    ).closest("[data-schedule-banner]") as HTMLElement
    expect(banner).toHaveTextContent(labels.banner.waitingMineHint)
    expect(banner).not.toHaveTextContent(labels.banner.waitingHint)
    expect(
      within(banner).getByRole("link", { name: labels.banner.leave })
    ).toHaveAttribute("href", "/pages")
  })

  it("programmation en attente : quelqu'un d'autre écrit (lecture seule)", async () => {
    const claire: api.LockRow = {
      ...mineRow,
      mine: false,
      holder_id: "00000000-0000-4000-8000-0000000000cc",
      holder_name: "Claire Martin",
    }
    vi.mocked(api.lockTake).mockResolvedValue(claire)
    vi.mocked(api.lockStatus).mockResolvedValue(claire)
    await open({}, { scheduled_at: "2020-01-01T08:00:00Z" })
    expect(
      await screen.findByText(labels.banner.waiting("1 janv. 2020 à 09h00"))
    ).toBeVisible()
    expect(screen.getByText(labels.banner.waitingHint)).toBeVisible()
    expect(screen.queryByText(labels.banner.waitingMineHint)).toBeNull()
  })

  it("juste après l'heure prévue, personne n'est accusé d'écrire : la publication part", async () => {
    const claire: api.LockRow = {
      ...mineRow,
      mine: false,
      holder_id: "00000000-0000-4000-8000-0000000000cc",
      holder_name: "Claire Martin",
    }
    vi.mocked(api.lockTake).mockResolvedValue(claire)
    vi.mocked(api.lockStatus).mockResolvedValue(claire)
    const at = new Date(Date.now() - 20_000)
    at.setSeconds(0, 0)
    await open({}, { scheduled_at: at.toISOString() })
    expect(
      await screen.findByText(labels.banner.due(formatDateTime(at)))
    ).toBeVisible()
    expect(
      screen.queryByText(labels.banner.waiting(formatDateTime(at)))
    ).toBeNull()
  })

  it("programmation échouée : la raison et la personne qui l'avait programmée", async () => {
    vi.mocked(publicationApi.unscheduleContent).mockResolvedValue(true)
    await open(
      {},
      {
        schedule_error: "brouillon_en_cours_d_ecriture",
        scheduled_by_name: "Claire Martin",
      }
    )
    await ready()
    const banner = (await screen.findByText(labels.banner.failed)).closest(
      "[data-schedule-banner]"
    )!
    expect(banner).toHaveTextContent(
      labels.banner.failedReason(
        labels.scheduleErrors.brouillon_en_cours_d_ecriture
      )
    )
    expect(banner).toHaveTextContent(labels.banner.failedBy("Claire Martin"))
    fireEvent.click(
      within(banner as HTMLElement).getByRole("button", {
        name: labels.actions.dismissFailure,
      })
    )
    await waitFor(() =>
      expect(publicationApi.unscheduleContent).toHaveBeenCalledWith(PAGE_ID)
    )
  })
})

describe("retirer de l'app", () => {
  async function unpublish() {
    await open(
      {},
      { live: liveVersion, first_published_at: "2026-09-27T12:30:00Z" }
    )
    await ready()
    await screen.findByText(labels.status.live)
    fireEvent.click(screen.getByRole("button", { name: labels.actions.more }))
    fireEvent.click(
      await screen.findByRole("menuitem", { name: labels.actions.unpublish })
    )
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: labels.unpublishDialog.confirm,
      })
    )
    await waitFor(() =>
      expect(publicationApi.unpublishContent).toHaveBeenCalledWith(PAGE_ID)
    )
    expect(
      (await screen.findAllByText(labels.unpublishDialog.done)).length
    ).toBeGreaterThan(0)
  }

  it("des fichiers changent d'emplacement : la fonction « files » tout de suite", async () => {
    vi.mocked(publicationApi.unpublishContent).mockResolvedValue(true)
    await unpublish()
    expect(mediaApi.kickFiles).toHaveBeenCalled()
  })

  it("aucun fichier à déplacer : pas d'appel à la fonction « files »", async () => {
    vi.mocked(publicationApi.unpublishContent).mockResolvedValue(false)
    await unpublish()
    expect(mediaApi.kickFiles).not.toHaveBeenCalled()
  })
})

describe("programmer (heure de Paris)", () => {
  async function openScheduleDialog() {
    await open()
    await ready()
    await waitFor(() => expect(publishButton()).toBeEnabled())
    // Le menu « Autres actions de publication ».
    fireEvent.click(screen.getByRole("button", { name: labels.actions.more }))
    fireEvent.click(
      await screen.findByRole("menuitem", { name: labels.actions.schedule })
    )
    return screen.findByRole("dialog", { name: labels.scheduleDialog.title })
  }

  function fill(dialog: HTMLElement, date: string, time: string) {
    fireEvent.change(
      within(dialog).getByLabelText(labels.scheduleDialog.date),
      { target: { value: date } }
    )
    fireEvent.change(
      within(dialog).getByLabelText(labels.scheduleDialog.time),
      { target: { value: time } }
    )
  }

  it("convertit l'heure de Paris en instant, y compris au retour à l'heure d'hiver", async () => {
    vi.mocked(publicationApi.scheduleContent).mockImplementation(
      async (_id, at) => at.toISOString()
    )
    const dialog = await openScheduleDialog()
    fill(dialog, "25/10/2099", "02h30")
    // L'heure doublée : la première (heure d'été) est retenue, et c'est dit.
    const summary = within(dialog).getByText(
      labels.scheduleDialog.summary("25 oct. 2099 à 02h30"),
      { exact: false }
    )
    expect(summary).toHaveTextContent(labels.scheduleDialog.ambiguous)
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: labels.scheduleDialog.confirm,
      })
    )
    await waitFor(() =>
      expect(publicationApi.scheduleContent).toHaveBeenCalledWith(
        PAGE_ID,
        new Date("2099-10-25T00:30:00Z")
      )
    )
  })

  it("termine l'enregistrement avant de programmer, même quand le niveau est déjà choisi", async () => {
    // schedule vérifie [D45] et le son sur le brouillon ENREGISTRÉ : ce qui est à l'écran
    // doit être parti avant, sans attendre la fin du délai de l'enregistrement automatique.
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-27T12:31:00Z",
    })
    vi.mocked(publicationApi.scheduleContent).mockImplementation(
      async (_id, at) => at.toISOString()
    )
    const dialog = await openScheduleDialog()
    // Un changement encore en attente d'enregistrement (délai de 1,5 s).
    fireEvent.change(screen.getByLabelText(texts.editor.title.label), {
      target: { value: "Aide et contact" },
    })
    expect(api.saveDraft).not.toHaveBeenCalled()
    fill(dialog, "03/10/2099", "08h00")
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: labels.scheduleDialog.confirm,
      })
    )
    await waitFor(() =>
      expect(publicationApi.scheduleContent).toHaveBeenCalled()
    )
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
    expect(vi.mocked(api.saveDraft).mock.calls[0][2]).toMatchObject({
      title: "Aide et contact",
    })
    expect(vi.mocked(api.saveDraft).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(publicationApi.scheduleContent).mock.invocationCallOrder[0]
    )
  })

  it("refuse une heure qui n'existe pas (passage à l'heure d'été) et un moment passé", async () => {
    const dialog = await openScheduleDialog()
    const confirm = within(dialog).getByRole("button", {
      name: labels.scheduleDialog.confirm,
    })

    fill(dialog, "29/03/2099", "02h30")
    expect(
      within(dialog).getByText(labels.scheduleDialog.errors.nonexistent)
    ).toBeVisible()
    fireEvent.click(confirm)

    fill(dialog, "01/01/2020", "08h00")
    fireEvent.click(confirm)
    expect(
      await within(dialog).findByText(labels.scheduleDialog.errors.past)
    ).toBeVisible()
    expect(publicationApi.scheduleContent).not.toHaveBeenCalled()
  })
})

describe("réglages du contenu", () => {
  it("choisir une formule part avec le brouillon, sous le verrou", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-27T12:31:00Z",
    })
    await open({ access_chosen: false })
    await ready()
    expect(
      screen.getByText(labels.settings.access.notChosenShort)
    ).toBeVisible()
    await pickLevel(/Premium/)
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    expect(vi.mocked(api.saveDraft).mock.calls[0][4]).toEqual({
      access_level_id: PREMIUM,
    })
  })

  it("après une réponse perdue, le rejeu repart avec les mêmes réglages (la base le reconnaît)", async () => {
    vi.mocked(api.saveDraft)
      .mockRejectedValueOnce(new api.ContentError(null, { retryable: true }))
      .mockResolvedValue({ rev: 5, savedAt: "2026-09-27T12:31:00Z" })
    await open({ access_chosen: false })
    await ready()
    await pickLevel(/Premium/)
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalledTimes(2), {
      timeout: 8000,
    })
    const [first, second] = vi.mocked(api.saveDraft).mock.calls
    expect(second[1]).toBe(first[1])
    expect(second[2]).toEqual(first[2])
    expect(second[4]).toEqual({ access_level_id: PREMIUM })
    expect(second[4]).toEqual(first[4])
  }, 10_000)

  it("après une réponse perdue, le rejeu d'une adresse repart avec la même adresse", async () => {
    vi.mocked(api.saveDraft)
      .mockRejectedValueOnce(new api.ContentError(null, { retryable: true }))
      .mockResolvedValue({ rev: 5, savedAt: "2026-09-27T12:31:00Z" })
    await open({ slug: null })
    await ready()
    const address = addressField()
    fireEvent.change(address, { target: { value: "aide" } })
    fireEvent.keyDown(address, { key: "Enter" })
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalledTimes(2), {
      timeout: 8000,
    })
    const [first, second] = vi.mocked(api.saveDraft).mock.calls
    expect(second[1]).toBe(first[1])
    expect(first[4]).toEqual({ slug: "aide" })
    expect(second[4]).toEqual(first[4])
  }, 10_000)

  it("une adresse refusée n'empêche pas d'enregistrer la suite du brouillon", async () => {
    vi.mocked(api.saveDraft)
      .mockRejectedValueOnce(new api.ContentError("adresse_prise"))
      .mockResolvedValueOnce({ rev: 5, savedAt: "2026-09-27T12:31:00Z" })
      .mockResolvedValue({ rev: 6, savedAt: "2026-09-27T12:32:00Z" })
    await open({ slug: null })
    await ready()
    const address = addressField()
    fireEvent.change(address, { target: { value: "contact" } })
    fireEvent.keyDown(address, { key: "Enter" })
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalledTimes(1), {
      timeout: 4000,
    })
    expect(vi.mocked(api.saveDraft).mock.calls[0][4]).toEqual({
      slug: "contact",
    })
    // Le champ garde l'adresse refusée, avec la raison ; le brouillon repart sans elle.
    expect(
      await within(addressCard()).findByText(texts.editor.errors.adresse_prise)
    ).toBeVisible()
    expect(address).toHaveValue("contact")
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalledTimes(2), {
      timeout: 4000,
    })
    expect(vi.mocked(api.saveDraft).mock.calls[1][4]).toBeNull()

    // La suite du texte s'enregistre, sans renvoyer l'adresse refusée.
    fireEvent.change(screen.getByLabelText(texts.editor.title.label), {
      target: { value: "Aide et contact" },
    })
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalledTimes(3), {
      timeout: 4000,
    })
    const [, baseRev, saved, , settings] = vi.mocked(api.saveDraft).mock
      .calls[2]
    expect(baseRev).toBe(5)
    expect(saved.title).toBe("Aide et contact")
    expect(settings).toBeNull()
    expect(await screen.findByText(texts.editor.save.saved)).toBeVisible()
  }, 15_000)

  it("l'adresse n'est enregistrée que si elle est valide", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-27T12:31:00Z",
    })
    await open({ slug: null })
    await ready()
    const address = addressField()
    // Vérifiée en tapant : la forme tout de suite.
    fireEvent.change(address, { target: { value: "Aide Générale" } })
    expect(
      within(addressCard()).getByText(labels.settings.slug.invalid)
    ).toBeVisible()

    fireEvent.change(address, { target: { value: "aide-generale" } })
    fireEvent.keyDown(address, { key: "Enter" })
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    expect(vi.mocked(api.saveDraft).mock.calls[0][4]).toEqual({
      slug: "aide-generale",
    })
  })
})
