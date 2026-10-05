import { queryOptions } from "@tanstack/react-query"

import { accessLevelsKey, listAccessLevels } from "@/lib/access-levels"
import {
  categoryKeys,
  listCategories,
  type CategorySection,
} from "@/lib/categories"
import {
  contentKeys,
  getContent,
  getMediaByIds,
  listContents,
  type ContentKind,
} from "@/lib/contents/api"
import {
  homeKeys,
  listFailedSchedules,
  listMyRecentDrafts,
  listScheduled,
} from "@/lib/contents/home"
import {
  getElementContext,
  getMethodPreview,
  getMethodTree,
  methodKeys,
} from "@/lib/contents/methods"
import { getPublication } from "@/lib/contents/publication"
import {
  getTemplateOutdated,
  getTemplatesByIds,
  listStarters,
  listTemplates,
  listTemplateUses,
  templateKeys,
} from "@/lib/contents/templates"
import {
  getLatestAudit,
  getMedia,
  getPreviewUrls,
  getStorageUsed,
  listMedia,
  listTrash,
  mediaKeys,
  PREVIEW_REFRESH_MS,
  previewKey,
  trashKey,
  type MediaFilters,
} from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { listMembers, teamQueryKey } from "@/lib/team"

/*
 * Les lectures (TanStack Query) qu'une page fait en arrivant. La page et sa préparation
 * (lib/page-preparations.ts) partagent la même clé et la même fonction : ce qui est préparé est
 * exactement ce que la page lit. Les réglages propres à un écran (relecture régulière, données
 * gardées pendant une nouvelle lecture) restent là où la lecture est faite.
 */

/**
 * Une lecture relue à chaque ouverture d'une page : la préparation vient de la faire, la page ne
 * la refait pas aussitôt.
 */
export const REREAD_MS = 3_000

export const contentListRead = (kind: ContentKind) =>
  queryOptions({
    queryKey: contentKeys.list(kind),
    queryFn: () => listContents(kind),
  })

/** Un contenu ouvert dans l'éditeur, qui relit ensuite son brouillon lui-même. */
export const contentRead = (id: string) =>
  queryOptions({
    queryKey: contentKeys.detail(id),
    queryFn: () => getContent(id),
    // L'éditeur relit le brouillon lui-même quand il change (verrou et Realtime).
    staleTime: Infinity,
  })

/** Des fichiers lus par leurs id (images d'une liste, fichiers d'un brouillon). */
export const mediaByIdsRead = (ids: string[]) =>
  queryOptions({
    queryKey: contentKeys.media(ids),
    queryFn: () => getMediaByIds(ids),
  })

export const publicationRead = (id: string) =>
  queryOptions({
    queryKey: contentKeys.publication(id),
    queryFn: () => getPublication(id),
  })

export const accessLevelsRead = () =>
  queryOptions({ queryKey: accessLevelsKey, queryFn: listAccessLevels })

export const categoriesRead = (section: CategorySection) =>
  queryOptions({
    queryKey: categoryKeys.list(section),
    queryFn: () => listCategories(section),
  })

export const homeDraftsRead = (userId: string) =>
  queryOptions({
    queryKey: homeKeys.drafts(userId),
    queryFn: () => listMyRecentDrafts(userId),
  })

export const homeScheduledRead = () =>
  queryOptions({ queryKey: homeKeys.scheduled, queryFn: listScheduled })

export const homeFailedRead = () =>
  queryOptions({ queryKey: homeKeys.failed, queryFn: listFailedSchedules })

export const methodTreeRead = (methodId: string) =>
  queryOptions({
    queryKey: methodKeys.tree(methodId),
    queryFn: () => getMethodTree(methodId),
  })

export const methodPreviewRead = (methodId: string) =>
  queryOptions({
    queryKey: methodKeys.preview(methodId),
    queryFn: () => getMethodPreview(methodId),
  })

