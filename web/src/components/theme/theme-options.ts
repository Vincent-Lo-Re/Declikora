import { Monitor, Moon, Sun } from "lucide-react"

import { texts } from "@/texts"

/** Les trois thèmes, dans l'ordre : sur la page Mon compte et dans le menu de l'avatar. */
export const themeOptions = [
  { value: "light", label: texts.theme.light, icon: Sun },
  { value: "dark", label: texts.theme.dark, icon: Moon },
  { value: "system", label: texts.theme.system, icon: Monitor },
] as const
