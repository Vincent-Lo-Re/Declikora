// Les textes de l'interface, dans la langue de l'admin (`lib/language.ts`). Ils s'écrivent dans
// texts/en.ts (la référence), puis dans texts/fr.ts.

import { language } from "@/lib/language"
import { en, type Texts } from "@/texts/en"
import { fr } from "@/texts/fr"

export type { Texts }

export const texts: Texts = language === "fr" ? fr : en
