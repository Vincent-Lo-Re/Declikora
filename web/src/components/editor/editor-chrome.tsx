import { ArrowLeft, Blocks, FileQuestion, Focus } from "lucide-react"
import type { ReactNode } from "react"
import { Link, type useBlocker } from "react-router"

import { ColumnHeader } from "@/components/editor/column-header"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RETURN_STATE, returnAddress } from "@/lib/scroll-memory"
import { sections, type SectionKey } from "@/navigation"
import { texts } from "@/texts"

// Ce qui entoure l'éditeur plein écran du Fil (editor-page.tsx) : le retour vers la liste, un contenu introuvable, la
// glissière des Blocs, la pastille de la Concentration et la fenêtre « Quitter ».

/**
 * Le retour vers la liste de la section : elle retrouve ses réglages et sa place, et la ligne de
 * ce contenu s'allume un instant. compact : la flèche seule, à gauche de l'en-tête du plan (sur
 * toute sa hauteur), le nom de la section dans l'infobulle.
 */
export function BackLink({
  section,
  compact = false,
}: {
  section: SectionKey
  compact?: boolean
}) {
  const title = texts.sections[section].title
  const to = returnAddress(sections[section].path)
  const label = texts.editor.back(title)
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              to={to}
              state={RETURN_STATE}
              aria-label={label}
              className="flex h-full w-12 shrink-0 items-center justify-center border-r text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [&_svg]:size-4"
            />
          }
        >
          <ArrowLeft />
        </TooltipTrigger>
        <TooltipContent>{title}</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Link
      to={to}
      state={RETURN_STATE}
      aria-label={label}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      <ArrowLeft />
      {title}
    </Link>
  )
}

/**
 * Un contenu introuvable (supprimé, à la corbeille, d'une autre sorte), ou sa lecture qui a
 * échoué (message, et « Réessayer »).
 */
export function EditorNotFound({
  section,
  message,
  retry,
}: {
  section: SectionKey
  message: string | null
  retry: (() => void) | null
}) {
  return (
    <div className="flex h-svh flex-col bg-muted/40">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
        <BackLink section={section} />
      </header>
      <Empty className="m-10 border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>{texts.editor.notFound.title}</EmptyTitle>
          <EmptyDescription>
            {message ?? texts.editor.notFound.description}
          </EmptyDescription>
        </EmptyHeader>
        {retry && (
          <Button variant="outline" onClick={retry}>
            {texts.common.retry}
          </Button>
        )}
      </Empty>
    </div>
  )
}

/** Les Blocs, en glissière par-dessus le plan : × ou Échap la referment. */
export function LibraryDrawer({
  back,
  onClose,
  children,
}: {
  back: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby="colonne-blocs-titre"
      className="absolute inset-0 z-20 flex flex-col bg-background motion-safe:animate-in motion-safe:slide-in-from-left-4"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault()
          onClose()
        }
      }}
    >
      <ColumnHeader
        icon={Blocks}
        title={texts.editor.columns.blocks}
        titleId="colonne-blocs-titre"
        back={back}
        close={{ label: texts.editor.library.close, onClick: onClose }}
      />
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

/** En Concentration, en haut à droite : l'enregistrement, le cadenas et la sortie. */
export function FocusPill({
  apple,
  saveStatus,
  lockButton,
  onExit,
}: {
  apple: boolean
  saveStatus: ReactNode
  lockButton: ReactNode
  onExit: () => void
}) {
  return (
    <div className="fixed top-3 right-4 z-20 flex items-center gap-2 rounded-full border bg-background py-1 pr-1 pl-3 shadow-sm">
      {saveStatus}
      {lockButton}
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        aria-label={texts.editor.focusMode.exit}
        aria-keyshortcuts={apple ? "Meta+." : "Control+."}
        onClick={onExit}
      >
        <Focus />
        {texts.editor.focusMode.exit}
        <Kbd>
          {apple
            ? texts.editor.focusMode.shortcut.apple
            : texts.editor.focusMode.shortcut.other}
        </Kbd>
      </Button>
    </div>
  )
}

/** Quitter alors qu'une modification n'a pas pu être enregistrée : on demande. */
export function LeaveDialog({
  blocker,
}: {
  blocker: ReturnType<typeof useBlocker>
}) {
  return (
    <AlertDialog
      open={blocker.state === "blocked"}
      onOpenChange={(open) => {
        if (!open && blocker.state === "blocked") blocker.reset()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{texts.editor.save.leave.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {texts.editor.save.leave.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{texts.editor.save.leave.stay}</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => blocker.state === "blocked" && blocker.proceed()}
          >
            {texts.editor.save.leave.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
