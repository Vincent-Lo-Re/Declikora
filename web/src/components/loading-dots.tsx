import { texts } from "@/texts"

/**
 * Trois petits points qui rebondissent, à la place du texte d'un bouton qui attend (pages de
 * connexion) ; leur animation est dans index.css. Les lecteurs d'écran entendent « Chargement… ».
 */
export function LoadingDots() {
  return (
    <span className="flex items-center gap-1">
      <span className="sr-only">{texts.common.loading}</span>
      {[1, 2, 3].map((dot) => (
        <span
          key={dot}
          aria-hidden
          data-loading-dot={dot}
          className="size-1.5 rounded-full bg-current"
        />
      ))}
    </span>
  )
}
