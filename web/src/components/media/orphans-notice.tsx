import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Eraser, FileWarning } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useAccessCheck } from "@/components/team/use-access-check"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatDateTime } from "@/lib/dates"
import { callFiles, mediaKeys } from "@/lib/media/api"
import { auditRead } from "@/lib/reads"
import { texts } from "@/texts"

// Nombre de chemins montrés dans la liste dépliée.
const shownPaths = 10

/**
 * Fichiers sans fiche trouvés par le dernier contrôle (restes d'envois interrompus), avec
 * « Nettoyer » pour toute l'équipe. La fonction « files » revérifie chaque fichier avant de
 * l'effacer (toujours sans fiche, plus de 24 heures).
 */
export function OrphansNotice() {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [expanded, setExpanded] = useState(false)
  const audit = useQuery(auditRead())

  const clean = useMutation({
    mutationFn: () => callFiles("clean"),
    onSuccess: (summary) =>
      toast.success(texts.media.orphans.cleaned(summary.removed)),
    onError: (error) => {
      toast.error(error.message)
      checkAccess(error)
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: mediaKeys.audit }),
        queryClient.invalidateQueries({ queryKey: mediaKeys.storage }),
      ]),
  })

  const paths = audit.data?.orphan_paths ?? []
  if (!audit.data || paths.length === 0) return null

  return (
    <Alert>
      <FileWarning />
      <AlertTitle>{texts.media.orphans.title(paths.length)}</AlertTitle>
      <AlertDescription>
        <p>
          {texts.media.orphans.description(
            formatDateTime(audit.data.checked_at)
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={clean.isPending}
            onClick={() => clean.mutate()}
          >
            {clean.isPending ? <Spinner /> : <Eraser />}
            {texts.media.orphans.clean}
          </Button>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? texts.media.orphans.hide : texts.media.orphans.show}
          </Button>
        </div>
        {expanded && (
          <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-xs break-all">
            {paths.slice(0, shownPaths).map((path) => (
              <li key={path}>{path}</li>
            ))}
            {paths.length > shownPaths && (
              <li className="list-none font-sans">
                {texts.media.orphans.more(paths.length - shownPaths)}
              </li>
            )}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  )
}
