import { fireEvent, render, screen } from "@testing-library/react"
import { AudioLines } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import { MediaUnavailable } from "@/blocks/components/media-state"
import { texts } from "@/texts"

const words = { ...texts.editor.presentation.audio }

function show(
  media: Parameters<typeof MediaUnavailable>[0]["media"],
  editable = true
) {
  const onChoose = vi.fn()
  render(
    <MediaUnavailable
      media={media}
      words={words}
      icon={AudioLines}
      editable={editable}
      onChoose={onChoose}
      className=""
      iconClassName=""
    />
  )
  return onChoose
}

describe("MediaUnavailable", () => {
  it("dit pourquoi le fichier manque et propose d'en choisir un autre", () => {
    const onChoose = show({ state: "missing" })
    expect(screen.getByText(words.missing)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: words.choose }))
    expect(onChoose).toHaveBeenCalled()
  })

  it("après une lecture ratée : le message du bon type de fichier, et « Réessayer »", () => {
    const retry = vi.fn()
    show({ state: "error", retry })
    // Un audio, pas « L'image n'a pas pu être chargée ».
    expect(screen.getByText(words.loadFailed)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: texts.common.retry }))
    expect(retry).toHaveBeenCalled()
  })

  it("sans droit d'écrire, ni pendant le chargement : pas de bouton", () => {
    show({ state: "none" }, false)
    expect(screen.getByText(words.none)).toBeVisible()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
