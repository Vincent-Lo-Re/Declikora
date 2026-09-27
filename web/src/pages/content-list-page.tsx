import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FilePlus2, FileText, TriangleAlert } from "lucide-react"
import { useEffect } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { useAccessCheck } from "@/components/team/use-access-check"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  contentKeys,
  createContent,
  listContents,
  type ContentKind,
} from "@/lib/contents/api"
import { formatDateTime } from "@/lib/dates"
import { editorPath, type SectionKey } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.contentList

/**
 * Liste des contenus d'une section, minimale à l'étape 4 : créer, ouvrir dans l'éditeur.
 * L'étape 7 la complétera (adresse, publication, corbeille…).
 */
export function ContentListPage({
  section,
  kind,
}: {
  section: SectionKey
  kind: ContentKind
}) {
  const { title, description } = texts.sections[section]
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()

  const list = useQuery({
    queryKey: contentKeys.list(kind),
    queryFn: () => listContents(kind),
    // Qui écrit quoi : relu toutes les 30 secondes.
    refetchInterval: 30_000,
  })
  useEffect(() => {
    if (list.error) checkAccess(list.error)
  }, [list.error, checkAccess])

  const create = useMutation({
    mutationFn: () => createContent(kind),
    onSuccess: (content) => {
      queryClient.setQueryData(contentKeys.detail(content.id), content)
      void queryClient.invalidateQueries({ queryKey: contentKeys.list(kind) })
      void navigate(editorPath(section, content.id))
    },
    onError: (error) => {
      checkAccess(error)
      toast.error(`${labels.createFailed} ${error.message}`)
    },
  })

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Spinner /> : <FilePlus2 />}
            {labels.create}
          </Button>
        }
      />

      {list.data === undefined ? (
        list.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {labels.loadFailed} {list.error.message}
            </p>
            <Button variant="outline" onClick={() => list.refetch()}>
              {labels.retry}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {list.isError && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{labels.refreshFailed}</AlertDescription>
            </Alert>
          )}
          {list.data.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>{labels.empty.title}</EmptyTitle>
                <EmptyDescription>{labels.empty.description}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.columns.title}</TableHead>
                  <TableHead>{labels.columns.savedAt}</TableHead>
                  <TableHead>{labels.columns.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={editorPath(section, item.id)}
                        className="underline-offset-4 hover:underline"
                      >
                        {item.title.trim() || labels.untitled}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(item.draft_saved_at)}
                      {item.saved_by_name && (
                        <> {labels.savedBy(item.saved_by_name)}</>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.editing_name && (
                        <Badge variant="secondary">
                          {labels.beingEdited(item.editing_name)}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </>
  )
}
