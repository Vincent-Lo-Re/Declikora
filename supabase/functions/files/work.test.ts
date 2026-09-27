// Travail de la fonction « files » avec des doublures de la base et de Storage : la base est
// simulée avec les mêmes règles que les fonctions public.files_* (voir la migration de la
// médiathèque et supabase/tests/23_fichiers.test.sql).

import { assertEquals } from "@std/assert"
import {
  type Database,
  type Orphan,
  PROTECTED_BUCKET,
  PUBLIC_BUCKET,
  runAudit,
  runClean,
  runKick,
  type Store,
  type WorkItem,
} from "./work.ts"

type Row = {
  id: string
  kind: string
  path: string
  status: "pending" | "checking" | "ready" | "rejected"
  reject_reason: string | null
  check_attempts: number
  is_public: boolean
  in_trash: boolean
  purge_requested: boolean
  purge_error: string | null
  old: boolean
  used: boolean
  failed_recently: boolean
}

const encoder = new TextEncoder()
const cleanSvg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'
const trappedSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'

function row(id: string, fields: Partial<Row>): Row {
  return {
    id,
    kind: "image",
    path: `${id}/f.bin`,
    status: "ready",
    reject_reason: null,
    check_attempts: 0,
    is_public: false,
    in_trash: false,
    purge_requested: false,
    purge_error: null,
    old: false,
    used: false,
    failed_recently: false,
    ...fields,
  }
}

class FakeDatabase implements Database {
  rows = new Map<string, Row>()
  calls: string[] = []
  audits: string[][] = []

  constructor(rows: Row[], readonly orphanList: Orphan[] = []) {
    for (const r of rows) this.rows.set(r.id, r)
  }

  worklist(maxItems: number): Promise<WorkItem[]> {
    this.calls.push("worklist")
    for (const r of this.rows.values()) {
      if (r.purge_requested && r.used) {
        r.purge_requested = false
        r.purge_error = "fichier_utilise"
      }
    }
    const items: Array<[number, WorkItem]> = []
    for (const r of this.rows.values()) {
      if (r.failed_recently) continue
      const base = {
        media_id: r.id,
        path: r.path,
        kind: r.kind,
        mime: r.kind === "svg" ? "image/svg+xml" : "application/octet-stream",
        size_bytes: 100,
        is_public: r.is_public,
        to_public: null,
      }
      if (r.status === "checking") items.push([1, { ...base, action: "check" }])
      // Étape 3 : aucun fichier ne doit être public.
      if (r.status === "ready" && !r.purge_requested && r.is_public) {
        items.push([2, { ...base, action: "move", to_public: false }])
      }
      if (r.in_trash && r.purge_requested) items.push([3, { ...base, action: "purge" }])
      if ((r.status === "pending" || r.status === "rejected") && r.old && !r.purge_requested) {
        items.push([4, { ...base, action: "discard" }])
      }
    }
    return Promise.resolve(
      items.sort((a, b) => a[0] - b[0]).slice(0, maxItems).map(([, item]) => item),
    )
  }

  markChecked(mediaId: string, accepted: boolean, reason: string | null) {
    this.calls.push(`checked:${mediaId}:${accepted}:${reason}`)
    const r = this.rows.get(mediaId)!
    if (r.status === "checking") {
      r.status = accepted ? "ready" : "rejected"
      r.reject_reason = accepted ? null : reason
    }
    return Promise.resolve(r.status)
  }

  markCheckFailed(mediaId: string, error: string) {
    this.calls.push(`checkFailed:${mediaId}:${error}`)
    const r = this.rows.get(mediaId)!
    if (r.status === "checking") {
      r.check_attempts++
      r.failed_recently = true
      if (r.check_attempts >= 3) {
        r.status = "rejected"
        r.reject_reason = "verification_impossible"
      }
    }
    return Promise.resolve(r.status)
  }

  markMoved(mediaId: string, isPublic: boolean) {
    this.calls.push(`moved:${mediaId}:${isPublic}`)
    const r = this.rows.get(mediaId)
    if (!r) return Promise.resolve(false)
    r.is_public = isPublic
    return Promise.resolve(true)
  }

  markFailed(mediaId: string, error: string) {
    this.calls.push(`failed:${mediaId}:${error}`)
    const r = this.rows.get(mediaId)
    if (r) r.failed_recently = true
    return Promise.resolve()
  }

  markErased(mediaId: string) {
    this.calls.push(`erased:${mediaId}`)
    const r = this.rows.get(mediaId)
    if (!r) return Promise.resolve(true)
    const erasable = (r.in_trash && r.purge_requested) ||
      ((r.status === "pending" || r.status === "rejected") && r.old && !r.purge_requested)
    if (!erasable) return Promise.resolve(false)
    if (r.used) {
      // Refus du déclencheur media_before_delete : noté, demande retirée.
      r.purge_requested = false
      r.purge_error = "fichier_utilise"
      return Promise.resolve(false)
    }
    this.rows.delete(mediaId)
    return Promise.resolve(true)
  }

