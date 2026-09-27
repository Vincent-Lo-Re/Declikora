import { Spinner } from "@/components/ui/spinner"

/** Affiché pendant la lecture de la session ou de la fiche du membre. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  )
}
