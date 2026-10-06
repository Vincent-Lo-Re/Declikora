import type { QueryClient } from "@tanstack/react-query"

import type { Draft } from "@/blocks/types"
import { draftMediaIds } from "@/blocks/draft"
import { linkedTemplateBlocks, linkedTemplateIds } from "@/blocks/templates"
import { askedFileFromAddress, mediaFiltersFromAddress } from "@/lib/address"
import type { CategorySection } from "@/lib/categories"
import type { ContentKind } from "@/lib/contents/api"
import { isTemplateSort } from "@/lib/contents/templates"
import { contentProfile, type EditorKind } from "@/lib/editor/profile"
import { previewKey } from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { fresh, preloadImages, ready, type Prepare } from "@/lib/preparation"
import {
  accessLevelsRead,
  auditRead,
  categoriesRead,
  contentListRead,
  contentRead,
  coverIds,
  elementContextRead,
  homeDraftsRead,
  homeFailedRead,
  homeScheduledRead,
  linkedTemplatesRead,
  liveMethodIds,
  mediaByIdsRead,
  mediaListRead,
  mediaRead,
  methodPartsRead,
  methodPreviewRead,
  methodTreeRead,
  previewKeys,
  previewUrlsRead,
  publicationRead,
  shownFiles,
  startersRead,
  storageRead,
  teamRead,
  templateListRead,
  templateOutdatedRead,
  templateUsesRead,
  trashRead,
} from "@/lib/reads"

/*
 * Ce que chaque page lit en arrivant, préparé avant de la montrer (lib/preparation.ts). Une page
 * qui lit quelque chose de nouveau en arrivant l'ajoute ici ; le contrôle des lectures non
 * préparées le rappelle (docs/BONNES-PRATIQUES.md, § 2).
 */

// Les vignettes téléchargées d'avance dans une liste : celles du premier écran.
const LIST_IMAGES = 24
// Un brouillon lu il y a plus longtemps est relu avant d'ouvrir l'éditeur (un autre membre a pu
// l'écrire entre-temps).
const DRAFT_MAX_AGE_MS = 30_000

/** Les adresses d'aperçu des fichiers, puis les images elles-mêmes (les `limit` premières). */
async function prepareImages(
  queryClient: QueryClient,
  files: readonly Media[],
  limit = Infinity
) {
  const keys = previewKeys(files)
  if (keys.length === 0) return
  const urls = await ready(queryClient, previewUrlsRead(keys))
  if (!urls) return
  const images = files.filter(
    (media) => media.kind === "image" || media.kind === "svg"
  )
  await preloadImages(
    images.slice(0, limit).flatMap((media) => {
      const url = urls[previewKey(media)]
      return url ? [url] : []
    })
  )
}

/** Des fichiers lus par leurs id, avec leurs images (images d'une liste, fichiers d'un brouillon). */
async function prepareFiles(
  queryClient: QueryClient,
  ids: string[],
  limit = Infinity
) {
  if (ids.length === 0) return
  const media = await ready(queryClient, mediaByIdsRead(ids))
  await prepareImages(queryClient, shownFiles(media ?? []), limit)
}

/** Les méthodes en ligne d'une liste : y a-t-il quelque chose à publier ? */
function prepareMethodPending(
  queryClient: QueryClient,
  items: Parameters<typeof liveMethodIds>[0],
  allMethods = false
) {
  return Promise.all(
    liveMethodIds(items, allMethods).map((id) =>
      ready(queryClient, methodPreviewRead(id))
    )
  )
}

export const prepareHome: Prepare = async ({ queryClient, member }) => {
  const [drafts] = await Promise.all([
    ready(queryClient, homeDraftsRead(member.id)),
    ready(queryClient, homeScheduledRead()),
    ready(queryClient, homeFailedRead()),
  ])
  await prepareMethodPending(queryClient, drafts)
}

/** Le Fil, Radio Éclaircies, Méthodes, Pages. */
export function prepareContentList(kind: ContentKind): Prepare {
  const profile = contentProfile(kind)
  return async ({ queryClient }) => {
    const [items] = await Promise.all([
      ready(queryClient, contentListRead(kind)),
      profile.categories &&
        ready(queryClient, categoriesRead(profile.categories)),
      ready(queryClient, accessLevelsRead()),
      // « Nouvel article » : ses points de départ (pas pour une méthode, [D42]).
      kind !== "method" && ready(queryClient, startersRead(kind)),
    ])
    await Promise.all([
      kind === "method" && prepareMethodPending(queryClient, items, true),
      profile.cover === "required" &&
        prepareFiles(queryClient, coverIds(items ?? []), LIST_IMAGES),
    ])
  }
}

/** Les catégories d'une section : relues à chaque ouverture (leurs nombres de brouillons). */
export function prepareCategories(section: CategorySection): Prepare {
  return ({ queryClient }) => fresh(queryClient, categoriesRead(section))
}

