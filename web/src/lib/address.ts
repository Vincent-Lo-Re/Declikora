/**
 * Les réglages des listes gardés dans leur adresse (ADMIN § 7, « Une navigation sans à-coups ») :
 * la recherche, les filtres et l'onglet, en mots anglais courants comme les adresses de navigation.ts,
 * et seulement quand ils diffèrent de leur valeur de départ. On peut ainsi recharger ou partager
 * une liste telle quelle, et la retrouver en y revenant. Sans React.
 */

import type { TemplateSort } from "@/lib/contents/templates"
import {
  ALL_CATEGORIES,
  NO_CATEGORY,
  noFilters,
  type ListFilters,
  type StateFilter,
} from "@/lib/contents/list-filters"
import type { MediaFilters } from "@/lib/media/api"
import type { TrashFilter } from "@/lib/trash"

/** Un réglage à choix : son nom dans l'adresse, le mot de chaque valeur, sa valeur de départ. */
type Choice<T extends string> = {
  name: string
  words: Record<T, string>
  fallback: T
}

function readChoice<T extends string>(
  params: URLSearchParams,
  { name, words, fallback }: Choice<T>
): T {
  const word = params.get(name)
  const values = Object.keys(words) as T[]
  return values.find((value) => words[value] === word) ?? fallback
}

function writeChoice<T extends string>(
  params: URLSearchParams,
  { name, words, fallback }: Choice<T>,
  value: T
) {
  if (value === fallback) params.delete(name)
  else params.set(name, words[value])
}

/** Un texte (la recherche) : absent de l'adresse quand il est vide. */
function writeText(params: URLSearchParams, name: string, value: string) {
  if (value === "") params.delete(name)
  else params.set(name, value)
}

const SEARCH = "q"

// --- Le Fil, Radio Éclaircies, Pages ------------------------------------------------------

const stateChoice: Choice<StateFilter> = {
  name: "status",
  words: {
    all: "all",
    draft: "draft",
    live: "live",
    modified: "modified",
    withdrawn: "unpublished",
    scheduled: "scheduled",
    failed: "failed",
  },
  fallback: "all",
}
const CATEGORY = "category"
const NO_CATEGORY_WORD = "none"

/** La recherche et les filtres d'une liste de contenus, lus dans l'adresse. */
export function listFiltersFromAddress(params: URLSearchParams): ListFilters {
  const category = params.get(CATEGORY)
  return {
    search: params.get(SEARCH) ?? noFilters.search,
    state: readChoice(params, stateChoice),
    category:
      category === null
        ? ALL_CATEGORIES
        : category === NO_CATEGORY_WORD
          ? NO_CATEGORY
          : category,
  }
}

/** Écrit la recherche et les filtres d'une liste de contenus dans l'adresse. */
export function writeListFilters(
  params: URLSearchParams,
  filters: ListFilters
) {
  writeText(params, SEARCH, filters.search)
  writeChoice(params, stateChoice, filters.state)
  if (filters.category === ALL_CATEGORIES) params.delete(CATEGORY)
  else {
    params.set(
      CATEGORY,
      filters.category === NO_CATEGORY ? NO_CATEGORY_WORD : filters.category
    )
  }
}

/** Blog, Podcasts : l'onglet de la liste, les contenus (au départ) ou les catégories. */
export type ListTab = "contents" | "categories"

const listTabChoice: Choice<ListTab> = {
  name: "tab",
  words: { contents: "contents", categories: "categories" },
  fallback: "contents",
}

/** L'onglet d'une liste de contenus (Blog, Podcasts), lu dans l'adresse. */
export function listTabFromAddress(params: URLSearchParams): ListTab {
  return readChoice(params, listTabChoice)
}

/** Écrit l'onglet d'une liste de contenus dans l'adresse. */
export function writeListTab(params: URLSearchParams, tab: ListTab) {
  writeChoice(params, listTabChoice, tab)
}

