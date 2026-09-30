import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { expect } from "vitest"

import { texts } from "@/texts"

/**
 * « Nouvel article » (…) dans une liste : ouvre la fenêtre, écrit le titre, choisit un point de
 * départ s'il est donné, puis crée.
 */
export async function createFromDialog(
  kind: "page" | "article" | "episode" | "method",
  title: string,
  starter?: string
) {
  const words = texts.contentList.kinds[kind]
  fireEvent.click(await screen.findByRole("button", { name: words.create }))
  const dialog = await screen.findByRole("dialog", { name: words.create })
  fireEvent.change(
    within(dialog).getByLabelText(texts.publication.settings.titleLabel),
    { target: { value: title } }
  )
  if (starter) {
    fireEvent.click(
      await within(dialog).findByRole("combobox", {
        name: texts.contentList.newContent.starter,
      })
    )
    const choice = await screen.findByRole("option", { name: starter })
    // Base UI ne retient un clic de souris que s'il a commencé sur l'option.
    fireEvent.pointerDown(choice, { pointerType: "mouse" })
    fireEvent.click(choice)
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
  }
  fireEvent.click(within(dialog).getByRole("button", { name: words.submit }))
}
