// Appels propres aux méthodes (étape 7, partie 7b, puis les exercices) : l'arbre des chapitres,
// des leçons et de leurs exercices, publish_preview, outline_reorder, les cases « Montrer dans
// l'app » et « Leçon gratuite » cochées depuis le plan, la méthode d'un élément, et le nombre
// d'éléments de chaque méthode. Contrat : docs/ARCHITECTURE-CONTENUS.md, « Étape 7, partie 7b »
// et « Exercices ».

import { toContentError } from "@/lib/contents/api"
import type {
  MethodTree,
  OutlineChapter,
  OutlineElement,
  OutlineLesson,
  PreviewChange,
  PreviewRow,
} from "@/lib/contents/outline"
import { toOutlinePayload } from "@/lib/contents/outline"
import { saveSettingsPayload } from "@/lib/contents/settings"
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
    kind:
      row.kind === "chapter" || row.kind === "exercise" ? row.kind : "lesson",
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

/** Les éléments (hors corbeille) d'une sorte, enfants de ces parents, dans l'ordre. */
async function childrenOf(
  parentIds: string[],
  kind: "lesson" | "exercise"
): Promise<ElementRow[]> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(ELEMENT_COLUMNS)
    .in("parent_id", parentIds)
    .eq("kind", kind)
    .is("deleted_at", null)
    .order("position")
    .order("id")
  if (error) throw toContentError(error, status)
  return data as ElementRow[]
}

/**
 * Les chapitres d'une méthode (hors corbeille), dans l'ordre, chacun avec ses leçons et leurs
 * exercices.
 */
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
  const byChapter = new Map(tree.map((chapter) => [chapter.id, chapter]))
  const lessons: OutlineLesson[] = []
  for (const row of await childrenOf([...byChapter.keys()], "lesson")) {
    const lesson: OutlineLesson = {
      ...toElement(row, now),
      kind: "lesson",
      exercises: [],
    }
    byChapter.get(row.parent_id ?? "")?.lessons.push(lesson)
    lessons.push(lesson)
  }
  if (lessons.length === 0) return tree
  const byLesson = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  for (const row of await childrenOf([...byLesson.keys()], "exercise")) {
    byLesson.get(row.parent_id ?? "")?.exercises.push(toElement(row, now))
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
    (row.kind === "method" ||
      row.kind === "chapter" ||
      row.kind === "lesson" ||
      row.kind === "exercise")
      ? [
          {
            elementId: row.element_id,
            kind: row.kind,
            title: row.title ?? "",
            chapterId: row.chapter_id ?? null,
            chapterTitle: row.chapter_title ?? null,
            lessonId: row.lesson_id ?? null,
            lessonTitle: row.lesson_title ?? null,
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
 * Range les chapitres, les leçons et les exercices (il faut tenir le verrou de la méthode depuis
 * cette ouverture de l'éditeur). Rien ne change dans l'app avant la publication.
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

/** Les cases d'un élément, cochées depuis le plan de la méthode. */
export type ElementFlags = { in_app?: boolean; is_free?: boolean }

/**
 * Coche ou décoche « Montrer dans l'app » ou « Leçon gratuite » depuis le plan : ce sont des
 * réglages de l'élément, enregistrés par save_draft sous SON verrou. Le verrou est pris le temps
 * de l'enregistrement, puis rendu. Refusé (verrou_tenu, avec le nom) si quelqu'un l'écrit en ce
 * moment, y compris soi-même dans un autre onglet : on ne lui retire pas la main en silence.
 */
export function setElementFlags(
  elementId: string,
  flags: ElementFlags,
  myId: string
): Promise<void> {
  return saveSettingsPayload(elementId, myId, texts.methods.outline, flags)
}

/**
 * La méthode (et le chapitre, et la leçon) d'un chapitre, d'une leçon ou d'un exercice. access :
 * le niveau d'accès du brouillon de la méthode, celui de l'élément à sa prochaine publication
 * (sauf leçon gratuite : lesson.isFree, pour un exercice).
 */
export type ElementContext = {
  method: {
    id: string
    title: string
    deleted: boolean
    access: { accessChosen: boolean; accessLevelId: string | null }
  }
  chapter: { id: string; title: string } | null
  lesson: { id: string; title: string; isFree: boolean } | null
}

/**
 * En Lecture, l'écran du dessus, comme la flèche de retour de l'app (QCM du 04/10/2026) : la
 * leçon d'un exercice, la méthode d'un chapitre ou d'une leçon.
 */
export function screenAbove(
  kind: "chapter" | "lesson" | "exercise",
  context: ElementContext
): { kind: "method" | "lesson"; id: string; title: string } {
  if (kind === "exercise" && context.lesson) {
    return {
      kind: "lesson",
      id: context.lesson.id,
      title: context.lesson.title,
    }
  }
  return { kind: "method", id: context.method.id, title: context.method.title }
}

type ParentRow = {
  id: string
  kind: string
  title: string | null
  deleted_at: string | null
  parent_id: string | null
  is_free: boolean
  access_chosen: boolean
  access_level_id: string | null
}

async function getParent(id: string): Promise<ParentRow | null> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(
      "id, kind, title, deleted_at, parent_id, is_free, access_chosen, access_level_id"
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw toContentError(error, status)
  return data
}

/**
 * Remonte d'un élément à sa méthode, parent après parent (relu à chaque fois : une leçon peut
 * changer de chapitre, un exercice de leçon, pendant qu'on l'écrit).
 */
export async function getElementContext(
  elementId: string
): Promise<ElementContext | null> {
  const element = await getParent(elementId)
  if (!element?.parent_id) return null
  let parent = await getParent(element.parent_id)
  let lesson: ElementContext["lesson"] = null
  if (parent?.kind === "lesson") {
    lesson = {
      id: parent.id,
      title: parent.title ?? "",
      isFree: parent.is_free,
    }
    parent = parent.parent_id ? await getParent(parent.parent_id) : null
  }
  if (!parent) return null
  if (parent.kind === "method") {
    return { method: methodOf(parent), chapter: null, lesson }
  }
  const method = parent.parent_id ? await getParent(parent.parent_id) : null
  if (!method) return null
  return {
    method: methodOf(method),
    chapter: { id: parent.id, title: parent.title ?? "" },
    lesson,
  }
}

function methodOf(row: ParentRow): ElementContext["method"] {
  return {
    id: row.id,
    title: row.title ?? "",
    deleted: row.deleted_at !== null,
    access: {
      accessChosen: row.access_chosen,
      accessLevelId: row.access_level_id,
    },
  }
}
