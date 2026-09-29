import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AudioPlayer } from "@/components/media/audio-player"
import { formatClock } from "@/lib/media/format"
import { texts } from "@/texts"

const labels = texts.audioPlayer

// jsdom ne lit pas l'audio : lecture et pause sont simulées, comme le ferait le navigateur.
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
    this: HTMLMediaElement
  ) {
    Object.defineProperty(this, "paused", { value: false, configurable: true })
    this.dispatchEvent(new Event("play"))
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
    this: HTMLMediaElement
  ) {
    Object.defineProperty(this, "paused", { value: true, configurable: true })
    this.dispatchEvent(new Event("pause"))
  })
})
afterEach(() => vi.restoreAllMocks())

describe("AudioPlayer", () => {
  it("lit et met en pause, avec la durée connue avant le chargement", () => {
    render(<AudioPlayer src="/son.mp3" name="episode.mp3" durationHint={185} />)
    expect(screen.getByText(`0:00 / ${formatClock(185)}`)).toBeVisible()

    fireEvent.click(
      screen.getByRole("button", { name: labels.play("episode.mp3") })
    )
    fireEvent.click(
      screen.getByRole("button", { name: labels.pause("episode.mp3") })
    )
    expect(
      screen.getByRole("button", { name: labels.play("episode.mp3") })
    ).toBeVisible()
  })

  it("avance avec le temps de lecture, et la position est lue en clair", () => {
    const { container } = render(
      <AudioPlayer src="/son.mp3" name="episode.mp3" durationHint={185} />
    )
    const audio = container.querySelector("audio")!
    Object.defineProperty(audio, "currentTime", { value: 65, writable: true })
    fireEvent.timeUpdate(audio)
    expect(screen.getByText("1:05 / 3:05")).toBeVisible()
    // La poignée n'est mesurée que dans un vrai navigateur : on la trouve par son nom.
    expect(screen.getByLabelText(labels.position)).toHaveAttribute(
      "aria-valuetext",
      "1 min 05 s"
    )
  })

  it("coupe et remet le son", () => {
    render(<AudioPlayer src="/son.mp3" name="episode.mp3" durationHint={10} />)
    fireEvent.click(screen.getByRole("button", { name: labels.mute }))
    expect(screen.getByRole("button", { name: labels.unmute })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("dit quand l'audio ne peut pas être lu", () => {
    const { container } = render(
      <AudioPlayer src="/son.mp3" name="episode.mp3" />
    )
    fireEvent.error(container.querySelector("audio")!)
    expect(screen.getByRole("alert")).toHaveTextContent(labels.failed)
  })
})

describe("formatClock", () => {
  it("écrit le compteur d'un lecteur", () => {
    expect(formatClock(0)).toBe("0:00")
    expect(formatClock(185.7)).toBe("3:05")
    expect(formatClock(3723)).toBe("1:02:03")
  })
})
