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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AutosaveState } from "@/lib/editor/autosave"
import type { LockState } from "@/lib/editor/edit-lock"
import {
  staysByDefault,
  takeIsForced,
  type LockSituation,
} from "@/lib/editor/lock-view"
import { texts } from "@/texts"

const labels = texts.editor.lock

/** Un contenu supprimé ou mis à la corbeille : « Réessayer » n'y changerait rien. */
function isGone(code: string | null | undefined): boolean {
  return code === "dans_la_corbeille" || code === "contenu_introuvable"
}

/**
 * Bandeau sous l'en-tête : lecture seule (avec le nom de la personne qui écrit et « Reprendre
 * la main »), verrou libre, main perdue (avec « Copier mon texte »), enregistrement arrêté.
 * Rien quand on écrit normalement. Dans l'éditeur du Fil, la lecture seule passe par le cadenas
 * et sa fenêtre (`LockDialog`), et le bandeau se pose au-dessus du téléphone.
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
  lockInDialog = false,
  inline = false,
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
  // La lecture seule (quelqu'un écrit, verrou libre ou libéré) est dite par LockDialog.
  lockInDialog?: boolean
  // Au-dessus du téléphone, à sa largeur, plutôt que sur toute la largeur de la page.
  inline?: boolean
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
        {/* Relire ne sert à rien pour un contenu supprimé ou mis à la corbeille. */}
        {!isGone(autosave.error?.code) && (
          <Button size="sm" variant="outline" onClick={onReload}>
            <RefreshCw />
            {texts.common.retry}
          </Button>
        )}
      </Row>
    )
  } else if (lockInDialog && isReadOnlyPhase(lock)) {
    content = null
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
        {!isGone(lock.error?.code) && (
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
        <div className={inline ? "w-full" : "border-b bg-muted/40 px-4 py-2"}>
          <Alert
            variant={destructive ? "destructive" : "default"}
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

function isReadOnlyPhase(lock: LockState): boolean {
  return (
    lock.phase === "readonly" ||
    lock.phase === "free" ||
    lock.phase === "released"
  )
}

/**
 * Éditeur du Fil : le cadenas, à côté de Concentration, tant qu'on est en lecture seule. Il
 * rouvre la fenêtre qui dit qui écrit.
 */
export function LockButton({
  expanded,
  onClick,
}: {
  expanded: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={labels.button}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            className="bg-warning/10 text-warning hover:bg-warning/20 hover:text-warning"
            onClick={onClick}
          />
        }
      >
        <Lock />
      </TooltipTrigger>
      <TooltipContent>{labels.button}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Éditeur du Fil : la fenêtre de la lecture seule (ADMIN § 4). Ce qui s'est passé, « Copier mon
 * texte » s'il restait du texte pas encore enregistré, ce que ferait la prise de main, puis
 * « (Re)prendre la main » et « Rester en lecture seule ». Échap vaut « Rester » ; un clic sur le
 * fond ne la ferme pas. La prise de main se fait sans seconde confirmation : la fenêtre dit déjà
 * ce qui arrivera.
 */
export function LockDialog({
  situation,
  holderName,
  open,
  onOpenChange,
  canCopy,
  onTake,
  onCopy,
}: {
  situation: LockSituation | null
  holderName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canCopy: boolean
  onTake: (force: boolean) => void
  onCopy: () => void
}) {
  // Gardée pendant l'animation de fermeture, quand la situation est déjà retombée à null.
  const [last, setLast] = useState(situation)
  if (situation !== null && situation !== last) setLast(situation)
  const shown = situation ?? last
  if (!shown) return null

  const words = labels.dialog
  const title =
    shown === "lost"
      ? holderName
        ? words.title.lost(holderName)
        : words.title.lostUnknown
      : shown === "readOnly"
        ? words.title.readOnly(holderName ?? labels.someone)
        : words.title[shown]
  const text =
    shown === "lost"
      ? holderName
        ? words.text.lost(holderName)
        : words.text.lostUnknown
      : shown === "readOnly"
        ? words.text.readOnly(holderName ?? labels.someone)
        : words.text[shown]
  const forced = takeIsForced(shown)
  const note = !forced
    ? null
    : shown === "lostSelf" || shown === "readOnlySelf"
      ? words.note.self
      : holderName
        ? words.note.other(holderName)
        : words.note.unknown
  const stayPrimary = staysByDefault(shown)
  const copying =
    canCopy && (shown === "lost" || shown === "lostSelf" || shown === "free")

  const take = (
    <Button
      variant={stayPrimary ? "outline" : "default"}
      onClick={() => {
        onOpenChange(false)
        onTake(forced)
      }}
    >
      {words.take[shown]}
    </Button>
  )
  const stay = (
    <AlertDialogCancel variant={stayPrimary ? "default" : "outline"}>
      {words.stay}
    </AlertDialogCancel>
  )

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-lock-situation={shown}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{text}</AlertDialogDescription>
        </AlertDialogHeader>
        {copying && (
          <Alert className="items-center *:[svg]:row-span-1 *:[svg]:translate-y-0">
            <TriangleAlert className="text-warning" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-foreground">
              <span>{labels.unsaved}</span>
              <Button size="sm" variant="outline" onClick={onCopy}>
                <Copy />
                {labels.copy}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
        <AlertDialogFooter>
          {stayPrimary ? (
            <>
              {take}
              {stay}
            </>
          ) : (
            <>
              {stay}
              {take}
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
