// Méthodes (étape 7, partie 7b) : ce que voit l'app (app_method, comme un anonyme), une formule
// créée pour le test, ce que la base a rangé (outline_reorder) et les versions de la méthode.

import postgres from "postgres"

import { localSupabase } from "./local-supabase.ts"

function database() {
  return postgres(localSupabase().dbUrl, { max: 1, onnotice: () => {} })
}

/** Une leçon d'une méthode en ligne, telle que l'app la reçoit. */
type AppLesson = {
  id: string
  versionId: string
  title: string
  isFree: boolean
  level: { name: string } | null
  locked: boolean
  // Le nombre de ses exercices en ligne (le plan ne les liste pas).
  exerciseCount: number
}

/** Une méthode en ligne, telle que l'app la reçoit (null si elle ne l'est pas). */
type AppMethod = {
  id: string
  versionId: string
  title: string
  level: { name: string } | null
  locked: boolean
  chapters: {
    id: string
    versionId: string
    title: string
    level: { name: string } | null
    locked: boolean
    lessons: AppLesson[]
  }[]
}

/** Appelle app_method comme l'app, sans session (anon). */
export async function appMethod(methodId: string): Promise<AppMethod | null> {
  const { apiUrl, publishableKey } = localSupabase()
  const response = await fetch(`${apiUrl}/rest/v1/rpc/app_method`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ content_id: methodId }),
  })
  if (!response.ok) {
    throw new Error(`app_method : ${response.status} ${await response.text()}`)
  }
  return (await response.json()) as AppMethod | null
}

/** Le plan de l'app, lisible : « Respirer : Le souffle (gratuite), Expirer ». */
export function appOutline(method: AppMethod | null): string[] {
  return (method?.chapters ?? []).map(
    (chapter) =>
      `${chapter.title} : ${chapter.lessons
        .map((lesson) => `${lesson.title}${lesson.isFree ? " (gratuite)" : ""}`)
        .join(", ")}`
  )
}

/** Une formule d'abonnement pour le test (nom qui finit par « <id> », effacée ensuite). */
export async function createAccessLevel(name: string): Promise<void> {
  const sql = database()
  try {
    await sql`
      insert into public.access_levels (name, rank)
      values (${name}, (select coalesce(max(rank), 0) + 1 from public.access_levels))`
  } finally {
    await sql.end()
  }
}

/** L'ordre des leçons d'un chapitre dans le brouillon (positions de contents). */
export async function lessonOrder(chapterTitle: string): Promise<string[]> {
  const sql = database()
  try {
    const rows = await sql<{ title: string }[]>`
      select l.title from public.contents l
      join public.contents c on c.id = l.parent_id
      where c.title = ${chapterTitle} and l.deleted_at is null
      order by l.position`
    return rows.map((row) => row.title)
  } finally {
    await sql.end()
  }
}

/** Les titres des chapitres d'une méthode dans le brouillon (positions de contents). */
export async function chapterOrder(methodId: string): Promise<string[]> {
  const sql = database()
  try {
    const rows = await sql<{ title: string }[]>`
      select title from public.contents
      where parent_id = ${methodId} and kind = 'chapter' and deleted_at is null
      order by position`
    return rows.map((row) => row.title)
  } finally {
    await sql.end()
  }
}

/** Les versions d'une méthode, de la plus ancienne à la plus récente (numéro et origine). */
export async function methodVersions(
  methodId: string
): Promise<{ id: string; number: number; origin: string }[]> {
  const sql = database()
  try {
    return await sql<{ id: string; number: number; origin: string }[]>`
      select id, number, origin from public.versions
      where content_id = ${methodId}
      order by number`
  } finally {
    await sql.end()
  }
}
