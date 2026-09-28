import { z } from "zod"

import { texts } from "@/texts"

// Formulaires de l'admin : ce qui est saisi, et les messages en cas d'erreur.

export const MAX_NAME_LENGTH = 100

const email = (message: string) =>
  z.string().trim().toLowerCase().pipe(z.email(message))

const sixDigits = (message: string) => z.string().regex(/^\d{6}$/, message)

const fullName = (message: string) =>
  z.string().trim().max(MAX_NAME_LENGTH, message)

export const signInEmailSchema = z.object({
  email: email(texts.signIn.invalidEmail),
})

export const signInCodeSchema = z.object({
  code: sixDigits(texts.signIn.invalidCode),
})

export const mfaCodeSchema = z.object({
  code: sixDigits(texts.mfa.invalidCode),
})

export const profileSchema = z.object({
  full_name: fullName(texts.account.profile.nameTooLong),
})

export const inviteSchema = z.object({
  email: email(texts.team.invalidEmail),
  full_name: fullName(texts.team.nameTooLong),
  role: z.enum(["admin", "editor"]),
})

// Fiche d'un fichier de la médiathèque : mêmes limites que la base (table media).
export const mediaDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, texts.media.detail.nameRequired)
    .max(255, texts.media.detail.nameTooLong),
  alt: z.string().trim().max(1000, texts.media.detail.altTooLong),
  transcript: z
    .string()
    .trim()
    .max(200_000, texts.media.detail.transcriptTooLong),
})

// Formule d'abonnement : mêmes limites que la base (table access_levels).
export const accessLevelNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, texts.settings.accessLevels.nameRequired)
    .max(MAX_NAME_LENGTH, texts.settings.accessLevels.nameTooLong),
})
