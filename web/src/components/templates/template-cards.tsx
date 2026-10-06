import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileText, Files, RefreshCw } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"

import { LoadState } from "@/components/load-state"
import { PanelCard } from "@/components/panel-card"
import { useAccessCheck } from "@/components/team/use-access-check"
import { templateSortIcons } from "@/components/templates/sort-icons"
import { useTemplateUses } from "@/components/templates/use-template-uses"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ContentError, contentKeys } from "@/lib/contents/api"
import {
  pushTemplate,
  templateKeys,
  type TemplateFor,
  type TemplateSort,
} from "@/lib/contents/templates"
import { formatDateTime } from "@/lib/dates"
import { kickFiles, mediaKeys } from "@/lib/media/api"
import { templateOutdatedRead } from "@/lib/reads"
import { contentEditorPath, contentSection, sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.templates.editor
const sorts = texts.templates.sorts

/**
 * La sorte d'un modèle, en bas de la colonne de droite de son éditeur (éditeur du Fil) : son
 * icône et son nom, à la place de l'état de publication (un modèle ne se publie pas).
 */
export function TemplateSortBadge({ sort }: { sort: TemplateSort }) {
  const Icon = templateSortIcons[sort]
  return (
    <Badge variant="outline" data-template-sort={sort} className="min-w-0">
      <Icon aria-hidden data-icon="inline-start" />
      <span className="truncate">{sorts[sort].title}</span>
    </Badge>
  )
}

/**
 * La carte « Sorte » d'un modèle (ADMIN § 4) : ce qu'il est, choisi à sa création, et pour un
 * point de départ, la section qu'il sert à créer.
 */
export function TemplateSortCard({
  sort,
  templateFor,
}: {
  sort: TemplateSort
  templateFor: TemplateFor | null
}) {
  return (
    <PanelCard
      id="modele-sorte"
      icon={templateSortIcons[sort]}
      title={sorts[sort].title}
    >
      <p className="text-xs text-muted-foreground">{sorts[sort].description}</p>
      {sort === "starter" && templateFor && (
        <p className="mt-1.5 text-xs">
          {labels.starterFor(texts.templates.sections[templateFor])}
        </p>
      )}
    </PanelCard>
  )
}

/**
 * La carte « Utilisé dans N brouillons » d'un bloc partagé (ADMIN § 5) : les brouillons, avec un
 * lien vers chacun, et, quand des contenus en ligne en ont une copie différente, « Mettre à jour
 * ces N contenus dans l'app » (avec confirmation qui les liste). Rien ne change dans l'app avant
 * ce clic.
 */
export function TemplateUsesCard({ templateId }: { templateId: string }) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [confirming, setConfirming] = useState(false)
  const uses = useTemplateUses(templateId, true)
  const outdated = useQuery({
    ...templateOutdatedRead(templateId),
    refetchInterval: 30_000,
  })
  const push = useMutation({
    mutationFn: () => pushTemplate(templateId),
    onSuccess: (count) => {
      setConfirming(false)
      toast.success(labels.outdated.pushed(count))
      // Un fichier cité pour la première fois par un contenu gratuit devient public.
      if (count > 0) void kickFiles()
    },
    onError: (error) => {
      setConfirming(false)
      toast.error(error.message, {
        description:
          error instanceof ContentError
            ? (error.detail ?? undefined)
            : undefined,
      })
      checkAccess(error)
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: templateKeys.outdated(templateId),
        }),
        queryClient.invalidateQueries({ queryKey: contentKeys.all }),
        queryClient.invalidateQueries({ queryKey: mediaKeys.allUses }),
      ]),
  })

  const stale = outdated.data ?? []

  return (
    <PanelCard
      id="modele-utilisations"
      icon={Files}
      title={uses.data ? labels.usedIn(uses.data.length) : labels.usesTitle}
    >
      {uses.data === undefined ? (
        <LoadState
          query={uses}
          failed={labels.usesFailed}
          rows={2}
          rowClassName="h-6 w-full"
        />
      ) : uses.data.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.usesNone}</p>
      ) : (
        <ul className="text-sm" data-template-uses={uses.data.length}>
          {uses.data.map((use) => {
            const section = contentSection(use.kind)
            const Icon = section ? sections[section].icon : FileText
            const name = use.title.trim() || texts.common.untitled
            const path = use.inTrash
              ? null
              : contentEditorPath(use.kind, use.id)
            return (
              <li
                key={use.id}
                data-template-use={use.id}
                className="flex items-center gap-2 py-1"
              >
                <Icon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate">
                  {path ? (
                    <Link
                      to={path}
                      className="underline-offset-4 hover:underline"
                    >
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                  {use.inTrash && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({labels.inTrash})
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {outdated.isError && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {labels.outdated.failed}
        </p>
      )}
      {stale.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={push.isPending}
          data-template-outdated={stale.length}
          onClick={() => setConfirming(true)}
        >
          {push.isPending ? <Spinner /> : <RefreshCw />}
          {labels.outdated.push(stale.length)}
        </Button>
      )}

      <AlertDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!push.isPending) setConfirming(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {labels.outdated.title(stale.length)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {labels.outdated.description(stale.length)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {stale.map((item) => (
              <li key={item.content_id} data-outdated-content={item.content_id}>
                {item.title?.trim() || texts.common.untitled}
                <span className="text-muted-foreground">
                  {" "}
                  (
                  {labels.outdated.version(
                    item.version_number,
                    formatDateTime(item.published_at)
                  )}
                  )
                </span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={push.isPending}>
              {texts.common.cancel}
            </AlertDialogCancel>
            <Button disabled={push.isPending} onClick={() => push.mutate()}>
              {push.isPending ? <Spinner /> : <RefreshCw />}
              {labels.outdated.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelCard>
  )
}
