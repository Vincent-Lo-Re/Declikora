import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { LoadState } from "@/components/load-state"
import { texts } from "@/texts"

describe("LoadState", () => {
  it("un échec : l'Alert de shadcn, avec la raison et « Réessayer »", () => {
    const refetch = vi.fn()
    render(
      <LoadState
        query={{ isError: true, error: new Error("Réseau coupé."), refetch }}
        failed="Les fichiers n'ont pas pu être chargés."
      />
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveAttribute("data-slot", "alert")
    expect(alert).toHaveTextContent("Les fichiers n'ont pas pu être chargés.")
    expect(alert).toHaveTextContent("Réseau coupé.")
    fireEvent.click(screen.getByRole("button", { name: texts.common.retry }))
    expect(refetch).toHaveBeenCalled()
  })

  it("pendant le chargement : des lignes grises", () => {
    render(
      <LoadState
        query={{ isError: false, error: null, refetch: vi.fn() }}
        failed="…"
        rows={3}
      />
    )
    expect(screen.getByLabelText(texts.common.loading).children).toHaveLength(3)
  })
})
