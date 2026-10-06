import { Pause, Play, TriangleAlert, Volume2, VolumeX } from "lucide-react"
import { useRef, useState } from "react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { formatClock, formatDuration } from "@/lib/media/format"
import { texts } from "@/texts"

const labels = texts.audioPlayer

/**
 * Le lecteur d'un audio, aux couleurs de l'admin (au lieu des commandes du navigateur, qui
 * changent de l'un à l'autre) : lecture et pause, position, temps écoulé et durée, son coupé.
 * durationHint : la durée connue par la médiathèque, montrée avant le chargement. Pour un autre
 * fichier, le lecteur repart de zéro : on le monte avec key={src}.
 */
export function AudioPlayer({
  src,
  name,
  durationHint,
  preload = "metadata",
}: {
  src: string
  name: string
  durationHint?: number | null
  preload?: "none" | "metadata"
}) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(durationHint ?? 0)
  const [muted, setMuted] = useState(false)
  const [failed, setFailed] = useState(false)

  const toggle = () => {
    const element = audio.current
    if (!element) return
    if (element.paused) {
      element.play().catch(() => setFailed(true))
    } else {
      element.pause()
    }
  }

  return (
    <div className="flex items-center gap-2" data-audio-player>
      {/* Les commandes du navigateur sont remplacées par celles ci-dessous. */}
      <audio
        ref={audio}
        src={src}
        preload={preload}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onDurationChange={(event) => {
          const value = event.currentTarget.duration
          if (Number.isFinite(value)) setDuration(value)
        }}
        onError={() => setFailed(true)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 rounded-full"
        aria-label={playing ? labels.pause(name) : labels.play(name)}
        disabled={failed}
        onClick={toggle}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      {failed ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>{labels.failed}</AlertTitle>
        </Alert>
      ) : (
        <>
          <Slider
            className="min-w-0 flex-1"
            min={0}
            max={duration || 1}
            step={1}
            value={[Math.min(current, duration || 1)]}
            disabled={!duration}
            thumbLabel={labels.position}
            getAriaValueText={(_, value) => formatDuration(value)}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value
              if (audio.current) audio.current.currentTime = next
              setCurrent(next)
            }}
          />
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {formatClock(current)} / {formatClock(duration)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label={muted ? labels.unmute : labels.mute}
            aria-pressed={muted}
            onClick={() => {
              const next = !muted
              if (audio.current) audio.current.muted = next
              setMuted(next)
            }}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        </>
      )}
    </div>
  )
}
