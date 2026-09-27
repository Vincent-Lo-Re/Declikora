import { FunctionsHttpError } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

// Appels à la fonction serveur « equipe » (supabase/functions/equipe), réservée aux admins.

export type TeamRole = Database["public"]["Enums"]["team_role"]

export type Member = {
  id: string
  email: string
  full_name: string | null
  role: TeamRole
  created_at: string
  // « invited » : l'invitation n'a pas encore été acceptée.
  status: "invited" | "active"
  invited_at: string | null
  last_sign_in_at: string | null
  mfa_enabled: boolean
  mfa_enabled_at: string | null
}

export type TeamRequest =
  | { action: "list" }
  | { action: "invite"; email: string; full_name: string; role: TeamRole }
  | { action: "resend"; user_id: string }
  | { action: "set_role"; user_id: string; role: TeamRole }
  | { action: "remove"; user_id: string }
  | { action: "reset_mfa"; user_id: string }

type TeamErrorCode = keyof typeof texts.team.errors

function isTeamErrorCode(code: unknown): code is TeamErrorCode {
  return typeof code === "string" && Object.hasOwn(texts.team.errors, code)
}

/** Erreur de la fonction « equipe » : son code (s'il est connu) et le message à afficher. */
export class TeamError extends Error {
  readonly code: TeamErrorCode | null

  constructor(code: TeamErrorCode | null) {
    super(code ? texts.team.errors[code] : texts.common.unexpected)
    this.name = "TeamError"
    this.code = code
  }
}

/** Traduit une erreur renvoyée par la fonction « equipe ». */
export async function toTeamError(error: unknown): Promise<TeamError> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await (error.context as Response).json()
      const code = (body as { error?: { code?: unknown } } | null)?.error?.code
      if (isTeamErrorCode(code)) return new TeamError(code)
    } catch {
      // Réponse illisible : message général.
    }
  }
  return new TeamError(null)
}

/**
 * Vrai si l'erreur montre que la personne n'a plus accès à l'équipe (rôle retiré, compte
 * supprimé, session fermée) : sa fiche est alors à relire.
 */
export function isAccessLost(error: unknown): boolean {
  return (
    error instanceof TeamError &&
    (error.code === "reserve_aux_admins" || error.code === "non_connecte")
  )
}

export async function callTeam<T>(request: TeamRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("equipe", {
    body: request,
  })
  if (error) throw await toTeamError(error)
  return data as T
}

export const teamQueryKey = ["team"] as const

// Durée de validité d'un lien d'invitation : auth.email.otp_expiry dans supabase/config.toml.
const invitationValidityMs = 10 * 60 * 1000

/** Vrai si l'invitation n'est pas acceptée et que son lien a expiré. */
export function isInvitationExpired(member: Member, now = Date.now()): boolean {
  if (member.status !== "invited" || member.invited_at === null) return false
  return now - new Date(member.invited_at).getTime() > invitationValidityMs
}

/**
 * Nombre d'admins capables d'agir : invitation acceptée et double vérification
 * configurée (même règle que la base, voir has_other_active_admin).
 */
export function countActiveAdmins(members: Member[]): number {
  return members.filter(
    (member) =>
      member.role === "admin" &&
      member.status === "active" &&
      member.mfa_enabled
  ).length
}

export async function listMembers(): Promise<Member[]> {
  const { members } = await callTeam<{ members: Member[] }>({ action: "list" })
  return members
}
