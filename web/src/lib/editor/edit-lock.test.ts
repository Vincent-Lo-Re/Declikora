import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ContentError,
  type ChannelState,
  type LockChange,
  type LockRow,
} from "@/lib/contents/api"
import {
  EditLockController,
  initialLockState,
  lockReducer,
  type LockApi,
  type LockState,
} from "@/lib/editor/edit-lock"

const ME = "00000000-0000-4000-8000-000000000001"
const CLAIRE = "00000000-0000-4000-8000-000000000002"
// L'ouverture de l'éditeur de ces tests, et celle d'un autre onglet du même membre.
const SESSION = "00000000-0000-4000-8000-00000000000a"
const OTHER_TAB = "00000000-0000-4000-8000-00000000000b"
const NOW = new Date("2026-09-27T12:00:00Z").getTime()

function row(overrides: Partial<LockRow>): LockRow {
  return {
    mine: false,
    holder_id: null,
    holder_name: null,
    taken_at: null,
    heartbeat_at: null,
    is_active: false,
    draft_rev: 3,
    ...overrides,
  }
}

const mineRow = row({
  mine: true,
  holder_id: ME,
  holder_name: "Moi",
  is_active: true,
})
const claireRow = row({
  holder_id: CLAIRE,
  holder_name: "Claire",
  is_active: true,
})

function change(
  holder: string | null,
  secondsAgo = 0,
  rev = 3,
  session: string | null = holder === ME ? SESSION : holder ? OTHER_TAB : null
): LockChange {
  return {
    holder_id: holder,
    holder_session: session,
    heartbeat_at: new Date(NOW - secondsAgo * 1000).toISOString(),
    draft_rev: rev,
    taken_at: holder ? new Date(NOW).toISOString() : null,
  }
}

const mine: LockState = lockReducer(initialLockState, {
  type: "row",
  row: mineRow,
  source: "take",
})

