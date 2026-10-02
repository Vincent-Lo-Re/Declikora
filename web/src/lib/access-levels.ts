// Formules d'abonnement (table access_levels) : lecture par l'équipe, écriture par les admins
// (nom seulement), rangement par access_levels_reorder. Contrat : docs/ARCHITECTURE-CONTENUS.md
// (§ 1.3, « Étape 5 »).

import type { PostgrestError } from "@supabase/supabase-js"

import type { TablesInsert } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

export type AccessLevel = { id: string; name: string; rank: number }

export const accessLevelsKey = ["access-levels"] as const

/**
 * Vrai pour la formule la plus complète (le plus grand rang) : aucune formule n'est au-dessus
 * d'elle, son explication le dit.
 */
export function isMostComplete(levels: AccessLevel[], id: string): boolean {
  const top = Math.max(...levels.map((level) => level.rank))
  return levels.some((level) => level.id === id && level.rank === top)
}

type AccessLevelErrorCode = keyof typeof texts.settings.accessLevels.errors

/** Erreur de la base sur une formule, avec son code (s'il est connu). */
export class AccessLevelError extends Error {
  readonly code: AccessLevelErrorCode | null

  constructor(code: AccessLevelErrorCode | null) {
    super(
      code ? texts.settings.accessLevels.errors[code] : texts.common.unexpected
    )
    this.name = "AccessLevelError"
    this.code = code
  }
}

function toAccessLevelError(error: PostgrestError): AccessLevelError {
  const known = texts.settings.accessLevels.errors
  if (Object.hasOwn(known, error.message)) {
    return new AccessLevelError(error.message as AccessLevelErrorCode)
  }
  // Nom déjà pris (index unique, à la casse près).
  if (error.code === "23505") return new AccessLevelError("nom_en_double")
  // Politique de la table : réservé aux admins.
  if (error.code === "42501") return new AccessLevelError("reserve_aux_admins")
  return new AccessLevelError(null)
}

/** Vrai si l'erreur montre que la personne n'a plus accès (fiche ou rôle à relire). */
export function isAccessLevelAccessLost(error: unknown): boolean {
  return (
    error instanceof AccessLevelError &&
    (error.code === "reserve_a_l_equipe" || error.code === "reserve_aux_admins")
  )
}

/** Les formules, de la moins complète à la plus complète. */
export async function listAccessLevels(): Promise<AccessLevel[]> {
  const { data, error } = await supabase
    .from("access_levels")
    .select("id, name, rank")
    .order("rank")
  if (error) throw toAccessLevelError(error)
  return data
}

/** Ajoute une formule, en fin de liste (la plus complète). */
export async function createAccessLevel(name: string): Promise<AccessLevel> {
  const { data, error } = await supabase
    .from("access_levels")
    // Le rang est posé par la base (fin de liste) : l'API n'écrit que le nom.
    .insert({ name } as TablesInsert<"access_levels">)
    .select("id, name, rank")
    .single()
  if (error) throw toAccessLevelError(error)
  return data
}

export async function renameAccessLevel(
  id: string,
  name: string
): Promise<AccessLevel> {
  const { data, error } = await supabase
    .from("access_levels")
    .update({ name })
    .eq("id", id)
    .select("id, name, rank")
    .maybeSingle()
  if (error) throw toAccessLevelError(error)
  // Aucune ligne : la formule a disparu, ou la personne n'est plus admin.
  if (!data) throw new AccessLevelError("introuvable")
  return data
}

export async function deleteAccessLevel(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("access_levels")
    .delete()
    .eq("id", id)
    .select("id")
  if (error) throw toAccessLevelError(error)
  if (data.length === 0) throw new AccessLevelError("introuvable")
}

/** Range toutes les formules dans cet ordre (de la moins complète à la plus complète). */
export async function reorderAccessLevels(
  ids: string[]
): Promise<AccessLevel[]> {
  const { data, error } = await supabase.rpc("access_levels_reorder", { ids })
  if (error) throw toAccessLevelError(error)
  return data.map(({ id, name, rank }) => ({ id, name, rank }))
}
