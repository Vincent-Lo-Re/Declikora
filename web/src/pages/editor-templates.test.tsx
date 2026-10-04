import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { BoxBlock, Draft, TextBlock } from "@/blocks/types"
import * as levelsApi from "@/lib/access-levels"
import * as api from "@/lib/contents/api"
import * as publicationApi from "@/lib/contents/publication"
import * as templatesApi from "@/lib/contents/templates"
import * as mediaApi from "@/lib/media/api"
import { renderApp, testProfile } from "@/test/render"
import { texts } from "@/texts"

// Modèles de blocs dans l'éditeur (étape 6) : bloc lié montré tel qu'il est dans son modèle,
// « Détacher », insertion d'un modèle, « Enregistrer comme modèle », éditeur d'un modèle.
// La base et Realtime sont simulés.

vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    listContents: vi.fn(async () => []),
    createContent: vi.fn(),
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
    trashContent: vi.fn(),
    restoreContent: vi.fn(),
  }
})

vi.mock("@/lib/contents/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof templatesApi>()
  return {
    ...actual,
    listTemplates: vi.fn(async () => []),
    listTemplateUses: vi.fn(async () => []),
    getTemplatesByIds: vi.fn(async () => []),
    listStarters: vi.fn(async () => []),
    getTemplateOutdated: vi.fn(async () => []),
    createTemplate: vi.fn(),
    createTemplateFrom: vi.fn(),
    pushTemplate: vi.fn(),
    detachTemplateEverywhere: vi.fn(),
  }
})

vi.mock("@/lib/media/api", async (importOriginal) => {
  const actual = await importOriginal<typeof mediaApi>()
  return { ...actual, kickFiles: vi.fn(async () => {}) }
})

vi.mock("@/lib/access-levels", async (importOriginal) => {
  const actual = await importOriginal<typeof levelsApi>()
  return { ...actual, listAccessLevels: vi.fn(async () => []) }
})

const PAGE_ID = "00000000-0000-4000-8000-0000000000aa"
const TEMPLATE_ID = "00000000-0000-4000-8000-0000000000c1"
const STYLE_ID = "00000000-0000-4000-8000-0000000000c2"
const EMPTY_ID = "00000000-0000-4000-8000-0000000000c3"
const STARTER_ID = "00000000-0000-4000-8000-0000000000c4"
const TEXT_ID = "00000000-0000-4000-8000-0000000000b1"
const LINKED_ID = "00000000-0000-4000-8000-0000000000b2"
const OTHER_ID = "00000000-0000-4000-8000-0000000000b3"
const INNER_ID = "00000000-0000-4000-8000-0000000000d1"

function textBlock(id: string, text: string): TextBlock {
  return {
    id,
    type: "text",
    doc: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
  }
}

const contactBox: BoxBlock = {
  id: "00000000-0000-4000-8000-0000000000d0",
  type: "box",
  look: "fill",
  blocks: [textBlock(INNER_ID, "Écris-nous à contact@exemple.fr")],
}

function draftOf(blocks: Draft["blocks"], title = "Accueil"): Draft {
  return { v: 1, title, summary: null, cover: null, audio: null, blocks }
}

function page(blocks: Draft["blocks"]): api.Content {
  return {
    id: PAGE_ID,
    kind: "page",
    title: "Accueil",
    draft: draftOf(blocks),
    draft_rev: 4,
    draft_saved_at: "2026-09-27T12:30:00Z",
    deleted_at: null,
    parent_id: null,
    access_chosen: false,
    access_level_id: null,
    slug: null,
    template_sort: null,
    template_for: null,
    in_app: false,
    is_free: false,
    category_ids: [],
  }
}

const contactTemplate: templatesApi.LinkedTemplate = {
  id: TEMPLATE_ID,
  title: "Contact",
  sort: "shared",
  inTrash: false,
  draft: draftOf([contactBox], "Contact"),
}

