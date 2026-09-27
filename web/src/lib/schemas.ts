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
