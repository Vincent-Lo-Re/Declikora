// Modèles de blocs (étape 6) : liste des modèles, où ils sont utilisés, création (section
// Modèles ou « Enregistrer comme modèle »), mise à jour dans l'app, « Détacher partout ».
// Contrat : docs/ARCHITECTURE-CONTENUS.md (§ 2.5, § 3.5, « Étape 6 »).
// Les modèles sont des lignes de contents (kind = template) : même éditeur, même verrou, même
// corbeille (lib/contents/api.ts et lib/contents/publication.ts).

import type { Draft } from "@/blocks/types"
import {
  toContentError,
  type Content,
  type ContentKind,
} from "@/lib/contents/api"
import { supabase } from "@/lib/supabase"
import type { ContentUse } from "@/lib/uses-export"

/** style : mise en forme réutilisable ; shared : bloc identique partout ; starter : point de départ. */
export type TemplateSort = "style" | "shared" | "starter"

/** La section d'un point de départ : la sorte de contenu qu'il sert à créer ([D42]). */
export type TemplateFor =
  "article" | "episode" | "chapter" | "lesson" | "exercise" | "page"

/** Dans l'ordre de la page Modèles et du choix de la sorte. */
export const templateSorts: readonly TemplateSort[] = [
  "style",
  "shared",
  "starter",
]

/**
 * Dans l'ordre du menu (Blog, Podcasts, Méthodes, Pages). Les points de départ d'un chapitre,
 * d'une leçon ou d'un exercice restent : ils serviront aux méthodes refaites (ADMIN § 1).
 */
const templateSections: readonly TemplateFor[] = [
  "article",
  "episode",
  "chapter",
  "lesson",
  "exercise",
  "page",
]

/**
 * Les sections proposées pour un nouveau point de départ : celles qui ont un éditeur aujourd'hui.
 * Les méthodes refaites ajouteront le chapitre, la leçon et l'exercice ; d'ici là, ils ne
 * serviraient à rien (un point de départ déjà créé reste lisible).
 */
export const offeredTemplateSections: readonly TemplateFor[] = [
  "article",
  "episode",
  "page",
]

export function isTemplateSort(value: unknown): value is TemplateSort {
  return (
    typeof value === "string" && templateSorts.includes(value as TemplateSort)
  )
}

export function isTemplateFor(value: unknown): value is TemplateFor {
  return (
    typeof value === "string" && templateSections.includes(value as TemplateFor)
  )
}

// Rangées sous contentKeys.all (["contents"]) : relire les contenus relit aussi les modèles.
export const templateKeys = {
  all: ["contents", "templates"] as const,
  list: ["contents", "templates", "list"] as const,
  uses: ["contents", "templates", "uses"] as const,
  usesOf: (id: string) => ["contents", "templates", "uses", id] as const,
  // Les brouillons qui citent un modèle, quel qu'il soit (« Mes blocs » de l'éditeur du Fil).
  allUses: ["contents", "templates", "uses", "all"] as const,
  // La colonne « État » des Modèles de bloc : le nombre d'endroits de chaque modèle, et la liste
  // des endroits d'un modèle (fenêtre des utilisations).
  usage: ["contents", "templates", "uses", "usage"] as const,
  where: (id: string) =>
    ["contents", "templates", "uses", "where", id] as const,
  allOutdated: ["contents", "templates", "outdated"] as const,
  outdated: (id: string) => ["contents", "templates", "outdated", id] as const,
  byIds: (ids: string[]) => ["contents", "templates", "by-ids", ids] as const,
  starters: (kind: ContentKind) =>
    ["contents", "templates", "starters", kind] as const,
}

// ---------------------------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------------------------

/** Un modèle hors corbeille, avec ses blocs (pour l'insérer, le montrer, le compter). */
export type TemplateItem = {
  id: string
  title: string
  sort: TemplateSort
  templateFor: TemplateFor | null
  draft: Draft
  draft_saved_at: string
}

/** Tous les modèles hors corbeille, par nom. */
export async function listTemplates(): Promise<TemplateItem[]> {
  const { data, error, status } = await supabase
    .from("contents")
    .select("id, title, template_sort, template_for, draft, draft_saved_at")
    .eq("kind", "template")
    .is("deleted_at", null)
    .order("title")
    .limit(500)
  if (error) throw toContentError(error, status)
  return data.flatMap((row) => {
    if (!isTemplateSort(row.template_sort)) return []
    return [
      {
        id: row.id,
        title: row.title ?? "",
        sort: row.template_sort,
        templateFor: isTemplateFor(row.template_for) ? row.template_for : null,
        draft: row.draft as unknown as Draft,
        draft_saved_at: row.draft_saved_at,
      },
    ]
  })
}

