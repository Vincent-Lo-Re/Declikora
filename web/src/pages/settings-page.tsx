import { PageHeader } from "@/components/page-header"
import { AccessLevelsCard } from "@/components/settings/access-levels-card"
import { sections } from "@/navigation"
import { texts } from "@/texts"

/** Paramètres (admins seulement) : les formules d'abonnement. */
export function SettingsPage() {
  const { title, description } = texts.sections.settings
  return (
    <>
      <PageHeader
        icon={sections.settings.icon}
        title={title}
        description={description}
      />
      <AccessLevelsCard />
    </>
  )
}
