// Identité de l'admin (table admin_identity, une seule ligne ; Paramètres, onglet « Identité de
// l'admin », ADMIN § 7), la même pour toute l'équipe : le nom de la marque (vide : « Ruche »), le
// logotype et le monogramme, chacun pour fond clair et pour fond sombre (espace public
// « marque »), l'image de l'écran de connexion, et les déclinaisons du logo aux couleurs de chaque palette (table
// admin_brand_variants). admin_brand() et admin_brand_variants() les donnent à tout le monde,
// page de connexion comprise ; seul un admin les change.

import rucheLogotype from "@/assets/brand/ruche-logotype.svg?raw"
import rucheMonogram from "@/assets/brand/ruche-monogramme.svg?raw"
import {
  analyzeSvgColors,
  recolorSvg,
  svgDataUrl,
  type SvgColors,
} from "@/lib/brand-colors"
import type { Tables, TablesInsert } from "@/lib/database.types"
import { decodeImage, reduceImage } from "@/lib/media/image"
import { cleanSvg } from "@/lib/media/svg"
import { isLanguage, locale, type Language } from "@/lib/language"
import { DEFAULT_MOTIONS, isMotion, type Motion } from "@/lib/monogram-motion"
import { palettePresets, presetLogoColors, type PresetId } from "@/lib/palettes"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

export const adminBrandKey = ["admin-brand"] as const

const BUCKET = "marque"
const MAX_BYTES = 1024 * 1024
const extensions = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/webp": "webp",
} as const
type BrandMime = keyof typeof extensions

export const brandFileAccept = Object.keys(extensions).join(",")

/** Les quatre fichiers de la marque : leur dossier dans « marque » et leur colonne. */
const brandSlots = {
  "logotype-light": { folder: "logotype-clair", column: "logotype_light" },
  "logotype-dark": { folder: "logotype-sombre", column: "logotype_dark" },
  "monogram-light": { folder: "monogramme-clair", column: "monogram_light" },
  "monogram-dark": { folder: "monogramme-sombre", column: "monogram_dark" },
} as const
export type BrandSlot = keyof typeof brandSlots
type BrandColumn = (typeof brandSlots)[BrandSlot]["column"]

export type BrandKind = "logotype" | "monogram"
export type BrandSurface = "light" | "dark"

type BrandFile = { path: string; url: string }

/**
 * L'identité enregistrée : le nom (ou null), les adresses publiques des fichiers (ou null), celles
 * des déclinaisons du logo par palette (« logotype:stone-orange:dark ») et l'image de l'écran de
 * connexion (ou null).
 */
export type AdminBrand = { name: string | null } & Record<
  BrandSlot,
  BrandFile | null
> & {
    variants: Partial<Record<string, string>>
    loginImage: BrandFile | null
    /** Le monogramme de l'écran de connexion est animé (faux : immobile). */
    monogramMotion: boolean
    /** Ses animations cochées (lib/monogram-motion.ts). */
    monogramMotions: Motion[]
    /** L'adresse de contact de la marque, sur l'écran de connexion (ou null). */
    contactEmail: string | null
    /** La langue de toute l'admin (Paramètres › Avancé). */
    language: Language
  }

type BrandRow = Pick<
  Tables<"admin_identity">,
  | "name"
  | BrandColumn
  | "login_image"
  | "login_monogram_motion"
  | "login_monogram_motions"
  | "contact_email"
  | "language"
>

const variantKey = (kind: BrandKind, palette: string, surface: BrandSurface) =>
  `${kind}:${palette}:${surface}`

// Le dossier des déclinaisons dans « marque ».
const variantFolders = {
  logotype: "logotype-palettes",
  monogram: "monogramme-palettes",
} as const

// Neutrine, la palette d'origine : le logo garde ses couleurs, avec sa version pour l'autre fond.
const ORIGIN: PresetId = "neutral-none"

/** Les palettes pour lesquelles un logo est décliné : toutes, Neutrine comprise. */
export const variantPresets = palettePresets

function fileOf(path: string | null): BrandFile | null {
  if (!path) return null
  return {
    path,
    url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
  }
}

