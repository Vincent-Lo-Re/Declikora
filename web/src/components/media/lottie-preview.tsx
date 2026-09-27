import { useEffect, useRef, useState } from "react"

import { Spinner } from "@/components/ui/spinner"
import { texts } from "@/texts"

/**
 * Aperçu d'une animation Lottie vérifiée par le serveur. lottie-web est chargé à la demande, dans
 * sa version « light » (rendu SVG, sans les expressions, donc sans évaluation de code).
 */
export function LottiePreview({ url, label }: { url: string; label: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    let destroy: (() => void) | null = null
    const controller = new AbortController()

    async function load() {
      try {
        const [response, { default: lottie }] = await Promise.all([
          fetch(url, { signal: controller.signal }),
          import("lottie-web/build/player/lottie_light"),
        ])
        if (!response.ok) throw new Error(String(response.status))
        const animationData: unknown = await response.json()
        if (cancelled || !container.current) return
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
        const animation = lottie.loadAnimation({
          container: container.current,
          renderer: "svg",
          loop: true,
          autoplay: !reduceMotion,
          animationData,
        })
        destroy = () => animation.destroy()
        setState("ready")
      } catch {
        if (!cancelled) setState("error")
      }
    }
    void load()

    return () => {
      cancelled = true
      controller.abort()
      destroy?.()
    }
  }, [url])

  return (
    <div className="relative flex size-full items-center justify-center">
      <div
        ref={container}
        role="img"
        aria-label={label}
        className="size-full [&>svg]:size-full"
      />
      {state === "loading" && <Spinner className="absolute" />}
      {state === "error" && (
        <p className="absolute px-4 text-center text-sm text-muted-foreground">
          {texts.media.detail.lottieFailed}
        </p>
      )}
    </div>
  )
}
