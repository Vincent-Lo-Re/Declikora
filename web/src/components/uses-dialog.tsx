import type { UseQueryResult } from "@tanstack/react-query"
import {
  Download,
  FileText,
  Link as LinkIcon,
  TriangleAlert,
} from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { ListCard } from "@/components/list-card"
import { LoadState } from "@/components/load-state"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { downloadUsesCsv, type ContentUse } from "@/lib/uses-export"
import { contentEditorPath, contentSection, sections } from "@/navigation"
import { texts } from "@/texts"

const words = texts.uses

// Où un fichier (Médiathèque) ou une catégorie (onglet Catégories) est utilisé : la pastille qui
// ouvre la fenêtre, la fenêtre, et l'export en CSV (lib/uses-export.ts). Les mêmes partout.

/** L'icône de la section d'un contenu (Blog, Podcasts, Pages, Modèles de bloc). */
export function SectionIcon({ kind }: { kind: string }) {
  const section = contentSection(kind)
  const Icon = section ? sections[section].icon : FileText
  return <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
}

/** Titre d'un contenu qui utilise le fichier ou la catégorie, avec un lien vers son éditeur. */
export function UseTitle({
  use,
  onNavigate,
}: {
  use: ContentUse
  onNavigate?: () => void
}) {
  const title = use.title?.trim() || texts.common.untitled
  const path = contentEditorPath(use.kind, use.content_id)
  return path ? (
    <Link
      to={path}
      onClick={onNavigate}
      className="underline-offset-4 hover:underline"
    >
      {title}
    </Link>
  ) : (
    title
  )
}

/** « Exporter » : le CSV des utilisations, sous ce nom de fichier. */
export function ExportUsesButton({
  fileName,
  uses,
  size = "default",
}: {
  fileName: string
  uses: readonly ContentUse[] | undefined
  size?: "default" | "sm"
}) {
  return (
    <Button
      variant="outline"
      size={size}
      disabled={!uses || uses.length === 0}
      onClick={() => {
        if (!uses) return
        downloadUsesCsv(fileName, uses)
        toast.success(words.exported)
      }}
    >
      <Download />
      {words.export}
    </Button>
  )
}

/** La pastille « utilisé » (un lien) : un bouton, son sens dans l'infobulle. */
export function UsesBadgeButton({
  label,
  tooltip,
  onClick,
}: {
  // Le nom du bouton (« Voir où … est utilisé ») et ce que dit l'infobulle.
  label: string
  tooltip: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant="outline"
            render={<button type="button" />}
            aria-label={label}
            aria-haspopup="dialog"
            className="cursor-pointer hover:bg-muted"
            onClick={onClick}
          />
        }
      >
        <LinkIcon aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

/**
 * La fenêtre des utilisations : le nom de ce qui est utilisé et le nombre d'endroits, puis un
 * contenu par ligne (titre vers l'éditeur, section, en ligne, brouillon, à la Corbeille), avec
 * « Exporter ».
 */
export function UsesDialog({
  open,
  onOpenChange,
  title,
  subject,
  query,
  fileName,
  failed,
  empty,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  // Le fichier ou la catégorie, sous le titre.
  subject: string
  query: UseQueryResult<ContentUse[]>
  fileName: string
  failed: string
  empty: string
}) {
  const close = () => onOpenChange(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="truncate">
            {subject}
            {query.data ? ` · ${words.count(query.data.length)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {query.data === undefined ? (
          query.isError ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>{failed}</AlertTitle>
            </Alert>
          ) : (
            <LoadState
              query={query}
              failed={failed}
              rows={2}
              rowClassName="h-10 w-full"
            />
          )
        ) : query.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ListCard className="max-h-picker overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{words.columns.title}</TableHead>
                  <TableHead>{words.columns.section}</TableHead>
                  <TableHead>{words.columns.where}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((use) => {
                  const section = contentSection(use.kind)
                  return (
                    <TableRow key={use.content_id}>
                      <TableCell className="max-w-72 truncate font-medium">
                        <UseTitle use={use} onNavigate={close} />
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <SectionIcon kind={use.kind} />
                          {section ? texts.sections[section].title : ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {use.in_app && (
                            <Badge variant="secondary">
                              {texts.media.detail.inApp}
                            </Badge>
                          )}
                          {use.in_draft && (
                            <Badge variant="outline">
                              {texts.media.detail.inDraft}
                            </Badge>
                          )}
                          {use.in_trash && (
                            <Badge variant="outline">{words.inTrash}</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ListCard>
        )}
        <DialogFooter>
          <ExportUsesButton fileName={fileName} uses={query.data} />
          <Button onClick={close}>{texts.common.close}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
