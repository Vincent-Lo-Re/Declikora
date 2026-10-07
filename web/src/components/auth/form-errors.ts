import type { FieldErrors } from "react-hook-form"
import { toast } from "sonner"

/**
 * Un formulaire de la connexion refusé avant l'envoi (adresse ou code invalide) : son premier
 * message en notification, comme les erreurs du reste de l'admin (sonner, en bas à droite).
 */
export function toastFirstError(errors: FieldErrors) {
  const message = Object.values(errors).find((error) => error?.message)?.message
  if (typeof message === "string") toast.error(message)
}
