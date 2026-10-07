import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { SlideActive } from "@/components/auth/slide-active"

// Embla compte en « images » et non en millisecondes : environ 300 ms, en douceur.
const SLIDE_DURATION = 30

const reducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Le premier champ de l'étape (sinon son premier bouton), pour y mettre le curseur. */
function focusIn(slide: HTMLElement | null | undefined) {
  const target =
    slide?.querySelector<HTMLElement>("input:not([type=hidden]):enabled") ??
    slide?.querySelector<HTMLElement>("button:enabled")
  target?.focus({ preventScroll: true })
}

/**
 * Les étapes de la connexion côte à côte, dans le carrousel de shadcn (ADMIN § 2, « La connexion
 * en slides ») : l'étape `current` glisse en place, la précédente part à gauche (ou à droite en
 * revenant). La carte prend la hauteur de l'étape affichée ; les autres sont inertes (ni clic ni
 * tabulation). Arrivée sur une étape : le curseur va dans son premier champ.
 */
export function AuthSlides({
  current,
  slides,
}: {
  current: number
  slides: readonly ReactNode[]
}) {
  const [api, setApi] = useState<CarouselApi>()
  const items = useRef<(HTMLDivElement | null)[]>([])
  const [height, setHeight] = useState<number>()
  const placed = useRef(false)

  // La première fois, l'étape est posée d'un coup ; ensuite, elle glisse. Le curseur va tout de
  // suite dans son premier champ (sans faire défiler : le carrousel s'en charge).
  useEffect(() => {
    if (!api) return
    const jump = !placed.current || reducedMotion()
    placed.current = true
    api.scrollTo(current, jump)
    focusIn(items.current[current])
  }, [api, current])

  // La hauteur de l'étape affichée, suivie quand son contenu change (QR code chargé, erreur…).
  useLayoutEffect(() => {
    const slide = items.current[current]
    if (!slide) return
    const measure = () => setHeight(slide.offsetHeight)
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(slide)
    return () => observer.disconnect()
  }, [current])

  return (
    <Carousel
      opts={{ watchDrag: false, duration: SLIDE_DURATION }}
      setApi={setApi}
    >
      <CarouselContent
        className="items-start"
        // Débord de 4 px tout autour, rendu par le p-1 de chaque étape : les anneaux du focus
        // (3 px) ne sont pas rognés par le cadre du carrousel.
        viewportClassName="-m-1 transition-[height] duration-300 ease-out motion-reduce:transition-none"
        viewportStyle={height === undefined ? undefined : { height }}
      >
        {slides.map((slide, index) => (
          <CarouselItem
            key={index}
            ref={(node) => {
              items.current[index] = node
            }}
            // Inertes et cachées aux lecteurs d'écran : seule l'étape affichée compte.
            inert={index !== current}
            aria-hidden={index !== current || undefined}
          >
            <div className="p-1">
              <SlideActive value={index === current}>{slide}</SlideActive>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
