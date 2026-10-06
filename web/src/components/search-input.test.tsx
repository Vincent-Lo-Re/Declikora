import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { SearchInput } from "@/components/search-input"
import { texts } from "@/texts"

function Search() {
  const [value, setValue] = useState("")
  return (
    <SearchInput
      value={value}
      onChange={setValue}
      label="Chercher"
      placeholder="Nom…"
    />
  )
}

describe("SearchInput", () => {
  it("montre « Effacer la recherche » seulement quand il y a du texte, et rend le focus au champ", () => {
    render(<Search />)
    const field = screen.getByRole("searchbox", { name: "Chercher" })
    expect(
      screen.queryByRole("button", { name: texts.common.clearSearch })
    ).toBeNull()

    fireEvent.change(field, { target: { value: "photo" } })
    // La loupe et la croix sont dans le champ : l'InputGroup de shadcn.
    const clear = screen.getByRole("button", { name: texts.common.clearSearch })
    expect(field.closest('[data-slot="input-group"]')).toContainElement(clear)
    fireEvent.click(clear)
    expect(field).toHaveValue("")
    expect(document.activeElement).toBe(field)
  })

  it("Échap efface la recherche", () => {
    render(<Search />)
    const field = screen.getByRole("searchbox", { name: "Chercher" })
    fireEvent.change(field, { target: { value: "photo" } })
    fireEvent.keyDown(field, { key: "Escape" })
    expect(field).toHaveValue("")
  })
})
