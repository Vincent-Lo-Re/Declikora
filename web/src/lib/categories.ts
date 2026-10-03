// Catégories du Blog et des Podcasts (table categories) : lecture et écriture directes par
// l'équipe, rangement par categories_reorder. Supprimer une catégorie est définitif ([D28]) ;
// elles sont facultatives ([D44]). Contrat : docs/ARCHITECTURE-CONTENUS.md (§ 1.5, « Étape 7,
// partie 7a »).

import type { PostgrestError } from "@supabase/supabase-js"

import type { TablesInsert } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

/** La section d'une catégorie : Blog (articles) ou Podcasts (épisodes). */
export type CategorySection = "blog" | "podcasts"

export type Category = {
  id: string
  name: string
  position: number
  // Brouillons qui la citent (corbeille comprise) : ce que sa suppression leur retire.
  uses: number
}

export const categoryKeys = {
  all: ["categories"] as const,
  list: (section: CategorySection) => ["categories", section] as const,
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
  content_categories?: { count: number }[]
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    uses: row.content_categories?.[0]?.count ?? 0,
  }
}

/** Les catégories d'une section, dans l'ordre de l'équipe (celui de l'app). */
export async function listCategories(
  section: CategorySection
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, position, content_categories(count)")
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
    .select("id, name, position")
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
    .select("id, name, position")
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
): Promise<Omit<Category, "uses">[]> {
  const { data, error } = await supabase.rpc("categories_reorder", {
    section,
    ids,
  })
  if (error) throw toCategoryError(error)
  return data.map(({ id, name, position }) => ({ id, name, position }))
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
