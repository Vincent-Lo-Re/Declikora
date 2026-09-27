import { useEffect, useState, useSyncExternalStore } from "react"

import { prepareDraft } from "@/blocks/draft"
import type { Draft } from "@/blocks/types"
import { ContentError, saveDraft, type SavedDraft } from "@/lib/contents/api"
import { AutosaveController } from "@/lib/editor/autosave"
import { texts } from "@/texts"

/**
 * Enregistre un brouillon : nettoyé et vérifié par le validateur généré, puis save_draft.
 * Un brouillon refusé ici ne part pas (même message que la base).
 */
export function saveCheckedDraft(
  contentId: string,
  editorSession: string,
  draft: Draft,
  baseRev: number
): Promise<SavedDraft> {
  const prepared = prepareDraft(draft)
  if (!prepared.ok) {
    return Promise.reject(
      prepared.reason === "too_large"
        ? new ContentError("brouillon_trop_lourd")
        : new ContentError("forme_invalide", {
            detail:
              prepared.position !== null
                ? texts.editor.save.invalidAt(prepared.position)
                : null,
          })
    )
  }
  return saveDraft(contentId, baseRev, prepared.draft, editorSession)
}

type Callbacks = {
  onSaved?: (result: SavedDraft, draft: Draft) => void
  onStopped?: (error: ContentError) => void
}

/**
 * Enregistrement automatique d'un brouillon (voir lib/editor/autosave.ts), depuis une ouverture
 * de l'éditeur (editorSession, celle du verrou). Le navigateur prévient avant de quitter la
 * page tant qu'une modification n'est pas enregistrée.
 */
export function useAutosave(
  contentId: string,
  editorSession: string,
  initial: { rev: number; savedAt: string | null },
  callbacks: Callbacks,
  save: (draft: Draft, baseRev: number) => Promise<SavedDraft> = (
    draft,
    baseRev
  ) => saveCheckedDraft(contentId, editorSession, draft, baseRev)
) {
  const [controller] = useState(
    () =>
      new AutosaveController<Draft>({
        save,
        rev: initial.rev,
        savedAt: initial.savedAt,
      })
  )
  // Les rappels suivent les derniers rendus.
  useEffect(() => {
    controller.setHandlers(callbacks)
  })
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot
  )

  // Retour en ligne : nouvel essai sans attendre.
  useEffect(() => {
    const onOnline = () => controller.retryNow()
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [controller])

  // Quitter la page avec une modification pas encore enregistrée : le navigateur demande.
  useEffect(() => {
    if (!state.unsaved) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [state.unsaved])

  return { state, controller }
}
