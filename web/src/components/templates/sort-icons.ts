import {
  Link2,
  LayoutTemplate,
  Paintbrush,
  type LucideIcon,
} from "lucide-react"

import type { TemplateSort } from "@/lib/contents/templates"

/** L'icône de chaque sorte de modèle : la liste de Modèles de bloc et l'éditeur d'un modèle. */
export const templateSortIcons: Record<TemplateSort, LucideIcon> = {
  style: Paintbrush,
  shared: Link2, // un bloc lié à son modèle (« Détacher » : le lien coupé)
  starter: LayoutTemplate, // comme les points de départ de « Nouvel article »
}
