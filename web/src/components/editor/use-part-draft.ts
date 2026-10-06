import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { draftToPlainText } from "@/blocks/draft"
import type { Draft } from "@/blocks/types"
import type { RefusedSlug } from "@/lib/contents/slug"
import { useAccessCheck } from "@/components/team/use-access-check"
import {
  saveCheckedDraft,
  useAutosave,
  type EditorValue,
} from "@/hooks/use-autosave"
import { accessLevelsKey } from "@/lib/access-levels"
import { categoryKeys } from "@/lib/categories"
import {
  contentKeys,
  getContent,
  sameCategories,
  settingsDiff,
  settingsOf,
  type Content,
  type ContentSettings,
  type SettingsPayload,
} from "@/lib/contents/api"
import type { LockState } from "@/lib/editor/edit-lock"
import { texts } from "@/texts"

// Nouvel essai de relecture du brouillon après un échec (réseau).
const RELOAD_RETRY_MS = 3000

// Refus de save_draft qui viennent d'un réglage (et non du brouillon).
const SLUG_REFUSALS = new Set(["adresse_prise", "adresse_invalide"])

/** « Copier mon texte » : le brouillon en texte simple, dans le presse-papiers. */
async function copyDraft(draft: Draft) {
  try {
    await navigator.clipboard.writeText(draftToPlainText(draft))
    toast.success(texts.editor.lock.copied)
  } catch {
    toast.error(texts.editor.lock.copyFailed)
  }
}

/** Ce qu'un brouillon sait du verrou sous lequel il s'écrit. */
export type PartLock = {
  phase: LockState["phase"]
  lost: boolean
  // La révision de ce brouillon dans la base, d'après les autres (null : rien à suivre).
  serverRev: number | null
  notifyLost: () => void
}

/**
 * Un brouillon et ses réglages, tenus à jour avec la base sous un verrou tenu ailleurs (celui du
 * contenu, dans useDraftSync) : l'enregistrement
 * automatique, la relecture quand quelqu'un d'autre a écrit, la reprise après « Reprendre la
 * main » (resumeSignal change), et « Copier mon texte » quand la main est perdue. session :
 * l'ouverture de l'éditeur qui tient le verrou. afterSave : ce qui est relu après chaque
 * enregistrement (listes, plans…).
 */
