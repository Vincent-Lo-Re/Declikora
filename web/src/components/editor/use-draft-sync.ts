import { useEffect, useRef, useState } from "react"

import { usePartDraft } from "@/components/editor/use-part-draft"
import { useEditLock } from "@/hooks/use-edit-lock"
import type { Content } from "@/lib/contents/api"

/**
 * Le brouillon d'un éditeur et ses réglages, tenus à jour avec la base : le verrou « un seul à
 * la fois » du contenu (lib/editor/edit-lock.ts), et tout ce que fait usePartDraft
 * (enregistrement automatique, relecture, reprise de la main, « Copier mon texte »). afterSave :
 * ce que l'éditeur relit après chaque enregistrement (listes, plans…). writing : faux en
 * Lecture, où l'on ne prend pas la main.
 */
export function useDraftSync({
  initial,
  afterSave,
  writing,
}: {
  initial: Content
  afterSave: () => void
  writing: boolean
}) {
  // Cette ouverture de l'éditeur : le verrou est tenu par elle, pas seulement par le membre.
  const [editorSession] = useState(() => crypto.randomUUID())
  // Avant de rendre la main : terminer l'enregistrement en attente (connu après usePartDraft).
  const flush = useRef<() => Promise<void>>(() => Promise.resolve())
  const lock = useEditLock(
    initial.id,
    editorSession,
    () => flush.current(),
    writing
  )
  // Change à chaque « Prendre la main » ou « Reprendre la main » : l'enregistrement reprend.
  const [resumeSignal, setResumeSignal] = useState(0)
  const part = usePartDraft({
    initial,
    session: editorSession,
    lock: {
      phase: lock.state.phase,
      lost: lock.state.lost,
      serverRev: lock.state.draftRev,
      notifyLost: lock.notifyLost,
    },
    resumeSignal,
    afterSave,
  })
  const { saving } = part
  useEffect(() => {
    flush.current = () => saving.flush()
  }, [saving])

  /** « Prendre la main » ou « Reprendre la main » (force : même si quelqu'un écrit). */
  const take = (force: boolean) => {
    setResumeSignal((signal) => signal + 1)
    void lock.take(force)
  }

  return { ...part, editorSession, lock, take }
}
