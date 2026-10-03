import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TruncatedText } from "@/components/truncated-text"
import { TooltipProvider } from "@/components/ui/tooltip"

const TITLE = "Bien commencer sa journée, même les jours les plus chargés"

/** jsdom ne mesure rien : la largeur du texte et celle de sa place sont données. */
function measure(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(
    scrollWidth
  )
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
    clientWidth
  )
}

async function hover() {
  render(
    <TooltipProvider>
      <TruncatedText text={TITLE} />
    </TooltipProvider>
  )
  const heading = screen.getByRole("heading", { name: TITLE })
  await act(async () => {
    fireEvent.pointerEnter(heading, { pointerType: "mouse" })
    fireEvent.mouseEnter(heading)
    fireEvent.mouseMove(heading)
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
}

describe("TruncatedText", () => {
  afterEach(() => vi.restoreAllMocks())

  it("coupé : le titre entier dans l'infobulle", async () => {
    measure(400, 200)
    await hover()
    // Le titre, puis l'infobulle.
    expect(await screen.findAllByText(TITLE)).toHaveLength(2)
  })

  it("en entier : pas d'infobulle", async () => {
    measure(200, 200)
    await hover()
    expect(screen.getAllByText(TITLE)).toHaveLength(1)
  })
})