  audit() {
    this.calls.push("audit")
    this.audits.push(this.orphanList.map((o) => `${o.bucket_id}/${o.name}`))
    return Promise.resolve(this.orphanList.length)
  }

  orphans() {
    this.calls.push("orphans")
    return Promise.resolve(this.orphanList)
  }
}

class FakeStore implements Store {
  objects = new Map<string, Uint8Array>()
  calls: string[] = []
  failMoves = false
  failDownloads = false

  put(bucket: string, path: string, content: string | Uint8Array) {
    this.objects.set(
      `${bucket}/${path}`,
      typeof content === "string" ? encoder.encode(content) : content,
    )
  }

  has(bucket: string, path: string) {
    return this.objects.has(`${bucket}/${path}`)
  }

  download(bucket: string, path: string) {
    this.calls.push(`download:${bucket}/${path}`)
    const content = this.objects.get(`${bucket}/${path}`)
    if (this.failDownloads || !content) return Promise.reject(new Error("Object not found"))
    return Promise.resolve(content)
  }

  move(fromBucket: string, toBucket: string, path: string) {
    this.calls.push(`move:${fromBucket}->${toBucket}/${path}`)
    const content = this.objects.get(`${fromBucket}/${path}`)
    if (this.failMoves || !content) return Promise.reject(new Error("Object not found"))
    if (this.has(toBucket, path)) return Promise.reject(new Error("The resource already exists"))
    this.objects.delete(`${fromBucket}/${path}`)
    this.objects.set(`${toBucket}/${path}`, content)
    return Promise.resolve()
  }

  exists(bucket: string, path: string) {
    return Promise.resolve(this.has(bucket, path))
  }

  remove(bucket: string, paths: string[]) {
    this.calls.push(`remove:${bucket}:${paths.join(",")}`)
    for (const path of paths) this.objects.delete(`${bucket}/${path}`)
    return Promise.resolve()
  }
}

Deno.test("vérification : SVG propre prêt, SVG piégé refusé", async () => {
  const db = new FakeDatabase([
    row("a", { kind: "svg", status: "checking" }),
    row("b", { kind: "svg", status: "checking" }),
  ])
  const store = new FakeStore()
  store.put(PROTECTED_BUCKET, "a/f.bin", cleanSvg)
  store.put(PROTECTED_BUCKET, "b/f.bin", trappedSvg)

  const summary = await runKick(db, store)
  assertEquals(db.rows.get("a")!.status, "ready")
  assertEquals(db.rows.get("b")!.status, "rejected")
  assertEquals(db.rows.get("b")!.reject_reason, "svg_element_interdit")
  assertEquals([summary.checked, summary.accepted, summary.rejected], [2, 1, 1])
  assertEquals(summary.remaining, false)
})

Deno.test("vérification impossible : un essai par passage, refusé au troisième", async () => {
  const db = new FakeDatabase([row("a", { kind: "svg", status: "checking" })])
  const store = new FakeStore()
  store.failDownloads = true

  for (let attempt = 1; attempt <= 3; attempt++) {
    const summary = await runKick(db, store)
    assertEquals(summary.checkFailed, 1, `passage ${attempt} : un seul essai`)
    // La base attend 10 minutes avant de reproposer le fichier : on simule ce délai.
    db.rows.get("a")!.failed_recently = false
  }
  assertEquals(db.rows.get("a")!.status, "rejected")
  assertEquals(db.rows.get("a")!.reject_reason, "verification_impossible")
  const again = await runKick(db, store)
  assertEquals(again.checkFailed, 0, "plus jamais rappelé")
})

Deno.test("un échec n'est pas réessayé dans le même passage (pas de boucle)", async () => {
  const db = new FakeDatabase([row("a", { kind: "svg", status: "checking" })])
  const store = new FakeStore()
  store.failDownloads = true
  // Même si la base reproposait aussitôt le fichier, le passage ne le reprend pas.
  db.markCheckFailed = function (mediaId: string, error: string) {
    this.calls.push(`checkFailed:${mediaId}:${error}`)
    return Promise.resolve("checking")
  }
  const summary = await runKick(db, store)
  assertEquals(summary.checkFailed, 1)
  assertEquals(db.calls.filter((call) => call.startsWith("checkFailed")).length, 1)
  assertEquals(summary.remaining, true)
})

Deno.test("déplacement : idempotent, y compris après un passage interrompu", async () => {
  const db = new FakeDatabase([
    row("a", { is_public: true }),
    // Déjà déplacé par Storage, mais pas encore noté en base.
    row("b", { is_public: true }),
    // Présent dans les deux buckets.
    row("c", { is_public: true }),
  ])
  const store = new FakeStore()
  store.put(PUBLIC_BUCKET, "a/f.bin", "a")
  store.put(PROTECTED_BUCKET, "b/f.bin", "b")
  store.put(PUBLIC_BUCKET, "c/f.bin", "c")
  store.put(PROTECTED_BUCKET, "c/f.bin", "c")

  const first = await runKick(db, store)
  assertEquals(first.moved, 3)
  assertEquals(first.failed, 0)
  for (const id of ["a", "b", "c"]) {
    assertEquals(db.rows.get(id)!.is_public, false)
    assertEquals(store.has(PROTECTED_BUCKET, `${id}/f.bin`), true)
    assertEquals(store.has(PUBLIC_BUCKET, `${id}/f.bin`), false)
  }
  const second = await runKick(db, store)
  assertEquals(second.moved, 0, "rejouer ne fait rien")
})

