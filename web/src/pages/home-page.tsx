import { PageHeader } from "@/components/page-header"
import { sections } from "@/navigation"
import { texts } from "@/texts"

/** Le Tableau de bord : son titre et son icône, et « Bienvenue » (06/10/2026). */
export function HomePage() {
  return (
    <PageHeader
      icon={sections.home.icon}
      title={texts.sections.home.title}
      description={texts.sections.home.description}
    />
  )
}
