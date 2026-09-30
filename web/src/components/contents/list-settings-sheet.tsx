import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/auth/auth-context"
import {
  ContentSettingsSheet,
  type RefusedSlug,
  type SectionCategories,
} from "@/components/editor/content-settings-sheet"
import { useAccessCheck } from "@/components/team/use-access-check"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { AccessLevel } from "@/lib/access-levels"
import {
  ContentError,
  contentKeys,
  lockStatus,
  type ContentKind,
  type ContentListItem,
  type ContentSettings,
} from "@/lib/contents/api"
import { getPublication } from "@/lib/contents/publication"
import { saveFromList } from "@/lib/contents/settings"
import { errorMessage } from "@/lib/errors"
import { texts } from "@/texts"

const labels = texts.contentList.settings

// Une adresse refusée par la base : le champ la garde, avec la raison.
const SLUG_REFUSALS = new Set(["adresse_prise", "adresse_invalide"])

/**
 * « Réglages » depuis le menu d'une ligne : le titre et les mêmes réglages que dans l'éditeur,
 * enregistrés d'un coup par « Enregistrer » (le brouillon est pris le temps de l'enregistrement,
 * puis rendu). Si quelqu'un l'écrit en ce moment, la glissière est en lecture seule, avec son nom.
 * Montée avec key={item.id} : chaque ouverture repart du contenu de la ligne.
 */
export function ListSettingsSheet({
  item,
  kind,
  categories,
  levels,
  levelsFailed,
  onClose,
}: {
  item: ContentListItem
  kind: ContentKind
  categories?: SectionCategories
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const myId = useAuth().session?.user.id ?? ""
  const [title, setTitle] = useState(item.title)
  const [settings, setSettings] = useState<ContentSettings>({
    accessChosen: item.access_chosen,
    accessLevelId: item.access_level_id,
    slug: item.slug,
    categoryIds: item.category_ids,
    // Sans objet dans une liste (chapitres et leçons) : jamais envoyés.
    inApp: false,
    isFree: false,
  })
  const [refusedSlug, setRefusedSlug] = useState<RefusedSlug | null>(null)
  const [held, setHeld] = useState<string | null>(null)

  // Qui écrit ce contenu en ce moment : lu à l'ouverture (session neuve, qui ne tient rien).
  const [session] = useState(() => crypto.randomUUID())
  const lock = useQuery({
    queryKey: [...contentKeys.detail(item.id), "verrou", session],
    queryFn: () => lockStatus(item.id, session),
    staleTime: 0,
  })
  const holder =
    lock.data?.is_active && lock.data.holder_id !== null ? lock.data : null
  const heldMessage =
    held ??
    (holder
      ? holder.holder_id === myId
        ? labels.heldSelf
        : labels.heldBy(holder.holder_name ?? texts.editor.lock.someone)
      : null)
  const publication = useQuery({
    queryKey: contentKeys.publication(item.id),
    queryFn: () => getPublication(item.id),
  })

  const save = useMutation({
    mutationFn: () =>
      saveFromList(item.id, myId, labels, title.trim(), {
        accessChosen: settings.accessChosen,
        accessLevelId: settings.accessLevelId,
        slug: settings.slug,
        categoryIds: settings.categoryIds,
      }),
    onSuccess: (changed) => {
      toast.success(changed ? labels.saved(title.trim()) : labels.unchanged)
      void queryClient.invalidateQueries({ queryKey: contentKeys.all })
      onClose()
    },
    onError: (error) => {
      checkAccess(error)
      if (error instanceof ContentError && error.code === "verrou_tenu") {
        setHeld(error.detail ?? error.message)
      } else if (
        error instanceof ContentError &&
        error.code !== null &&
        SLUG_REFUSALS.has(error.code)
      ) {
        setRefusedSlug({ slug: settings.slug, message: error.message })
      } else {
        toast.error(errorMessage(error))
      }
    },
  })

  const titleMissing = title.trim() === ""
  const editable = !lock.isPending && heldMessage === null && !save.isPending

  return (
    <ContentSettingsSheet
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose()
      }}
      focus={null}
      kind={kind}
      title={title}
      onTitleChange={setTitle}
      titleError={
        titleMissing ? texts.publication.settings.titleRequired : null
      }
      settings={settings}
      editable={editable}
      notice={lock.isPending ? labels.checking : (heldMessage ?? undefined)}
      levels={levels}
      levelsFailed={levelsFailed}
      live={publication.data?.live ?? null}
      refusedSlug={refusedSlug}
      categories={categories}
      onChange={(next) => {
        if (next.slug !== settings.slug) setRefusedSlug(null)
        setSettings(next)
      }}
      footer={
        <>
          <Button variant="outline" disabled={save.isPending} onClick={onClose}>
            {texts.common.cancel}
          </Button>
          <Button
            disabled={!editable || titleMissing}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Spinner />}
            {labels.save}
          </Button>
        </>
      }
    />
  )
}