export async function getAdminBrand(): Promise<AdminBrand> {
  const [identity, variants] = await Promise.all([
    supabase.rpc("admin_brand").single(),
    supabase.rpc("admin_brand_variants"),
  ])
  if (identity.error) throw identity.error
  if (variants.error) throw variants.error
  const row = identity.data as BrandRow
  return {
    name: row.name ?? null,
    "logotype-light": fileOf(row.logotype_light),
    "logotype-dark": fileOf(row.logotype_dark),
    "monogram-light": fileOf(row.monogram_light),
    "monogram-dark": fileOf(row.monogram_dark),
    loginImage: fileOf(row.login_image),
    monogramMotion: row.login_monogram_motion ?? true,
    monogramMotions: (row.login_monogram_motions ?? DEFAULT_MOTIONS).filter(
      isMotion
    ),
    contactEmail: row.contact_email ?? null,
    language: isLanguage(row.language) ? row.language : "en",
    variants: Object.fromEntries(
      variants.data.map((variant) => [
        variantKey(
          variant.kind as BrandKind,
          variant.palette,
          variant.surface as BrandSurface
        ),
        fileOf(variant.path)?.url,
      ])
    ),
  }
}

async function updateIdentity(values: Partial<BrandRow>): Promise<void> {
  const { error } = await supabase
    .from("admin_identity")
    .update(values)
    .eq("id", true)
  if (error) throw error
}

/**
 * Change le nom de la marque et son adresse de contact (admins) ; null : le nom à défaut, ou pas
 * d'adresse.
 */
export function saveBrandDetails(
  name: string | null,
  contactEmail: string | null
): Promise<void> {
  return updateIdentity({ name, contact_email: contactEmail })
}

/** Change la langue de toute l'admin (admins). */
export function saveAdminLanguage(language: Language): Promise<void> {
  return updateIdentity({ language })
}

/** Un fichier refusé avant l'envoi : son message est dans texts. */
export class BrandFileError extends Error {}

/**
 * Un fichier prêt à partir : un SVG est nettoyé (comme dans la Médiathèque), le reste tel quel.
 * Pour un SVG aux couleurs modifiables, son texte et ses couleurs (lib/brand-colors.ts).
 */
export type PreparedBrandFile = {
  body: Blob
  mime: BrandMime
  svg: BrandSvg | null
}
type BrandSvg = { markup: string; colors: SvgColors }

export async function prepareBrandFile(file: File): Promise<PreparedBrandFile> {
  const words = texts.settings.adminIdentity.files.errors
  if (!(file.type in extensions)) throw new BrandFileError(words.type)
  const mime = file.type as BrandMime
  if (mime !== "image/svg+xml") {
    if (file.size > MAX_BYTES) throw new BrandFileError(words.tooBig)
    return { body: file, mime, svg: null }
  }
  let markup: string
  try {
    markup = cleanSvg(await file.text()).markup
  } catch {
    throw new BrandFileError(words.svg)
  }
  const body = new Blob([markup], { type: mime })
  if (body.size > MAX_BYTES) throw new BrandFileError(words.tooBig)
  const colors = analyzeSvgColors(markup)
  return { body, mime, svg: colors ? { markup, colors } : null }
}

async function upload(path: string, body: Blob, mime: BrandMime) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: mime })
  if (error) throw error
}

const slotKind = (slot: BrandSlot): BrandKind =>
  slot.startsWith("logotype") ? "logotype" : "monogram"

/**
 * Envoie un fichier de la marque (admins) sous un nouveau nom, l'enregistre, puis retire l'ancien
 * (s'il reste, il ne sert plus : rien ne casse). Les déclinaisons du logo d'avant partent aussi :
 * elles ne lui ressemblent plus.
 */
export async function saveBrandFile(
  slot: BrandSlot,
  file: PreparedBrandFile,
  previous: string | null
): Promise<void> {
  const { folder, column } = brandSlots[slot]
  const path = `${folder}/${crypto.randomUUID()}.${extensions[file.mime]}`
  await upload(path, file.body, file.mime)
  await updateIdentity({ [column]: path })
  await clearBrandVariants(slotKind(slot))
  if (previous) await supabase.storage.from(BUCKET).remove([previous])
}

/**
 * Retire un fichier de la marque (admins) : l'autre version, ou le nom, prend sa place. Le dernier
 * fichier du logotype (ou du monogramme) emporte ses déclinaisons.
 */
export async function removeBrandFile(
  slot: BrandSlot,
  previous: string,
  last: boolean
): Promise<void> {
  await updateIdentity({ [brandSlots[slot].column]: null })
  if (last) await clearBrandVariants(slotKind(slot))
  await supabase.storage.from(BUCKET).remove([previous])
}

