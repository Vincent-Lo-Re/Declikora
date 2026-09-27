// Codes de l'app du téléphone (TOTP), calculés à partir de la clé affichée par l'admin.

import { Secret, TOTP } from "otpauth"

const period = 30

// Dernière période utilisée pour chaque clé : Supabase refuse de valider deux fois le même code.
const lastUsedStep = new Map<string, number>()

/** Un code valable et pas encore utilisé (attend la période suivante si besoin, 30 s au plus). */
export async function totpCode(secret: string): Promise<string> {
  const step = () => Math.floor(Date.now() / 1000 / period)
  const last = lastUsedStep.get(secret)
  if (last !== undefined && step() <= last) {
    const nextStepAt = (last + 1) * period * 1000
    await new Promise((resolve) =>
      setTimeout(resolve, nextStepAt - Date.now() + 200)
    )
  }
  const totp = new TOTP({ secret: Secret.fromBase32(secret), period })
  lastUsedStep.set(secret, step())
  return totp.generate()
}
