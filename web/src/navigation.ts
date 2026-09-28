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

// Pages de connexion, sans le menu.
export const authPaths = {
  signIn: "/connexion",
  mfa: "/double-verification",
  invitation: "/invitation",
  signOut: "/deconnexion",
} as const

// Sections réservées aux admins : cachées dans le menu d'un éditeur.
export const adminOnlySections: readonly SectionKey[] = ["team", "settings"]

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

/** Adresse de l'éditeur d'un contenu : « /pages/<id> ». */
export function editorPath(section: SectionKey, contentId: string): string {
  return `${sections[section].path}/${contentId}`
}

// Section de l'éditeur de chaque sorte de contenu.
const editorSections: Partial<Record<string, SectionKey>> = {
  article: "blog",
  episode: "podcasts",
  method: "methods",
  page: "pages",
  template: "templates",
}

// Les éditeurs d'un chapitre et d'une leçon, sous la section Méthodes : « /methodes/lecons/<id> ».
// L'adresse ne porte pas la méthode : l'éditeur la retrouve par le parent.
export const methodElementSegments = {
  chapter: "chapitres",
  lesson: "lecons",
} as const

/** Adresse de l'éditeur d'un chapitre ou d'une leçon. */
export function methodElementPath(
  kind: "chapter" | "lesson",
  contentId: string
): string {
  return `${sections.methods.path}/${methodElementSegments[kind]}/${contentId}`
}

/** Adresse de l'éditeur d'un contenu d'après sa sorte, ou null si elle n'a pas d'éditeur. */
export function contentEditorPath(
  kind: string,
  contentId: string
): string | null {
  if (kind === "chapter" || kind === "lesson") {
    return methodElementPath(kind, contentId)
  }
  const section = editorSections[kind]
  return section ? editorPath(section, contentId) : null
}

/** Les catégories d'une section (Blog, Podcasts) : « /blog/categories ». */
export function categoriesPath(section: "blog" | "podcasts"): string {
  return `${sections[section].path}/categories`
}

/** La fiche d'un fichier dans la Médiathèque : « /mediatheque?fichier=<id> ». */
export function mediaFilePath(mediaId: string): string {
  return `${sections.media.path}?fichier=${encodeURIComponent(mediaId)}`
}

/** Vrai si l'adresse affichée appartient à la section (ou à l'une de ses pages). */
export function isInSection(path: string, pathname: string) {
  if (path === "/") return pathname === "/"
  return pathname === path || pathname.startsWith(`${path}/`)
}
