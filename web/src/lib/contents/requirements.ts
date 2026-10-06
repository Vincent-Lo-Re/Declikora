// Ce qu'il faut pour publier un contenu, vu de l'admin (sans React) : le titre ([D49], tout ce
// qui se publie), [D45] (image de présentation d'un article et d'un épisode),
// l'audio d'un épisode, et le conseil [D46] (transcription). La base vérifie les mêmes règles
// (publish, schedule) : l'admin ne fait qu'expliquer avant d'envoyer.

import type { BlockMedia } from "@/blocks/components/context"
import type { Draft } from "@/blocks/types"
import type { ContentKind, ContentSettings } from "@/lib/contents/api"
import { contentProfile } from "@/lib/editor/profile"

/**
 * Ce qui manque : le titre, l'image de présentation ou l'audio, absent (missing) ou plus
 * disponible (unavailable : supprimé, pas prêt, ou d'un autre type).
 */
export type Requirement = {
  key: "title" | "cover" | "audio"
  state: "missing" | "unavailable"
}

/** Un conseil, qui n'empêche pas de publier : l'audio n'a pas de transcription ([D46]). */
type Advice = { key: "transcript"; mediaId: string }

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
  kind: ContentKind,
  draft: Pick<Draft, "title" | "cover" | "audio">,
  mediaFor: (mediaId: string | null) => BlockMedia
): PublishChecks {
  const profile = contentProfile(kind)
  const missing: Requirement[] = []
  const advice: Advice[] = []
  // Comme la base : des espaces ne font pas un titre, et il est demandé en premier.
  if (profile.titleRequired && draft.title.trim() === "") {
    missing.push({ key: "title", state: "missing" })
  }
  if (profile.cover === "required") {
    const state = fileState(mediaFor(draft.cover?.mediaId ?? null), "image")
    if (state) missing.push({ key: "cover", state })
  }
  if (profile.audio) {
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

/**
 * Une ligne de « Prêt à publier ? » (éditeur du Fil) : le titre, l'image de présentation, l'audio,
 * l'adresse d'une page, le niveau d'accès.
 */
export type ReadyItem = {
  key: "title" | "cover" | "audio" | "address" | "access"
  done: boolean
}

/**
 * « Prêt à publier ? », selon ce que la sorte demande : le titre ([D49]), l'image de présentation
 * ([D45]), l'audio d'un épisode, l'adresse d'une page, et le niveau d'accès, que « Publier »
 * demande tant qu'il n'est pas choisi ([D41]). Un fichier en cours de lecture compte comme fait
 * (la base tranchera), comme pour publishChecks.
 */
export function readyItems(
  kind: ContentKind,
  checks: PublishChecks,
  settings: Pick<ContentSettings, "accessChosen" | "slug">
): ReadyItem[] {
  const profile = contentProfile(kind)
  const done = (key: Requirement["key"]) =>
    !checks.missing.some((item) => item.key === key)
  const items: ReadyItem[] = []
  if (profile.titleRequired) items.push({ key: "title", done: done("title") })
  if (profile.cover === "required") {
    items.push({ key: "cover", done: done("cover") })
  }
  if (profile.audio) items.push({ key: "audio", done: done("audio") })
  if (profile.address) items.push({ key: "address", done: !!settings.slug })
  if (profile.access === "own") {
    items.push({ key: "access", done: settings.accessChosen })
  }
  return items
}
