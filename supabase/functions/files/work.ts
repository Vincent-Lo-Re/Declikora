// Le travail de la fonction « files », sans dépendance au réseau : la base (Database) et
// Storage (Store) sont passés en paramètres, ce qui permet de le tester avec des doublures.
//
// Principes (docs/ARCHITECTURE-CONTENUS.md, § 3.7) :
// - la base décide du travail (public.files_worklist) et de chaque changement d'état
//   (public.files_mark_*), en relisant la ligne : on peut relancer sans risque (idempotent) ;
// - un élément n'est traité qu'une fois par passage : un échec est noté (la base attend
//   10 minutes avant de le reproposer), jamais réessayé en boucle ;
// - un effacement refusé par la base (fichier encore utilisé) n'est pas réessayé.

import { checkLottie, MAX_CHECKED_BYTES } from "./lottie.ts"
import { type CheckResult, checkSvg } from "./svg.ts"

export const PUBLIC_BUCKET = "files-public"
export const PROTECTED_BUCKET = "files-protected"

export type WorkItem = {
  action: "check" | "move" | "purge" | "discard"
  media_id: string
  path: string
  kind: string
  mime: string
  size_bytes: number
  is_public: boolean
  to_public: boolean | null
}

export type Orphan = { bucket_id: string; name: string }

/** Ce que la fonction demande à la base (fonctions public.files_*, clé secrète). */
export interface Database {
  worklist(maxItems: number): Promise<WorkItem[]>
  markChecked(mediaId: string, accepted: boolean, reason: string | null): Promise<string>
  markCheckFailed(mediaId: string, error: string): Promise<string>
  markMoved(mediaId: string, isPublic: boolean): Promise<boolean>
  markFailed(mediaId: string, error: string): Promise<void>
  markErased(mediaId: string): Promise<boolean>
  audit(): Promise<number>
  orphans(): Promise<Orphan[]>
}

/** Ce que la fonction demande à Storage (clé secrète). Chaque méthode lève en cas d'erreur. */
export interface Store {
  download(bucket: string, path: string): Promise<Uint8Array>
  /** Déplace un objet d'un bucket à l'autre, au même chemin. */
  move(fromBucket: string, toBucket: string, path: string): Promise<void>
  exists(bucket: string, path: string): Promise<boolean>
  /** Efface des objets ; un chemin absent n'est pas une erreur. */
  remove(bucket: string, paths: string[]): Promise<void>
}

export type KickSummary = {
  mode: "kick"
  checked: number
  accepted: number
  rejected: number
  checkFailed: number
  moved: number
  erased: number
  eraseRefused: number
  failed: number
  /** Vrai s'il reste du travail (lot plein, budget de vérification ou de temps atteint). */
  remaining: boolean
}

export type KickOptions = {
  /** Nombre maximal de lots lus dans un passage. */
  maxRounds?: number
  /** Taille maximale de SVG et Lottie vérifiés dans un passage (2 s de processeur en ligne). */
  checkBudgetBytes?: number
  /** Heure (ms) après laquelle on ne commence plus de nouvel élément. */
  deadline?: number
  now?: () => number
}

const BATCH_SIZE = 50

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function bucketOf(isPublic: boolean): string {
  return isPublic ? PUBLIC_BUCKET : PROTECTED_BUCKET
}

/** Vérifie le contenu d'un SVG ou d'un Lottie. */
export function checkContent(kind: string, bytes: Uint8Array): CheckResult {
  if (bytes.byteLength > MAX_CHECKED_BYTES) {
    return { ok: false, reason: "fichier_trop_lourd", detail: `${bytes.byteLength} octets` }
  }
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return {
      ok: false,
      reason: kind === "svg" ? "svg_illisible" : "lottie_illisible",
      detail: "texte UTF-8 attendu",
    }
  }
  if (kind === "svg") return checkSvg(text)
  if (kind === "lottie") return checkLottie(text)
  return { ok: false, reason: "fichier_refuse", detail: `sorte inattendue : ${kind}` }
}

async function check(item: WorkItem, db: Database, store: Store, summary: KickSummary) {
  let bytes: Uint8Array
  try {
    bytes = await store.download(bucketOf(item.is_public), item.path)
  } catch (error) {
    summary.checkFailed++
    await db.markCheckFailed(item.media_id, `lecture : ${message(error)}`)
    return
  }
  let result: CheckResult
  try {
    result = checkContent(item.kind, bytes)
  } catch (error) {
    summary.checkFailed++
    await db.markCheckFailed(item.media_id, `vérification : ${message(error)}`)
    return
  }
  summary.checked++
  if (result.ok) {
    summary.accepted++
    await db.markChecked(item.media_id, true, null)
  } else {
    summary.rejected++
    console.info(`files : ${item.media_id} refusé (${result.reason}) : ${result.detail}`)
    await db.markChecked(item.media_id, false, result.reason)
  }
}