describe("machine d'états du verrou", () => {
  it("prend la main quand la base répond « à toi »", () => {
    expect(mine).toMatchObject({ phase: "mine", draftRev: 3, lost: false })
  })

  it("passe en lecture seule, avec le nom, si quelqu'un d'autre écrit", () => {
    const state = lockReducer(initialLockState, {
      type: "row",
      row: claireRow,
      source: "take",
    })
    expect(state).toMatchObject({
      phase: "readonly",
      holderName: "Claire",
      lost: false,
    })
  })

  it("verrou libre : on peut prendre la main", () => {
    const state = lockReducer(initialLockState, {
      type: "row",
      row: row({}),
      source: "take",
    })
    expect(state.phase).toBe("free")
  })

  it("quelqu'un reprend la main (Realtime) : lecture seule, main perdue, nom à relire", () => {
    const state = lockReducer(mine, {
      type: "change",
      change: change(CLAIRE),
      myId: ME,
      mySession: SESSION,
      now: NOW,
    })
    expect(state).toMatchObject({
      phase: "readonly",
      holderId: CLAIRE,
      holderName: null,
      lost: true,
    })
  })

  it("nos propres enregistrements, vus par Realtime avant leur réponse, ne changent rien", () => {
    // Sinon la révision (5) dépasserait celle affichée (3) : l'aperçu deviendrait non
    // modifiable un instant et le curseur sortirait du texte.
    const state = lockReducer(mine, {
      type: "change",
      change: change(ME, 0, 5),
      myId: ME,
      mySession: SESSION,
      now: NOW,
    })
    expect(state).toBe(mine)
  })

  it("une relecture (lock_status) pendant qu'on tient la main garde la révision de départ", () => {
    const state = lockReducer(mine, {
      type: "row",
      row: { ...mineRow, draft_rev: 5 },
      source: "status",
    })
    expect(state).toMatchObject({ phase: "mine", draftRev: 3 })
    // Une prise de main, elle, donne la révision de la base.
    expect(
      lockReducer(mine, {
        type: "row",
        row: { ...mineRow, draft_rev: 5 },
        source: "take",
      }).draftRev
    ).toBe(5)
  })

  it("un changement d'avant notre prise de main, livré en retard par Realtime, est ignoré", () => {
    const taken = lockReducer(initialLockState, {
      type: "row",
      row: { ...mineRow, heartbeat_at: new Date(NOW).toISOString() },
      source: "take",
    })
    // La création du contenu (verrou à nous, sans ouverture de l'éditeur), 2 s avant la prise.
    const late = lockReducer(taken, {
      type: "change",
      change: change(ME, 2, 1, null),
      myId: ME,
      mySession: SESSION,
      now: NOW,
    })
    expect(late).toBe(taken)
    // Une relâche d'avant, elle aussi.
    expect(
      lockReducer(taken, {
        type: "change",
        change: change(null, 1),
        myId: ME,
        mySession: SESSION,
        now: NOW,
      })
    ).toBe(taken)
    // Un autre onglet qui prend la main après nous, lui, compte.
    expect(
      lockReducer(taken, {
        type: "change",
        change: change(ME, 0, 3, OTHER_TAB),
        myId: ME,
        mySession: SESSION,
        now: NOW + 1000,
      })
    ).toMatchObject({ phase: "readonly", holderId: ME, lost: true })
  })

  it("nous-mêmes dans un autre onglet prenons la main : celui-ci passe en lecture seule", () => {
    const state = lockReducer(mine, {
      type: "change",
      change: change(ME, 0, 3, OTHER_TAB),
      myId: ME,
      mySession: SESSION,
      now: NOW,
    })
    expect(state).toMatchObject({
      phase: "readonly",
      holderId: ME,
      holderName: "Moi",
      lost: true,
    })
  })

  it("en lecture seule, suit la révision de celui qui écrit", () => {
    const reading = lockReducer(initialLockState, {
      type: "row",
      row: claireRow,
      source: "take",
    })
    const state = lockReducer(reading, {
      type: "change",
      change: change(CLAIRE, 0, 9),
      myId: ME,
      mySession: SESSION,
      now: NOW,
    })
    expect(state).toMatchObject({
      phase: "readonly",
      holderName: "Claire",
      draftRev: 9,
    })
  })

  it("celui qui écrit quitte (holder_id nul) ou ne donne plus signe de vie (90 s) : libre", () => {
    const reading = lockReducer(initialLockState, {
      type: "row",
      row: claireRow,
      source: "take",
    })
    expect(
      lockReducer(reading, {
        type: "change",
        change: change(null),
        myId: ME,
        mySession: SESSION,
        now: NOW,
      }).phase
    ).toBe("free")
    expect(
      lockReducer(reading, {
        type: "change",
        change: change(CLAIRE, 91),
        myId: ME,
        mySession: SESSION,
        now: NOW,
      }).phase
    ).toBe("free")
    expect(
      lockReducer(reading, {
        type: "change",
        change: change(CLAIRE, 89),
        myId: ME,
        mySession: SESSION,
        now: NOW,
      }).phase
    ).toBe("readonly")
  })

  it("« verrou_perdu » à l'enregistrement : lecture seule, main perdue", () => {
    expect(lockReducer(mine, { type: "lost" })).toMatchObject({
      phase: "readonly",
      lost: true,
    })
    // Sans effet si l'on n'avait pas la main.
    const reading = lockReducer(initialLockState, {
      type: "row",
      row: claireRow,
      source: "take",
    })
    expect(lockReducer(reading, { type: "lost" })).toBe(reading)
  })

  it("reprendre la main efface « main perdue »", () => {
    const lost = lockReducer(mine, { type: "lost" })
    expect(
      lockReducer(lost, { type: "row", row: mineRow, source: "take" })
    ).toMatchObject({
      phase: "mine",
      lost: false,
    })
  })

  it("relâché (onglet caché) : reste relâché jusqu'au retour, même si l'état est relu", () => {
    const released = lockReducer(mine, { type: "released" })
    expect(released.phase).toBe("released")
    expect(
      lockReducer(released, { type: "row", row: row({}), source: "take" }).phase
    ).toBe("released")
    expect(
      lockReducer(released, { type: "row", row: claireRow, source: "take" })
        .phase
    ).toBe("released")
    expect(
      lockReducer(released, { type: "row", row: mineRow, source: "take" }).phase
    ).toBe("mine")
  })

  it("contenu dans la corbeille : erreur", () => {
    const state = lockReducer(initialLockState, {
      type: "error",
      error: new ContentError("dans_la_corbeille"),
    })
    expect(state.phase).toBe("error")
    expect(state.error?.code).toBe("dans_la_corbeille")
  })
})

