import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import { useAuth } from "@/auth/auth-context"
import {
  lockHeartbeat,
  lockRelease,
  lockReleaseOnExit,
  lockStatus,
  lockTake,
  subscribeLock,
} from "@/lib/contents/api"
import { EditLockController, type LockApi } from "@/lib/editor/edit-lock"

function lockApiFor(contentId: string, session: string): LockApi {
  return {
    take: (force) => lockTake(contentId, force, session),
    status: () => lockStatus(contentId, session),
    heartbeat: () => lockHeartbeat(contentId, session),
    release: () => lockRelease(contentId, session),
    subscribe: (onChange, onState) =>
      subscribeLock(contentId, onChange, onState),
  }
}

// Éditeurs de cet onglet en train de se fermer, par contenu : un éditeur rouvert aussitôt sur
// le même contenu attend que le précédent ait fini d'enregistrer et rendu la main.
const closing = new Map<string, Promise<void>>()

/**
 * Attend que les éditeurs de cet onglet en train de se fermer aient rendu la main (vrai s'il y
 * en avait) : le plan d'une méthode, ouvert juste après une leçon, relit alors qui écrit quoi.
 */
export async function editorsClosed(): Promise<boolean> {
  if (closing.size === 0) return false
  await Promise.allSettled([...closing.values()])
  return true
}

/**
 * Le verrou d'un brouillon, pendant que l'éditeur est ouvert (voir lib/editor/edit-lock.ts).
 * editorSession identifie cette ouverture de l'éditeur (la même que pour save_draft).
 * beforeRelease est appelé avant de relâcher le verrou (onglet caché 30 minutes, fermeture de
 * l'éditeur, passage en Lecture) : c'est là qu'on termine l'enregistrement en attente.
 * writing : faux en Lecture, où l'on suit le verrou sans le prendre (QCM du 04/10/2026).
 */
export function useEditLock(
  contentId: string,
  editorSession: string,
  beforeRelease: () => Promise<void>,
  writing = true,
  api?: LockApi
) {
  const { profile, session } = useAuth()
  const myId = profile?.id ?? ""
  const token = useRef(session?.access_token ?? null)
  const [controller] = useState(
    () =>
      new EditLockController({
        api: api ?? lockApiFor(contentId, editorSession),
        myId,
        session: editorSession,
        writing,
      })
  )
  useEffect(() => {
    token.current = session?.access_token ?? null
    controller.setBeforeRelease(beforeRelease)
  })
  useEffect(() => controller.setWriting(writing), [controller, writing])
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot
  )

  useEffect(() => {
    controller.start(closing.get(contentId))
    const onVisibility = () =>
      controller.setHidden(document.visibilityState === "hidden")
    // Onglet fermé ou page quittée : on relâche le verrou sans attendre de réponse.
    const onPageHide = () => {
      if (controller.state.phase === "mine" && token.current) {
        lockReleaseOnExit(contentId, editorSession, token.current)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", onPageHide)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onPageHide)
      // L'éditeur se ferme : on termine l'enregistrement, puis on rend la main.
      const done = controller.finishThenStop()
      closing.set(contentId, done)
      void done.finally(() => {
        if (closing.get(contentId) === done) closing.delete(contentId)
      })
    }
  }, [controller, contentId, editorSession])

  const actions = useMemo(
    () => ({
      take: (force: boolean) => controller.take(force),
      notifyLost: () => controller.notifyLost(),
      refresh: () => controller.refresh(),
    }),
    [controller]
  )
  return { state, myId, ...actions }
}
