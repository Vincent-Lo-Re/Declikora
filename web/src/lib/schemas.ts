import { z } from "zod"

import { ALT_MAX, TITLE_MAX } from "@/blocks/draft"
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

// Le nom de la marque : mêmes limites que la base (table admin_identity) ; vide : « Ruche ».
const ADMIN_NAME_MAX = 40

export const adminNameSchema = z.object({
  name: z
    .string()
    .trim()
    .max(ADMIN_NAME_MAX, texts.settings.adminIdentity.nameTooLong),
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
  alt: z.string().trim().max(ALT_MAX, texts.media.detail.altTooLong),
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

// Catégorie du Blog ou des Podcasts : mêmes limites que la base (table categories).
export const categoryNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, texts.categories.nameRequired)
    .max(MAX_NAME_LENGTH, texts.categories.nameTooLong),
})

// Nouveau modèle (section Modèles, ou « Enregistrer comme modèle ») : mêmes règles que la base
// (content_create, template_create_from) : nom de 1 à 200 caractères, section d'un point de
// départ obligatoire ([D42]).
export const templateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, texts.templates.create.nameRequired)
      .max(TITLE_MAX, texts.templates.create.nameTooLong),
    sort: z.enum(["style", "shared", "starter"]),
    templateFor: z
      .enum(["article", "episode", "chapter", "lesson", "exercise", "page"])
      .nullable(),
  })
  .refine((value) => value.sort !== "starter" || value.templateFor !== null, {
    path: ["templateFor"],
    message: texts.templates.create.sectionRequired,
  })

export type TemplateValues = z.infer<typeof templateSchema>
