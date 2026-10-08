import type { UseQueryResult } from "@tanstack/react-query"
import {
  Download,
  FileText,
  Link as LinkIcon,
  TriangleAlert,
} from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { toast } from "sonner"

import { SelectAllHead } from "@/components/bulk-selection"
import { ListCard } from "@/components/list-card"
import { LoadState } from "@/components/load-state"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

/** Les lignes qu'on coche dans la fenêtre (catégories : « Retirer (n) »). */
export type UsesSelection<T extends ContentUse> = {
  selected: ReadonlySet<string>
  onSelectedChange: (selected: ReadonlySet<string>) => void
  // Une ligne qu'on ne peut pas cocher (l'action y est indisponible).
  selectable: (use: T) => boolean
}

/** Où sert un contenu : en ligne, brouillon, copie, à la Corbeille (fichiers, modèles). */
function WhereBadges({ use }: { use: ContentUse }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {use.in_app && (
        <Badge variant="secondary">{texts.media.detail.inApp}</Badge>
      )}
      {use.in_draft && (
        <Badge variant="outline">{texts.media.detail.inDraft}</Badge>
      )}
      {use.copied && <Badge variant="outline">{words.copied}</Badge>}
      {use.in_trash && <Badge variant="outline">{words.inTrash}</Badge>}
    </div>
  )
}

/**
 * La fenêtre des utilisations : le nom de ce qui est utilisé et le nombre d'endroits, puis un
 * contenu par ligne (titre vers l'éditeur, section, en ligne, brouillon, à la Corbeille), avec
 * « Exporter ». Les catégories y ajoutent l'état de chaque contenu (status), une action par ligne
 * (action), des cases (selection) et un bouton en bas (footer).
 */
export function UsesDialog<T extends ContentUse>({
  open,
  onOpenChange,
  title,
  subject,
  query,
  fileName,
  failed,
  empty,
  status,
  action,
  selection,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  // Le fichier ou la catégorie, sous le titre.
  subject: string
  query: UseQueryResult<T[]>
  fileName: string
  failed: string
  empty: string
  // La colonne d'état, à la place de « Où » : son titre et sa cellule.
  status?: { head: string; cell: (use: T) => ReactNode }
  action?: (use: T) => ReactNode
  selection?: UsesSelection<T>
  footer?: ReactNode
}) {
  const close = () => onOpenChange(false)
  const selectable = selection
    ? (query.data ?? []).filter(selection.selectable)
    : []
  const toggle = (id: string, checked: boolean) => {
    if (!selection) return
    const next = new Set(selection.selected)
    if (checked) next.add(id)
    else next.delete(id)
    selection.onSelectedChange(next)
  }
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
                  {selection && (
                    <SelectAllHead
                      all={
                        selectable.length > 0 &&
                        selectable.every((use) =>
                          selection.selected.has(use.content_id)
                        )
                      }
                      some={
                        selection.selected.size > 0 &&
                        selection.selected.size < selectable.length
                      }
                      disabled={selectable.length === 0}
                      onToggleAll={(checked) =>
                        selection.onSelectedChange(
                          new Set(
                            checked
                              ? selectable.map((use) => use.content_id)
                              : []
                          )
                        )
                      }
                    />
                  )}
                  <TableHead>{words.columns.title}</TableHead>
                  <TableHead>{words.columns.section}</TableHead>
                  <TableHead>{status?.head ?? words.columns.where}</TableHead>
                  {action && (
                    <TableHead>
                      <span className="sr-only">{texts.common.actions}</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((use) => {
                  const section = contentSection(use.kind)
                  return (
                    <TableRow key={use.content_id}>
                      {selection && (
                        <TableCell className="w-0">
                          <Checkbox
                            aria-label={texts.selection.select(
                              use.title?.trim() || texts.common.untitled
                            )}
                            checked={selection.selected.has(use.content_id)}
                            disabled={!selection.selectable(use)}
                            onCheckedChange={(checked) =>
                              toggle(use.content_id, checked)
                            }
                          />
                        </TableCell>
                      )}
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
                        {status ? status.cell(use) : <WhereBadges use={use} />}
                      </TableCell>
                      {action && (
                        <TableCell className="w-0 text-right">
                          {action(use)}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ListCard>
        )}
        <DialogFooter>
          {footer}
          <ExportUsesButton fileName={fileName} uses={query.data} />
          <Button onClick={close}>{texts.common.close}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
