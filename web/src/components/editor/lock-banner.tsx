import { Copy, Lock, LockOpen, RefreshCw, TriangleAlert } from "lucide-react"
import { useState, type ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { AutosaveState } from "@/lib/editor/autosave"
import type { LockState } from "@/lib/editor/edit-lock"
import { texts } from "@/texts"

const labels = texts.editor.lock

/**
 * Bandeau sous l'en-tête : lecture seule (avec le nom de la personne qui écrit et « Reprendre
 * la main »), verrou libre, main perdue (avec « Copier mon texte »), enregistrement arrêté.
 * Rien quand on écrit normalement.
 */
export function LockBanner({
  lock,
  holderIsMe,
  autosave,
  canCopy,
  onTake,
  onCopy,
  onReload,
  onDismissCopy,
}: {
  lock: LockState
  // Celui qui écrit, c'est nous, dans un autre onglet (ou une autre fenêtre).
  holderIsMe: boolean
  autosave: AutosaveState
  canCopy: boolean
  onTake: (force: boolean) => void
  onCopy: () => void
  onReload: () => void
  onDismissCopy: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const holder = lock.holderName ?? labels.someone

  const copyButton = canCopy && (
    <Button size="sm" variant="outline" onClick={onCopy}>
      <Copy />
      {labels.copy}
    </Button>
  )

  let content: ReactNode = null
  let destructive = false

  if (lock.phase === "mine" && autosave.status === "stopped") {
    destructive = true
    content = (
      <Row
        icon={<TriangleAlert />}
        message={autosave.error?.message ?? texts.common.unexpected}
        extra={canCopy ? labels.unsaved : null}
      >
        {copyButton}
        <Button size="sm" variant="outline" onClick={onReload}>
          <RefreshCw />
          {texts.common.retry}
        </Button>
      </Row>
    )
  } else if (lock.phase === "readonly") {
    content = (
      <Row
        icon={<Lock />}
        message={
          holderIsMe
            ? lock.lost
              ? labels.lostSelf
              : labels.readOnlySelf
            : lock.lost
              ? lock.holderName
                ? labels.lost(lock.holderName)
                : labels.lostUnknown
              : labels.readOnly(holder)
        }
        extra={lock.lost && canCopy ? labels.unsaved : null}
      >
        {copyButton}
        <Button size="sm" onClick={() => setConfirming(true)}>
          {labels.forceTake}
        </Button>
      </Row>
    )
  } else if (lock.phase === "free") {
    content = (
      <Row
        icon={<LockOpen />}
        message={labels.free}
        extra={lock.lost && canCopy ? labels.unsaved : null}
      >
        {copyButton}
        <Button size="sm" onClick={() => onTake(false)}>
          {labels.take}
        </Button>
      </Row>
    )
  } else if (lock.phase === "released") {
    content = (
      <Row icon={<LockOpen />} message={labels.released}>
        <Button size="sm" onClick={() => onTake(false)}>
          {labels.retake}
        </Button>
      </Row>
    )
  } else if (lock.phase === "mine" && canCopy) {
    // Main reprise : le texte non enregistré d'avant reste copiable.
    content = (
      <Row icon={<Copy />} message={labels.stashKept}>
        {copyButton}
        <Button size="sm" variant="ghost" onClick={onDismissCopy}>
          {labels.dismiss}
        </Button>
      </Row>
    )
  } else if (lock.phase === "error") {
    destructive = true
    content = (
      <Row
        icon={<TriangleAlert />}
        message={
          lock.error?.code === "dans_la_corbeille"
            ? labels.trashed
            : (lock.error?.message ?? labels.failed)
        }
      >
        {lock.error?.code !== "dans_la_corbeille" &&
          lock.error?.code !== "contenu_introuvable" && (
            <Button size="sm" variant="outline" onClick={() => onTake(false)}>
              <RefreshCw />
              {texts.common.retry}
            </Button>
          )}
      </Row>
    )
  }

  return (
    <>
      {content && (
        <div className="border-b bg-muted/40 px-4 py-2">
          <Alert
            variant={destructive ? "destructive" : "default"}
            data-lock-phase={lock.phase}
            // L'icône au milieu de la ligne (message et boutons), et non sur la première ligne
            // du texte comme dans les autres alertes.
            className="items-center *:[svg]:row-span-1 *:[svg]:translate-y-0"
          >
            {content}
          </Alert>
        </div>
      )}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.confirmForce.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {holderIsMe
                ? labels.confirmForce.descriptionSelf
                : labels.confirmForce.description(holder)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{texts.common.cancel}</AlertDialogCancel>
            <Button
              onClick={() => {
                setConfirming(false)
                onTake(true)
              }}
            >
              {labels.confirmForce.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Row({
  icon,
  message,
  extra,
  children,
}: {
  icon: ReactNode
  message: string
  extra?: string | null
  children?: ReactNode
}) {
  return (
    <>
      {icon}
      <AlertDescription className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-foreground">
        <span>
          {message}
          {extra && (
            <span className="block text-muted-foreground">{extra}</span>
          )}
        </span>
        <span className="flex shrink-0 gap-2">{children}</span>
      </AlertDescription>
    </>
  )
}
