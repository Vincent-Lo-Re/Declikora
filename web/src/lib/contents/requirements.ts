// Ce qu'il faut pour publier un contenu, vu de l'admin (sans React) : [D45] (image de
// présentation d'un article, d'un épisode et, plus tard, d'une méthode), l'audio d'un épisode,
// et le conseil [D46] (transcription). La base vérifie les mêmes règles (publish, schedule) :
// l'admin ne fait qu'expliquer avant d'envoyer.

import type { BlockMedia } from "@/blocks/components/context"
import type { Draft } from "@/blocks/types"

/** Sortes dont l'image de présentation est obligatoire pour publier ([D45]). */
export function coverRequired(kind: string): boolean {
  return kind === "article" || kind === "episode" || kind === "method"
}

/** Sortes qui ont un audio (obligatoire pour publier). */
export function hasAudio(kind: string): boolean {
  return kind === "episode"
}

/** Sortes qui montrent une présentation (image, résumé) en tête de l'éditeur. */
export type PresentationKind =
  "article" | "episode" | "method" | "chapter" | "lesson"

/**
 * Sortes qui montrent une présentation (image, résumé) en tête de l'éditeur : l'image n'est
 * exigée que pour un article, un épisode ou une méthode ([D45]) ; un chapitre et une leçon
 * peuvent en avoir une (app_method la donne), sans obligation.
 */
export function hasPresentation(kind: string): kind is PresentationKind {
  return (
    kind === "article" ||
    kind === "episode" ||
    kind === "method" ||
    kind === "chapter" ||
    kind === "lesson"
  )
}

/** Sortes qui ont des catégories (Blog, Podcasts). */
export function hasCategories(kind: string): boolean {
  return kind === "article" || kind === "episode"
}

/**
 * Ce qui manque : l'image de présentation ou l'audio, absent (missing) ou plus disponible
 * (unavailable : supprimé, pas prêt, ou d'un autre type).
 */
export type Requirement = {
  key: "cover" | "audio"
  state: "missing" | "unavailable"
}

/** Un conseil, qui n'empêche pas de publier : l'audio n'a pas de transcription ([D46]). */
export type Advice = { key: "transcript"; mediaId: string }

export type PublishChecks = { missing: Requirement[]; advice: Advice[] }

/** L'état d'un fichier choisi (image de présentation ou audio), s'il bloque la publication. */
function fileState(
  media: BlockMedia,
  kind: "image" | "audio"
): Requirement["state"] | null {
  switch (media.state) {
    case "none":
      return "missing"
    case "missing":
    case "not_ready":
      return "unavailable"
    case "ready":
      return media.media.kind === kind ? null : "unavailable"
    // En cours de lecture, ou lecture ratée : la base tranchera.
    case "loading":
    case "error":
      return null
  }
}

/**
 * Ce qui manque pour publier (ou programmer) ce brouillon, et les conseils. mediaFor : ce que
 * l'éditeur sait des fichiers cités (le même que pour les blocs Image).
 */
export function publishChecks(
  kind: string,
  draft: Pick<Draft, "cover" | "audio">,
  mediaFor: (mediaId: string | null) => BlockMedia
): PublishChecks {
  const missing: Requirement[] = []
  const advice: Advice[] = []
  if (coverRequired(kind)) {
    const state = fileState(mediaFor(draft.cover?.mediaId ?? null), "image")
    if (state) missing.push({ key: "cover", state })
  }
  if (hasAudio(kind)) {
    const audio = mediaFor(draft.audio?.mediaId ?? null)
    const state = fileState(audio, "audio")
    if (state) missing.push({ key: "audio", state })
    if (
      audio.state === "ready" &&
      audio.media.kind === "audio" &&
      !audio.media.transcript?.trim()
    ) {
      advice.push({ key: "transcript", mediaId: audio.media.id })
    }
  }
  return { missing, advice }
}