/** Une fausse base et un faux Realtime. */
function fakeApi(first: LockRow = mineRow) {
  let onChange: (change: LockChange) => void = () => {}
  let onState: (state: ChannelState) => void = () => {}
  // L'état du verrou dans la fausse base : relâcher le libère.
  let current = first
  const api = {
    take: vi.fn<LockApi["take"]>(async () => first),
    status: vi.fn<LockApi["status"]>(async () => current),
    heartbeat: vi.fn<LockApi["heartbeat"]>(async () => true),
    release: vi.fn<LockApi["release"]>(async () => {
      current = row({})
      return true
    }),
    subscribe: vi.fn<LockApi["subscribe"]>((change, state) => {
      onChange = change
      onState = state
      return () => {}
    }),
  }
  return {
    api,
    emit: (value: LockChange) => onChange(value),
    channel: (value: ChannelState) => onState(value),
  }
}

describe("EditLockController", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it("prend le verrou à l'ouverture et relit l'état juste après l'abonnement Realtime", async () => {
    const { api, channel } = fakeApi()
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(api.take).toHaveBeenCalledWith(false)
    expect(lock.state.phase).toBe("mine")
    channel("SUBSCRIBED")
    await vi.advanceTimersByTimeAsync(0)
    expect(api.status).toHaveBeenCalledTimes(1)
  })

  it("une relecture n'écrase pas une prise de main plus récente (Realtime déjà connecté)", async () => {
    // Le verrou vient d'être relâché (on rouvre l'éditeur aussitôt après l'avoir quitté) :
    // lock_status, lancé pendant lock_take, lirait « libre ».
    const { api, channel } = fakeApi()
    let answer: (value: LockRow) => void = () => {}
    api.take.mockImplementationOnce(
      () => new Promise<LockRow>((resolve) => (answer = resolve))
    )
    api.status.mockResolvedValue(row({}))
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.start()
    channel("SUBSCRIBED")
    await vi.advanceTimersByTimeAsync(0)
    // La relecture attend la fin de la prise.
    expect(api.status).not.toHaveBeenCalled()
    api.status.mockResolvedValue(mineRow)
    answer(mineRow)
    await vi.advanceTimersByTimeAsync(0)
    expect(api.status).toHaveBeenCalledTimes(1)
    expect(lock.state.phase).toBe("mine")

    // Une relecture partie juste avant une prise : sa réponse, plus ancienne, est ignorée.
    let late: (value: LockRow) => void = () => {}
    api.status.mockImplementationOnce(
      () => new Promise<LockRow>((resolve) => (late = resolve))
    )
    const refresh = lock.refresh()
    await lock.take(false)
    late(row({}))
    await refresh
    expect(lock.state.phase).toBe("mine")
  })

  it("donne signe de vie toutes les 20 s, et passe en lecture seule si la main est perdue", async () => {
    const { api } = fakeApi()
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.start()
    await vi.advanceTimersByTimeAsync(19_999)
    expect(api.heartbeat).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(api.heartbeat).toHaveBeenCalledTimes(1)

    api.heartbeat.mockResolvedValueOnce(false)
    api.status.mockResolvedValue(claireRow)
    await vi.advanceTimersByTimeAsync(20_000)
    // Le nom de la personne est relu aussitôt.
    expect(lock.state).toMatchObject({
      phase: "readonly",
      holderName: "Claire",
      lost: true,
    })
  })

  it("sans Realtime, relit l'état toutes les 30 s", async () => {
    const { api, channel } = fakeApi(claireRow)
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.start()
    channel("CHANNEL_ERROR")
    await vi.advanceTimersByTimeAsync(30_000)
    expect(api.status).toHaveBeenCalledTimes(1)
    channel("SUBSCRIBED")
    await vi.advanceTimersByTimeAsync(0)
    const calls = api.status.mock.calls.length
    await vi.advanceTimersByTimeAsync(60_000)
    // Realtime revenu : plus de relecture périodique.
    expect(api.status).toHaveBeenCalledTimes(calls)
  })

  it("retour sur un onglet caché : signe de vie aussitôt", async () => {
    const { api } = fakeApi()
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.start()
    await vi.advanceTimersByTimeAsync(0)
    lock.setHidden(true)
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    const beats = api.heartbeat.mock.calls.length
    lock.setHidden(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(api.heartbeat).toHaveBeenCalledTimes(beats + 1)
    expect(lock.state.phase).toBe("mine")
  })

  it("onglet caché plus de 30 minutes : enregistre, relâche, puis reprend au retour", async () => {
    const { api } = fakeApi()
    const beforeRelease = vi.fn(async () => {})
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.setBeforeRelease(beforeRelease)
    lock.start()
    await vi.advanceTimersByTimeAsync(0)
    lock.setHidden(true)
    await vi.advanceTimersByTimeAsync(30 * 60_000)
    expect(beforeRelease).toHaveBeenCalledTimes(1)
    expect(api.release).toHaveBeenCalledTimes(1)
    expect(lock.state.phase).toBe("released")

    lock.setHidden(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(api.take).toHaveBeenLastCalledWith(false)
    expect(lock.state.phase).toBe("mine")
  })

  it("au retour après 30 minutes, lecture seule si quelqu'un a pris la main entre-temps", async () => {
    const { api } = fakeApi()
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.start()
    await vi.advanceTimersByTimeAsync(0)
    lock.setHidden(true)
    await vi.advanceTimersByTimeAsync(31 * 60_000)
    api.take.mockResolvedValue(claireRow)
    lock.setHidden(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(lock.state).toMatchObject({
      phase: "readonly",
      holderName: "Claire",
    })
  })

  it("« Reprendre la main » force la prise du verrou", async () => {
    const { api } = fakeApi(claireRow)
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(lock.state.phase).toBe("readonly")
    api.take.mockResolvedValue(mineRow)
    await lock.take(true)
    expect(api.take).toHaveBeenLastCalledWith(true)
    expect(lock.state.phase).toBe("mine")
  })

  it("en quittant l'éditeur : termine l'enregistrement, puis relâche le verrou", async () => {
    const { api } = fakeApi()
    const order: string[] = []
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.setBeforeRelease(async () => {
      order.push("enregistrement")
    })
    api.release.mockImplementation(async () => {
      order.push("relâche")
      return true
    })
    lock.start()
    await vi.advanceTimersByTimeAsync(0)
    await lock.finishThenStop()
    expect(order).toEqual(["enregistrement", "relâche"])
    // Plus de minuterie ensuite.
    await vi.advanceTimersByTimeAsync(120_000)
    expect(api.heartbeat).not.toHaveBeenCalled()
  })

  it("rouvert aussitôt dans le même onglet : attend que l'éditeur précédent ait rendu la main", async () => {
    const { api, channel } = fakeApi()
    let closed: () => void = () => {}
    const previous = new Promise<void>((resolve) => (closed = resolve))
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.start(previous)
    channel("SUBSCRIBED")
    await vi.advanceTimersByTimeAsync(1000)
    // Ni prise ni relecture tant que l'ancien éditeur enregistre encore.
    expect(api.take).not.toHaveBeenCalled()
    expect(api.status).not.toHaveBeenCalled()
    expect(lock.state.phase).toBe("taking")
    closed()
    await vi.advanceTimersByTimeAsync(0)
    expect(api.take).toHaveBeenCalledWith(false)
    expect(lock.state.phase).toBe("mine")
  })

  it("ne relâche pas un verrou qu'il ne tient pas", async () => {
    const { api } = fakeApi(claireRow)
    const lock = new EditLockController({ api, myId: ME, session: SESSION })
    lock.start()
    await vi.advanceTimersByTimeAsync(0)
    await lock.finishThenStop()
    expect(api.release).not.toHaveBeenCalled()
  })

  describe("en Lecture, on ne prend pas la main (QCM du 04/10/2026)", () => {
    it("suit le verrou sans le prendre, puis le prend en passant en Édition", async () => {
      const { api, channel } = fakeApi(row({}))
      api.take.mockResolvedValue(mineRow)
      const lock = new EditLockController({
        api,
        myId: ME,
        session: SESSION,
        writing: false,
      })
      lock.start()
      channel("SUBSCRIBED")
      await vi.advanceTimersByTimeAsync(0)
      expect(api.take).not.toHaveBeenCalled()
      expect(api.status).toHaveBeenCalled()
      expect(lock.state.phase).toBe("free")
      // Ni signe de vie ni relâche : on ne tient rien.
      await vi.advanceTimersByTimeAsync(20_000)
      expect(api.heartbeat).not.toHaveBeenCalled()

      lock.setWriting(true)
      await vi.advanceTimersByTimeAsync(0)
      expect(api.take).toHaveBeenCalledWith(false)
      expect(lock.state.phase).toBe("mine")
    })

    it("quelqu'un écrit déjà : on le suit, et l'Édition reste en lecture seule", async () => {
      const { api } = fakeApi(claireRow)
      const lock = new EditLockController({
        api,
        myId: ME,
        session: SESSION,
        writing: false,
      })
      lock.start()
      await vi.advanceTimersByTimeAsync(0)
      expect(lock.state).toMatchObject({
        phase: "readonly",
        holderName: "Claire",
        lost: false,
      })
      lock.setWriting(true)
      await vi.advanceTimersByTimeAsync(0)
      expect(api.take).toHaveBeenCalledWith(false)
      expect(lock.state).toMatchObject({ phase: "readonly", lost: false })
    })

    it("repasser en Lecture rend la main après l'enregistrement, sans la croire perdue", async () => {
      const { api, emit } = fakeApi()
      const saved = vi.fn(async () => {})
      const lock = new EditLockController({
        api,
        myId: ME,
        session: SESSION,
        beforeRelease: saved,
      })
      lock.start()
      await vi.advanceTimersByTimeAsync(0)
      expect(lock.state.phase).toBe("mine")

      lock.setWriting(false)
      await vi.advanceTimersByTimeAsync(0)
      expect(saved).toHaveBeenCalled()
      expect(api.release).toHaveBeenCalledTimes(1)
      // La relâche, vue par Realtime : ce n'est pas une main perdue.
      emit(change(null))
      expect(lock.state).toMatchObject({ phase: "free", lost: false })
      await vi.advanceTimersByTimeAsync(20_000)
      expect(api.heartbeat).not.toHaveBeenCalled()
      // Fermer l'éditeur ne relâche pas une seconde fois.
      await lock.finishThenStop()
      expect(api.release).toHaveBeenCalledTimes(1)
    })

    it("revenu en Édition pendant la relâche : reprend la main une fois celle-ci finie", async () => {
      const { api } = fakeApi()
      let released: (value: boolean) => void = () => {}
      api.release.mockImplementationOnce(
        () => new Promise<boolean>((resolve) => (released = resolve))
      )
      const lock = new EditLockController({ api, myId: ME, session: SESSION })
      lock.start()
      await vi.advanceTimersByTimeAsync(0)
      lock.setWriting(false)
      await vi.advanceTimersByTimeAsync(0)
      expect(api.release).toHaveBeenCalledTimes(1)
      lock.setWriting(true)
      await vi.advanceTimersByTimeAsync(0)
      // Pas de prise tant que la relâche n'est pas finie : elle l'effacerait.
      expect(api.take).toHaveBeenCalledTimes(1)
      released(true)
      await vi.advanceTimersByTimeAsync(0)
      expect(api.take).toHaveBeenCalledTimes(2)
      expect(lock.state.phase).toBe("mine")
    })

    it("un onglet caché en Lecture ne reprend pas la main à son retour", async () => {
      const { api } = fakeApi(row({}))
      const lock = new EditLockController({
        api,
        myId: ME,
        session: SESSION,
        writing: false,
      })
      lock.start()
      await vi.advanceTimersByTimeAsync(0)
      lock.setHidden(true)
      await vi.advanceTimersByTimeAsync(31 * 60 * 1000)
      lock.setHidden(false)
      await vi.advanceTimersByTimeAsync(0)
      expect(api.take).not.toHaveBeenCalled()
      expect(api.release).not.toHaveBeenCalled()
    })
  })
})
