import { useEffect, useState, useSyncExternalStore } from "react"

import { prepareDraft } from "@/blocks/draft"
import type { Draft } from "@/blocks/types"
import {
  ContentError,
  saveDraft,
  type ContentSettings,
  type SavedDraft,
  type SettingsPayload,
} from "@/lib/contents/api"
import { AutosaveController } from "@/lib/editor/autosave"
import { texts } from "@/texts"

/**
 * Ce que l'éditeur enregistre : le brouillon et les réglages du contenu (niveau d'accès,
 * adresse), qui partent ensemble par save_draft, sous le verrou.
 */
export type EditorValue = { draft: Draft; settings: ContentSettings }

/**
 * Enregistre un brouillon : nettoyé et vérifié par le validateur généré, puis save_draft, avec
 * les réglages changés. Un brouillon refusé ici ne part pas (même message que la base).
 */
export function saveCheckedDraft(
  contentId: string,
  editorSession: string,
  draft: Draft,
  baseRev: number,
  settings: SettingsPayload | null = null
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
  return saveDraft(contentId, baseRev, prepared.draft, editorSession, settings)
}

type Callbacks = {
  onSaved?: (result: SavedDraft, value: EditorValue) => void
  onStopped?: (error: ContentError) => void
}

/**
 * Enregistrement automatique d'un brouillon et de ses réglages (voir lib/editor/autosave.ts).
 * save envoie une valeur sur une révision : une valeur rejouée après une réponse perdue part
 * telle quelle (mêmes réglages), et la base reconnaît le rejeu. Le navigateur prévient avant
 * de quitter la page tant qu'une modification n'est pas enregistrée.
 */
export function useAutosave(
  initial: { rev: number; savedAt: string | null },
  callbacks: Callbacks,
  save: (value: EditorValue, baseRev: number) => Promise<SavedDraft>
) {
  const [controller] = useState(
    () =>
      new AutosaveController<EditorValue>({
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
