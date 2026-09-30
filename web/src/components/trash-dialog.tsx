import { Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { texts } from "@/texts"

/** Confirmation d'une mise à la corbeille (une ligne, ou les lignes cochées) : listes de contenus, Modèles de bloc. */
export function TrashDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel()
      }}
    >
      {open && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {texts.common.cancel}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? <Spinner /> : <Trash2 />}
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
