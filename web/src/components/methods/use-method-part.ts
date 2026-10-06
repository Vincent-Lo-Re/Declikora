import { useEffect, useRef } from "react"

import type { usePartDraft } from "@/components/editor/use-part-draft"
import { useMethodPage } from "@/components/methods/method-page-context"
import type { ElementFlags } from "@/lib/contents/method-page"

type PartSync = ReturnType<typeof usePartDraft>

/**
 * Une partie de la page d'une méthode se fait connaître de la page : ce qu'elle peut faire
 * (enregistrer tout de suite, donner son texte non enregistré, se relire, ses cases, le curseur
 * dans son titre) et ce qu'elle en dit (son enregistrement, son titre, ses cases). titleId : son
 * titre dans le téléphone.
 */
export function useMethodPart(
  id: string,
  sync: PartSync,
  titleId: string,
  flags?: ElementFlags
) {
  const { register, report } = useMethodPage()
  // Un élément a des cases ; la fiche n'en a pas.
  const hasFlags = flags !== undefined
  // Les gestes de la page lisent toujours le dernier état de la partie.
  const latest = useRef(sync)
  useEffect(() => {
    latest.current = sync
  })

  useEffect(
    () =>
      register(id, {
        flush: async () => {
          const { saving } = latest.current
          await saving.flush()
          const state = saving.state
          return !(
            state.unsaved ||
            state.status === "failed" ||
            state.status === "stopped" ||
            state.status === "offline"
          )
        },
        unsavedDraft: () => latest.current.unsavedDraft(),
        reload: () => latest.current.reload(),
        dismissStash: () => latest.current.dismissStash(),
        setFlags: hasFlags
          ? (wanted) =>
              latest.current.setSettings((current) => ({
                ...current,
                ...wanted,
              }))
          : undefined,
        focusTitle: () => document.getElementById(titleId)?.focus(),
      }),
    [register, id, titleId, hasFlags]
  )

  const inApp = flags?.inApp
  const isFree = flags?.isFree
  const title = sync.draft.title
  useEffect(() => {
    report(id, {
      save: sync.autosave,
      canCopy: sync.canCopy,
      title,
      flags:
        inApp === undefined || isFree === undefined
          ? undefined
          : { inApp, isFree },
    })
  }, [report, id, sync.autosave, sync.canCopy, title, inApp, isFree])
}
