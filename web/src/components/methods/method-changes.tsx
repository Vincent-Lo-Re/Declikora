import {
  CircleMinus,
  CirclePlus,
  GitCompare,
  ListOrdered,
  Pencil,
  TriangleAlert,
} from "lucide-react"
import { cn } from "cn"
import { useId, useState, type ReactNode } from "react"
import { Link } from "react-router"

import type { MethodPublication } from "@/components/editor/use-publication"
import { PanelCard } from "@/components/panel-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { contentProblemText } from "@/lib/contents/api"
import {
  CHANGES_SHOWN,
  changesView,
  shownProblem,
  type ChangeGroup,
  type ChangesView,
  type PreviewChange,
  type PreviewRow,
} from "@/lib/contents/outline"
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
        <ChangesCount method={method} />
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <ChangesBody method={method} onOpen={onOpen} />
    </section>
  )
}

/**
 * Dans la colonne de droite de l'écran d'une méthode (ADMIN § 4) : la même liste, toujours là,
 * relue pendant qu'on travaille (les autres écrivent ses leçons) ; plus courte (qui a modifié et
 * quand : dans la fenêtre Publier).
 */
export function MethodChangesCard({ method }: { method: MethodPublication }) {
  return (
    <PanelCard
      id="methode-changements"
      icon={GitCompare}
      title={labels.cardTitle}
      aside={method.fetching && <Spinner className="size-3" />}
    >
      <ChangesBody method={method} compact />
    </PanelCard>
  )
}

/** Le nombre de changements, avec un tourniquet pendant la relecture. */
function ChangesCount({ method }: { method: MethodPublication }) {
  const { preview } = method
  // La méthode entre dans l'app : le résumé dit déjà ce qui arrive.
  if (!preview || preview.length === 0) return null
  if (changesView(preview).kind === "entry") return null
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {method.fetching && <Spinner className="size-3" />}
      {labels.count(preview.length)}
    </span>
  )
}

function ChangesBody({
  method,
  onOpen,
  compact = false,
}: {
  method: MethodPublication
  onOpen?: () => void
  compact?: boolean
}) {
  const { preview } = method
  // « Corrige d'abord ce qui est signalé » : seulement s'il y a une ligne signalée ici.
  const problems = preview?.filter((row) => shownProblem(row) !== null) ?? []
  return (
    <>
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
        <div className={cn(!compact && "max-h-72 overflow-y-auto")}>
          <ChangesList
            view={changesView(preview)}
            onOpen={onOpen}
            compact={compact}
          />
        </div>
      )}
      {problems.length > 0 && (
        <Alert variant="destructive" className="mt-2">
          <TriangleAlert />
          <AlertDescription className="text-foreground">
            {labels.blocked}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}

/**
 * La liste elle-même (QCM du 04/10/2026) : un résumé tant que la méthode entre dans l'app (avec
 * les lignes qui ont un problème), sinon la fiche puis les groupes par sorte de changement.
 */
function ChangesList({
  view,
  onOpen,
  compact,
}: {
  view: ChangesView
  onOpen?: () => void
  compact: boolean
}) {
  if (view.kind === "entry") {
    return (
      <div className="space-y-2">
        <p className="flex items-start gap-2 text-sm" data-method-entry>
          <CirclePlus
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <span>{labels.entry(view.chapters, view.lessons)}</span>
        </p>
        {view.problems.length > 0 && (
          <ChangeRows rows={view.problems} onOpen={onOpen} compact={compact} />
        )}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {view.method.length > 0 && (
        <ChangeRows rows={view.method} onOpen={onOpen} compact={compact} />
      )}
      {view.groups.map((group) => (
        <ChangeGroupList
          key={group.change}
          group={group}
          onOpen={onOpen}
          compact={compact}
        />
      ))}
    </div>
  )
}

function ChangeRows({
  rows,
  onOpen,
  compact,
}: {
  rows: PreviewRow[]
  onOpen?: () => void
  compact: boolean
}) {
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((row) => (
        <ChangeRow
          key={`${row.elementId}-${row.change}`}
          row={row}
          onOpen={onOpen}
          compact={compact}
        />
      ))}
    </ul>
  )
}

/** Un groupe (« Modifications (12) ») : ses premières lignes, puis « Voir tout ». */
function ChangeGroupList({
  group,
  onOpen,
  compact,
}: {
  group: ChangeGroup
  onOpen?: () => void
  compact: boolean
}) {
  const titleId = useId()
  const [all, setAll] = useState(false)
  const count = group.rows.length
  const rows = all ? group.rows : group.rows.slice(0, CHANGES_SHOWN)
  return (
    <section
      aria-labelledby={titleId}
      className="space-y-1.5"
      data-change-group={group.change}
    >
      <h4
        id={titleId}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground [&_svg]:size-3.5"
      >
        {changeIcons[group.change]}
        {labels.groupTitle(labels.groups[group.change], count)}
      </h4>
      <ChangeRows rows={rows} onOpen={onOpen} compact={compact} />
      {count > CHANGES_SHOWN && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          aria-expanded={all}
          onClick={() => setAll((shown) => !shown)}
        >
          {all ? labels.showLess : labels.showAll(count)}
        </Button>
      )}
    </section>
  )
}

function ChangeRow({
  row,
  onOpen,
  compact,
}: {
  row: PreviewRow
  onOpen?: () => void
  compact: boolean
}) {
  const label = rowLabel(row)
  const path =
    row.kind === "method" ? null : contentEditorPath(row.kind, row.elementId)
  const problem = shownProblem(row)
  return (
    <li
      className="space-y-1 px-3 py-2 text-sm"
      data-change={row.change}
      data-element-id={row.elementId}
    >
      {/* La fiche a son icône ; un chapitre ou une leçon a celle de son groupe. */}
      <div className="flex min-w-0 items-start gap-2">
        {row.kind === "method" && (
          <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">
            {changeIcons[row.change]}
          </span>
        )}
        <span className="min-w-0">
          <span className="font-medium break-words">{label}</span>
          {row.kind === "lesson" && row.chapterTitle && (
            <span className="text-muted-foreground">
              {" "}
              {labels.inChapter(row.chapterTitle)}
            </span>
          )}
        </span>
      </div>
      {row.savedAt && !compact && (
        <p className="text-xs text-muted-foreground">
          {labels.savedAt(formatDateTime(row.savedAt))}
          {row.savedByName && ` ${texts.common.savedBy(row.savedByName)}`}
        </p>
      )}
      {problem && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
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
