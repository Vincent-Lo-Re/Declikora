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
  // Ce que montre son éditeur, dans la mise en page du Fil : des blocs, ou le plan d'une méthode
  // (ses chapitres et ses leçons, sans blocs, [D4]).
  layout: "feed" | "method"
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
 * Les sortes faites de blocs (layout « feed ») : le plan de leurs blocs à gauche, la barre de mise
 * en forme et les Blocs. Toutes, sauf la méthode, dont l'écran a la même mise en page avec le plan
 * de ses chapitres et de ses leçons.
 */
export type FeedKind = Exclude<ContentKind, "method">

/** Vrai pour une sorte faite de blocs. */
export function isFeedKind(kind: ContentKind): kind is FeedKind {
  return contentProfile(kind).layout === "feed"
}

/**
 * Celles qui ont une carte dans une liste de l'app (le Fil, Radio Éclaircies, les Méthodes) : leur
 * image de présentation est exigée ([D45]), et la colonne de droite montre cette carte.
 */
export type ListedKind = Extract<ContentKind, "article" | "episode" | "method">

/**
 * Celles qui se publient elles-mêmes (ni un modèle de bloc, ni un élément d'une méthode) : la
 * colonne de droite montre « Prêt à publier ? » et leur publication.
 */
export type PublishedKind = Extract<
  ContentKind,
  "article" | "episode" | "page" | "method"
>

/** Un chapitre ou une leçon : publié avec sa méthode ([D29]), au niveau d'accès de la méthode. */
export type ElementKind = Extract<FeedKind, "chapter" | "lesson">

/**
 * Celles qui ont un niveau d'accès (le leur, ou celui de leur méthode) : la Lecture peut les
 * montrer à une personne sans la formule.
 */
export type LockableKind = Exclude<FeedKind, "template">

/** Vrai pour une sorte qui a une carte dans une liste de l'app. */
export function isListedKind(kind: ContentKind): kind is ListedKind {
  return contentProfile(kind).cover === "required"
}

/** Vrai pour un chapitre ou une leçon. */
export function isElementKind(kind: ContentKind): kind is ElementKind {
  return contentProfile(kind).publication === "method"
}

/** Le profil d'une sorte de contenu ; templateSort : la sorte d'un modèle de bloc. */
export function contentProfile(
  kind: ContentKind,
  templateSort: TemplateSort | null = null
): ContentProfile {
  const base = {
    layout: "feed",
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
