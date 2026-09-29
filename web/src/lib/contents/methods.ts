// Appels propres aux méthodes (étape 7, partie 7b) : l'arbre des chapitres et des leçons,
// publish_preview, outline_reorder, les cases « Montrer dans l'app » et « Leçon gratuite » cochées
// depuis le plan, la méthode d'un chapitre ou d'une leçon, et le nombre d'éléments de chaque
// méthode. Contrat : docs/ARCHITECTURE-CONTENUS.md, « Étape 7, partie 7b ».

import {
  ContentError,
  getContent,
  lockRelease,
  lockStatus,
  lockTake,
  saveDraft,
  toContentError,
} from "@/lib/contents/api"
import type {
  MethodTree,
  OutlineChapter,
  OutlineElement,
  PreviewChange,
  PreviewRow,
} from "@/lib/contents/outline"
import { toOutlinePayload } from "@/lib/contents/outline"
import type { Json } from "@/lib/database.types"
import { isLockAlive } from "@/lib/editor/edit-lock"
import { displayName, type PersonName } from "@/lib/people"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

// Sous « contents » : ce qui relit tous les contenus relit aussi les méthodes.
export const methodKeys = {
  all: ["contents", "methods"] as const,
  allTrees: ["contents", "methods", "tree"] as const,
  tree: (methodId: string) =>
    ["contents", "methods", "tree", methodId] as const,
  allPreviews: ["contents", "methods", "preview"] as const,
  preview: (methodId: string) =>
    ["contents", "methods", "preview", methodId] as const,
  context: (elementId: string) =>
    ["contents", "methods", "context", elementId] as const,
  counts: ["contents", "methods", "counts"] as const,
}

const ELEMENT_COLUMNS =
  "id, kind, title, parent_id, position, in_app, is_free, draft_saved_at, saved_by:profiles!contents_draft_saved_by_fkey(full_name, email), edit_locks(holder_id, heartbeat_at, holder:profiles(full_name, email)), versions!versions_content_id_fkey(count)"

type ElementRow = {
  id: string
  kind: string
  title: string | null
  parent_id: string | null
  position: number | null
  in_app: boolean
  is_free: boolean
  draft_saved_at: string
  saved_by: unknown
  edit_locks: unknown
  versions: unknown
}

function toElement(row: ElementRow, now: number): OutlineElement {
  const lock = row.edit_locks as {
    holder_id: string | null
    heartbeat_at: string
    holder: PersonName | null
  } | null
  const active = lock?.holder_id != null && isLockAlive(lock.heartbeat_at, now)
  const versions = row.versions as { count: number }[] | null
  return {
    id: row.id,
    kind: row.kind === "chapter" ? "chapter" : "lesson",
    title: row.title ?? "",
    inApp: row.in_app,
    isFree: row.is_free,
    draftSavedAt: row.draft_saved_at,
    savedByName: displayName(row.saved_by as PersonName | null),
    editingId: active ? lock.holder_id : null,
    editingName: active
      ? (displayName(lock.holder) ?? texts.editor.lock.someone)
      : null,
    published: (versions?.[0]?.count ?? 0) > 0,
  }
}

/** Les chapitres d'une méthode (hors corbeille), dans l'ordre, chacun avec ses leçons. */
export async function getMethodTree(methodId: string): Promise<MethodTree> {
  const chapters = await supabase
    .from("contents")
    .select(ELEMENT_COLUMNS)
    .eq("parent_id", methodId)
    .eq("kind", "chapter")
    .is("deleted_at", null)
    .order("position")
    .order("id")
  if (chapters.error) throw toContentError(chapters.error, chapters.status)
  const now = Date.now()
  const tree: OutlineChapter[] = (chapters.data as ElementRow[]).map((row) => ({
    ...toElement(row, now),
    kind: "chapter",
    lessons: [],
  }))
  if (tree.length === 0) return tree
  const lessons = await supabase
    .from("contents")
    .select(ELEMENT_COLUMNS)
    .in(
      "parent_id",
      tree.map((chapter) => chapter.id)
    )
    .eq("kind", "lesson")
    .is("deleted_at", null)
    .order("position")
    .order("id")
  if (lessons.error) throw toContentError(lessons.error, lessons.status)
  const byChapter = new Map(tree.map((chapter) => [chapter.id, chapter]))
  for (const row of lessons.data as ElementRow[]) {
    byChapter.get(row.parent_id ?? "")?.lessons.push(toElement(row, now))
  }
  return tree
}

const previewChanges = new Set<string>([
  "new",
  "modified",
  "reordered",
  "removed",
])

/**
 * Ce qui changera dans l'app si l'on publie la méthode maintenant (rien n'est écrit). Aucune
 * ligne : rien à publier. Un POST (supabase.rpc) : la fonction prend des verrous de lecture.
 */
export async function getMethodPreview(
  methodId: string
): Promise<PreviewRow[]> {
  const { data, error, status } = await supabase.rpc("publish_preview", {
    content_id: methodId,
  })
  if (error) throw toContentError(error, status)
  return (data ?? []).flatMap((row): PreviewRow[] =>
    previewChanges.has(row.change) &&
    (row.kind === "method" || row.kind === "chapter" || row.kind === "lesson")
      ? [
          {
            elementId: row.element_id,
            kind: row.kind,
            title: row.title ?? "",
            chapterId: row.chapter_id ?? null,
            chapterTitle: row.chapter_title ?? null,
            change: row.change as PreviewChange,
            problem: row.problem ?? null,
            problemDetail: row.problem_detail ?? null,
            savedAt: row.draft_saved_at ?? null,
            savedByName: row.draft_saved_by_name ?? null,
          },
        ]
      : []
  )
}

