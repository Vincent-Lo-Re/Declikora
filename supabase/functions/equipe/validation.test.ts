import { assertEquals } from "@std/assert"
import { MAX_NAME_LENGTH, parseRequest } from "./validation.ts"

const userId = "0b9f7c1e-2d4a-4c8e-9f3b-1a2b3c4d5e6f"

function refused(body: unknown): string {
  const result = parseRequest(body)
  if (result.ok) throw new Error(`Demande acceptée à tort : ${JSON.stringify(body)}`)
  return result.message
}

Deno.test("list : accepté sans autre champ", () => {
  assertEquals(parseRequest({ action: "list" }), { ok: true, request: { action: "list" } })
})

Deno.test("invite : e-mail nettoyé, nom facultatif", () => {
  assertEquals(
    parseRequest({ action: "invite", email: "  Marie@Exemple.FR ", role: "editor" }),
    {
      ok: true,
      request: {
        action: "invite",
        email: "marie@exemple.fr",
        full_name: null,
        role: "editor",
        language: null,
      },
    },
  )
  assertEquals(
    parseRequest({ action: "invite", email: "a@b.fr", full_name: "  Marie Curie ", role: "admin" }),
    {
      ok: true,
      request: {
        action: "invite",
        email: "a@b.fr",
        full_name: "Marie Curie",
        role: "admin",
        language: null,
      },
    },
  )
  assertEquals(
    parseRequest({ action: "invite", email: "a@b.fr", full_name: "   ", role: "admin" }),
    {
      ok: true,
      request: {
        action: "invite",
        email: "a@b.fr",
        full_name: null,
        role: "admin",
        language: null,
      },
    },
  )
})

Deno.test("invite : la langue du membre invité, facultative", () => {
  assertEquals(
    parseRequest({ action: "invite", email: "a@b.fr", role: "editor", language: "fr" }),
    {
      ok: true,
      request: {
        action: "invite",
        email: "a@b.fr",
        full_name: null,
        role: "editor",
        language: "fr",
      },
    },
  )
  assertEquals(
    refused({ action: "invite", email: "a@b.fr", role: "editor", language: "de" }),
    "La langue doit être « en » ou « fr ».",
  )
})

Deno.test("invite : entrées refusées", () => {
  assertEquals(refused({ action: "invite", role: "editor" }), "L'adresse e-mail est obligatoire.")
  assertEquals(
    refused({ action: "invite", email: "pas-une-adresse", role: "editor" }),
    "L'adresse e-mail n'est pas valide.",
  )
  assertEquals(
    refused({ action: "invite", email: `${"a".repeat(250)}@b.fr`, role: "editor" }),
    "L'adresse e-mail n'est pas valide.",
  )
  assertEquals(
    refused({ action: "invite", email: "a@b.fr", role: "patron" }),
    "Le rôle doit être « admin » ou « editor ».",
  )
  assertEquals(
    refused({ action: "invite", email: "a@b.fr", role: "editor", full_name: 42 }),
    "Le nom n'est pas valide.",
  )
  assertEquals(
    refused({
      action: "invite",
      email: "a@b.fr",
      role: "editor",
      full_name: "x".repeat(MAX_NAME_LENGTH + 1),
    }),
    `Le nom ne doit pas dépasser ${MAX_NAME_LENGTH} caractères.`,
  )
})

Deno.test("actions sur un membre : identifiant vérifié", () => {
  for (const action of ["resend", "remove", "reset_mfa"] as const) {
    assertEquals(parseRequest({ action, user_id: userId.toUpperCase() }), {
      ok: true,
      request: { action, user_id: userId },
    })
    assertEquals(refused({ action, user_id: "123" }), "Le membre n'est pas valide.")
    assertEquals(refused({ action }), "Le membre n'est pas valide.")
  }
  assertEquals(parseRequest({ action: "set_role", user_id: userId, role: "admin" }), {
    ok: true,
    request: { action: "set_role", user_id: userId, role: "admin" },
  })
  assertEquals(
    refused({ action: "set_role", user_id: userId }),
    "Le rôle doit être « admin » ou « editor ».",
  )
})

Deno.test("forme de la demande", () => {
  assertEquals(refused(undefined), "La demande doit être un objet JSON.")
  assertEquals(refused(null), "La demande doit être un objet JSON.")
  assertEquals(refused([]), "La demande doit être un objet JSON.")
  assertEquals(refused("list"), "La demande doit être un objet JSON.")
  assertEquals(refused({}), "Action inconnue.")
  assertEquals(refused({ action: "toString" }), "Action inconnue.")
  assertEquals(refused({ action: "delete_all" }), "Action inconnue.")
  assertEquals(refused({ action: "list", role: "admin" }), "Champ inattendu : role.")
  assertEquals(
    refused({ action: "remove", user_id: userId, email: "a@b.fr" }),
    "Champ inattendu : email.",
  )
})
