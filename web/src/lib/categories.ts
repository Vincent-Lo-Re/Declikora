// Catégories du Blog et des Podcasts (table categories) : lecture et écriture directes par
// l'équipe, rangement par categories_reorder. Supprimer une catégorie est définitif ([D28]) ;
// elles sont facultatives ([D44]). Contrat : docs/ARCHITECTURE-CONTENUS.md (§ 1.5, « Étape 7,
// partie 7a »).

import type { PostgrestError } from "@supabase/supabase-js"

import { publicationStatus, type LiveState } from "@/lib/contents/publication"
import type { TablesInsert } from "@/lib/database.types"
import { isLockAlive } from "@/lib/editor/edit-lock"
import { displayName, type PersonName } from "@/lib/people"
import type { ContentUse } from "@/lib/uses-export"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

/** La section d'une catégorie : Blog (articles) ou Podcasts (épisodes). */
export type CategorySection = "blog" | "podcasts"

export type Category = {
  id: string
  name: string
  position: number
  created_at: string
  // Brouillons qui la citent (corbeille comprise) : ce que sa suppression leur retire.
  uses: number
}

export const categoryKeys = {
  all: ["categories"] as const,
  list: (section: CategorySection) => ["categories", section] as const,
  uses: (id: string) => ["categories", "uses", id] as const,
}

type CategoryErrorCode = keyof typeof texts.categories.errors

/** Erreur de la base sur une catégorie, avec son code (s'il est connu). */
export class CategoryError extends Error {
  readonly code: CategoryErrorCode | null

  constructor(code: CategoryErrorCode | null) {
    super(code ? texts.categories.errors[code] : texts.common.unexpected)
    this.name = "CategoryError"
    this.code = code
  }
}

export function toCategoryError(error: PostgrestError): CategoryError {
  const known = texts.categories.errors
  if (Object.hasOwn(known, error.message)) {
    return new CategoryError(error.message as CategoryErrorCode)
  }
  // Nom déjà pris dans la section (index unique, à la casse près).
  if (error.code === "23505") return new CategoryError("nom_en_double")
  // Nom vide après nettoyage, ou trop long (check de la table).
  if (error.code === "23514") return new CategoryError("nom_invalide")
  // Plus membre de l'équipe (politique de la table, ou garde de la RPC).
  if (error.code === "42501") return new CategoryError("reserve_a_l_equipe")
  return new CategoryError(null)
}

/** Vrai si l'erreur montre que la personne n'a plus accès (fiche ou session à relire). */
export function isCategoryAccessLost(error: unknown): boolean {
  return error instanceof CategoryError && error.code === "reserve_a_l_equipe"
}

type CategoryRow = {
  id: string
  name: string
  position: number
  created_at: string
  content_categories?: { count: number }[]
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    created_at: row.created_at,
    uses: row.content_categories?.[0]?.count ?? 0,
  }
}

/** Les catégories d'une section, dans l'ordre de l'équipe (celui de l'app). */
export async function listCategories(
  section: CategorySection
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, position, created_at, content_categories(count)")
    .eq("section", section)
    .order("position")
    .order("name")
  if (error) throw toCategoryError(error)
  return (data as CategoryRow[]).map(toCategory)
}

/** Ajoute une catégorie, en fin de liste (la position est posée par la base). */
export async function createCategory(
  section: CategorySection,
  name: string
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ section, name } as TablesInsert<"categories">)
    .select("id, name, position, created_at")
    .single()
  if (error) throw toCategoryError(error)
  return toCategory(data)
}

export async function renameCategory(
  id: string,
  name: string
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .select("id, name, position, created_at")
    .maybeSingle()
  if (error) throw toCategoryError(error)
  // Aucune ligne : la catégorie a disparu entre-temps (ou l'accès a été retiré).
  if (!data) throw new CategoryError("introuvable")
  return toCategory(data)
}

/** Supprime une catégorie : définitif, les brouillons la perdent ([D28]). */
export async function deleteCategory(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .select("id")
  if (error) throw toCategoryError(error)
  if (data.length === 0) throw new CategoryError("introuvable")
}

