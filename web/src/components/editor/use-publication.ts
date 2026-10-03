import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import type { SettingsFocus } from "@/components/editor/content-settings-sheet"
import { useAccessCheck } from "@/components/team/use-access-check"
import type { AccessLevel } from "@/lib/access-levels"
import {
  ContentError,
  contentKeys,
  type ContentKind,
  type ContentSettings,
} from "@/lib/contents/api"
import {
  getPublication,
  publicationStatus,
  publishContent,
  scheduleContent,
  unpublishContent,
  unscheduleContent,
} from "@/lib/contents/publication"
import type { PublishChecks, Requirement } from "@/lib/contents/requirements"
import { methodKeys } from "@/lib/contents/methods"
import type { PreviewRow } from "@/lib/contents/outline"
import { templateKeys } from "@/lib/contents/templates"
import { formatDateTime } from "@/lib/dates"
import { kickFiles, mediaKeys } from "@/lib/media/api"
import { texts } from "@/texts"

const labels = texts.publication

// Ce que l'éditeur donne à la publication : l'état du brouillon et de quoi l'enregistrer.
type PublicationBridge = {
  contentId: string
  kind: ContentKind
  // Faux pour un modèle : il ne se publie pas (pas de lecture de l'état de publication).
  enabled?: boolean
  // La révision la plus récente connue du brouillon (enregistrée ici ou vue dans la base).
  draftRev: number
  // Une modification attend d'être enregistrée.
  unsaved: boolean
  // On tient le verrou : les réglages peuvent être enregistrés.
  editable: boolean
  settings: ContentSettings
  // Les formules (undefined tant qu'elles ne sont pas chargées) ; levelsFailed si la lecture a
  // échoué, retryLevels pour la relancer.
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  retryLevels: () => void
  /**
   * Termine l'enregistrement en attente, puis renvoie la révision à publier (null si le
   * brouillon n'a pas pu être enregistré : l'éditeur l'a déjà dit).
   */
  prepare: () => Promise<number | null>
  /** Enregistre ces réglages avec le brouillon, puis renvoie la révision (comme prepare). */
  applySettings: (next: ContentSettings) => Promise<number | null>
  /** « Reprendre la main » (confirmé par la fenêtre du refus [D14]). */
  takeLock: () => void
  /** Ouvre les réglages du contenu (et met le focus sur l'adresse). */
  openSettings: (focus: SettingsFocus) => void
  /**
   * Ce qui manque pour publier (image de présentation, audio : [D45]) et les conseils
   * (transcription : [D46]). Absent : rien n'est exigé (page).
   */
  checks?: PublishChecks
  /** Ouvre le choix de ce qui manque (image de présentation, audio). */
  onFix?: (key: Requirement["key"]) => void
  /** Une méthode : ce qui changera dans l'app si on la publie ([D29], publish_preview). */
  method?: MethodPublication
}

/** La liste des changements d'une méthode, lue par l'éditeur (publish_preview). */
export type MethodPublication = {
  // undefined tant qu'elle n'est pas lue.
  preview: PreviewRow[] | undefined
  // Vrai si publier changerait quelque chose dans l'app (la liste, ou la fiche enregistrée
  // depuis sa dernière lecture) ; undefined tant qu'on ne le sait pas.
  pending: boolean | undefined
  // Une lecture est en cours (la liste peut dater un peu).
  fetching: boolean
  failed: boolean
  /** Relit la liste (après l'enregistrement en attente). */
  refresh: () => Promise<unknown>
}

type DialogState =
  | null
  | { type: "publish" }
  | { type: "schedule" }
  | { type: "unpublish" }
  | { type: "held"; name: string }

// Aucun choix de niveau dans la fenêtre (undefined), Gratuit (null) ou une formule.
export type LevelPick = string | null | undefined

const NO_PUBLICATION = {
  live: null,
  first_published_at: null,
  scheduled_at: null,
  schedule_error: null,
}

/**
 * La publication d'un contenu dans l'éditeur : son état (relu toutes les 30 secondes, et après
 * chaque geste), et les gestes Publier, Programmer, Annuler la programmation, Retirer de l'app.
 */