// L'image de l'écran de connexion : une photo, réduite dans le navigateur comme celles de la
// Médiathèque (environ 300 Ko, 2 000 px au plus, en WebP ou en JPEG avec Safari).
const loginImageTypes = ["image/jpeg", "image/png", "image/webp"]
export const loginImageAccept = loginImageTypes.join(",")
const LOGIN_FOLDER = "connexion"

/** Réduit l'image de l'écran de connexion avant l'envoi. */
export async function prepareLoginImage(file: File): Promise<Blob> {
  const words = texts.settings.adminIdentity.files.errors
  if (!loginImageTypes.includes(file.type)) {
    throw new BrandFileError(words.photoType)
  }
  let image
  try {
    image = await decodeImage(file)
  } catch {
    throw new BrandFileError(words.photo)
  }
  try {
    return (await reduceImage(image, image.encode)).blob
  } finally {
    image.close()
  }
}

/** Envoie l'image de l'écran de connexion (admins) sous un nouveau nom, puis retire l'ancienne. */
export async function saveLoginImage(
  image: Blob,
  previous: string | null
): Promise<void> {
  const mime = image.type === "image/webp" ? "image/webp" : "image/jpeg"
  const path = `${LOGIN_FOLDER}/${crypto.randomUUID()}.${mime === "image/webp" ? "webp" : "jpg"}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, image, { contentType: mime })
  if (error) throw error
  await updateIdentity({ login_image: path })
  if (previous) await supabase.storage.from(BUCKET).remove([previous])
}

/** Active ou désactive le monogramme animé de l'écran de connexion (admins). */
export function saveMonogramMotion(enabled: boolean): Promise<void> {
  return updateIdentity({ login_monogram_motion: enabled })
}

/** Les animations cochées du monogramme de l'écran de connexion (admins ; une au moins). */
export function saveMonogramMotions(motions: Motion[]): Promise<void> {
  return updateIdentity({ login_monogram_motions: motions })
}

/** Retire l'image de l'écran de connexion (admins) : le monogramme reprend sa place. */
export async function removeLoginImage(previous: string): Promise<void> {
  await updateIdentity({ login_image: null })
  await supabase.storage.from(BUCKET).remove([previous])
}

/**
 * Le logo décliné pour chaque palette, fond clair et fond sombre (pour l'aperçu et l'envoi). Un
 * logo d'une seule couleur (sans accent) prend la couleur des boutons de la palette, plutôt que
 * son noir ou son blanc. Neutrine garde les couleurs du logo : seule sa couleur principale passe
 * à l'encre de la base sur fond clair et à son texte clair sur fond sombre (un logo noir devient
 * blanc sur le menu sombre).
 */
export function brandVariants(svg: BrandSvg) {
  const single = svg.colors.accent === null
  return variantPresets.map(({ id }) => {
    const colors = presetLogoColors(id)
    const target = (surface: BrandSurface) => {
      const palette = colors[surface]
      if (id === ORIGIN) {
        return { main: palette.main, accent: svg.colors.accent ?? palette.main }
      }
      return single ? { ...palette, main: palette.accent } : palette
    }
    return {
      palette: id,
      light: recolorSvg(svg.markup, svg.colors, target("light")),
      dark: recolorSvg(svg.markup, svg.colors, target("dark")),
    }
  })
}

/**
 * Enregistre les déclinaisons d'un logo SVG (admins) : une par palette et par fond, chacune sous un
 * nouveau nom ; celles d'avant sont retirées. `fill` : la carte de l'autre fond, vide, qui reçoit
 * la version Neutrine de ce fond (les couleurs d'origine, la couleur principale adaptée au fond).
 */
export async function saveBrandVariants(
  kind: BrandKind,
  svg: BrandSvg,
  fill: BrandSlot | null = null
): Promise<void> {
  await clearBrandVariants(kind)
  const variants = brandVariants(svg)
  const rows: TablesInsert<"admin_brand_variants">[] = []
  for (const variant of variants) {
    for (const surface of ["light", "dark"] as const) {
      const path = `${variantFolders[kind]}/${crypto.randomUUID()}.svg`
      const body = new Blob([variant[surface]], { type: "image/svg+xml" })
      await upload(path, body, "image/svg+xml")
      rows.push({ kind, palette: variant.palette, surface, path })
    }
  }
  const { error } = await supabase.from("admin_brand_variants").insert(rows)
  if (error) throw error
  if (!fill) return
  const origin = variants.find((variant) => variant.palette === ORIGIN)!
  const surface: BrandSurface = fill.endsWith("dark") ? "dark" : "light"
  const path = `${brandSlots[fill].folder}/${crypto.randomUUID()}.svg`
  await upload(
    path,
    new Blob([origin[surface]], { type: "image/svg+xml" }),
    "image/svg+xml"
  )
  await updateIdentity({ [brandSlots[fill].column]: path })
}

/** Retire les déclinaisons du logotype (ou du monogramme), lignes et fichiers. */
async function clearBrandVariants(kind: BrandKind): Promise<void> {
  const { data, error } = await supabase
    .from("admin_brand_variants")
    .delete()
    .eq("kind", kind)
    .select("path")
  if (error) throw error
  if (data.length > 0) {
    await supabase.storage.from(BUCKET).remove(data.map((row) => row.path))
  }
}

/** Le nom à afficher : celui de la marque, sinon « Ruche ». */
export function brandName(name: string | null | undefined): string {
  return name ?? texts.app.name
}

/**
 * Les logos de Ruche, l'admin par défaut (src/assets/brand/) : déclinés comme un logo envoyé,
 * pour chaque palette et chaque fond, une fois, dans le navigateur (rien dans la base).
 */
const rucheSources = { logotype: rucheLogotype, monogram: rucheMonogram }
const rucheCache = new Map<string, string>()

export function defaultBrandFile(
  kind: BrandKind,
  surface: BrandSurface,
  preset: PresetId | null
): string {
  const palette = preset ?? ORIGIN
  const key = variantKey(kind, palette, surface)
  if (!rucheCache.has(key)) {
    const markup = rucheSources[kind]
    const colors = analyzeSvgColors(markup)!
    for (const variant of brandVariants({ markup, colors })) {
      for (const side of ["light", "dark"] as const) {
        rucheCache.set(
          variantKey(kind, variant.palette, side),
          svgDataUrl(variant[side])
        )
      }
    }
  }
  return rucheCache.get(key)!
}

/**
 * L'adresse d'un fichier pour un fond : la déclinaison de la palette de ce membre s'il y en a une
 * (Neutrine pour une association libre), sinon la version de ce fond, sinon l'autre. Sans aucun
 * fichier : les logos de Ruche si l'admin n'a pas non plus de nom de marque (c'est alors Ruche),
 * sinon null (le nom en texte, ou son initiale). Avec Neutrine, un fichier envoyé pour ce fond
 * passe avant la déclinaison : ce sont les couleurs d'origine.
 */
export function brandFileFor(
  brand: AdminBrand | undefined,
  kind: BrandKind,
  surface: BrandSurface,
  preset: PresetId | null = null
): string | null {
  if (!brand) return null
  const palette = preset ?? ORIGIN
  const sent = brand[`${kind}-${surface}`]?.url ?? null
  if (palette === ORIGIN && sent) return sent
  const variant = brand.variants[variantKey(kind, palette, surface)]
  if (variant) return variant
  const other = surface === "light" ? "dark" : "light"
  const file = sent ?? brand[`${kind}-${other}`]?.url ?? null
  if (file) return file
  return brand.name === null ? defaultBrandFile(kind, surface, preset) : null
}

/** Le titre d'un onglet du navigateur (« Mon compte — Ruche »), sans le nom tant qu'il n'est pas lu. */
export function tabTitle(title: string, brand: string): string {
  return brand ? `${title} — ${brand}` : title
}

/** L'initiale de la marque, en capitale (« Essaim » : « E ») ; vide tant que le nom n'est pas lu. */
export function brandInitial(brand: string): string {
  return Array.from(brand.trim())[0]?.toLocaleUpperCase(locale) ?? ""
}

/**
 * Le favicon d'une marque sans monogramme : son initiale, dans un carré arrondi (public/favicon.svg,
 * le monogramme de Ruche, sert pendant le chargement), en image data: (acceptée par la CSP, img-src).
 */
export function faviconHref(brand: string): string {
  const initial = brandInitial(brand)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>rect{fill:#171717}text{fill:#fafafa}@media (prefers-color-scheme:dark){rect{fill:#fafafa}text{fill:#171717}}</style><rect width="32" height="32" rx="7"/><text x="16" y="22.5" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="600">${initial}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
