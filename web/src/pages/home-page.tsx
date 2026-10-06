import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { CalendarClock, FilePen, TriangleAlert } from "lucide-react"
import { useEffect, type ReactNode } from "react"
import { Link } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { LiveBadge, ScheduleBadge } from "@/components/editor/publication"
import { LoadState } from "@/components/load-state"
import { PageHeader } from "@/components/page-header"
import { useAccessCheck } from "@/components/team/use-access-check"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyDescription } from "@/components/ui/empty"
import type { HomeItem } from "@/lib/contents/home"
import {
  publicationStatus,
  scheduleErrorText,
  type PublicationStatus,
} from "@/lib/contents/publication"
import { formatDateTime } from "@/lib/dates"
import { homeDraftsRead, homeFailedRead, homeScheduledRead } from "@/lib/reads"
import { contentEditorPath, sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.home

// La tâche « publications » passe chaque minute : l'Accueil suit à peu près au même rythme.
const REFRESH_MS = 30_000

/** L'état de publication d'un contenu. */
function statusOf(item: HomeItem, now: number): PublicationStatus {
  return publicationStatus(
    {
      live:
        item.live_draft_rev === null
          ? null
          : { draft_rev: item.live_draft_rev },
      first_published_at: item.first_published_at,
      scheduled_at: item.scheduled_at,
      schedule_error: item.schedule_error,
    },
    item.draft_rev,
    now
  )
}

/**
 * Accueil : mes brouillons récents, les publications programmées (celles en attente
 * comprises, [D31]) et les programmations échouées, avec un lien vers l'éditeur de chacun.
 */
export function HomePage() {
  const { title, description } = texts.sections.home
  const { profile } = useAuth()
  const userId = profile?.id ?? ""
  const checkAccess = useAccessCheck()

  const drafts = useQuery({
    ...homeDraftsRead(userId),
    enabled: userId !== "",
    refetchInterval: REFRESH_MS,
  })
  const scheduled = useQuery({
    ...homeScheduledRead(),
    refetchInterval: REFRESH_MS,
  })
  const failed = useQuery({
    ...homeFailedRead(),
    refetchInterval: REFRESH_MS,
  })
  const error = drafts.error ?? scheduled.error ?? failed.error
  useEffect(() => {
    if (error) checkAccess(error)
  }, [error, checkAccess])

  const hasFailures = (failed.data?.length ?? 0) > 0

  // Les publications ratées : en tête, en rouge et sur toute la largeur s'il y en a ; sinon en
  // dernier, comme les autres cartes.
  const failedCard = (
    <HomeCard
      className={hasFailures ? "ring-destructive/40 xl:col-span-2" : undefined}
      icon={
        <TriangleAlert
          className={hasFailures ? "text-destructive" : undefined}
        />
      }
      title={labels.failed.title}
      description={labels.failed.description}
      query={failed}
      empty={labels.failed.empty}
      dataAttribute="failed"
      render={(item) => <FailedRow key={item.id} item={item} />}
    />
  )

  return (
    <>
      <PageHeader
        icon={sections.home.icon}
        title={title}
        description={description}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {hasFailures && failedCard}
        <HomeCard
          icon={<FilePen />}
          title={labels.drafts.title}
          description={labels.drafts.description}
          query={drafts}
          empty={labels.drafts.empty}
          dataAttribute="drafts"
          render={(item) => (
            <DraftRow key={item.id} item={item} now={drafts.dataUpdatedAt} />
          )}
        />
        <HomeCard
          icon={<CalendarClock />}
          title={labels.scheduled.title}
          description={labels.scheduled.description}
          query={scheduled}
          empty={labels.scheduled.empty}
          dataAttribute="scheduled"
          render={(item) => (
            <ScheduledRow
              key={item.id}
              item={item}
              now={scheduled.dataUpdatedAt}
            />
          )}
        />
        {!hasFailures && failedCard}
      </div>
    </>
  )
}

function HomeCard({
  icon,
  title,
  description,
  query,
  empty,
  render,
  dataAttribute,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  query: UseQueryResult<HomeItem[]>
  empty: string
  render: (item: HomeItem) => ReactNode
  dataAttribute: string
  className?: string
}) {
  const headingId = `accueil-${dataAttribute}`
  return (
    <Card className={className} data-home={dataAttribute}>
      <CardHeader>
        <CardTitle>
          <h2
            id={headingId}
            className="flex items-center gap-2 text-base font-medium [&_svg]:size-4"
          >
            {icon}
            {title}
          </h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {query.data === undefined ? (
          <LoadState query={query} failed={labels.loadFailed} />
        ) : query.data.length === 0 ? (
          <Empty className="p-4">
            <EmptyDescription>{empty}</EmptyDescription>
          </Empty>
        ) : (
          <ul aria-labelledby={headingId} className="divide-y">
            {query.data.map(render)}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/** Le titre d'un contenu, avec un lien vers son éditeur. */
function ItemTitle({ item }: { item: HomeItem }) {
  const name = item.title.trim() || texts.common.untitled
  const path = contentEditorPath(item.kind, item.id)
  return (
    <span className="flex min-w-0 items-center gap-2">
      {path ? (
        <Link
          to={path}
          className="truncate font-medium underline-offset-4 hover:underline"
        >
          {name}
        </Link>
      ) : (
        <span className="truncate font-medium">{name}</span>
      )}
      <Badge variant="outline" className="shrink-0">
        {texts.trash.contentKinds[item.kind]}
      </Badge>
    </span>
  )
}

function DraftRow({ item, now }: { item: HomeItem; now: number }) {
  const status = statusOf(item, now)
  return (
    <li
      data-content-row={item.id}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
    >
      <div className="min-w-0 space-y-0.5">
        <ItemTitle item={item} />
        <p className="text-xs text-muted-foreground">
          {labels.savedAt(formatDateTime(item.draft_saved_at))}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <LiveBadge live={status.live} />
        <ScheduleBadge schedule={status.schedule} />
      </div>
    </li>
  )
}

function ScheduledRow({ item, now }: { item: HomeItem; now: number }) {
  const status = statusOf(item, now)
  return (
    <li
      data-content-row={item.id}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
    >
      <div className="min-w-0 space-y-0.5">
        <ItemTitle item={item} />
        {item.scheduled_by_name && (
          <p className="text-xs text-muted-foreground">
            {labels.scheduled.by(item.scheduled_by_name)}
          </p>
        )}
      </div>
      <ScheduleBadge schedule={status.schedule} />
    </li>
  )
}

function FailedRow({ item }: { item: HomeItem }) {
  return (
    <li data-content-row={item.id} className="space-y-1 py-2.5">
      <ItemTitle item={item} />
      <p className="text-sm">
        {labels.failed.reason(scheduleErrorText(item.schedule_error ?? ""))}
        {item.scheduled_by_name && (
          <span className="text-muted-foreground">
            {" "}
            {labels.failed.by(item.scheduled_by_name)}
          </span>
        )}
      </p>
    </li>
  )
}