function templateItem(
  id: string,
  title: string,
  sort: templatesApi.TemplateSort,
  blocks: Draft["blocks"]
): templatesApi.TemplateItem {
  return {
    id,
    title,
    sort,
    templateFor: sort === "starter" ? "page" : null,
    draft: draftOf(blocks, title),
    draft_saved_at: "2026-09-27T12:30:00Z",
  }
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

/** Le dernier brouillon envoyé à save_draft. */
function lastSaved(): Draft {
  const calls = vi.mocked(api.saveDraft).mock.calls
  return calls[calls.length - 1][2]
}

async function editable() {
  const title = await screen.findByLabelText(texts.editor.title.label)
  await waitFor(() => expect(title).not.toHaveAttribute("readonly"))
}

beforeEach(() => {
  vi.mocked(publicationApi.getPublication).mockResolvedValue({
    id: PAGE_ID,
    draft_rev: 4,
    first_published_at: null,
    scheduled_at: null,
    scheduled_by_name: null,
    schedule_error: null,
    deleted_at: null,
    live: null,
  })
  vi.mocked(api.lockTake).mockResolvedValue(mineRow)
  vi.mocked(api.lockStatus).mockResolvedValue(mineRow)
  let rev = 4
  vi.mocked(api.saveDraft).mockImplementation(async () => ({
    rev: ++rev,
    savedAt: "2026-09-27T12:31:00Z",
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("bloc lié dans un contenu", () => {
  it("montre le bloc du modèle tel qu'il est, non modifiable ; choisi, « Modifier le modèle » et « Détacher » dans sa barre", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      page([
        textBlock(TEXT_ID, "Bonjour"),
        { id: LINKED_ID, type: "linked", templateId: TEMPLATE_ID },
      ])
    )
    vi.mocked(templatesApi.getTemplatesByIds).mockResolvedValue([
      contactTemplate,
    ])
    renderApp(`/pages/${PAGE_ID}`)
    await editable()

    const linked = await screen.findByText("Écris-nous à contact@exemple.fr")
    const view = linked.closest("[data-linked-template]") as HTMLElement
    expect(view).toHaveAttribute("data-linked-template", TEMPLATE_ID)
    // Non modifiable sur place : aucun champ éditable dans le bloc lié.
    expect(view.querySelector('[contenteditable="true"]')).toBeNull()
    expect(templatesApi.getTemplatesByIds).toHaveBeenCalledWith([TEMPLATE_ID])
    // Le plan le nomme d'après son modèle.
    expect(
      within(
        screen.getByRole("navigation", { name: texts.editor.outline.title })
      ).getByRole("button", {
        name: texts.editor.outline.select(
          texts.editor.blockLabel.linked("Contact")
        ),
      })
    ).toHaveTextContent("Contact")
    // Choisi : « Modifier le modèle » et « Détacher » dans la barre de ses réglages, pas
    // « Enregistrer comme modèle » (c'est déjà un modèle).
    fireEvent.pointerDown(view)
    const bar = await screen.findByRole("toolbar", {
      name: texts.editor.settings.actions,
    })
    expect(
      within(bar).getByRole("link", {
        name: texts.templates.linked.editLabel("Contact"),
      })
    ).toHaveAttribute("href", `/modeles/${TEMPLATE_ID}`)
    expect(
      within(bar).getByRole("button", {
        name: texts.templates.linked.detachLabel("Contact"),
      })
    ).toBeVisible()
    expect(
      within(bar).queryByRole("button", {
        name: texts.templates.saveAs.action,
      })
    ).toBeNull()
  })

  it("« Détacher » en fait une copie ordinaire : même id, nouveaux id à l'intérieur", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      page([{ id: LINKED_ID, type: "linked", templateId: TEMPLATE_ID }])
    )
    vi.mocked(templatesApi.getTemplatesByIds).mockResolvedValue([
      contactTemplate,
    ])
    renderApp(`/pages/${PAGE_ID}`)
    await editable()

    // Choisi, « Détacher » est dans la barre de ses réglages.
    await screen.findByText("Écris-nous à contact@exemple.fr")
    fireEvent.pointerDown(
      document.querySelector(`[data-block-id="${LINKED_ID}"]`)!
    )
    fireEvent.click(
      within(
        await screen.findByRole("toolbar", {
          name: texts.editor.settings.actions,
        })
      ).getByRole("button", {
        name: texts.templates.linked.detachLabel("Contact"),
      })
    )
    expect(
      await screen.findByText(texts.templates.linked.detached("Contact"))
    ).toBeInTheDocument()
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    const [block] = lastSaved().blocks
    expect(block.id).toBe(LINKED_ID)
    expect(block.type).toBe("box")
    expect(block).not.toHaveProperty("templateId")
    const inner = (block as BoxBlock).blocks[0] as TextBlock
    expect(inner.id).not.toBe(INNER_ID)
    expect(inner.doc).toEqual((contactBox.blocks[0] as TextBlock).doc)
    // La copie s'écrit maintenant sur place.
    expect(document.querySelector("[data-linked-template]")).toBeNull()
  })

  it("un modèle qui n'existe plus : le bloc le dit, et ne se détache pas", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      page([{ id: LINKED_ID, type: "linked", templateId: TEMPLATE_ID }])
    )
    vi.mocked(templatesApi.getTemplatesByIds).mockResolvedValue([
      { ...contactTemplate, inTrash: true },
    ])
    renderApp(`/pages/${PAGE_ID}`)
    await editable()
    expect(
      await screen.findByText(texts.templates.linked.missing)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", {
        name: texts.templates.linked.detachLabel("Contact"),
      })
    ).toBeNull()
  })

  it("« Publier » reste possible quand le brouillon cite un modèle (il a pu changer)", async () => {
    vi.mocked(api.getContent).mockResolvedValue({
      ...page([{ id: LINKED_ID, type: "linked", templateId: TEMPLATE_ID }]),
      access_chosen: true,
      slug: "accueil",
    })
    vi.mocked(templatesApi.getTemplatesByIds).mockResolvedValue([
      contactTemplate,
    ])
    vi.mocked(publicationApi.getPublication).mockResolvedValue({
      id: PAGE_ID,
      draft_rev: 4,
      first_published_at: "2026-09-27T12:00:00Z",
      scheduled_at: null,
      scheduled_by_name: null,
      schedule_error: null,
      deleted_at: null,
      live: {
        id: "00000000-0000-4000-8000-0000000000f1",
        number: 1,
        draft_rev: 4,
        published_at: "2026-09-27T12:00:00Z",
        published_by_name: null,
        slug: "accueil",
        access_level_id: null,
        outline: null,
      },
    })
    renderApp(`/pages/${PAGE_ID}`)
    await editable()
    await screen.findByText(texts.publication.status.live)
    expect(
      screen.getByRole("button", {
        name: texts.publication.actions.publish,
      })
    ).toBeEnabled()
  })
})

