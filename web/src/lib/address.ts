/**
 * Les réglages des listes gardés dans leur adresse (ADMIN § 7, « Une navigation sans à-coups ») :
 * la recherche, les filtres et l'onglet, en mots français comme les adresses de navigation.ts,
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

const SEARCH = "recherche"

// --- Le Fil, Radio Éclaircies, Méthodes, Pages ----------------------------------------------

const stateChoice: Choice<StateFilter> = {
  name: "etat",
  words: {
    all: "tous",
    draft: "brouillon",
    live: "en-ligne",
    modified: "modifie",
    withdrawn: "retire",
    scheduled: "programme",
    failed: "echec",
  },
  fallback: "all",
}
const CATEGORY = "categorie"
const NO_CATEGORY_WORD = "aucune"

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

// --- Médiathèque ----------------------------------------------------------------------------

const kindChoice: Choice<MediaFilters["kind"]> = {
  name: "type",
  words: {
    all: "tous",
    image: "image",
    svg: "svg",
    lottie: "lottie",
    audio: "audio",
    pdf: "pdf",
  },
  fallback: "all",
}
const UNUSED = "non-utilises"

/** La recherche et les filtres de la Médiathèque, lus dans l'adresse. */
export function mediaFiltersFromAddress(params: URLSearchParams): MediaFilters {
  return {
    kind: readChoice(params, kindChoice),
    search: params.get(SEARCH) ?? "",
    unused: params.has(UNUSED),
  }
}

/** Écrit la recherche et les filtres de la Médiathèque dans l'adresse. */
export function writeMediaFilters(
  params: URLSearchParams,
  filters: MediaFilters
) {
  writeChoice(params, kindChoice, filters.kind)
  writeText(params, SEARCH, filters.search)
  if (filters.unused) params.set(UNUSED, "oui")
  else params.delete(UNUSED)
}

// --- Modèles de bloc ------------------------------------------------------------------------

const tabChoice: Choice<"all" | TemplateSort> = {
  name: "onglet",
  words: {
    all: "tous",
    style: "mise-en-forme",
    shared: "partages",
    starter: "points-de-depart",
  },
  fallback: "all",
}

/** L'onglet des Modèles de bloc, lu dans l'adresse. */
export function templateTabFromAddress(
  params: URLSearchParams
): "all" | TemplateSort {
  return readChoice(params, tabChoice)
}

/** Écrit l'onglet des Modèles de bloc dans l'adresse. */
export function writeTemplateTab(
  params: URLSearchParams,
  tab: "all" | TemplateSort
) {
  writeChoice(params, tabChoice, tab)
}

// --- Corbeille ------------------------------------------------------------------------------

const trashChoice: Choice<TrashFilter> = {
  name: "type",
  words: {
    all: "tous",
    article: "article",
    episode: "episode",
    method: "methode",
    page: "page",
    template: "modele",
    file: "fichier",
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
