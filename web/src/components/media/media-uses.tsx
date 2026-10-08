import {
  Download,
  FileText,
  Link as LinkIcon,
  TriangleAlert,
} from "lucide-react"
import { useState } from "react"
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
import { useMediaUses } from "@/components/media/use-media-uses"
import type { MediaUse } from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { downloadUsesCsv } from "@/lib/media/uses-export"
import { contentEditorPath, contentSection, sections } from "@/navigation"
import { texts } from "@/texts"

const words = texts.media.uses

/** L'icône de la section d'un contenu (Blog, Podcasts, Pages, Modèles de bloc). */
export function SectionIcon({ kind }: { kind: string }) {
  const section = contentSection(kind)
  const Icon = section ? sections[section].icon : FileText
  return <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
}

/** Titre d'un contenu qui utilise le fichier, avec un lien vers son éditeur s'il existe. */
export function UseTitle({
  use,
  onNavigate,
}: {
  use: MediaUse
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

/** « Exporter » : le CSV des utilisations du fichier (lib/media/uses-export.ts). */
export function ExportUsesButton({
  media,
  uses,
  size = "default",
}: {
  media: Pick<Media, "name">
  uses: readonly MediaUse[] | undefined
  size?: "default" | "sm"
}) {
  return (
    <Button
      variant="outline"
      size={size}
      disabled={!uses || uses.length === 0}
      onClick={() => {
        if (!uses) return
        downloadUsesCsv(media.name, uses)
        toast.success(words.exported)
      }}
    >
      <Download />
      {words.export}
    </Button>
  )
}

/**
 * La pastille « Utilisé » d'un fichier (vignette, ligne de la liste) : un bouton qui ouvre la liste
 * des endroits où il sert (titre vers l'éditeur, section, brouillon ou en ligne), avec son export.
 */
export function MediaUsesButton({ media }: { media: Media }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant="outline"
              render={<button type="button" />}
              aria-label={words.open(media.name)}
              aria-haspopup="dialog"
              className="cursor-pointer hover:bg-muted"
              onClick={() => setOpen(true)}
            />
          }
        >
          <LinkIcon aria-hidden />
        </TooltipTrigger>
        <TooltipContent>{texts.media.used}</TooltipContent>
      </Tooltip>
      <MediaUsesDialog media={media} open={open} onOpenChange={setOpen} />
    </>
  )
}

function MediaUsesDialog({
  media,
  open,
  onOpenChange,
}: {
  media: Media
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const uses = useMediaUses(media.id, open)
  const close = () => onOpenChange(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{words.title}</DialogTitle>
          <DialogDescription className="truncate">
            {media.name}
            {uses.data ? ` · ${words.count(uses.data.length)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {uses.data === undefined ? (
          uses.isError ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>{texts.media.detail.usesFailed}</AlertTitle>
            </Alert>
          ) : (
            <LoadState
              query={uses}
              failed={texts.media.detail.usesFailed}
              rows={2}
              rowClassName="h-10 w-full"
            />
          )
        ) : uses.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {texts.media.detail.notUsed}
          </p>
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
                {uses.data.map((use) => {
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
          <ExportUsesButton media={media} uses={uses.data} />
          <Button onClick={close}>{texts.common.close}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
