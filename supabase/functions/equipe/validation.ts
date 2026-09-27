// Lecture stricte des demandes envoyées à la fonction « equipe ».

export type TeamRole = "admin" | "editor"

export type TeamRequest =
  | { action: "list" }
  | { action: "invite"; email: string; full_name: string | null; role: TeamRole }
  | { action: "resend"; user_id: string }
  | { action: "set_role"; user_id: string; role: TeamRole }
  | { action: "remove"; user_id: string }
  | { action: "reset_mfa"; user_id: string }

export type ParseResult = { ok: true; request: TeamRequest } | { ok: false; message: string }

export const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Champs acceptés pour chaque action, en plus de « action ». Tout autre champ est refusé.
const fieldsByAction = {
  list: [],
  invite: ["email", "full_name", "role"],
  resend: ["user_id"],
  set_role: ["user_id", "role"],
  remove: ["user_id"],
  reset_mfa: ["user_id"],
} as const

type Action = keyof typeof fieldsByAction

class InvalidRequest extends Error {}

function isAction(value: unknown): value is Action {
  return typeof value === "string" && Object.hasOwn(fieldsByAction, value)
}

function readEmail(value: unknown): string {
  if (typeof value !== "string") throw new InvalidRequest("L'adresse e-mail est obligatoire.")
  const email = value.trim().toLowerCase()
  if (email.length > MAX_EMAIL_LENGTH || !emailPattern.test(email)) {
    throw new InvalidRequest("L'adresse e-mail n'est pas valide.")
  }
  return email
}

function readName(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") throw new InvalidRequest("Le nom n'est pas valide.")
  const name = value.trim()
  if (name.length > MAX_NAME_LENGTH) {
    throw new InvalidRequest(`Le nom ne doit pas dépasser ${MAX_NAME_LENGTH} caractères.`)
  }
  return name === "" ? null : name
}

function readRole(value: unknown): TeamRole {
  if (value === "admin" || value === "editor") return value
  throw new InvalidRequest("Le rôle doit être « admin » ou « editor ».")
}

function readUserId(value: unknown): string {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new InvalidRequest("Le membre n'est pas valide.")
  }
  return value.toLowerCase()
}

export function parseRequest(body: unknown): ParseResult {
  try {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new InvalidRequest("La demande doit être un objet JSON.")
    }
    const fields = body as Record<string, unknown>
    const action = fields.action
    if (!isAction(action)) throw new InvalidRequest("Action inconnue.")

    const allowed: readonly string[] = fieldsByAction[action]
    const unknown = Object.keys(fields).filter((key) => key !== "action" && !allowed.includes(key))
    if (unknown.length > 0) throw new InvalidRequest(`Champ inattendu : ${unknown.join(", ")}.`)

    switch (action) {
      case "list":
        return { ok: true, request: { action } }
      case "invite":
        return {
          ok: true,
          request: {
            action,
            email: readEmail(fields.email),
            full_name: readName(fields.full_name),
            role: readRole(fields.role),
          },
        }
      case "set_role":
        return {
          ok: true,
          request: { action, user_id: readUserId(fields.user_id), role: readRole(fields.role) },
        }
      case "resend":
      case "remove":
      case "reset_mfa":
        return { ok: true, request: { action, user_id: readUserId(fields.user_id) } }
    }
  } catch (error) {
    if (error instanceof InvalidRequest) return { ok: false, message: error.message }
    throw error
  }
}