// --- Médiathèque ----------------------------------------------------------------------------

const kindChoice: Choice<MediaFilters["kind"]> = {
  name: "type",
  words: {
    all: "all",
    image: "image",
    svg: "svg",
    lottie: "lottie",
    audio: "audio",
    pdf: "pdf",
  },
  fallback: "all",
}
const UNUSED = "unused"

/** La recherche et les filtres de la Médiathèque, lus dans l'adresse. */
export function mediaFiltersFromAddress(params: URLSearchParams): MediaFilters {
  return {
    kind: readChoice(params, kindChoice),
    search: params.get(SEARCH) ?? "",
    unused: params.has(UNUSED),
  }
}

// « /media?file=<id> » ouvre la fiche de ce fichier (lien depuis l'éditeur : la
// transcription d'un audio, le texte alternatif d'une image de présentation).
export const FILE_PARAM = "file"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Le fichier dont l'adresse demande la fiche (null : aucun, ou un id qui n'en est pas un). */
export function askedFileFromAddress(params: URLSearchParams): string | null {
  const asked = params.get(FILE_PARAM)
  return asked && UUID.test(asked) ? asked : null
}

/** Écrit la recherche et les filtres de la Médiathèque dans l'adresse. */
export function writeMediaFilters(
  params: URLSearchParams,
  filters: MediaFilters
) {
  writeChoice(params, kindChoice, filters.kind)
  writeText(params, SEARCH, filters.search)
  if (filters.unused) params.set(UNUSED, "true")
  else params.delete(UNUSED)
}

// --- Modèles de bloc ------------------------------------------------------------------------

const tabChoice: Choice<"all" | TemplateSort | "unused"> = {
  name: "tab",
  words: {
    all: "all",
    style: "style",
    shared: "shared",
    starter: "starter",
    unused: "unused",
  },
  fallback: "all",
}

/** L'onglet des Modèles de bloc, lu dans l'adresse. */
export function templateTabFromAddress(
  params: URLSearchParams
): "all" | TemplateSort | "unused" {
  return readChoice(params, tabChoice)
}

/** Écrit l'onglet des Modèles de bloc dans l'adresse. */
export function writeTemplateTab(
  params: URLSearchParams,
  tab: "all" | TemplateSort | "unused"
) {
  writeChoice(params, tabChoice, tab)
}

// --- Paramètres -----------------------------------------------------------------------------

/** Les onglets de Paramètres, dans l'ordre (ADMIN § 7). */
export const settingsTabs = ["admin", "app", "plans", "advanced"] as const
export type SettingsTab = (typeof settingsTabs)[number]

const settingsTabChoice: Choice<SettingsTab> = {
  name: "tab",
  words: {
    admin: "admin",
    app: "app",
    plans: "plans",
    advanced: "advanced",
  },
  fallback: "admin",
}

/** L'onglet de Paramètres, lu dans l'adresse (le premier, l'identité de l'admin, par défaut). */
export function settingsTabFromAddress(params: URLSearchParams): SettingsTab {
  return readChoice(params, settingsTabChoice)
}

/** Écrit l'onglet de Paramètres dans l'adresse. */
export function writeSettingsTab(params: URLSearchParams, tab: SettingsTab) {
  writeChoice(params, settingsTabChoice, tab)
}

// --- Corbeille ------------------------------------------------------------------------------

const trashChoice: Choice<TrashFilter> = {
  name: "type",
  words: {
    all: "all",
    article: "article",
    episode: "episode",
    page: "page",
    template: "template",
    file: "file",
  },
  fallback: "all",
}

/** Le filtre de la Corbeille, lu dans l'adresse. */
export function trashFilterFromAddress(params: URLSearchParams): TrashFilter {
  return readChoice(params, trashChoice)
}

/** Écrit le filtre de la Corbeille dans l'adresse. */
export function writeTrashFilter(params: URLSearchParams, filter: TrashFilter) {
  writeChoice(params, trashChoice, filter)
}
