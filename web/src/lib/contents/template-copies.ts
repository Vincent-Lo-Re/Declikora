// Les copies des modèles (table template_copies) : une mise en forme insérée ou un point de
// départ utilisé est copié dans le contenu, sans lien ; l'admin note la copie pour savoir où le
// modèle a servi (colonne « État » des Modèles de bloc). Séparé de templates.ts : api.ts s'en sert.

import { reportError } from "@/lib/sentry"
import { supabase } from "@/lib/supabase"

/**
 * Note qu'une mise en forme ou un point de départ a été copié dans ce contenu (template_copies) :
 * c'est ainsi que l'admin sait où un modèle copié a servi. Une seule ligne par modèle et par
 * contenu (la suivante est ignorée). Un échec ne gêne pas la copie elle-même : il part à Sentry.
 */
export async function recordTemplateCopy(
  templateId: string,
  contentId: string
): Promise<void> {
  const { error } = await supabase
    .from("template_copies")
    .upsert(
      { template_id: templateId, content_id: contentId },
      { onConflict: "template_id,content_id", ignoreDuplicates: true }
    )
  if (error) reportError(error)
}
