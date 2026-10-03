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
  // Sa mise en page : celle du Fil, l'ancienne (tant que la sorte n'y est pas passée), ou
  // l'écran d'une méthode (sa fiche et son plan, sans blocs, [D4]).
  layout: "feed" | "classic" | "method"
  // Qui la publie : elle-même, sa méthode (un chapitre, une leçon, [D29]), ou personne (un
  // modèle de bloc).
  publication: "own" | "method" | null
  // Le titre est exigé pour publier ([D49]).
  titleRequired: boolean
  // L'image de présentation ([D45]) : exigée pour publier, facultative (la vignette d'un
  // élément dans le plan de sa méthode), ou sans objet.
  cover: "required" | "optional" | null
  // Un audio, exigé pour publier (un épisode).
  audio: boolean
  // La section de ses catégories (Blog, Podcasts), sinon null.
  categories: CategorySection | null
  // Son niveau d'accès : le sien, celui de sa méthode, ou aucun (un modèle de bloc).
  access: "own" | "method" | null
  // Une adresse dans l'app (une page).
  address: boolean
  // « Mes blocs » et « Enregistrer comme modèle » : pas dans un modèle de bloc (la base refuse
  // un bloc partagé dans un modèle), ni dans une méthode (pas de blocs).
  savedBlocks: boolean
  // Nombre maximal de blocs au premier niveau : un bloc partagé n'en a qu'un ([D11]).
  rootLimit: number | undefined
}

/**
 * Les sortes dont l'éditeur a un panneau de présentation (l'image de présentation, à droite) :
 * celles qui ont une image sans avoir encore l'éditeur du Fil, où elle se règle dans la colonne de
 * droite.
 */
export type PresentationKind = "method" | "chapter" | "lesson"

/** Les sortes qui ont déjà l'éditeur du Fil (layout « feed ») : leurs mots dans la colonne de droite. */
export type FeedKind = "article" | "episode"

/** Vrai pour une sorte qui a l'éditeur du Fil. */
export function isFeedKind(kind: ContentKind): kind is FeedKind {
  return contentProfile(kind).layout === "feed"
}

/** Le profil d'une sorte de contenu ; templateSort : la sorte d'un modèle de bloc. */
export function contentProfile(
  kind: ContentKind,
  templateSort: TemplateSort | null = null
): ContentProfile {
  const base = {
    layout: "classic",
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
      return { ...base, layout: "feed", cover: "required", categories: "blog" }
    case "episode":
      return {
        ...base,
        layout: "feed",
        cover: "required",
        audio: true,
        categories: "podcasts",
      }
    case "page":
      return { ...base, address: true }
    case "method":
      return {
        ...base,
        layout: "method",
        cover: "required",
        savedBlocks: false,
      }
    case "chapter":
    case "lesson":
      return {
        ...base,
        publication: "method",
        cover: "optional",
        access: "method",
      }
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

/** Vrai pour une sorte dont l'éditeur a un panneau de présentation (PresentationKind). */
export function hasPresentation(kind: ContentKind): kind is PresentationKind {
  const profile = contentProfile(kind)
  return profile.cover !== null && profile.layout !== "feed"
}