export function usePublication(bridge: PublicationBridge) {
  const { contentId, kind, settings } = bridge
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [dialog, setDialog] = useState<DialogState>(null)

  const query = useQuery({
    queryKey: contentKeys.publication(contentId),
    queryFn: () => getPublication(contentId),
    // La tâche planifiée publie (ou échoue) sans prévenir : l'état est relu régulièrement, et à
    // chaque ouverture de l'éditeur (sinon, rouvert depuis l'Accueil, il montrerait encore une
    // programmation qui a échoué entre-temps).
    staleTime: 0,
    refetchInterval: 30_000,
    enabled: bridge.enabled ?? true,
  })
  const publication = query.data ?? null
  // Pas encore lu (échec) : l'état est inconnu, jamais « Brouillon » par défaut.
  const failed = query.isError && query.data === undefined
  useEffect(() => {
    if (query.error) checkAccess(query.error)
  }, [query.error, checkAccess])
  // Une méthode : « Modifié depuis la publication » vient de la liste des changements, pas de
  // la révision de la fiche (une leçon modifiée ne change pas la fiche, [D29]).
  const pendingChanges = bridge.method?.pending
  const draftRev = Math.max(bridge.draftRev, publication?.draft_rev ?? 0)
  const status = publicationStatus(
    publication ?? NO_PUBLICATION,
    pendingChanges === false && publication?.live
      ? publication.live.draft_rev
      : draftRev,
    query.dataUpdatedAt,
    bridge.unsaved || pendingChanges === true
  )

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: contentKeys.publication(contentId),
      }),
      queryClient.invalidateQueries({
        queryKey: contentKeys.versions(contentId),
      }),
      queryClient.invalidateQueries({ queryKey: contentKeys.lists }),
      queryClient.invalidateQueries({ queryKey: mediaKeys.allUses }),
      queryClient.invalidateQueries({
        queryKey: mediaKeys.allOutdated,
      }),
      // Un contenu publié ou retiré de l'app : ses blocs identiques partout à mettre à jour.
      queryClient.invalidateQueries({ queryKey: templateKeys.allOutdated }),
      // Une méthode : son plan et la liste de ses changements.
      queryClient.invalidateQueries({ queryKey: methodKeys.all }),
    ])

  const onError = (error: Error) => {
    setDialog(null)
    if (error instanceof ContentError) {
      switch (error.code) {
        case "verrou_tenu":
          setDialog({
            type: "held",
            name: error.hint ?? texts.editor.lock.someone,
          })
          return
        case "adresse_manquante":
        case "adresse_prise":
          toast.error(error.message)
          bridge.openSettings("slug")
          return
        case "conflit_revision":
          toast.error(labels.conflict)
          return
        // [D45] et l'audio d'un épisode : la base a refusé, on ouvre le choix du fichier.
        case "image_de_presentation_manquante":
          toast.error(error.message)
          bridge.onFix?.("cover")
          return
        // [D49] : le curseur va dans le titre.
        case "titre_manquant":
          toast.error(error.message)
          bridge.onFix?.("title")
          return
        case "son_manquant":
          toast.error(error.message)
          bridge.onFix?.("audio")
          return
      }
      toast.error(error.message, { description: error.detail ?? undefined })
    } else {
      toast.error(error.message)
    }
    checkAccess(error)
  }

  /** Enregistre le niveau choisi dans la fenêtre (s'il y en a un), sinon termine l'enregistrement. */
  const saveFirst = (level: LevelPick) =>
    level === undefined
      ? bridge.prepare()
      : bridge.applySettings({
          ...settings,
          accessChosen: true,
          accessLevelId: level,
        })

  const publish = useMutation({
    mutationFn: async (level: LevelPick) => {
      const rev = await saveFirst(level)
      return rev === null ? null : publishContent(contentId, rev)
    },
    onSuccess: (result) => {
      setDialog(null)
      if (!result) return
      toast.success(labels.published(result.versionNumber))
      // Des fichiers changent d'emplacement (public ou protégé) : tout de suite.
      if (result.needsFileSync) void kickFiles()
    },
    onError,
    onSettled: refresh,
  })

  const schedule = useMutation({
    mutationFn: async ({ at, level }: { at: Date; level: LevelPick }) => {
      // Toujours terminer l'enregistrement d'abord : schedule vérifie [D45] et
      // le son sur le brouillon enregistré, pas sur celui qui est à l'écran.
      if ((await saveFirst(level)) === null) return null
      return scheduleContent(contentId, at)
    },
    onSuccess: (at) => {
      setDialog(null)
      if (at) toast.success(labels.scheduleDialog.done(formatDateTime(at)))
    },
    onError,
    onSettled: refresh,
  })

  const unschedule = useMutation({
    mutationFn: () => unscheduleContent(contentId),
    onSuccess: () =>
      toast.success(
        status.schedule.kind === "failed"
          ? labels.failureDismissed
          : labels.unscheduled
      ),
    onError,
    onSettled: refresh,
  })

  const unpublish = useMutation({
    mutationFn: () => unpublishContent(contentId),
    onSuccess: (needsFileSync) => {
      setDialog(null)
      toast.success(labels.unpublishDialog.done)
      if (needsFileSync) void kickFiles()
    },
    onError,
    onSettled: refresh,
  })

  /** Une page ne se publie (ni ne se programme) sans adresse. */
  const needsAddress = () => {
    if (kind !== "page" || settings.slug) return false
    toast.error(labels.settings.slug.missing)
    bridge.openSettings("slug")
    return true
  }

  /** Une méthode : la liste des changements est relue à l'ouverture de la fenêtre. */
  const refreshChanges = async () => {
    if (!bridge.method) return
    await bridge.prepare()
    await bridge.method.refresh()
  }

  const busy =
    publish.isPending ||
    schedule.isPending ||
    unschedule.isPending ||
    unpublish.isPending

  return {
    bridge,
    status,
    publication,
    loading: query.isPending,
    failed,
    retry: () => void query.refetch(),
    now: query.dataUpdatedAt,
    dialog,
    setDialog,
    busy,
    publish,
    schedule,
    unschedule,
    unpublish,
    startPublish: () => {
      if (needsAddress()) return
      setDialog({ type: "publish" })
      void refreshChanges()
    },
    startSchedule: () => {
      if (needsAddress()) return
      setDialog({ type: "schedule" })
      void refreshChanges()
    },
  }
}

export type PublicationControls = ReturnType<typeof usePublication>