export const prepareTemplates: Prepare = ({ queryClient }) =>
  ready(queryClient, templateListRead())

export const prepareMedia: Prepare = async ({ queryClient, search }) => {
  const askedId = askedFileFromAddress(search)
  const [list, asked] = await Promise.all([
    ready(queryClient, mediaListRead(mediaFiltersFromAddress(search))),
    askedId ? ready(queryClient, mediaRead(askedId)) : null,
    ready(queryClient, storageRead()),
    ready(queryClient, auditRead()),
  ])
  const files = list ?? []
  // La fiche demandée, si elle n'est pas dans la liste : la page lit son aperçu avec les autres.
  const all =
    asked && !files.some((media) => media.id === asked.id)
      ? [...files, asked]
      : files
  await prepareImages(queryClient, all, LIST_IMAGES)
}

export const prepareTrash: Prepare = ({ queryClient }) =>
  ready(queryClient, trashRead())

// Équipe et Paramètres : réservés aux admins (les autres voient « réservé aux admins »).
export const prepareTeam: Prepare = async ({ queryClient, member }) => {
  if (member.role === "admin") await ready(queryClient, teamRead())
}

export const prepareSettings: Prepare = async ({ queryClient, member }) => {
  if (member.role === "admin") await ready(queryClient, accessLevelsRead())
}

/** Les fichiers d'un brouillon : ceux des blocs partagés d'abord (leurs modèles), puis les siens. */
async function prepareDraftFiles(queryClient: QueryClient, draft: Draft) {
  const linkedIds = linkedTemplateIds(draft)
  const templates =
    linkedIds.length > 0
      ? await ready(queryClient, linkedTemplatesRead(linkedIds))
      : []
  const byId = new Map(
    (templates ?? []).map((template) => [template.id, template])
  )
  const linkedBlocks = linkedTemplateBlocks(
    linkedIds,
    (id) => byId.get(id)?.draft
  )
  await prepareFiles(queryClient, draftMediaIds(draft, linkedBlocks))
}

/** L'éditeur d'un contenu : son brouillon, ses cartes et ses images. */
export function prepareEditor(kind: EditorKind): Prepare {
  return async ({ queryClient, params }) => {
    const contentId = params.contentId ?? ""
    const content = await fresh(
      queryClient,
      contentRead(contentId),
      DRAFT_MAX_AGE_MS
    )
    // Introuvable, à la corbeille ou d'une autre sorte : l'éditeur le dira.
    if (!content || content.deleted_at || content.kind !== kind) return
    const templateSort =
      kind === "template" && isTemplateSort(content.template_sort)
        ? content.template_sort
        : null
    const profile = contentProfile(kind, templateSort)
    await Promise.all([
      ready(queryClient, accessLevelsRead()),
      profile.categories &&
        ready(queryClient, categoriesRead(profile.categories)),
      profile.publication === "own" &&
        fresh(queryClient, publicationRead(contentId)),
      templateSort === "shared" &&
        Promise.all([
          ready(queryClient, templateUsesRead(contentId)),
          ready(queryClient, templateOutdatedRead(contentId)),
        ]),
      prepareDraftFiles(queryClient, content.draft),
    ])
  }
}

/**
 * La page d'une méthode : sa fiche, son plan et les brouillons de toutes ses parties (relus s'ils
 * datent), ce qui changera dans l'app, sa publication, les points de départ de ses parties, et
 * les fichiers de chaque brouillon.
 */
export const prepareMethodPage: Prepare = async ({ queryClient, params }) => {
  const methodId = params.contentId ?? ""
  const content = await fresh(
    queryClient,
    contentRead(methodId),
    DRAFT_MAX_AGE_MS
  )
  // Introuvable, à la corbeille ou d'une autre sorte : la page le dira.
  if (!content || content.deleted_at || content.kind !== "method") return
  const [parts] = await Promise.all([
    fresh(queryClient, methodPartsRead(methodId), DRAFT_MAX_AGE_MS),
    fresh(queryClient, methodTreeRead(methodId), DRAFT_MAX_AGE_MS),
    fresh(queryClient, methodPreviewRead(methodId)),
    fresh(queryClient, publicationRead(methodId)),
    ready(queryClient, accessLevelsRead()),
    ...(["chapter", "lesson", "exercise"] as const).map((kind) =>
      ready(queryClient, startersRead(kind))
    ),
  ])
  await Promise.all(
    [content, ...(parts ?? [])].map((part) =>
      prepareDraftFiles(queryClient, part.draft)
    )
  )
}

/** Un chapitre, une leçon ou un exercice ouvert d'ailleurs : sa méthode, où il mène. */
export const prepareMethodElement: Prepare = async ({
  queryClient,
  params,
}) => {
  await ready(queryClient, elementContextRead(params.contentId ?? ""))
}
