import { BookOpen, Search } from "lucide-react"
import { useEffect, useState } from "react"

import { HelpSheet } from "@/components/help/help-sheet"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { helpFiches } from "@/help/fiches"
import type { HelpFiche, HelpTheme } from "@/help/types"
import { isApple } from "@/lib/editor/focus-mode"
import { fichesByTheme, helpScore, isHelpShortcut } from "@/lib/help"
import { texts } from "@/texts"

const labels = texts.help
const themes = Object.keys(labels.themes) as HelpTheme[]
const groups = fichesByTheme(helpFiches, themes)

/**
 * La recherche de l'aide, à droite du header (ADMIN § 7) : un bouton (ou ⌘ K, Ctrl + K) ouvre la
 * fenêtre de recherche de shadcn (Command) ; une fiche choisie s'ouvre dans une glissière.
 */
export function HelpSearch() {
  const apple = isApple(navigator.platform)
  const [open, setOpen] = useState(false)
  const [fiche, setFiche] = useState<HelpFiche | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isHelpShortcut(event, apple)) return
      event.preventDefault()
      setOpen((current) => !current)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [apple])

  const choose = (chosen: HelpFiche) => {
    setOpen(false)
    setFiche(chosen)
    setSheetOpen(true)
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-64 justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search />
        {labels.search}
        <Kbd className="ml-auto">
          {apple ? labels.shortcut.apple : labels.shortcut.other}
        </Kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={labels.title}
        description={labels.description}
      >
        <Command filter={helpScore}>
          <CommandInput placeholder={labels.placeholder} />
          <CommandList>
            <CommandEmpty>{labels.empty}</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup
                key={group.theme}
                heading={labels.themes[group.theme]}
              >
                {group.fiches.map((one) => (
                  <CommandItem
                    key={one.slug}
                    value={one.title}
                    keywords={[one.summary, ...one.keywords]}
                    onSelect={() => choose(one)}
                  >
                    <BookOpen />
                    {one.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
      <HelpSheet fiche={fiche} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
