import {
  CircleUser,
  FileText,
  GraduationCap,
  House,
  Images,
  LayoutTemplate,
  Newspaper,
  Podcast,
  Settings,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react"

import { texts } from "@/texts"

export type SectionKey = keyof typeof texts.sections

// Adresse (en français) et icône de chaque section.
export const sections = {
  home: { path: "/", icon: House },
  blog: { path: "/blog", icon: Newspaper },
  podcasts: { path: "/podcasts", icon: Podcast },
  methods: { path: "/methodes", icon: GraduationCap },
  pages: { path: "/pages", icon: FileText },
  templates: { path: "/modeles", icon: LayoutTemplate },
  media: { path: "/mediatheque", icon: Images },
  trash: { path: "/corbeille", icon: Trash2 },
  team: { path: "/equipe", icon: Users },
  settings: { path: "/parametres", icon: Settings },
  account: { path: "/mon-compte", icon: CircleUser },
} satisfies Record<SectionKey, { path: string; icon: LucideIcon }>

// Rangement du menu : l'accueil, puis les groupes, et en bas l'équipe et le compte.
export const menu = {
  top: ["home"],
  groups: [
    {
      label: texts.nav.groups.contents,
      items: ["blog", "podcasts", "methods", "pages"],
    },
    {
      label: texts.nav.groups.tools,
      items: ["templates", "media", "trash"],
    },
  ],
  bottom: ["team", "settings", "account"],
} satisfies {
  top: SectionKey[]
  groups: { label: string; items: SectionKey[] }[]
  bottom: SectionKey[]
}

/** Vrai si l'adresse affichée appartient à la section (ou à l'une de ses pages). */
export function isInSection(path: string, pathname: string) {
  if (path === "/") return pathname === "/"
  return pathname === path || pathname.startsWith(`${path}/`)
}
