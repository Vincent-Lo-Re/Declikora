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
    saved_by_name: null,
    editing_name: null,
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
  it("montre le bloc du modèle tel qu'il est, non modifiable, avec « Modifier le modèle »", async () => {
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
    expect(view).toHaveTextContent(texts.templates.linked.label("Contact"))
    // Non modifiable sur place : aucun champ éditable dans le bloc lié.
    expect(view.querySelector('[contenteditable="true"]')).toBeNull()
    expect(
      within(view).getByRole("link", {
        name: texts.templates.linked.editLabel("Contact"),
      })
    ).toHaveAttribute("href", `/modeles/${TEMPLATE_ID}`)
    expect(templatesApi.getTemplatesByIds).toHaveBeenCalledWith([TEMPLATE_ID])
    // Le plan le nomme d'après son modèle.
    fireEvent.click(
      screen.getByRole("button", { name: texts.editor.outline.show })
    )
    expect(
      screen.getByRole("navigation", { name: texts.editor.outline.title })
    ).toHaveTextContent(texts.editor.blockLabel.linked("Contact"))
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

    fireEvent.click(
      await screen.findByRole("button", {
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

describe("insérer un modèle", () => {
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

  async function openPicker() {
    fireEvent.click(
      await screen.findByRole("button", { name: texts.templates.insert.menu })
    )
    return screen.findByRole("dialog", { name: texts.templates.insert.title })
  }

  it("une mise en forme s'insère en copie (nouveaux id), un bloc identique partout en bloc lié", async () => {
    vi.mocked(templatesApi.getTemplatesByIds).mockResolvedValue([
      contactTemplate,
    ])
    renderApp(`/pages/${PAGE_ID}`)
    await editable()

    let picker = await openPicker()
    // Un point de départ ne s'insère pas ; un bloc identique partout vide non plus.
    expect(within(picker).queryByText("Interview")).toBeNull()
    expect(
      await within(picker).findByRole("button", {
        name: texts.templates.insert.insertLabel("Vide"),
      })
    ).toBeDisabled()
    expect(
      within(picker).getByText(texts.templates.insert.emptyTemplate)
    ).toBeInTheDocument()
    fireEvent.click(
      within(picker).getByRole("button", {
        name: texts.templates.insert.insertLabel("À retenir"),
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

    // Le bloc identique partout : ajouté après le bloc choisi, par le menu « Ajouter un bloc ».
    fireEvent.click(
      screen.getAllByRole("button", { name: texts.editor.add.label })[0]
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: texts.templates.insert.menu })
    )
    picker = await screen.findByRole("dialog", {
      name: texts.templates.insert.title,
    })
    fireEvent.click(
      await within(picker).findByRole("button", {
        name: texts.templates.insert.insertLabel("Contact"),
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
      await screen.findByText("Écris-nous à contact@exemple.fr")
    ).toBeInTheDocument()
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

    fireEvent.click(
      screen.getByRole("button", { name: texts.editor.outline.show })
    )
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

  it("bloc identique partout : un seul bloc, « Utilisé dans », « Mettre à jour ces contenus dans l'app »", async () => {
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
    await screen.findByLabelText(texts.templates.editor.nameLabel)

    // « ← Modèles », la sorte, pas de publication ni de réglages d'accès.
    expect(
      screen.getByRole("link", {
        name: texts.editor.back(texts.sections.templates.title),
      })
    ).toHaveAttribute("href", "/modeles")
    expect(
      screen.getByText(texts.templates.sorts.shared.title)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", {
        name: texts.publication.actions.publish,
      })
    ).toBeNull()
    expect(
      screen.queryByRole("button", { name: texts.publication.actions.settings })
    ).toBeNull()
    // Un seul bloc : « Ajouter un bloc » est désactivé.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: texts.editor.add.label })
      ).toBeDisabled()
    )
    expect(
      screen.getByText(texts.templates.editor.sharedLimit)
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", {
        name: texts.templates.editor.usedIn(2),
      })
    ).toBeInTheDocument()

    // Le bloc d'un modèle utilisé ne se supprime pas.
    fireEvent.pointerDown(
      document.querySelector(`[data-block-id="${contactBox.id}"]`)!
    )
    expect(
      await screen.findByRole("button", {
        name: texts.editor.settings.remove,
      })
    ).toHaveAttribute("aria-disabled", "true")
    expect(
      screen.getByText(texts.templates.editor.keepBlock)
    ).toBeInTheDocument()

    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.templates.editor.outdated.push(1),
      })
    )
    const confirm = await screen.findByRole("alertdialog", {
      name: texts.templates.editor.outdated.title(1),
    })
    expect(confirm).toHaveTextContent("Accueil")
    expect(confirm).toHaveTextContent("version n° 3, publiée le 27 sept. 2026")
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

  it("bloc identique partout vide : il invite à ajouter son bloc", async () => {
    vi.mocked(api.getContent).mockResolvedValue(template("shared", []))
    renderApp(`/modeles/${TEMPLATE_ID}`)
    await screen.findByLabelText(texts.templates.editor.nameLabel)
    expect(
      await screen.findByText(texts.templates.editor.empty.sharedDescription)
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: texts.editor.add.label })
      ).toBeEnabled()
    )
    // Dans un modèle, pas de modèle à insérer (pas de bloc lié dans un modèle).
    expect(
      screen.queryByRole("button", { name: texts.templates.insert.menu })
    ).toBeNull()
  })

  it("point de départ : sa section dans l'en-tête", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      template("starter", [textBlock(TEXT_ID, "Question")])
    )
    renderApp(`/modeles/${TEMPLATE_ID}`)
    expect(
      await screen.findByText(
        texts.templates.editor.starterFor(texts.templates.sections.page)
      )
    ).toBeInTheDocument()
    expect(templatesApi.getTemplateOutdated).not.toHaveBeenCalled()
  })
})
