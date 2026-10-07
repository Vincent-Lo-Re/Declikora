import { texts } from "@/texts"

/**
 * Affiché pendant la lecture de la session ou de la fiche du membre, et le temps de charger le
 * code d'une page : un écran vide, sans icône qui tourne (une administration douce) ; la page
 * apparaît ensuite en fondu. Les lecteurs d'écran entendent « Chargement… ».
 */
export function LoadingScreen() {
  return (
    <div role="status" className="min-h-svh">
      <span className="sr-only">{texts.common.loading}</span>
    </div>
  )
}
