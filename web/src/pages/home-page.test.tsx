import { screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as homeApi from "@/lib/contents/home"
import { renderApp, testProfile } from "@/test/render"
import { texts } from "@/texts"

// Accueil (étape 7) : mes brouillons récents, publications programmées (en attente comprises)
// et programmations échouées, avec des liens vers les éditeurs. La base est simulée.

vi.mock("@/lib/contents/home", async (importOriginal) => {
  const actual = await importOriginal<typeof homeApi>()
  return {
    ...actual,
    listMyRecentDrafts: vi.fn(),
    listScheduled: vi.fn(),
    listFailedSchedules: vi.fn(),
  }
})

const labels = texts.home

function item(
  id: string,
  kind: homeApi.HomeItem["kind"],
  title: string,
  changes: Partial<homeApi.HomeItem> = {}
): homeApi.HomeItem {
  return {
    id,
    kind,
    title,
    draft_rev: 2,
    draft_saved_at: "2026-09-28T08:30:00Z",
    live_draft_rev: null,
    first_published_at: null,
    scheduled_at: null,
    schedule_error: null,
    scheduled_set_at: null,
    scheduled_by_name: null,
    ...changes,
  }
}

const ARTICLE = "00000000-0000-4000-8000-0000000000a1"
const EPISODE = "00000000-0000-4000-8000-0000000000e1"
const PAGE = "00000000-0000-4000-8000-0000000000b1"
const METHOD = "00000000-0000-4000-8000-0000000000d1"

beforeEach(() => {
  vi.mocked(homeApi.listMyRecentDrafts).mockResolvedValue([
    item(ARTICLE, "article", "Bien dormir en été", {
      live_draft_rev: 2,
      first_published_at: "2026-09-20T08:00:00Z",
    }),
    item(PAGE, "page", "Mentions légales"),
    // Les méthodes n'ont pas encore d'éditeur (partie 7b) : pas de lien.
    item(METHOD, "method", "Mieux respirer"),
  ])
  vi.mocked(homeApi.listScheduled).mockResolvedValue([
    item(PAGE, "page", "Mentions légales", {
      // L'heure est passée depuis longtemps : quelqu'un écrit ([D31]).
      scheduled_at: "2026-09-28T06:00:00Z",
      scheduled_by_name: "Claire Martin",
    }),
    item(ARTICLE, "article", "Bien dormir en été", {
      scheduled_at: "2099-10-03T06:00:00Z",
      scheduled_by_name: "Anne Admin",
    }),
  ])
  vi.mocked(homeApi.listFailedSchedules).mockResolvedValue([
    item(EPISODE, "episode", "Entretien avec Claire", {
      schedule_error: "image_de_presentation_manquante",
      scheduled_by_name: "Claire Martin",
    }),
  ])
})

afterEach(() => vi.clearAllMocks())

/** La carte de l'Accueil qui porte ce titre. */
function card(title: string): HTMLElement {
  return screen.getByRole("list", { name: title })
}

describe("Accueil", () => {
  it("remplace « Bientôt disponible » par les trois listes", async () => {
    renderApp("/")
    expect(
      screen.getByRole("heading", { level: 1, name: texts.sections.home.title })
    ).toBeVisible()
    await screen.findByRole("list", { name: labels.drafts.title })
    expect(screen.queryByText(texts.comingSoon.title)).toBeNull()
    expect(homeApi.listMyRecentDrafts).toHaveBeenCalledWith(testProfile.id)
  })

  it("mes brouillons récents : un lien vers l'éditeur de chacun, et son état", async () => {
    renderApp("/")
    await screen.findByRole("list", { name: labels.drafts.title })
    const drafts = card(labels.drafts.title)
    expect(
      within(drafts).getByRole("link", { name: "Bien dormir en été" })
    ).toHaveAttribute("href", `/blog/${ARTICLE}`)
    expect(
      within(drafts).getByRole("link", { name: "Mentions légales" })
    ).toHaveAttribute("href", `/pages/${PAGE}`)
    expect(within(drafts).getByText("Mieux respirer")).toBeVisible()
    expect(
      within(drafts).queryByRole("link", { name: "Mieux respirer" })
    ).toBeNull()
    expect(
      within(drafts).getByText(texts.trash.contentKinds.article)
    ).toBeVisible()
    expect(
      within(drafts).getByText(texts.publication.status.live)
    ).toBeVisible()
  })

  it("publications programmées, dans l'ordre, dont celles en attente ([D31])", async () => {
    renderApp("/")
    const scheduled = await screen.findByRole("list", {
      name: labels.scheduled.title,
    })
    const rows = within(scheduled).getAllByRole("listitem")
    expect(
      rows.map((row) => within(row).getByRole("link").textContent)
    ).toEqual(["Mentions légales", "Bien dormir en été"])
    expect(
      within(rows[0]).getByText(texts.publication.status.waiting)
    ).toBeVisible()
    expect(
      within(rows[0]).getByText(labels.scheduled.by("Claire Martin"))
    ).toBeVisible()
    expect(
      within(rows[1]).getByText(
        texts.publication.status.scheduled("3 oct. 2099 à 08:00")
      )
    ).toBeVisible()
  })

  it("programmations échouées : la raison et qui avait programmé", async () => {
    renderApp("/")
    const failed = await screen.findByRole("list", {
      name: labels.failed.title,
    })
    expect(
      within(failed).getByRole("link", { name: "Entretien avec Claire" })
    ).toHaveAttribute("href", `/podcasts/${EPISODE}`)
    expect(failed).toHaveTextContent(
      "Raison : choisis l'image de présentation avant de publier"
    )
    expect(failed).toHaveTextContent(labels.failed.by("Claire Martin"))
  })

  it("dit quand il n'y a rien", async () => {
    vi.mocked(homeApi.listMyRecentDrafts).mockResolvedValue([])
    vi.mocked(homeApi.listScheduled).mockResolvedValue([])
    vi.mocked(homeApi.listFailedSchedules).mockResolvedValue([])
    renderApp("/")
    expect(await screen.findByText(labels.drafts.empty)).toBeVisible()
    expect(await screen.findByText(labels.scheduled.empty)).toBeVisible()
    expect(await screen.findByText(labels.failed.empty)).toBeVisible()
  })
})