/**
 * Range les chapitres et les leçons (il faut tenir le verrou de la méthode depuis cette
 * ouverture de l'éditeur). Rien ne change dans l'app avant la publication.
 */
export async function reorderOutline(
  methodId: string,
  tree: MethodTree,
  session: string
): Promise<void> {
  const { error, status } = await supabase.rpc("outline_reorder", {
    method_id: methodId,
    outline: toOutlinePayload(tree) as unknown as Json,
    editor_session: session,
  })
  if (error) throw toContentError(error, status)
}

/** Les cases d'un chapitre ou d'une leçon, cochées depuis le plan de la méthode. */
export type ElementFlags = { in_app?: boolean; is_free?: boolean }

/**
 * Coche ou décoche « Montrer dans l'app » ou « Leçon gratuite » depuis le plan : ce sont des
 * réglages de l'élément, enregistrés par save_draft sous SON verrou. Le verrou est pris le temps
 * de l'enregistrement, puis rendu. Refusé (verrou_tenu, avec le nom) si quelqu'un l'écrit en ce
 * moment, y compris soi-même dans un autre onglet : on ne lui retire pas la main en silence.
 */
export async function setElementFlags(
  elementId: string,
  flags: ElementFlags,
  myId: string
): Promise<void> {
  const session = crypto.randomUUID()
  const state = await lockStatus(elementId, session)
  if (state.is_active && state.holder_id !== null) {
    const self = state.holder_id === myId
    const name = self
      ? texts.methods.outline.yourselfElsewhere
      : (state.holder_name ?? texts.editor.lock.someone)
    throw new ContentError("verrou_tenu", {
      hint: name,
      detail: self
        ? texts.methods.outline.heldSelf
        : texts.methods.outline.heldBy(name),
    })
  }
  const taken = await lockTake(elementId, false, session)
  if (!taken.mine) {
    const name = taken.holder_name ?? texts.editor.lock.someone
    throw new ContentError("verrou_tenu", {
      hint: name,
      detail: texts.methods.outline.heldBy(name),
    })
  }
  try {
    const content = await getContent(elementId)
    if (!content || content.deleted_at) {
      throw new ContentError("contenu_introuvable")
    }
    await saveDraft(elementId, content.draft_rev, content.draft, session, flags)
  } finally {
    await lockRelease(elementId, session).catch(() => false)
  }
}

/** La méthode (et le chapitre) d'un chapitre ou d'une leçon. */
export type ElementContext = {
  method: { id: string; title: string; deleted: boolean }
  chapter: { id: string; title: string } | null
}

type ParentRow = {
  id: string
  kind: string
  title: string | null
  deleted_at: string | null
  parent_id: string | null
}

async function getParent(id: string): Promise<ParentRow | null> {
  const { data, error, status } = await supabase
    .from("contents")
    .select("id, kind, title, deleted_at, parent_id")
    .eq("id", id)
    .maybeSingle()
  if (error) throw toContentError(error, status)
  return data
}

/**
 * Remonte d'un chapitre à sa méthode, d'une leçon à son chapitre puis à sa méthode (relu à
 * chaque fois : une leçon peut changer de chapitre pendant qu'on l'écrit).
 */
export async function getElementContext(
  elementId: string
): Promise<ElementContext | null> {
  const element = await getParent(elementId)
  if (!element?.parent_id) return null
  const parent = await getParent(element.parent_id)
  if (!parent) return null
  if (parent.kind === "method") {
    return {
      method: {
        id: parent.id,
        title: parent.title ?? "",
        deleted: parent.deleted_at !== null,
      },
      chapter: null,
    }
  }
  const method = parent.parent_id ? await getParent(parent.parent_id) : null
  if (!method) return null
  return {
    method: {
      id: method.id,
      title: method.title ?? "",
      deleted: method.deleted_at !== null,
    },
    chapter: { id: parent.id, title: parent.title ?? "" },
  }
}

/** Le nombre de chapitres et de leçons (hors corbeille) de chaque méthode. */
export type MethodCounts = Map<string, { chapters: number; lessons: number }>

export async function listMethodCounts(): Promise<MethodCounts> {
  const { data, error, status } = await supabase
    .from("contents")
    .select("id, kind, parent_id")
    .in("kind", ["chapter", "lesson"])
    .is("deleted_at", null)
    .limit(10_000)
  if (error) throw toContentError(error, status)
  const methodOf = new Map<string, string>()
  const counts: MethodCounts = new Map()
  for (const row of data) {
    if (row.kind !== "chapter" || !row.parent_id) continue
    methodOf.set(row.id, row.parent_id)
    const entry = counts.get(row.parent_id) ?? { chapters: 0, lessons: 0 }
    entry.chapters += 1
    counts.set(row.parent_id, entry)
  }
  for (const row of data) {
    if (row.kind !== "lesson" || !row.parent_id) continue
    const methodId = methodOf.get(row.parent_id)
    const entry = methodId ? counts.get(methodId) : undefined
    if (entry) entry.lessons += 1
  }
  return counts
}
