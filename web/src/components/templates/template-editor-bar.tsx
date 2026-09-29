import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronDown, RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useAccessCheck } from "@/components/team/use-access-check"
import { useTemplateUses } from "@/components/templates/use-template-uses"
import { UsesList } from "@/components/templates/uses-list"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { ContentError, contentKeys } from "@/lib/contents/api"
import {
  getTemplateOutdated,
  pushTemplate,
  templateKeys,
  type TemplateFor,
  type TemplateSort,
} from "@/lib/contents/templates"
import { formatDateTime } from "@/lib/dates"
import { kickFiles, mediaKeys } from "@/lib/media/api"
import { texts } from "@/texts"

const labels = texts.templates.editor

/** La sorte d'un modèle (et la section d'un point de départ), dans l'en-tête de son éditeur. */
export function TemplateSortBadge({
  sort,
  templateFor,
}: {
  sort: TemplateSort
  templateFor: TemplateFor | null
}) {
  return (
    <Badge variant="secondary" data-template-sort={sort}>
      {sort === "starter" && templateFor
        ? labels.starterFor(texts.templates.sections[templateFor])
        : texts.templates.sorts[sort].title}
    </Badge>
  )
}

/**
 * En haut de l'éditeur d'un bloc identique partout : « Utilisé dans N brouillons » (la liste,
 * avec un lien vers chacun) et, quand des contenus en ligne en ont une copie différente,
 * « Mettre à jour ces N contenus dans l'app » (avec confirmation qui les liste). Rien ne change
 * dans l'app avant ce clic (ADMIN § 5).
 */
export function SharedTemplateBar({ templateId }: { templateId: string }) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [confirming, setConfirming] = useState(false)
  const uses = useTemplateUses(templateId, true)
  const outdated = useQuery({
    queryKey: templateKeys.outdated(templateId),
    queryFn: () => getTemplateOutdated(templateId),
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
        queryClient.invalidateQueries({ queryKey: [...mediaKeys.all, "uses"] }),
      ]),
  })

  const count = uses.data?.length ?? 0
  const stale = outdated.data ?? []

  return (
    <div className="flex items-center gap-2">
      {uses.data && (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={count === 0}
            render={<Button variant="ghost" size="sm" />}
            data-template-uses={count}
          >
            {labels.usedIn(count)}
            {count > 0 && <ChevronDown />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-3">
            <UsesList uses={uses.data} title={labels.usedInList} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {outdated.isError && (
        <span role="alert" className="text-xs text-destructive">
          {labels.outdated.failed}
        </span>
      )}
      {stale.length > 0 && (
        <Button
          size="sm"
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
              {labels.outdated.description}
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
    </div>
  )
}