describe("insérer un modèle depuis « Mes blocs »", () => {
  beforeEach(() => {
    vi.mocked(templatesApi.listTemplates).mockResolvedValue([
      templateItem(STYLE_ID, "À retenir", "style", [
        textBlock("00000000-0000-4000-8000-0000000000e1", "À retenir"),
      ]),
      templateItem(TEMPLATE_ID, "Contact", "shared", [contactBox]),
      templateItem(EMPTY_ID, "Vide", "shared", []),
      templateItem(STARTER_ID, "Interview", "starter", [
        textBlock("00000000-0000-4000-8000-0000000000e2", "Question"),
      ]),
    ])
    vi.mocked(api.getContent).mockResolvedValue(page([]))
  })

  /** Les Blocs (« Ajouter un bloc »), puis « Mes blocs ». */
  async function openMine() {
    fireEvent.click(document.getElementById("colonne-gauche-ajouter")!)
    const library = screen.getByRole("region", {
      name: texts.editor.columns.blocks,
    })
    fireEvent.click(
      await within(library).findByRole("button", {
        name: new RegExp(texts.editor.library.mine.title),
      })
    )
    return within(library).findByRole("region", {
      name: texts.editor.library.mine.title,
    })
  }

  it("une mise en forme s'insère en copie (nouveaux id), un bloc partagé en bloc lié", async () => {
    vi.mocked(templatesApi.getTemplatesByIds).mockResolvedValue([
      contactTemplate,
    ])
    renderApp(`/pages/${PAGE_ID}`)
    await editable()

    const mine = await openMine()
    // Un point de départ ne s'insère pas ; un bloc partagé vide non plus.
    expect(within(mine).queryByText("Interview")).toBeNull()
    const empty = await within(mine).findByRole("button", {
      name: texts.editor.library.mine.insertLabel("Vide"),
    })
    expect(empty).toBeDisabled()
    expect(empty).toHaveAccessibleDescription(
      texts.templates.insert.emptyTemplate
    )
    fireEvent.click(
      within(mine).getByRole("button", {
        name: texts.editor.library.mine.insertLabel("À retenir"),
      })
    )
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    const [copy] = lastSaved().blocks
    expect(copy.type).toBe("text")
    expect(copy.id).not.toBe("00000000-0000-4000-8000-0000000000e1")
    expect((copy as TextBlock).doc.content?.[0]).toMatchObject({
      content: [{ text: "À retenir" }],
    })

    // Le bloc partagé : ajouté après le bloc choisi (la copie, qui vient d'arriver).
    fireEvent.click(
      within(mine).getByRole("button", {
        name: texts.editor.library.mine.insertLabel("Contact"),
      })
    )
    await waitFor(() => expect(lastSaved().blocks).toHaveLength(2), {
      timeout: 4000,
    })
    expect(lastSaved().blocks[1]).toMatchObject({
      type: "linked",
      templateId: TEMPLATE_ID,
    })
    expect(
      await screen.findAllByText("Écris-nous à contact@exemple.fr")
    ).not.toHaveLength(0)
  })
})

