import { PageHeader } from "@/components/page-header"
import { AccessLevelsCard } from "@/components/settings/access-levels-card"
import { texts } from "@/texts"

/** Paramètres (admins seulement) : les formules d'abonnement. */
export function SettingsPage() {
  const { title, description } = texts.sections.settings
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="max-w-3xl">
        <AccessLevelsCard />
      </div>
    </>
  )
}
