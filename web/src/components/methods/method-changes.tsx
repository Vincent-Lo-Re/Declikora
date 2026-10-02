import {
  CircleMinus,
  CirclePlus,
  ListOrdered,
  Pencil,
  TriangleAlert,
} from "lucide-react"
import { useId, type ReactNode } from "react"
import { Link } from "react-router"

import type { MethodPublication } from "@/components/editor/use-publication"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { contentProblemText } from "@/lib/contents/api"
import type { PreviewChange, PreviewRow } from "@/lib/contents/outline"
import { formatDateTime } from "@/lib/dates"
import { contentEditorPath } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.methods.changes

const changeIcons: Record<PreviewChange, ReactNode> = {
  new: <CirclePlus aria-hidden />,
  modified: <Pencil aria-hidden />,
  reordered: <ListOrdered aria-hidden />,
  removed: <CircleMinus aria-hidden />,
}

/** Le nom d'une ligne : la fiche de la méthode, ou « Leçon « Respirer » ». */
function rowLabel(row: PreviewRow): string {
  if (row.kind === "method") {
    return row.change === "new" || row.change === "modified"
      ? labels.method[row.change]
      : labels.method.reordered
  }
  const title = row.title.trim() || texts.common.untitled
  return labels.row(labels.kinds[row.kind], title)
}

/**
 * Avant de publier ou de programmer une méthode : ce qui va changer dans l'app (neufs, modifiés,
 * retirés, plan rangé autrement), avec qui a modifié chaque élément et quand, et ce qui ferait
 * refuser la publication ([D29], publish_preview).
 */
export function MethodChanges({
  method,
  onOpen,
  note,
}: {
  method: MethodPublication
  // Avant d'ouvrir un élément (la fenêtre se ferme).
  onOpen: () => void
  note?: string
}) {
  const titleId = useId()
  const { preview } = method
  const problems = preview?.filter((row) => row.problem !== null) ?? []
  return (
    <section
      aria-labelledby={titleId}
      className="space-y-2"
      data-method-changes
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={titleId} className="font-medium">
          {labels.title}
        </h3>
        {preview && preview.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {method.fetching && <Spinner className="size-3" />}
            {labels.count(preview.length)}
          </span>
        )}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {method.failed ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-destructive">
            {labels.failed}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void method.refresh()}
          >
            {texts.common.retry}
          </Button>
        </div>
      ) : preview === undefined ? (
        <div className="space-y-2" aria-label={labels.loading}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : preview.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-nothing-to-publish>
          {method.fetching ? labels.loading : labels.nothing}
        </p>
      ) : (
        <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
          {preview.map((row) => (
            <ChangeRow
              key={`${row.elementId}-${row.change}`}
              row={row}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
      {problems.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription className="text-foreground">
            {labels.blocked}
          </AlertDescription>
        </Alert>
      )}
    </section>
  )
}

function ChangeRow({ row, onOpen }: { row: PreviewRow; onOpen: () => void }) {
  const label = rowLabel(row)
  const path =
    row.kind === "method" ? null : contentEditorPath(row.kind, row.elementId)
  // Le titre et l'image de présentation de la fiche sont déjà signalés au-dessus (avec « Écrire
  // le titre » et « Choisir l'image »).
  const problem =
    row.problem &&
    !(
      row.kind === "method" &&
      (row.problem === "image_de_presentation_manquante" ||
        row.problem === "titre_manquant")
    )
      ? row.problem
      : null
  return (
    <li
      className="space-y-1 px-3 py-2 text-sm"
      data-change={row.change}
      data-element-id={row.elementId}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">
            {changeIcons[row.change]}
          </span>
          <span className="min-w-0">
            <span className="font-medium break-words">{label}</span>
            {row.kind === "lesson" && row.chapterTitle && (
              <span className="text-muted-foreground">
                {" "}
                {labels.inChapter(row.chapterTitle)}
              </span>
            )}
          </span>
        </span>
        {row.kind !== "method" && (
          <Badge
            variant={row.change === "removed" ? "outline" : "secondary"}
            className="shrink-0"
          >
            {labels.changes[row.change]}
          </Badge>
        )}
      </div>
      {row.savedAt && (
        <p className="pl-6 text-xs text-muted-foreground">
          {labels.savedAt(formatDateTime(row.savedAt))}
          {row.savedByName && ` ${texts.common.savedBy(row.savedByName)}`}
        </p>
      )}
      {problem && (
        <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-destructive">
          <span className="flex items-start gap-1.5">
            <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>{contentProblemText(problem, row.problemDetail)}</span>
          </span>
          {path && (
            <Link
              to={path}
              onClick={onOpen}
              className="font-medium text-foreground underline underline-offset-4"
              aria-label={labels.open(label)}
            >
              {texts.methods.outline.open}
            </Link>
          )}
        </div>
      )}
    </li>
  )
}