async function move(item: WorkItem, db: Database, store: Store, summary: KickSummary) {
  const toPublic = item.to_public === true
  const from = bucketOf(!toPublic)
  const to = bucketOf(toPublic)
  try {
    await store.move(from, to, item.path)
  } catch (error) {
    // Déjà déplacé (passage précédent interrompu avant de le noter) : l'objet est à
    // destination. S'il est aussi resté à la source, on retire ce double.
    try {
      if (!(await store.exists(to, item.path))) throw error
      if (await store.exists(from, item.path)) await store.remove(from, [item.path])
    } catch (checkError) {
      summary.failed++
      await db.markFailed(item.media_id, `déplacement : ${message(checkError)}`)
      return
    }
  }
  if (await db.markMoved(item.media_id, toPublic)) summary.moved++
}

async function erase(item: WorkItem, db: Database, store: Store, summary: KickSummary) {
  try {
    // Dans les deux buckets : l'objet peut être dans l'un ou l'autre (ou dans les deux après un
    // déplacement interrompu).
    await store.remove(PROTECTED_BUCKET, [item.path])
    await store.remove(PUBLIC_BUCKET, [item.path])
  } catch (error) {
    summary.failed++
    await db.markFailed(item.media_id, `effacement : ${message(error)}`)
    return
  }
  if (await db.markErased(item.media_id)) {
    summary.erased++
  } else {
    summary.eraseRefused++
  }
}

/**
 * Mode « kick » : fait le travail décidé par la base. Relit la liste par lots de 50, sans
 * jamais traiter deux fois le même élément dans un passage.
 */
export async function runKick(
  db: Database,
  store: Store,
  options: KickOptions = {},
): Promise<KickSummary> {
  const now = options.now ?? Date.now
  const maxRounds = options.maxRounds ?? 5
  const deadline = options.deadline ?? now() + 20_000
  let checkBudget = options.checkBudgetBytes ?? 10 * 1024 * 1024
  const summary: KickSummary = {
    mode: "kick",
    checked: 0,
    accepted: 0,
    rejected: 0,
    checkFailed: 0,
    moved: 0,
    erased: 0,
    eraseRefused: 0,
    failed: 0,
    remaining: false,
  }
  const seen = new Set<string>()

  for (let round = 0; round < maxRounds; round++) {
    const items = await db.worklist(BATCH_SIZE)
    const fresh = items.filter((item) => !seen.has(`${item.action}:${item.media_id}`))
    if (fresh.length === 0) {
      // Rien de neuf : soit tout est fait, soit il ne reste que des éléments déjà vus (reportés
      // au prochain passage).
      summary.remaining = items.length > 0
      return summary
    }
    for (const item of fresh) {
      seen.add(`${item.action}:${item.media_id}`)
      if (now() > deadline) {
        summary.remaining = true
        return summary
      }
      switch (item.action) {
        case "check":
          if (item.size_bytes > checkBudget) {
            // Budget de processeur de ce passage atteint : le prochain s'en chargera.
            summary.remaining = true
            continue
          }
          checkBudget -= item.size_bytes
          await check(item, db, store, summary)
          break
        case "move":
          await move(item, db, store, summary)
          break
        case "purge":
        case "discard":
          await erase(item, db, store, summary)
          break
      }
    }
  }
  summary.remaining = true
  return summary
}

export type CleanSummary = { mode: "clean"; removed: number; orphans: number }

/**
 * Mode « clean » (demandé par un membre) : efface les orphelins du dernier contrôle, revérifiés
 * par la base (toujours sans ligne media, plus de 24 h), puis refait le contrôle.
 */
export async function runClean(db: Database, store: Store): Promise<CleanSummary> {
  const orphans = await db.orphans()
  const byBucket = new Map<string, string[]>()
  for (const orphan of orphans) {
    const names = byBucket.get(orphan.bucket_id) ?? []
    names.push(orphan.name)
    byBucket.set(orphan.bucket_id, names)
  }
  for (const [bucket, names] of byBucket) {
    for (let start = 0; start < names.length; start += 100) {
      await store.remove(bucket, names.slice(start, start + 100))
    }
  }
  return { mode: "clean", removed: orphans.length, orphans: await db.audit() }
}

export type AuditSummary = { mode: "audit"; orphans: number }

/** Mode « audit » : contrôle des fichiers orphelins (résultat dans media_audit). */
export async function runAudit(db: Database): Promise<AuditSummary> {
  return { mode: "audit", orphans: await db.audit() }
}