/** Range toutes les catégories de la section dans cet ordre. */
export async function reorderCategories(
  section: CategorySection,
  ids: string[]
): Promise<Pick<Category, "id" | "name" | "position">[]> {
  const { data, error } = await supabase.rpc("categories_reorder", {
    section,
    ids,
  })
  if (error) throw toCategoryError(error)
  return data.map(({ id, name, position }) => ({ id, name, position }))
}

type UseRow = {
  id: string
  kind: string
  title: string
  deleted_at: string | null
  draft_rev: number
  first_published_at: string | null
  scheduled_at: string | null
  live: { category_ids: string[]; draft_rev: number } | null
  lock: {
    holder_id: string | null
    heartbeat_at: string
    holder: PersonName | null
  } | null
}

/**
 * Un contenu qui utilise une catégorie, avec ce qu'il faut pour savoir si on peut la lui retirer
 * depuis la fenêtre (lib/contents/category-removal.ts) : son état de publication, sa
 * programmation, et qui l'écrit en ce moment.
 */
export type CategoryUse = ContentUse & {
  live_state: LiveState
  scheduled: boolean
  writer: { id: string; name: string } | null
}

/**
 * Les contenus qui utilisent une catégorie : ceux dont le brouillon la cite (content_categories,
 * Corbeille comprise) et ceux dont la version en ligne la cite encore. Triés par titre.
 */
export async function getCategoryUses(
  categoryId: string,
  now = Date.now()
): Promise<CategoryUse[]> {
  const columns =
    "id, kind, title, deleted_at, draft_rev, first_published_at, scheduled_at, live:versions!contents_live_version_fkey(category_ids, draft_rev), lock:edit_locks(holder_id, heartbeat_at, holder:profiles(full_name, email))"
  const [drafts, live] = await Promise.all([
    supabase
      .from("content_categories")
      .select(`content:contents!inner(${columns})`)
      .eq("category_id", categoryId),
    supabase
      .from("contents")
      .select(columns.replace("fkey(", "fkey!inner("))
      .contains("live.category_ids", [categoryId]),
  ])
  if (drafts.error) throw toCategoryError(drafts.error)
  if (live.error) throw toCategoryError(live.error)
  const byId = new Map<string, CategoryUse>()
  const add = (row: UseRow, inDraft: boolean) => {
    const known = byId.get(row.id)
    const lock = row.lock
    byId.set(row.id, {
      content_id: row.id,
      kind: row.kind,
      title: row.title,
      in_draft: inDraft || (known?.in_draft ?? false),
      in_app: row.live?.category_ids.includes(categoryId) ?? false,
      in_trash: row.deleted_at !== null,
      live_state: publicationStatus(
        { ...row, schedule_error: null },
        row.draft_rev,
        now
      ).live,
      scheduled: row.scheduled_at !== null,
      writer:
        lock?.holder_id && isLockAlive(lock.heartbeat_at, now)
          ? {
              id: lock.holder_id,
              name: displayName(lock.holder) ?? texts.editor.lock.someone,
            }
          : null,
    })
  }
  for (const { content } of drafts.data as unknown as { content: UseRow }[])
    add(content, true)
  for (const row of live.data as unknown as UseRow[]) add(row, false)
  return [...byId.values()].sort((a, b) =>
    (a.title ?? "").localeCompare(b.title ?? "")
  )
}

/**
 * Les noms des catégories d'un contenu, dans l'ordre de la section. Un identifiant inconnu (une
 * catégorie supprimée entre-temps) est ignoré, comme dans l'app ([D28]).
 */
export function categoryNames(
  ids: readonly string[],
  categories: readonly Category[]
): string[] {
  const wanted = new Set(ids)
  return categories
    .filter((category) => wanted.has(category.id))
    .map((category) => category.name)
}

/**
 * Les catégories d'une version de l'historique : leurs noms dans l'ordre de la section, puis
 * autant de « catégorie supprimée » que d'identifiants qui n'existent plus ([D28]). L'historique
 * montre ainsi ce que « Revenir à cette version » remettra : une catégorie supprimée ne revient
 * pas.
 */
export function versionCategoryNames(
  ids: readonly string[],
  categories: readonly Category[]
): { names: string[]; deleted: number } {
  const known = new Set(categories.map((category) => category.id))
  return {
    names: categoryNames(ids, categories),
    deleted: new Set(ids.filter((id) => !known.has(id))).size,
  }
}
