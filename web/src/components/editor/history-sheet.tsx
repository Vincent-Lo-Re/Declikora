import { useMutation, useQuery } from "@tanstack/react-query"
import { History, RotateCcw } from "lucide-react"
import { useState } from "react"

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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { contentKeys } from "@/lib/contents/api"
import {
  listVersions,
  versionOriginLabel,
  type VersionItem,
} from "@/lib/contents/publication"
import { formatDateTime } from "@/lib/dates"
import { texts } from "@/texts"

const labels = texts.publication.history

/**
 * Historique : les versions publiées (numéro, origine, auteur, date), et « Revenir à cette
 * version », qui la recopie dans le brouillon sans rien publier. Il faut tenir le verrou.
 */
export function HistorySheet({
  open,
  onOpenChange,
  contentId,
  liveVersionId,
  canRevert,
  onRevert,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentId: string
  liveVersionId: string | null
  canRevert: boolean
  onRevert: (version: VersionItem) => Promise<void>
}) {
  const [confirming, setConfirming] = useState<VersionItem | null>(null)
  const versions = useQuery({
    queryKey: contentKeys.versions(contentId),
    queryFn: () => listVersions(contentId),
    enabled: open,
  })
  const revert = useMutation({
    mutationFn: onRevert,
    onSettled: () => setConfirming(null),
  })

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader className="pr-12">
            <SheetTitle>{labels.title}</SheetTitle>
            <SheetDescription>{labels.description}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6">
            {!canRevert && (versions.data?.length ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground">
                {labels.needsLock}
              </p>
            )}
            {versions.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : versions.isError ? (
              <div className="space-y-2">
                <p role="alert" className="text-sm text-destructive">
                  {labels.loadFailed}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => versions.refetch()}
                >
                  {labels.retry}
                </Button>
              </div>
            ) : versions.data.length === 0 ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <History />
                  </EmptyMedia>
                  <EmptyDescription>{labels.empty}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ol className="space-y-2" aria-label={labels.title}>
                {versions.data.map((version) => (
                  <li
                    key={version.id}
                    className="space-y-2 rounded-lg border p-3 text-sm"
                    data-version={version.number}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {labels.version(version.number)}
                      </span>
                      {version.id === liveVersionId && (
                        <Badge variant="secondary" className="gap-1.5">
                          <span
                            aria-hidden
                            className="size-1.5 rounded-full bg-emerald-500"
                          />
                          {labels.live}
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        {versionOriginLabel(version.origin)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {formatDateTime(version.published_at)}
                      {version.published_by_name &&
                        ` ${labels.by(version.published_by_name)}`}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canRevert || revert.isPending}
                      aria-label={labels.revertItem(version.number)}
                      onClick={() => setConfirming(version)}
                    >
                      <RotateCcw />
                      {labels.revert}
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(next) => {
          if (!next && !revert.isPending) setConfirming(null)
        }}
      >
        {confirming && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {labels.confirm.title(confirming.number)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {labels.confirm.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={revert.isPending}>
                {texts.common.cancel}
              </AlertDialogCancel>
              <Button
                disabled={revert.isPending}
                onClick={() => revert.mutate(confirming)}
              >
                {revert.isPending && <Spinner />}
                {labels.confirm.confirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}