/** Un brouillon qui cite des blocs identiques partout (corbeille comprise). */
export type TemplateUse = {
  id: string
  kind: ContentKind
  title: string
  inTrash: boolean
  templateIds: string[]
}

/**
 * Les brouillons qui citent l'un de ces modèles (bloc lié), corbeille comprise ; sans liste, ceux
 * qui citent un modèle, quel qu'il soit.
 */
export async function listTemplateUses(
  templateIds?: string[]
): Promise<TemplateUse[]> {
  let query = supabase
    .from("contents")
    .select("id, kind, title, deleted_at, draft_template_ids")
    .order("title")
    .limit(1000)
  query = templateIds
    ? query.overlaps("draft_template_ids", templateIds)
    : query.not("draft_template_ids", "eq", "{}")
  const { data, error, status } = await query
  if (error) throw toContentError(error, status)
  return data.map((row) => ({
    id: row.id,
    kind: row.kind as ContentKind,
    title: row.title ?? "",
    inTrash: row.deleted_at !== null,
    templateIds: row.draft_template_ids,
  }))
}

type CopyRow = {
  content: {
    id: string
    kind: string
    title: string | null
    deleted_at: string | null
  } | null
}

/**
 * Où un modèle sert : pour un bloc partagé, les contenus qui le citent (brouillon, Corbeille
 * comprise) ou dont la version en ligne le cite ; pour une mise en forme ou un point de départ,
 * les contenus où il a été copié (template_copies). Triés par titre.
 */
export async function getTemplateUses(
  template: Pick<TemplateItem, "id" | "sort">
): Promise<ContentUse[]> {
  if (template.sort !== "shared") {
    const { data, error, status } = await supabase
      .from("template_copies")
      .select(
        "content:contents!template_copies_content_id_fkey!inner(id, kind, title, deleted_at)"
      )
      .eq("template_id", template.id)
    if (error) throw toContentError(error, status)
    return (data as unknown as CopyRow[])
      .flatMap(({ content }) =>
        content
          ? [
              {
                content_id: content.id,
                kind: content.kind,
                title: content.title ?? "",
                in_draft: false,
                in_app: false,
                in_trash: content.deleted_at !== null,
                copied: true,
              },
            ]
          : []
      )
      .sort((a, b) => a.title.localeCompare(b.title))
  }
  const [drafts, live] = await Promise.all([
    listTemplateUses([template.id]),
    supabase
      .from("contents")
      .select(
        "id, kind, title, deleted_at, live:versions!contents_live_version_fkey!inner(template_ids)"
      )
      .contains("live.template_ids", [template.id]),
  ])
  if (live.error) throw toContentError(live.error, live.status)
  const byId = new Map<string, ContentUse>()
  for (const use of drafts) {
    byId.set(use.id, {
      content_id: use.id,
      kind: use.kind,
      title: use.title,
      in_draft: true,
      in_app: false,
      in_trash: use.inTrash,
    })
  }
  for (const row of live.data) {
    const known = byId.get(row.id)
    byId.set(row.id, {
      content_id: row.id,
      kind: row.kind,
      title: row.title ?? "",
      in_draft: known?.in_draft ?? false,
      in_app: true,
      in_trash: row.deleted_at !== null,
    })
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title))
}

/**
 * Le nombre d'endroits où chaque modèle sert : les contenus qui citent un bloc partagé
 * (brouillon, Corbeille comprise), et ceux où une mise en forme ou un point de départ a été copié.
 */
export async function templateUsage(): Promise<Map<string, number>> {
  const [linked, copies] = await Promise.all([
    listTemplateUses(),
    listTemplateCopies(),
  ])
  const contents = new Map<string, Set<string>>()
  const add = (templateId: string, contentId: string) => {
    const set = contents.get(templateId) ?? new Set<string>()
    set.add(contentId)
    contents.set(templateId, set)
  }
  for (const use of linked) for (const id of use.templateIds) add(id, use.id)
  for (const copy of copies) add(copy.templateId, copy.contentId)
  return new Map([...contents].map(([id, set]) => [id, set.size]))
}

/** Les modèles copiés et les contenus où ils l'ont été (pour compter les utilisations). */
async function listTemplateCopies(): Promise<
  { templateId: string; contentId: string }[]
> {
  const { data, error, status } = await supabase
    .from("template_copies")
    .select("template_id, content_id")
    .limit(5000)
  if (error) throw toContentError(error, status)
  return data.map((row) => ({
    templateId: row.template_id,
    contentId: row.content_id,
  }))
}

