import { useQuery, useQueryClient } from "@tanstack/react-query"

import { OrderedNames } from "@/components/ordered-names"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  accessLevelsKey,
  createAccessLevel,
  deleteAccessLevel,
  renameAccessLevel,
  reorderAccessLevels,
} from "@/lib/access-levels"
import { accessLevelsRead } from "@/lib/reads"
import { accessLevelNameSchema } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.settings.accessLevels

/**
 * Les formules d'abonnement (admins) : ajouter, renommer, ranger de la moins complète à la
 * plus complète (glisser-déposer à la souris ou au clavier), supprimer une formule inutilisée
 * ([D32]). Changer l'ordre change aussitôt ce que chaque abonné peut lire ([D2]).
 */
export function AccessLevelsCard() {
  const queryClient = useQueryClient()
  const levels = useQuery(accessLevelsRead())

  return (
    <OrderedNames
      labels={labels}
      header={
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
      }
      query={levels}
      queryKey={accessLevelsKey}
      schema={accessLevelNameSchema}
      inputId="formule"
      create={createAccessLevel}
      rename={renameAccessLevel}
      remove={deleteAccessLevel}
      reorder={reorderAccessLevels}
      refresh={() =>
        queryClient.invalidateQueries({ queryKey: accessLevelsKey })
      }
      before={(_, position) => (
        <span className="w-10 shrink-0 text-sm text-muted-foreground tabular-nums">
          {labels.rank(position)}
        </span>
      )}
    />
  )
}
