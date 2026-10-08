// Réglages d'un contenu enregistrés hors de l'éditeur : à la création (fenêtre « Nouvel
// article »…) ou depuis la liste (« Réglages »). Tout passe par save_draft, sous le verrou du
// contenu, pris le temps de l'enregistrement puis rendu.

import {
  ContentError,
  createContent,
  getContent,
  lockRelease,
  lockStatus,
  lockTake,
  saveDraft,
  settingsDiff,
  settingsOf,
  type Content,
  type ContentKind,
  type ContentSettings,
} from "@/lib/contents/api"
import {
  getPublication,
  publicationStatus,
  publishContent,
} from "@/lib/contents/publication"
import { errorMessage } from "@/lib/errors"
import { kickFiles } from "@/lib/media/api"
import { texts } from "@/texts"

/** Ce que dit un refus quand quelqu'un écrit déjà le contenu (soi-même dans un autre onglet compris). */
export type HeldWords = {
  heldBy: (name: string) => string
  heldSelf: string
  yourselfElsewhere: string
}

/**
 * Prend le verrou d'un contenu le temps de run, puis le rend. Refusé (verrou_tenu, avec le nom)
 * si quelqu'un l'écrit en ce moment, y compris soi-même dans un autre onglet : on ne lui retire
 * pas la main en silence. run reçoit le contenu relu sous le verrou.
 */
async function withBorrowedLock<T>(
  contentId: string,
  myId: string,
  words: HeldWords,
  run: (content: Content, session: string) => Promise<T>
): Promise<T> {
  const session = crypto.randomUUID()
  const state = await lockStatus(contentId, session)
  if (state.is_active && state.holder_id !== null) {
    const self = state.holder_id === myId
    const name = self
      ? words.yourselfElsewhere
      : (state.holder_name ?? texts.editor.lock.someone)
    throw new ContentError("verrou_tenu", {
      hint: name,
      detail: self ? words.heldSelf : words.heldBy(name),
    })
  }
  const taken = await lockTake(contentId, false, session)
  if (!taken.mine) {
    const name = taken.holder_name ?? texts.editor.lock.someone
    throw new ContentError("verrou_tenu", {
      hint: name,
      detail: words.heldBy(name),
    })
  }
  try {
    const content = await getContent(contentId)
    if (!content || content.deleted_at) {
      throw new ContentError("contenu_introuvable")
    }
    return await run(content, session)
  } finally {
    await lockRelease(contentId, session).catch(() => false)
  }
}

/**
 * Ce qu'on choisit à la création ou dans les réglages d'une liste : le niveau d'accès, les
 * catégories et l'adresse. Le reste (cases d'un chapitre ou d'une leçon) garde sa valeur.
 */
export type SettingsChoices = Pick<
  ContentSettings,
  "accessChosen" | "accessLevelId" | "slug" | "categoryIds"
>

/** Les choix, par-dessus les réglages actuels du contenu. */
function withChoices(
  content: Content,
  choices: SettingsChoices
): ContentSettings {
  return { ...settingsOf(content), ...choices }
}

/**
 * « Réglages » depuis une liste : le titre et les réglages voulus, comparés au contenu relu sous
 * le verrou (seul ce qui change part). Renvoie faux s'il n'y avait rien à enregistrer.
 */
export function saveFromList(
  contentId: string,
  myId: string,
  words: HeldWords,
  title: string,
  choices: SettingsChoices
): Promise<boolean> {
  return withBorrowedLock(contentId, myId, words, async (content, session) => {
    const payload = settingsDiff(
      settingsOf(content),
      withChoices(content, choices)
    )
    const titleChanged = content.draft.title !== title
    if (!payload && !titleChanged) return false
    await saveDraft(
      contentId,
      content.draft_rev,
      titleChanged ? { ...content.draft, title } : content.draft,
      session,
      payload
    )
    return true
  })
}

/** Ce qu'a fait « Retirer » : republié, retirée du brouillon seulement, ou rien (déjà fait). */
export type CategoryRemoved =
  | { result: "draft" | "republished" | "unchanged" }
  // Retirée du brouillon, sans republier : des modifications attendaient, ou la publication a
  // été refusée (publishError, la raison).
  | { result: "draftOnly"; publishError: string | null }

/**
 * Retire une catégorie du brouillon d'un contenu, sous son verrou, puis republie s'il était en
 * ligne sans autre modification (rien d'autre ne part). L'état est relu sous le verrou : un
 * contenu programmé entre-temps est refusé (scheduledError), une modification arrivée
 * entre-temps empêche de republier.
 */
export function removeCategory(
  contentId: string,
  categoryId: string,
  myId: string,
  words: HeldWords & { scheduled: string }
): Promise<CategoryRemoved> {
  return withBorrowedLock(contentId, myId, words, async (content, session) => {
    if (!content.category_ids.includes(categoryId))
      return { result: "unchanged" }
    const publication = await getPublication(contentId)
    if (publication?.scheduled_at) throw new Error(words.scheduled)
    const live = publication
      ? publicationStatus(publication, content.draft_rev, Date.now()).live
      : "draft"
    const settings = settingsOf(content)
    const saved = await saveDraft(
      contentId,
      content.draft_rev,
      content.draft,
      session,
      settingsDiff(settings, {
        ...settings,
        categoryIds: settings.categoryIds.filter((id) => id !== categoryId),
      })
    )
    if (live === "modified") return { result: "draftOnly", publishError: null }
    if (live !== "live") return { result: "draft" }
    try {
      const published = await publishContent(contentId, saved.rev)
      if (published.needsFileSync) void kickFiles()
      return { result: "republished" }
    } catch (error) {
      return { result: "draftOnly", publishError: errorMessage(error) }
    }
  })
}

/**
 * Crée un contenu (vide ou depuis un point de départ, [D42]) avec ses réglages choisis dans la
 * fenêtre de création. content_create donne le verrou à son auteur : les réglages partent aussitôt
 * par save_draft, puis le verrou est rendu (l'éditeur le reprend en s'ouvrant). Le contenu existe
 * même si les réglages sont refusés (adresse prise…) : settingsError le dit, et ils se
 * corrigent dans les réglages de l'éditeur.
 */
export async function createWithSettings(
  kind: ContentKind,
  title: string,
  fromTemplateId: string | null,
  choices: SettingsChoices
): Promise<{ content: Content; settingsError: unknown }> {
  const created = await createContent(kind, title, fromTemplateId)
  const payload = settingsDiff(
    settingsOf(created),
    withChoices(created, choices)
  )
  if (!payload) return { content: created, settingsError: null }
  const session = crypto.randomUUID()
  try {
    await lockTake(created.id, false, session)
    await saveDraft(
      created.id,
      created.draft_rev,
      created.draft,
      session,
      payload
    )
    const content = (await getContent(created.id)) ?? created
    return { content, settingsError: null }
  } catch (error) {
    return { content: created, settingsError: error }
  } finally {
    await lockRelease(created.id, session).catch(() => false)
  }
}