export const elementContextRead = (elementId: string) =>
  queryOptions({
    queryKey: methodKeys.context(elementId),
    queryFn: () => getElementContext(elementId),
  })

export const templateListRead = () =>
  queryOptions({ queryKey: templateKeys.list, queryFn: listTemplates })

/** Les points de départ d'une sorte de contenu ([D42]), proposés par « Nouvel article »… */
export const startersRead = (kind: ContentKind) =>
  queryOptions({
    queryKey: templateKeys.starters(kind),
    queryFn: () => listStarters(kind),
  })

export const linkedTemplatesRead = (ids: string[]) =>
  queryOptions({
    queryKey: templateKeys.byIds(ids),
    queryFn: () => getTemplatesByIds(ids),
  })

export const templateUsesRead = (templateId: string) =>
  queryOptions({
    queryKey: templateKeys.usesOf(templateId),
    queryFn: () => listTemplateUses([templateId]),
  })

export const templateOutdatedRead = (templateId: string) =>
  queryOptions({
    queryKey: templateKeys.outdated(templateId),
    queryFn: () => getTemplateOutdated(templateId),
  })

export const mediaListRead = (filters: MediaFilters) =>
  queryOptions({
    queryKey: mediaKeys.list(filters),
    queryFn: () => listMedia(filters),
  })

export const mediaRead = (id: string) =>
  queryOptions({ queryKey: mediaKeys.one(id), queryFn: () => getMedia(id) })

export const storageRead = () =>
  queryOptions({ queryKey: mediaKeys.storage, queryFn: getStorageUsed })

export const auditRead = () =>
  queryOptions({ queryKey: mediaKeys.audit, queryFn: getLatestAudit })

export const trashRead = () =>
  queryOptions({ queryKey: trashKey, queryFn: listTrash })

export const teamRead = () =>
  queryOptions({ queryKey: teamQueryKey, queryFn: listMembers })

/** Vrai si le fichier a un objet dans le stockage qu'on peut montrer. */
export function hasPreview(media: Media): boolean {
  return media.status === "ready" || media.status === "checking"
}

/** Les fichiers donnés qui ont un aperçu, en clés « <bucket>/<chemin> » rangées. */
export function previewKeys(items: readonly Media[] | undefined): string[] {
  return (items ?? []).filter(hasPreview).map(previewKey).sort()
}

/** Les adresses d'aperçu de ces clés, en une seule demande (voir getPreviewUrls). */
export const previewUrlsRead = (keys: string[]) =>
  queryOptions({
    queryKey: mediaKeys.urls(keys),
    queryFn: () => getPreviewUrls(keys),
    // Les liens valent une heure : relus toutes les 30 minutes (seuls ceux qui expirent avant
    // la relecture suivante sont redemandés, voir getPreviewUrls).
    staleTime: PREVIEW_REFRESH_MS,
  })

/** Les fichiers qu'une page montre : prêts et hors corbeille. */
export function shownFiles(items: readonly Media[]): Media[] {
  return items.filter((media) => media.status === "ready" && !media.deleted_at)
}

/** Les images de présentation d'une liste de contenus, sans doublon et triées. */
export function coverIds(
  items: readonly { cover_id: string | null }[]
): string[] {
  return [
    ...new Set(items.flatMap((item) => (item.cover_id ? [item.cover_id] : []))),
  ].sort()
}

/**
 * Les méthodes en ligne d'une liste, dont on lit s'il y a quelque chose à publier
 * (publish_preview, [D29]). allMethods : une liste d'une seule sorte, sans kind.
 */
export function liveMethodIds(
  items:
    | readonly { id: string; kind?: string; live_draft_rev: number | null }[]
    | undefined,
  allMethods = false
): string[] {
  return (items ?? []).flatMap((item) =>
    (allMethods || item.kind === "method") && item.live_draft_rev !== null
      ? [item.id]
      : []
  )
}
