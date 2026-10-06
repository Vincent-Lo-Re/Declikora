import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { DayField, TimeField } from "@/components/date-time-fields"
import { texts } from "@/texts"

function Fields({ day = "", time = "" }: { day?: string; time?: string }) {
  const [dayValue, setDay] = useState(day)
  const [timeValue, setTime] = useState(time)
  return (
    <>
      <label htmlFor="jour">Jour</label>
      <DayField id="jour" value={dayValue} onChange={setDay} />
      <label htmlFor="heure">Heure</label>
      <TimeField id="heure" value={timeValue} onChange={setTime} />
    </>
  )
}

describe("champs Jour et Heure", () => {
  it("remet le jour et l'heure en forme en quittant le champ", () => {
    render(<Fields />)
    const day = screen.getByLabelText("Jour")
    fireEvent.change(day, { target: { value: "5/3/2099" } })
    fireEvent.blur(day)
    expect(day).toHaveValue("05/03/2099")

    const time = screen.getByLabelText("Heure")
    fireEvent.change(time, { target: { value: "8h" } })
    fireEvent.blur(time)
    expect(time).toHaveValue("08h00")
    // Une saisie qui ne se lit pas reste telle quelle (la fenêtre dit ce qui ne va pas).
    fireEvent.change(time, { target: { value: "25h" } })
    fireEvent.blur(time)
    expect(time).toHaveValue("25h")
  })

  it("choisit le jour dans le calendrier, en français", async () => {
    render(<Fields day="05/03/2099" />)
    const pick = screen.getByRole("button", { name: texts.dates.pickDay })
    // Le bouton du calendrier est dans le champ du jour (InputGroup de shadcn).
    expect(pick.closest('[data-slot="input-group"]')).not.toBeNull()
    fireEvent.click(pick)
    // Le mois du jour saisi, en français.
    expect(await screen.findByText(/mars 2099/i)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: /20 mars 2099/i }))
    expect(screen.getByLabelText("Jour")).toHaveValue("20/03/2099")
  })
})
