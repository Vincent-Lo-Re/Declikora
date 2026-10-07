"use client"

import * as React from "react"
import { cn } from "cn"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"

// Le carrousel de shadcn (Embla), réduit à ce qui sert : les étapes de la connexion
// (components/auth/auth-slides.tsx) le font avancer elles-mêmes. Ni flèches, ni touches
// gauche et droite (elles servent dans les champs), ni glisser à la souris.

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]

type CarouselProps = {
  opts?: CarouselOptions
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
}

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

function Carousel({
  opts,
  setApi,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel({ ...opts, axis: "x" })

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  return (
    <CarouselContext.Provider value={{ carouselRef }}>
      <div
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({
  className,
  viewportClassName,
  viewportStyle,
  ...props
}: React.ComponentProps<"div"> & {
  viewportClassName?: string
  viewportStyle?: React.CSSProperties
}) {
  const { carouselRef } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className={cn("overflow-hidden", viewportClassName)}
      style={viewportStyle}
      data-slot="carousel-content"
    >
      <div className={cn("-ml-4 flex", className)} {...props} />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn("min-w-0 shrink-0 grow-0 basis-full pl-4", className)}
      {...props}
    />
  )
}

export { type CarouselApi, Carousel, CarouselContent, CarouselItem }