describe("« Enregistrer comme modèle »", () => {
  beforeEach(() => {
    vi.mocked(api.getContent).mockResolvedValue(
      page([
        textBlock(TEXT_ID, "Un"),
        textBlock(OTHER_ID, "Deux"),
        { ...contactBox, id: LINKED_ID },
      ])
    )
  })

  it("choisir des blocs dans le plan, puis créer une mise en forme (dans l'ordre du contenu)", async () => {
    vi.mocked(templatesApi.createTemplateFrom).mockResolvedValue({
      ...page([]),
      id: STYLE_ID,
      kind: "template",
      title: "Deux textes",
      template_sort: "style",
    })
    const { router } = renderApp(`/pages/${PAGE_ID}`)
    await editable()
    const saveAs = texts.templates.saveAs

    // Le plan est ouvert d'office (éditeur du Fil).
    const outline = screen.getByRole("navigation", {
      name: texts.editor.outline.title,
    })
    fireEvent.click(
      within(outline).getByRole("button", { name: saveAs.select })
    )
    const save = within(outline).getByRole("button", {
      name: saveAs.withCount(0),
    })
    expect(save).toBeDisabled()
    // Au clavier aussi : ce sont des cases à cocher. Les blocs d'un encadré n'en ont pas.
    fireEvent.click(
      within(outline).getByRole("checkbox", {
        name: saveAs.selectBlock("Texte « Deux »"),
      })
    )
    fireEvent.click(
      within(outline).getByRole("checkbox", {
        name: saveAs.selectBlock("Texte « Un »"),
      })
    )
    expect(within(outline).getAllByRole("checkbox")).toHaveLength(3)
    fireEvent.click(
      within(outline).getByRole("button", { name: saveAs.withCount(2) })
    )

    const dialog = await screen.findByRole("dialog", { name: saveAs.title })
    // Plusieurs blocs : pas de bloc identique partout (un seul bloc, [D11]).
    expect(
      within(dialog).getByRole("radio", {
        name: new RegExp(texts.templates.sorts.shared.title),
      })
    ).toHaveAttribute("aria-disabled", "true")
    expect(within(dialog).getByText(saveAs.sharedOne)).toBeInTheDocument()
    // Sans nom : refusé avant l'envoi.
    fireEvent.click(within(dialog).getByRole("button", { name: saveAs.submit }))
    expect(
      await within(dialog).findByText(texts.templates.create.nameRequired)
    ).toBeInTheDocument()
    fireEvent.change(
      within(dialog).getByLabelText(texts.templates.create.name),
      {
        target: { value: "Deux textes" },
      }
    )
    fireEvent.click(within(dialog).getByRole("button", { name: saveAs.submit }))

    await waitFor(() =>
      expect(templatesApi.createTemplateFrom).toHaveBeenCalledWith(
        PAGE_ID,
        [TEXT_ID, OTHER_ID],
        { name: "Deux textes", sort: "style", templateFor: null }
      )
    )
    const toast = await screen.findByText(saveAs.saved("Deux textes"))
    fireEvent.click(
      within(toast.closest("li")!).getByRole("button", { name: saveAs.open })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/modeles/${STYLE_ID}`)
    )
  })

  it("un seul bloc en bloc identique partout : il devient lié à son nouveau modèle", async () => {
    vi.mocked(templatesApi.createTemplateFrom).mockResolvedValue({
      ...page([]),
      id: TEMPLATE_ID,
      kind: "template",
      title: "Contact",
      draft: draftOf([contactBox], "Contact"),
      template_sort: "shared",
    })
    vi.mocked(templatesApi.getTemplatesByIds).mockResolvedValue([
      contactTemplate,
    ])
    renderApp(`/pages/${PAGE_ID}`)
    await editable()

    // Le bloc choisi dans l'aperçu : « Enregistrer comme modèle… » dans ses réglages.
    fireEvent.pointerDown(
      document.querySelector(`[data-block-id="${LINKED_ID}"]`)!
    )
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.templates.saveAs.action,
      })
    )
    const dialog = await screen.findByRole("dialog", {
      name: texts.templates.saveAs.title,
    })
    fireEvent.change(
      within(dialog).getByLabelText(texts.templates.create.name),
      {
        target: { value: "Contact" },
      }
    )
    fireEvent.click(
      within(dialog).getByRole("radio", {
        name: new RegExp(texts.templates.sorts.shared.title),
      })
    )
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.templates.saveAs.submit,
      })
    )
    await waitFor(() =>
      expect(templatesApi.createTemplateFrom).toHaveBeenCalledWith(
        PAGE_ID,
        [LINKED_ID],
        { name: "Contact", sort: "shared", templateFor: null }
      )
    )
    await waitFor(
      () =>
        expect(lastSaved().blocks[2]).toEqual({
          id: LINKED_ID,
          type: "linked",
          templateId: TEMPLATE_ID,
        }),
      { timeout: 4000 }
    )
    expect(
      await screen.findByText(texts.templates.saveAs.sharedReplaced)
    ).toBeInTheDocument()
  })
})

describe("éditeur d'un modèle", () => {
  const template = (
    sort: templatesApi.TemplateSort,
    blocks: Draft["blocks"]
  ): api.Content => ({
    ...page(blocks),
    id: TEMPLATE_ID,
    kind: "template",
    title: "Contact",
    draft: draftOf(blocks, "Contact"),
    template_sort: sort,
    template_for: sort === "starter" ? "page" : null,
  })

  const columns = texts.editor.columns
  const sorts = texts.templates.sorts

  async function editable() {
    const title = await screen.findByLabelText(texts.templates.editor.nameLabel)
    await waitFor(() => expect(title).not.toHaveAttribute("readonly"))
  }

  it("bloc partagé, dans l'éditeur du Fil : sa sorte, un seul bloc, « Utilisé dans », « Mettre à jour ces contenus dans l'app »", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      template("shared", [contactBox])
    )
    vi.mocked(templatesApi.listTemplateUses).mockResolvedValue([
      {
        id: PAGE_ID,
        kind: "page",
        title: "Accueil",
        inTrash: false,
        templateIds: [TEMPLATE_ID],
      },
      {
        id: OTHER_ID,
        kind: "page",
        title: "Ancienne",
        inTrash: true,
        templateIds: [TEMPLATE_ID],
      },
    ])
    vi.mocked(templatesApi.getTemplateOutdated).mockResolvedValue([
      {
        content_id: PAGE_ID,
        kind: "page",
        title: "Accueil",
        version_id: "00000000-0000-4000-8000-0000000000f1",
        version_number: 3,
        published_at: "2026-09-27T12:30:00Z",
      },
    ])
    vi.mocked(templatesApi.pushTemplate).mockResolvedValue(1)
    renderApp(`/modeles/${TEMPLATE_ID}`)
    await editable()

    // « ← Modèles de bloc » en bas à gauche ; pas de barre du haut.
    const left = screen.getByRole("complementary", { name: columns.left })
    expect(
      within(left).getByRole("link", {
        name: texts.editor.back(texts.sections.templates.title),
      })
    ).toHaveAttribute("href", "/modeles")
    expect(screen.queryByRole("banner")).toBeNull()

    // À droite : la sorte, pas de publication (ni « Prêt à publier ? », ni niveau d'accès).
    const right = screen.getByRole("complementary", {
      name: columns.right.template,
    })
    expect(
      within(right).getByRole("region", { name: sorts.shared.title })
    ).toHaveTextContent(sorts.shared.description)
    expect(right.querySelector('[data-template-sort="shared"]')).not.toBeNull()
    expect(
      screen.queryByRole("button", { name: texts.publication.actions.publish })
    ).toBeNull()
    expect(
      within(right).queryByText(texts.editor.article.ready.title)
    ).toBeNull()
    expect(
      within(right).queryByText(texts.publication.settings.access.label)
    ).toBeNull()

    // « Utilisé dans 2 brouillons » : un lien vers chacun, la corbeille dite.
    const uses = await within(right).findByRole("region", {
      name: texts.templates.editor.usedIn(2),
    })
    expect(within(uses).getByRole("link", { name: "Accueil" })).toHaveAttribute(
      "href",
      `/pages/${PAGE_ID}`
    )
    expect(uses).toHaveTextContent(
      `Ancienne (${texts.templates.editor.inTrash})`
    )

    // Un seul bloc : « Ajouter un bloc » est grisé, et la règle est dite, une icône info orange
    // devant.
    await waitFor(() =>
      expect(
        within(left).getByRole("button", { name: texts.editor.add.label })
      ).toBeDisabled()
    )
    const rule = within(left).getByText(texts.templates.editor.sharedLimit)
    expect(rule).toBeVisible()
    expect(rule.previousElementSibling).toHaveClass(
      "lucide-info",
      "text-warning"
    )

    // Le bloc d'un modèle utilisé ne se supprime pas, et ne se duplique pas (le premier niveau
    // est plein).
    fireEvent.pointerDown(
      document.querySelector(`[data-block-id="${contactBox.id}"]`)!
    )
    const bar = await screen.findByRole("toolbar", {
      name: texts.editor.settings.actions,
    })
    for (const name of [
      texts.editor.settings.remove,
      texts.editor.outline.duplicate,
    ]) {
      expect(within(bar).getByRole("button", { name })).toHaveAttribute(
        "aria-disabled",
        "true"
      )
    }
    // Ni « Enregistrer comme modèle » ni « Mes blocs » dans un modèle.
    expect(
      within(bar).queryByRole("button", {
        name: texts.templates.saveAs.action,
      })
    ).toBeNull()
    expect(
      screen.getByText(texts.templates.editor.keepBlock)
    ).toBeInTheDocument()

    // Dans le menu ⋮ du plan aussi : « Supprimer » grisé dit pourquoi.
    const boxRow = document
      .querySelector(`[data-outline-id="${contactBox.id}"]`)!
      .closest("li")!
    fireEvent.click(
      within(boxRow).getAllByRole("button", { name: /^Actions/ })[0]
    )
    const remove = within(await screen.findByRole("menu")).getByRole(
      "menuitem",
      { name: texts.editor.outline.remove }
    )
    expect(remove).toHaveAttribute("aria-disabled", "true")
    expect(remove).toHaveAccessibleDescription(texts.templates.editor.keepBlock)
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())

    fireEvent.click(
      await within(uses).findByRole("button", {
        name: texts.templates.editor.outdated.push(1),
      })
    )
    const confirm = await screen.findByRole("alertdialog", {
      name: texts.templates.editor.outdated.title(1),
    })
    expect(confirm).toHaveTextContent("Accueil")
    expect(confirm).toHaveTextContent("version n° 3, publiée le 27 sept. 2026")
    // Un seul contenu : la phrase est au singulier.
    expect(confirm).toHaveTextContent(
      texts.templates.editor.outdated.description(1)
    )
    expect(templatesApi.pushTemplate).not.toHaveBeenCalled()
    fireEvent.click(
      within(confirm).getByRole("button", {
        name: texts.templates.editor.outdated.confirm,
      })
    )
    await waitFor(() =>
      expect(templatesApi.pushTemplate).toHaveBeenCalledWith(TEMPLATE_ID)
    )
    expect(
      await screen.findByText(texts.templates.editor.outdated.pushed(1))
    ).toBeInTheDocument()
    await waitFor(() => expect(mediaApi.kickFiles).toHaveBeenCalled())
    expect(publicationApi.getPublication).not.toHaveBeenCalled()
  })

  it("le plan d'un bloc partagé : « Dupliquer » et « Sortir de la section » grisés, pas de « Mes blocs »", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      template("shared", [contactBox])
    )
    renderApp(`/modeles/${TEMPLATE_ID}`)
    await editable()
    const plan = screen.getByRole("navigation", {
      name: texts.editor.outline.title,
    })
    // Pas de « Choisir des blocs » : on n'enregistre pas un modèle depuis un modèle.
    expect(
      within(plan).queryByRole("button", {
        name: texts.templates.saveAs.select,
      })
    ).toBeNull()
    // Les sections sont dépliées d'office.
    const inner = (contactBox.blocks[0] as TextBlock).id
    const innerRow = document
      .querySelector(`[data-outline-id="${inner}"]`)!
      .closest("li")!
    fireEvent.click(within(innerRow).getByRole("button", { name: /^Actions/ }))
    const menu = await screen.findByRole("menu")
    expect(
      within(menu).getByRole("menuitem", {
        name: texts.editor.outline.leaveBox,
      })
    ).toHaveAttribute("aria-disabled", "true")
    expect(
      within(menu).queryByRole("menuitem", {
        name: texts.templates.saveAs.action,
      })
    ).toBeNull()
    fireEvent.keyDown(menu, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())

    // La section elle-même, au premier niveau : sa copie n'y aurait pas sa place.
    const boxRow = document
      .querySelector(`[data-outline-id="${contactBox.id}"]`)!
      .closest("li")!
    fireEvent.click(
      within(boxRow).getAllByRole("button", { name: /^Actions/ })[0]
    )
    expect(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: texts.editor.outline.duplicate,
      })
    ).toHaveAttribute("aria-disabled", "true")
  })

  it("bloc partagé vide : « Ajouter un bloc » ouvre les Blocs, sans « Mes blocs » ; la règle est dite", async () => {
    vi.mocked(api.getContent).mockResolvedValue(template("shared", []))
    vi.mocked(templatesApi.listTemplateUses).mockResolvedValue([])
    renderApp(`/modeles/${TEMPLATE_ID}`)
    await editable()
    const left = screen.getByRole("complementary", { name: columns.left })
    expect(
      within(left).getByText(texts.templates.editor.sharedLimit)
    ).toBeVisible()
    // Utilisé nulle part : la carte dit comment s'en servir.
    expect(
      await screen.findByRole("region", {
        name: texts.templates.editor.usedIn(0),
      })
    ).toHaveTextContent(texts.templates.editor.usesNone)
    const add = document.getElementById("colonne-gauche-ajouter")!
    expect(add).toBeEnabled()
    fireEvent.click(add)
    const library = screen.getByRole("region", { name: columns.blocks })
    expect(
      within(library).getByRole("button", {
        name: texts.editor.library.addLabel(texts.editor.blocks.text),
      })
    ).toBeEnabled()
    // Dans un modèle, pas de bloc enregistré à insérer (pas de bloc lié dans un modèle).
    expect(
      within(library).queryByRole("button", {
        name: new RegExp(texts.editor.library.mine.title),
      })
    ).toBeNull()
    expect(templatesApi.listTemplates).not.toHaveBeenCalled()
  })

  it("point de départ : sa sorte et sa section ; en Lecture, pas de choix « abonné / sans la formule »", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      template("starter", [textBlock(TEXT_ID, "Question")])
    )
    renderApp(`/modeles/${TEMPLATE_ID}`)
    await editable()
    const card = screen.getByRole("region", { name: sorts.starter.title })
    expect(card).toHaveTextContent(
      texts.templates.editor.starterFor(texts.templates.sections.page)
    )
    expect(templatesApi.getTemplateOutdated).not.toHaveBeenCalled()
    expect(templatesApi.listTemplateUses).not.toHaveBeenCalled()

    const preview = texts.editor.preview
    const tools = screen.getByRole("toolbar", { name: preview.tools })
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.read })
    )
    expect(
      within(tools).queryByRole("button", { name: preview.reader.visitor })
    ).toBeNull()
    expect(
      within(
        screen.getByRole("region", { name: preview.screen.ios })
      ).getByText("Question")
    ).toBeVisible()
  })
})