/** Un modèle cité par un bloc lié : son nom et son bloc (null s'il n'en a pas exactement un). */
export type LinkedTemplate = {
  id: string
  title: string
  sort: TemplateSort | null
  inTrash: boolean
  draft: Draft
}

/** Les modèles cités par les blocs liés d'un brouillon (ceux qui n'existent plus manquent). */
export async function getTemplatesByIds(
  ids: string[]
): Promise<LinkedTemplate[]> {
  if (ids.length === 0) return []
  const { data, error, status } = await supabase
    .from("contents")
    .select("id, title, template_sort, deleted_at, draft")
    .eq("kind", "template")
    .in("id", ids)
  if (error) throw toContentError(error, status)
  return data.map((row) => ({
    id: row.id,
    title: row.title ?? "",
    sort: isTemplateSort(row.template_sort) ? row.template_sort : null,
    inTrash: row.deleted_at !== null,
    draft: row.draft as unknown as Draft,
  }))
}

/** Les points de départ d'une sorte de contenu ([D42]), par nom. */
export async function listStarters(
  kind: ContentKind
): Promise<{ id: string; title: string }[]> {
  const { data, error, status } = await supabase
    .from("contents")
    .select("id, title")
    .eq("kind", "template")
    .eq("template_sort", "starter")
    .eq("template_for", kind)
    .is("deleted_at", null)
    .order("title")
    .limit(200)
  if (error) throw toContentError(error, status)
  return data.map((row) => ({ id: row.id, title: row.title ?? "" }))
}

/** Un contenu en ligne dont la copie d'un bloc identique partout n'est plus à jour. */
type TemplateOutdatedItem = {
  content_id: string
  kind: ContentKind
  title: string | null
  version_id: string
  version_number: number
  published_at: string
}

/** Les contenus en ligne qu'une mise à jour du modèle changerait (template_outdated). */
export async function getTemplateOutdated(
  templateId: string
): Promise<TemplateOutdatedItem[]> {
  const { data, error, status } = await supabase.rpc("template_outdated", {
    template_id: templateId,
  })
  if (error) throw toContentError(error, status)
  return data.map((row) => ({ ...row, kind: row.kind as ContentKind }))
}

// ---------------------------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------------------------

export type NewTemplate = {
  name: string
  sort: TemplateSort
  // Seulement pour un point de départ.
  templateFor: TemplateFor | null
}

function contentOf(data: Record<string, unknown>): Content {
  return {
    ...(data as unknown as Content),
    title: (data.title as string | null) ?? "",
    draft: data.draft as unknown as Draft,
    // Un modèle n'a pas de catégorie.
    category_ids: [],
  }
}

/** « Nouveau modèle » : un modèle vide ; l'appelant tient aussitôt son verrou (il l'ouvre). */
export async function createTemplate(template: NewTemplate): Promise<Content> {
  const { data, error, status } = await supabase.rpc("content_create", {
    kind: "template",
    title: template.name,
    template_sort: template.sort,
    ...(template.sort === "starter" &&
      template.templateFor && { template_for: template.templateFor }),
  })
  if (error) throw toContentError(error, status)
  return contentOf(data)
}

/**
 * « Enregistrer comme modèle » : un modèle fait de ces blocs (premier niveau) du brouillon
 * ENREGISTRÉ de ce contenu, avec de nouveaux identifiants. Aucun verrou n'est pris.
 */
export async function createTemplateFrom(
  contentId: string,
  blockIds: string[],
  template: NewTemplate
): Promise<Content> {
  const { data, error, status } = await supabase.rpc("template_create_from", {
    content_id: contentId,
    block_ids: blockIds,
    name: template.name,
    sort: template.sort,
    ...(template.sort === "starter" &&
      template.templateFor && { template_for: template.templateFor }),
  })
  if (error) throw toContentError(error, status)
  return contentOf(data)
}

/** « Mettre à jour ces N contenus dans l'app » : le nombre de contenus mis à jour. */
export async function pushTemplate(templateId: string): Promise<number> {
  const { data, error, status } = await supabase.rpc("template_push", {
    template_id: templateId,
  })
  if (error) throw toContentError(error, status)
  return data.length
}

/** « Détacher partout » : le nombre de brouillons détachés. */
export async function detachTemplateEverywhere(
  templateId: string
): Promise<number> {
  const { data, error, status } = await supabase.rpc("template_detach_all", {
    template_id: templateId,
  })
  if (error) throw toContentError(error, status)
  return data.length
}
