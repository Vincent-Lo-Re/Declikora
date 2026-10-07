import {
  CreditCard,
  PanelsTopLeft,
  Smartphone,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { ListEmpty } from "@/components/list-card"
import { PageHeader } from "@/components/page-header"
import { AccessLevelsCard } from "@/components/settings/access-levels-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAddressState } from "@/hooks/use-address-state"
import {
  settingsTabFromAddress,
  settingsTabs,
  writeSettingsTab,
  type SettingsTab,
} from "@/lib/address"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.settings

const tabIcons: Record<SettingsTab, LucideIcon> = {
  admin: PanelsTopLeft,
  app: Smartphone,
  plans: CreditCard,
  advanced: Wrench,
}

/**
 * Paramètres (admins seulement, ADMIN § 7) : quatre onglets, l'identité de l'admin, l'identité de
 * l'app, les formules d'abonnement et les réglages avancés. L'onglet ouvert est dans l'adresse
 * (« ?onglet=formules »). Seules les formules sont remplies pour l'instant.
 */
export function SettingsPage() {
  const { title, description } = texts.sections.settings
  const [tab, setTab] = useAddressState(
    settingsTabFromAddress,
    writeSettingsTab
  )
  return (
    <>
      <PageHeader
        icon={sections.settings.icon}
        title={title}
        description={description}
      />
      <Tabs value={tab} onValueChange={(value: SettingsTab) => setTab(value)}>
        <TabsList aria-label={labels.tabs.label}>
          {settingsTabs.map((value) => {
            const Icon = tabIcons[value]
            return (
              <TabsTrigger key={value} value={value}>
                <Icon />
                {labels.tabs[value]}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {settingsTabs.map((value) => (
          <TabsContent key={value} value={value} data-settings-tab={value}>
            {value === "plans" ? (
              <AccessLevelsCard />
            ) : (
              <ListEmpty
                icon={tabIcons[value]}
                title={labels.empty.title}
                description={labels.empty.description}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