Deno.test("déplacement impossible : noté, pas réessayé", async () => {
  const db = new FakeDatabase([row("a", { is_public: true })])
  const store = new FakeStore()
  store.put(PUBLIC_BUCKET, "a/f.bin", "a")
  store.failMoves = true
  const summary = await runKick(db, store)
  assertEquals(summary.failed, 1)
  assertEquals(db.rows.get("a")!.is_public, true)
  assertEquals(db.calls.filter((call) => call.startsWith("failed:a")).length, 1)
})

Deno.test("effacement : objets des deux buckets, puis la ligne ; rejouable", async () => {
  const db = new FakeDatabase([
    row("a", { in_trash: true, purge_requested: true }),
    row("b", { status: "pending", old: true }),
  ])
  const store = new FakeStore()
  store.put(PROTECTED_BUCKET, "a/f.bin", "a")
  store.put(PROTECTED_BUCKET, "b/f.bin", "b")
  const summary = await runKick(db, store)
  assertEquals(summary.erased, 2)
  assertEquals(db.rows.size, 0)
  assertEquals(store.objects.size, 0)
  assertEquals((await runKick(db, store)).erased, 0)
})

Deno.test("effacement refusé par la base : objet gardé, aucune boucle", async () => {
  const db = new FakeDatabase([row("a", { in_trash: true, purge_requested: true, used: true })])
  const store = new FakeStore()
  store.put(PROTECTED_BUCKET, "a/f.bin", "a")
  const summary = await runKick(db, store)
  // La liste refuse d'avance l'effacement d'un fichier utilisé : l'objet n'est pas touché.
  assertEquals(summary.erased, 0)
  assertEquals(store.has(PROTECTED_BUCKET, "a/f.bin"), true)
  assertEquals(db.rows.get("a")!.purge_error, "fichier_utilise")
  assertEquals(db.calls.filter((call) => call === "worklist").length, 1)
})

Deno.test("effacement refusé au dernier moment : compté, pas réessayé", async () => {
  const db = new FakeDatabase([row("a", { in_trash: true, purge_requested: true })])
  const store = new FakeStore()
  const worklist = db.worklist.bind(db)
  db.worklist = async (max) => {
    const items = await worklist(max)
    // Un usage apparaît entre la liste et l'effacement de la ligne.
    db.rows.get("a")!.used = true
    return items
  }
  const summary = await runKick(db, store)
  assertEquals([summary.erased, summary.eraseRefused], [0, 1])
  assertEquals(db.calls.filter((call) => call === "erased:a").length, 1)
})

Deno.test("budget de vérification : le reste attend le passage suivant", async () => {
  const db = new FakeDatabase([
    row("a", { kind: "svg", status: "checking" }),
    row("b", { kind: "svg", status: "checking" }),
  ])
  const store = new FakeStore()
  store.put(PROTECTED_BUCKET, "a/f.bin", cleanSvg)
  store.put(PROTECTED_BUCKET, "b/f.bin", cleanSvg)
  const summary = await runKick(db, store, { checkBudgetBytes: 150 })
  assertEquals(summary.checked, 1)
  assertEquals(summary.remaining, true)
  assertEquals((await runKick(db, store)).checked, 1)
})

Deno.test("délai dépassé : on s'arrête, le reste attend", async () => {
  const db = new FakeDatabase([row("a", { is_public: true }), row("b", { is_public: true })])
  const store = new FakeStore()
  store.put(PUBLIC_BUCKET, "a/f.bin", "a")
  store.put(PUBLIC_BUCKET, "b/f.bin", "b")
  let clock = 0
  const summary = await runKick(db, store, { deadline: 5, now: () => (clock += 4) })
  assertEquals(summary.moved, 1)
  assertEquals(summary.remaining, true)
})

Deno.test("contrôle et nettoyage des orphelins", async () => {
  const orphans = [
    { bucket_id: PROTECTED_BUCKET, name: "x/reste.png" },
    { bucket_id: PUBLIC_BUCKET, name: "y/reste.png" },
  ]
  const db = new FakeDatabase([], orphans)
  const store = new FakeStore()
  store.put(PROTECTED_BUCKET, "x/reste.png", "x")
  store.put(PUBLIC_BUCKET, "y/reste.png", "y")
  assertEquals(await runAudit(db), { mode: "audit", orphans: 2 })
  const summary = await runClean(db, store)
  assertEquals(summary.removed, 2)
  assertEquals(store.objects.size, 0)
  assertEquals(db.calls.at(-1), "audit", "le contrôle est refait après le nettoyage")
})
