// Adresse à laquelle un code de connexion vient d'être demandé, gardée pour l'onglet en cours
// (sessionStorage) : après un rechargement, la connexion reprend à l'étape du code au lieu d'en
// redemander un, ce que Supabase refuserait pendant une minute.
//
// Le stockage peut être indisponible (navigation privée, données bloquées) : la connexion
// marche alors quand même, sans cette reprise.

const storageKey = "declikora.connexion"

// Durée de validité d'un code : auth.email.otp_expiry dans supabase/config.toml.
const codeValidityMs = 10 * 60 * 1000

type PendingSignIn = { email: string; sentAt: number }

export function savePendingSignIn(email: string, now = Date.now()) {
  try {
    const value: PendingSignIn = { email, sentAt: now }
    sessionStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // Stockage indisponible : pas de reprise après un rechargement.
  }
}

export function clearPendingSignIn() {
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    // Rien à effacer.
  }
}

/** L'adresse d'une demande de code encore valable, ou null. */
export function readPendingSignIn(now = Date.now()): string | null {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<PendingSignIn> | null
    if (
      typeof value?.email === "string" &&
      typeof value.sentAt === "number" &&
      now - value.sentAt < codeValidityMs
    ) {
      return value.email
    }
  } catch {
    // Valeur illisible ou stockage indisponible.
  }
  clearPendingSignIn()
  return null
}