export function usePartDraft({
  initial,
  session,
  lock,
  resumeSignal,
  afterSave,
}: {
  initial: Content
  session: string
  lock: PartLock
  resumeSignal: number
  afterSave: () => void
}) {
  const contentId = initial.id
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()

  const [draft, setDraft] = useState<Draft>(initial.draft)
  // Réglages du contenu (niveau d'accès, adresse) : enregistrés avec le brouillon.
  const [initialSettings] = useState(() => settingsOf(initial))
  const [settings, setSettings] = useState<ContentSettings>(initialSettings)
  // Les réglages tels qu'ils sont dans la base : seuls ceux qui changent partent.
  const savedSettings = useRef<ContentSettings>(initialSettings)
  // Les réglages du dernier envoi (pour reconnaître le refus d'un réglage).
  const sentSettings = useRef<SettingsPayload | null>(null)
  const [refusedSlug, setRefusedSlug] = useState<RefusedSlug | null>(null)
  // Révision du brouillon affiché (celle de la base au dernier chargement ou enregistrement).
  const [loadedRev, setLoadedRev] = useState(initial.draft_rev)
  // Change à chaque rechargement depuis la base : les blocs repartent du nouveau brouillon.
  const [viewKey, setViewKey] = useState(0)
  // Ce qui n'était pas enregistré quand on a perdu la main (« Copier mon texte »).
  const [stash, setStash] = useState<Draft | null>(null)
  // La dernière valeur venue de la base ou confiée à l'enregistrement : un rendu qui ne la
  // change pas n'est pas une modification à enregistrer.
  const synced = useRef<EditorValue>({
    draft: initial.draft,
    settings: initialSettings,
  })
  // Vrai après « Reprendre la main » ou « Modifier » : l'enregistrement reprend.
  const resume = useRef(false)

  const autosave = useAutosave(
    { rev: initial.draft_rev, savedAt: initial.draft_saved_at },
    {
      onSaved: (result, saved) => {
        setLoadedRev(result.rev)
        savedSettings.current = saved.settings
        queryClient.setQueryData<Content | null>(
          contentKeys.detail(contentId),
          (old) =>
            old && {
              ...old,
              draft: saved.draft,
              title: saved.draft.title,
              draft_rev: result.rev,
              draft_saved_at: result.savedAt,
              access_chosen: saved.settings.accessChosen,
              access_level_id: saved.settings.accessLevelId,
              slug: saved.settings.slug,
              category_ids: saved.settings.categoryIds,
            }
        )
        afterSave()
      },
      onStopped: (error) => checkAccess(error),
      // L'éditeur fermé sans que la dernière modification ait pu partir : le message reste
      // après la fermeture, avec « Copier mon texte ».
      onUnsavedAtClose: (value) =>
        toast.error(texts.editor.save.unsavedAtClose, {
          duration: Infinity,
          action: {
            label: texts.editor.lock.copy,
            onClick: () => void copyDraft(value.draft),
          },
        }),
    },
    // Les réglages envoyés sont ceux qui diffèrent de la base au moment de l'envoi : une
    // valeur rejouée après une réponse perdue repart avec les mêmes.
    (value, baseRev) => {
      const payload = settingsDiff(savedSettings.current, value.settings)
      sentSettings.current = payload
      return saveCheckedDraft(contentId, session, value.draft, baseRev, payload)
    }
  )
  const saving = autosave.controller
  const { phase, serverRev, notifyLost } = lock

  // serverRev ne suit que les autres (edit-lock.ts) : nos propres enregistrements, vus par
  // Realtime avant leur réponse, ne rendent pas l'aperçu non modifiable.
  const editable =
    phase === "mine" &&
    autosave.state.status !== "stopped" &&
    (serverRev ?? loadedRev) <= loadedRev

  // Chaque modification du brouillon ou des réglages part à l'enregistrement automatique.
  useEffect(() => {
    const last = synced.current
    if (draft === last.draft && settings === last.settings) return
    synced.current = { draft, settings }
    saving.change(synced.current)
  }, [draft, settings, saving])

  // Un réglage refusé (adresse prise ou invalide, formule supprimée) : la base refuse tout
  // l'envoi. Le réglage revient à sa valeur enregistrée et le brouillon repart sans lui ;
  // sinon chaque enregistrement suivant le renverrait et serait refusé à son tour.
  const failedError =
    autosave.state.status === "failed" ? autosave.state.error : null
  useEffect(() => {
    const sent = sentSettings.current
    const code = failedError?.code
    if (!failedError || !sent || !code) return
    const saved = savedSettings.current
    const latest = synced.current.settings
    let next = latest
    if (SLUG_REFUSALS.has(code) && sent.slug !== undefined) {
      setRefusedSlug({ slug: sent.slug, message: failedError.message })
      if (latest.slug === sent.slug) next = { ...latest, slug: saved.slug }
    } else if (
      code === "categorie_invalide" &&
      sent.category_ids !== undefined
    ) {
      // Une catégorie a été supprimée entre-temps ([D28]) : la liste est relue, et le choix
      // revient à celui de la base (qui l'a déjà perdue).
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      if (sameCategories(latest.categoryIds, sent.category_ids)) {
        next = { ...latest, categoryIds: saved.categoryIds }
      }
    } else if (
      code === "niveau_invalide" &&
      sent.access_level_id !== undefined
    ) {
      void queryClient.invalidateQueries({ queryKey: accessLevelsKey })
      if (
        latest.accessChosen &&
        latest.accessLevelId === sent.access_level_id
      ) {
        next = {
          ...latest,
          accessChosen: saved.accessChosen,
          accessLevelId: saved.accessLevelId,
        }
      }
    } else {
      return
    }
    sentSettings.current = null
    toast.error(failedError.message, {
      description: texts.publication.settings.refused,
    })
    // Le réglage revient en arrière : l'effet ci-dessus renvoie le brouillon. Sinon, un réglage
    // plus récent attend déjà : on le renvoie.
    if (next !== latest) setSettings(next)
    else saving.change(synced.current)
  }, [failedError, queryClient, saving])

  // La base a refusé l'enregistrement parce qu'un autre a pris la main.
  useEffect(() => {
    if (autosave.state.error?.code === "verrou_perdu") notifyLost()
  }, [autosave.state.error, notifyLost])

  // Main perdue : plus d'enregistrement ; ce qui est à l'écran reste copiable.
  useEffect(() => {
    if (lock.lost) saving.stop()
  }, [lock.lost, saving])

  /**
   * Relit le brouillon dans la base. Une vraie lecture à chaque appel (jamais celle d'une
   * relecture déjà en cours, qui peut être plus ancienne), hors de la requête observée par la
   * page : son échec ne ferme pas l'éditeur.
   */
  const fetchFresh = useCallback(async () => {
    const fresh = await getContent(contentId)
    if (fresh && !fresh.deleted_at) {
      queryClient.setQueryData(contentKeys.detail(contentId), fresh)
    }
    return fresh
  }, [queryClient, contentId])

  /** Remplace le brouillon affiché par celui de la base. */
  const applyFresh = useCallback(
    (fresh: Content | null) => {
      // Une lecture plus ancienne que la révision affichée (arrivée en retard) : sans effet.
      if (!fresh || fresh.draft_rev < saving.state.rev) return
      const pending = saving.unsavedValue
      if (pending) setStash(pending.draft)
      const freshSettings = settingsOf(fresh)
      savedSettings.current = freshSettings
      synced.current = { draft: fresh.draft, settings: freshSettings }
      saving.reset(fresh.draft_rev, fresh.draft_saved_at)
      setDraft(fresh.draft)
      setSettings(freshSettings)
      setRefusedSlug(null)
      setLoadedRev(fresh.draft_rev)
      setViewKey((key) => key + 1)
    },
    [saving]
  )

  /** Relit le brouillon à la demande (« Réessayer », « Revenir à cette version »). */
  const reload = () => {
    void fetchFresh()
      .then(applyFresh)
      .catch((error: unknown) => {
        checkAccess(error)
        toast.error(texts.editor.lock.reloadFailed)
      })
  }

  // Le brouillon a changé dans la base (quelqu'un d'autre écrit) : on le relit.
  const mustReload =
    serverRev !== null &&
    serverRev > loadedRev &&
    !(
      phase === "mine" &&
      autosave.state.status !== "stopped" &&
      autosave.state.unsaved
    )
  // Relu tant que la révision affichée (loadedRev) est en retard ; nouvel essai après un échec.
  // En attendant, le brouillon reste en lecture seule : un échec le dit au-dessus du téléphone.
  const [reloadAttempt, setReloadAttempt] = useState(0)
  const [reloadFailed, setReloadFailed] = useState(false)
  useEffect(() => {
    if (!mustReload) return
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | undefined
    fetchFresh()
      .then((fresh) => {
        if (cancelled) return
        setReloadFailed(false)
        applyFresh(fresh)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          checkAccess(error)
          setReloadFailed(true)
          retry = setTimeout(
            () => setReloadAttempt((attempt) => attempt + 1),
            RELOAD_RETRY_MS
          )
        }
      })
    return () => {
      cancelled = true
      clearTimeout(retry)
    }
  }, [
    mustReload,
    serverRev,
    loadedRev,
    reloadAttempt,
    fetchFresh,
    applyFresh,
    checkAccess,
  ])

  // « Reprendre la main » ou « Modifier » : l'enregistrement reprendra (effet ci-dessous).
  const lastResume = useRef(resumeSignal)
  useEffect(() => {
    if (resumeSignal === lastResume.current) return
    lastResume.current = resumeSignal
    resume.current = true
  }, [resumeSignal])

  // Main reprise sans que personne n'ait écrit entre-temps : l'enregistrement reprend là où
  // il s'était arrêté, avec ce qui est à l'écran.
  useEffect(() => {
    if (phase !== "mine" || !resume.current) return
    if (autosave.state.status !== "stopped") {
      resume.current = false
      return
    }
    if ((serverRev ?? loadedRev) > loadedRev) return
    resume.current = false
    const pending = saving.unsavedValue
    saving.reset(loadedRev, autosave.state.savedAt)
    if (pending) saving.change(pending)
  }, [
    phase,
    resumeSignal,
    serverRev,
    loadedRev,
    autosave.state.status,
    autosave.state.savedAt,
    saving,
  ])

  /**
   * Avant de publier : termine l'enregistrement en attente et renvoie la révision enregistrée.
   * En lecture seule, la révision affichée (la base refuse si elle a changé, ou si quelqu'un
   * d'autre écrit : [D14]).
   */
  const prepare = async (): Promise<number | null> => {
    if (phase !== "mine") return loadedRev
    await saving.flush()
    const state = saving.state
    if (
      state.unsaved ||
      state.status === "failed" ||
      state.status === "stopped" ||
      state.status === "offline"
    ) {
      toast.error(texts.publication.needsSaved, {
        description: state.error?.message,
      })
      return null
    }
    return state.rev
  }

  /** Enregistre des réglages avec le brouillon (sous le verrou), puis comme prepare. */
  const applySettings = async (next: ContentSettings) => {
    if (!editable) {
      toast.error(texts.publication.levelNeedsLock)
      return null
    }
    setSettings(next)
    synced.current = { draft, settings: next }
    saving.change(synced.current)
    return prepare()
  }

  // Après une perte de main : ce qui n'était pas enregistré (encore à l'écran, ou mis de côté
  // quand le brouillon a été relu).
  const lostOrStopped = lock.lost || autosave.state.status === "stopped"
  const canCopy =
    stash !== null || (lostOrStopped && saving.unsavedValue !== null)
  const copy = () => copyDraft(saving.unsavedValue?.draft ?? stash ?? draft)

  return {
    draft,
    setDraft,
    settings,
    setSettings,
    refusedSlug,
    setRefusedSlug,
    loadedRev,
    viewKey,
    autosave: autosave.state,
    saving,
    editable,
    mustReload,
    reloadFailed,
    reload,
    prepare,
    applySettings,
    canCopy,
    copy,
    dismissStash: () => setStash(null),
  }
}
