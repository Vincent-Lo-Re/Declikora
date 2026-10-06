import { render, screen } from "@testing-library/react"
import { Search } from "lucide-react"
import { describe, expect, it } from "vitest"

import { ListEmpty } from "@/components/list-card"

describe("ListEmpty", () => {
  it("montre l'icône, le titre et la précision dans l'Empty de shadcn, en carte blanche", () => {
    render(
      <ListEmpty
        icon={Search}
        title="Rien trouvé"
        description="Essaie un autre mot."
      />
    )
    const empty = screen.getByText("Rien trouvé").closest('[data-slot="empty"]')
    expect(empty).toHaveClass("bg-card")
    expect(empty?.querySelector('[data-slot="empty-icon"] svg')).not.toBeNull()
    expect(screen.getByText("Essaie un autre mot.")).toHaveAttribute(
      "data-slot",
      "empty-description"
    )
  })

  it("se passe de précision", () => {
    render(<ListEmpty icon={Search} title="Rien trouvé" />)
    expect(document.querySelector('[data-slot="empty-description"]')).toBeNull()
  })
})
