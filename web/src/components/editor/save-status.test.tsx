import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SaveStatus } from "@/components/editor/save-status"
import type { AutosaveState, AutosaveStatus } from "@/lib/editor/autosave"
import { texts } from "@/texts"

const labels = texts.editor.save

function state(status: AutosaveStatus): AutosaveState {
  return {
    status,
    rev: 4,
    savedAt: "2026-09-27T12:32:00Z",
    unsaved: status !== "saved",
    error: null,
  }
}

/** La région lue par les lecteurs d'écran (l'indicateur visible n'en est pas une). */
function announced(): string {
  const regions = screen.getAllByRole("status")
  expect(regions).toHaveLength(1)
  return regions[0].textContent ?? ""
}

afterEach(() => vi.restoreAllMocks())

describe("indicateur d'enregistrement", () => {
  it("n'annonce pas le cycle normal (en attente, enregistrement, enregistré)", () => {
    const { rerender } = render(<SaveStatus state={state("saved")} visible />)
    for (const status of ["pending", "saving", "saved", "pending"] as const) {
      rerender(<SaveStatus state={state(status)} visible />)
      expect(announced()).toBe("")
    }
    // L'état reste visible à l'écran.
    expect(screen.getByText(labels.pending)).toBeInTheDocument()
  })

  it("annonce le passage hors ligne, puis le retour à « enregistré »", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const { rerender } = render(<SaveStatus state={state("saving")} visible />)
    rerender(<SaveStatus state={state("offline")} visible />)
    expect(announced()).toBe(labels.announce.offline)
    rerender(<SaveStatus state={state("saving")} visible />)
    expect(announced()).toBe(labels.announce.offline)
    rerender(<SaveStatus state={state("saved")} visible />)
    expect(announced()).toBe(labels.announce.saved)
  })

  it("en ligne, un serveur qui ne répond pas n'est pas « hors ligne »", () => {
    const { rerender } = render(<SaveStatus state={state("saving")} visible />)
    rerender(<SaveStatus state={state("offline")} visible />)
    expect(announced()).toBe(labels.announce.retrying)
    expect(screen.getByText(labels.retrying)).toBeInTheDocument()
  })

  it("l'heure d'enregistrement est atteignable au clavier et lue avec « Enregistré »", () => {
    render(<SaveStatus state={state("saved")} visible />)
    const indicator = document.querySelector<HTMLElement>(
      '[data-save-status="saved"]'
    )
    expect(indicator).not.toBeNull()
    expect(indicator).toHaveAttribute("tabindex", "0")
    expect(indicator).toHaveTextContent(
      `${labels.saved} ${labels.savedOn("27 sept. 2026 à 14h32")}`
    )
    expect(indicator).not.toHaveAttribute("title")
  })

  it("en icône seule (éditeur du Fil) : l'état sans l'heure, déjà dans « Modifié à … »", () => {
    render(<SaveStatus state={state("saved")} visible compact />)
    const indicator = document.querySelector<HTMLElement>(
      '[data-save-status="saved"]'
    )
    expect(indicator).toHaveAttribute("tabindex", "0")
    expect(indicator).toHaveTextContent(labels.saved)
    expect(indicator).not.toHaveTextContent(/14h32/)
  })

  it("en lecture seule, seule la région annoncée reste", () => {
    render(<SaveStatus state={state("saved")} visible={false} />)
    expect(document.querySelector("[data-save-status]")).toBeNull()
    expect(announced()).toBe("")
  })
})
