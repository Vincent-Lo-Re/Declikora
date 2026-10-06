/**
 * Le profil de chaque sorte de contenu (docs/ADMINISTRATION.md, § 4, « Le builder du Fil
 * partout ») : ce qu'elle demande pour être publiée et ce que son éditeur montre. Décrit une
 * seule fois ici : l'éditeur, les listes et « ce qui manque pour publier » le lisent, au lieu de
 * tester la sorte. Sans React.
 */

import { SHARED_ROOT_LIMIT } from "@/blocks/templates"
import type { CategorySection } from "@/lib/categories"
import type { ContentKind } from "@/lib/contents/api"
import type { TemplateSort } from "@/lib/contents/templates"

export type ContentProfile = {
  // Qui la publie : elle-même, ou personne (un modèle de bloc).
  publication: "own" | null
  // Le titre est exigé pour publier ([D49]).
  titleRequired: boolean
  // L'image de présentation ([D45]) : exigée pour publier, ou sans objet.
  cover: "required" | null
  // Un audio, exigé pour publier (un épisode).
  audio: boolean
  // La section de ses catégories (Blog, Podcasts), sinon null.
  categories: CategorySection | null
  // Son niveau d'accès : le sien, ou aucun (un modèle de bloc).
  access: "own" | null
  // Une adresse dans l'app (une page).
  address: boolean
  // « Mes blocs » et « Enregistrer comme modèle » : pas dans un modèle de bloc (la base refuse
  // un bloc partagé dans un modèle).
  savedBlocks: boolean
  // Nombre maximal de blocs au premier niveau : un bloc partagé n'en a qu'un ([D11]).
  rootLimit: number | undefined
}

/**
 * Celles qui ont une carte dans une liste de l'app (le Fil, Radio Éclaircies) : leur image de
 * présentation est exigée ([D45]), et la colonne de droite montre cette carte.
 */
export type ListedKind = Extract<ContentKind, "article" | "episode">

/**
 * Celles qui se publient elles-mêmes (pas un modèle de bloc) : la colonne de droite montre
 * « Prêt à publier ? » et leur publication.
 */
export type PublishedKind = Exclude<ContentKind, "template">

/**
 * Celles qui ont un niveau d'accès : la Lecture peut les montrer à une personne sans la formule.
 */
export type LockableKind = Exclude<ContentKind, "template">

/** Vrai pour une sorte qui a une carte dans une liste de l'app. */
export function isListedKind(kind: ContentKind): kind is ListedKind {
  return contentProfile(kind).cover === "required"
}

/** Le profil d'une sorte de contenu ; templateSort : la sorte d'un modèle de bloc. */
export function contentProfile(
  kind: ContentKind,
  templateSort: TemplateSort | null = null
): ContentProfile {
  const base = {
    publication: "own",
    titleRequired: true,
    cover: null,
    audio: false,
    categories: null,
    access: "own",
    address: false,
    savedBlocks: true,
    rootLimit: undefined,
  } satisfies ContentProfile
  switch (kind) {
    case "article":
      return { ...base, cover: "required", categories: "blog" }
    case "episode":
      return {
        ...base,
        cover: "required",
        audio: true,
        categories: "podcasts",
      }
    case "page":
      return { ...base, address: true }
    case "template":
      return {
        ...base,
        publication: null,
        titleRequired: false,
        access: null,
        savedBlocks: false,
        rootLimit: templateSort === "shared" ? SHARED_ROOT_LIMIT : undefined,
      }
  }
}
