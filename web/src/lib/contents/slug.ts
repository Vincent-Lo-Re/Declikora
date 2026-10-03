// Adresse d'une page (slug) : mêmes règles que la base (save_draft).

const SLUG_MAX = 100
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Une adresse refusée par la base (prise ou invalide) : le brouillon garde son adresse
 * enregistrée, et le champ montre celle qui a été refusée, avec la raison.
 */
export type RefusedSlug = { slug: string | null; message: string }

type SlugCheck =
  | { ok: true; slug: string | null }
  | { ok: false; reason: "invalid" | "too_long" }

/** Vérifie une adresse saisie : vide = pas d'adresse (null). */
export function checkSlug(input: string): SlugCheck {
  const value = input.trim()
  if (value === "") return { ok: true, slug: null }
  if (value.length > SLUG_MAX) return { ok: false, reason: "too_long" }
  if (!SLUG_PATTERN.test(value)) return { ok: false, reason: "invalid" }
  return { ok: true, slug: value }
}

/** Une adresse tirée d'un titre : « Mentions légales » → « mentions-legales ». */
export function slugFromTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "")
}
