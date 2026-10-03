import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ContentError, type SavedDraft } from "@/lib/contents/api"
import { AutosaveController } from "@/lib/editor/autosave"
import * as sentry from "@/lib/sentry"

vi.mock("@/lib/sentry", () => ({ reportError: vi.fn() }))

type Call = {
  value: string
  baseRev: number
  resolve: () => void
  reject: (e: unknown) => void
}

/** Une fausse base : chaque enregistrement attend qu'on le termine à la main. */
function fakeSave() {
  const calls: Call[] = []
  let rev = 1
  const save = vi.fn(
    (value: string, baseRev: number) =>
      new Promise<SavedDraft>((resolve, reject) => {
        calls.push({
          value,
          baseRev,
          resolve: () => {
            rev = baseRev + 1
            resolve({ rev, savedAt: `2026-09-27T12:00:0${rev}Z` })
          },
          reject,
        })
      })
  )
  return { save, calls }
}

async function flushPromises() {
  await vi.advanceTimersByTimeAsync(0)
}

describe("enregistrement automatique", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("enregistre 1,5 s après la dernière frappe", async () => {
    const { save, calls } = fakeSave()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.change("a")
    await vi.advanceTimersByTimeAsync(1000)
    autosave.change("ab")
    await vi.advanceTimersByTimeAsync(1400)
    expect(save).not.toHaveBeenCalled()
    expect(autosave.state.status).toBe("pending")
    await vi.advanceTimersByTimeAsync(100)
    expect(save).toHaveBeenCalledTimes(1)
    expect(calls[0]).toMatchObject({ value: "ab", baseRev: 1 })
    expect(autosave.state.status).toBe("saving")
    calls[0].resolve()
    await flushPromises()
    expect(autosave.state).toMatchObject({
      status: "saved",
      rev: 2,
      unsaved: false,
    })
  })

  it("enregistre au plus tard 10 s après la première modification, même sans pause", async () => {
    const { save, calls } = fakeSave()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    // Une frappe toutes les secondes : jamais 1,5 s de pause.
    for (let second = 0; second < 10; second += 1) {
      autosave.change(`texte ${second}`)
      await vi.advanceTimersByTimeAsync(1000)
    }
    expect(save).toHaveBeenCalledTimes(1)
    expect(calls[0].value).toBe("texte 9")
  })

  it("n'envoie qu'une requête à la fois ; la plus récente attend son tour", async () => {
    const { save, calls } = fakeSave()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.change("v1")
    await vi.advanceTimersByTimeAsync(1500)
    expect(save).toHaveBeenCalledTimes(1)

    // Pendant l'envoi : deux modifications, puis plus rien.
    autosave.change("v2")
    autosave.change("v3")
    await vi.advanceTimersByTimeAsync(5000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(autosave.state.status).toBe("saving")

    calls[0].resolve()
    await flushPromises()
    // La plus récente part aussitôt, avec la nouvelle révision.
    expect(save).toHaveBeenCalledTimes(2)
    expect(calls[1]).toMatchObject({ value: "v3", baseRev: 2 })
    calls[1].resolve()
    await flushPromises()
    expect(autosave.state).toMatchObject({ status: "saved", rev: 3 })
  })

  it("hors ligne : garde la modification et réessaie de plus en plus tard", async () => {
    const { save, calls } = fakeSave()
    const autosave = new AutosaveController({
      save,
      rev: 1,
      savedAt: null,
      retryDelaysMs: [2000, 4000, 8000],
    })
    autosave.change("texte")
    await vi.advanceTimersByTimeAsync(1500)
    calls[0].reject(new ContentError(null, { retryable: true }))
    await flushPromises()
    expect(autosave.state).toMatchObject({ status: "offline", unsaved: true })

    await vi.advanceTimersByTimeAsync(1999)
    expect(save).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(2)
    calls[1].reject(new TypeError("Failed to fetch"))
    await flushPromises()
    expect(autosave.state.status).toBe("offline")

    // Une modification hors ligne n'avance pas l'essai : elle partira juste après lui.
    autosave.change("texte modifié")
    await vi.advanceTimersByTimeAsync(3999)
    expect(save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(3)
    // L'envoi resté sans réponse est rejoué tel quel (il a peut-être été enregistré)…
    expect(calls[2]).toMatchObject({ value: "texte", baseRev: 1 })
    calls[2].resolve()
    await flushPromises()
    // … puis la valeur la plus récente part aussitôt, sur la nouvelle révision.
    expect(save).toHaveBeenCalledTimes(4)
    expect(calls[3]).toMatchObject({ value: "texte modifié", baseRev: 2 })
    calls[3].resolve()
    await flushPromises()
    expect(autosave.state).toMatchObject({ status: "saved", unsaved: false })
  })

  it("réponse perdue après l'enregistrement : pas de faux conflit, la suite s'enregistre", async () => {
    // Une base qui, comme save_draft, reconnaît le rejeu du même envoi.
    const db = { rev: 1, value: "" }
    let loseResponse = true
    const save = vi.fn(async (value: string, baseRev: number) => {
      if (baseRev === db.rev) {
        db.rev += 1
        db.value = value
        if (loseResponse) {
          loseResponse = false
          throw new ContentError(null, { retryable: true })
        }
        return { rev: db.rev, savedAt: "2026-09-27T12:00:00Z" }
      }
      if (db.rev === baseRev + 1 && db.value === value) {
        return { rev: db.rev, savedAt: "2026-09-27T12:00:00Z" }
      }
      throw new ContentError("conflit_revision")
    })
    const autosave = new AutosaveController({
      save,
      rev: 1,
      savedAt: null,
      retryDelaysMs: [2000],
    })
    autosave.change("un")
    await vi.advanceTimersByTimeAsync(1500)
    expect(autosave.state.status).toBe("offline")
    expect(db).toEqual({ rev: 2, value: "un" })

    autosave.change("un deux")
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()
    expect(save.mock.calls.map(([value, rev]) => [value, rev])).toEqual([
      ["un", 1],
      ["un", 1],
      ["un deux", 2],
    ])
    expect(autosave.state).toMatchObject({
      status: "saved",
      rev: 3,
      unsaved: false,
      error: null,
    })
    expect(db).toEqual({ rev: 3, value: "un deux" })
  })

  it("réessaie tout de suite au retour en ligne", async () => {
    const { save, calls } = fakeSave()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.change("texte")
    await vi.advanceTimersByTimeAsync(1500)
    calls[0].reject(new ContentError(null, { retryable: true }))
    await flushPromises()
    autosave.retryNow()
    expect(save).toHaveBeenCalledTimes(2)
  })

  it("s'arrête si la base répond « verrou_perdu », sans rien perdre", async () => {
    const { save, calls } = fakeSave()
    const onStopped = vi.fn()
    const autosave = new AutosaveController({
      save,
      rev: 1,
      savedAt: null,
      onStopped,
    })
    autosave.change("mon texte")
    await vi.advanceTimersByTimeAsync(1500)
    calls[0].reject(new ContentError("verrou_perdu"))
    await flushPromises()
    expect(autosave.state.status).toBe("stopped")
    expect(onStopped).toHaveBeenCalledWith(
      expect.objectContaining({ code: "verrou_perdu" })
    )
    expect(autosave.unsavedValue).toBe("mon texte")
    // Plus aucun envoi ensuite.
    autosave.change("encore")
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("un refus de forme attend la prochaine modification", async () => {
    const { save, calls } = fakeSave()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.change("invalide")
    await vi.advanceTimersByTimeAsync(1500)
    calls[0].reject(new ContentError("forme_invalide"))
    await flushPromises()
    expect(autosave.state).toMatchObject({ status: "failed", unsaved: true })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).toHaveBeenCalledTimes(1)
    autosave.change("corrigé")
    await vi.advanceTimersByTimeAsync(1500)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it("flush enregistre sans attendre (en quittant l'éditeur)", async () => {
    const { save, calls } = fakeSave()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.change("dernier mot")
    const done = autosave.flush()
    expect(save).toHaveBeenCalledTimes(1)
    calls[0].resolve()
    await done
    expect(autosave.state.status).toBe("saved")
  })

  it("une erreur qui n'est pas le réseau : « Non enregistré », sans nouvel essai, et signalée", async () => {
    const { save, calls } = fakeSave()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.change("texte")
    await vi.advanceTimersByTimeAsync(1500)
    const bug = new TypeError("Cannot read properties of undefined")
    calls[0].reject(bug)
    await flushPromises()
    expect(autosave.state).toMatchObject({ status: "failed", unsaved: true })
    expect(sentry.reportError).toHaveBeenCalledWith(bug)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("éditeur fermé : le dernier envoi échoue sans nouvel essai, et la valeur est confiée", async () => {
    const { save, calls } = fakeSave()
    const onUnsavedAtClose = vi.fn()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.setHandlers({ onUnsavedAtClose })
    autosave.change("dernier mot")
    autosave.close()
    const done = autosave.flush()
    calls[0].reject(new ContentError(null, { retryable: true }))
    await done
    expect(onUnsavedAtClose).toHaveBeenCalledWith("dernier mot")
    // Plus rien ne part, même longtemps après.
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("éditeur fermé après un refus : la valeur est confiée sans nouvel envoi", async () => {
    const { save, calls } = fakeSave()
    const onUnsavedAtClose = vi.fn()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.setHandlers({ onUnsavedAtClose })
    autosave.change("trop lourd")
    await vi.advanceTimersByTimeAsync(1500)
    calls[0].reject(new ContentError("brouillon_trop_lourd"))
    await flushPromises()
    expect(autosave.state.status).toBe("failed")
    autosave.close()
    await autosave.flush()
    expect(onUnsavedAtClose).toHaveBeenCalledWith("trop lourd")
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("éditeur fermé, tout enregistré : rien à confier ; rouvert, il enregistre de nouveau", async () => {
    const { save, calls } = fakeSave()
    const onUnsavedAtClose = vi.fn()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.setHandlers({ onUnsavedAtClose })
    autosave.change("mot")
    autosave.close()
    const done = autosave.flush()
    calls[0].resolve()
    await done
    expect(onUnsavedAtClose).not.toHaveBeenCalled()
    // React monte deux fois en développement : le même enregistrement repart.
    autosave.reopen()
    autosave.change("suite")
    await vi.advanceTimersByTimeAsync(1500)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it("reset repart d'une révision relue, sans modification en attente", async () => {
    const { save } = fakeSave()
    const autosave = new AutosaveController({ save, rev: 1, savedAt: null })
    autosave.change("local")
    autosave.reset(7, "2026-09-27T12:00:00Z")
    await vi.advanceTimersByTimeAsync(10_000)
    expect(save).not.toHaveBeenCalled()
    expect(autosave.state).toMatchObject({
      status: "saved",
      rev: 7,
      unsaved: false,
    })
  })
})
