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
import { AdminIdentityCard } from "@/components/settings/admin-identity-card"
import { AdminLanguageCard } from "@/components/settings/admin-language-card"
import { BrandLogosCard } from "@/components/settings/brand-logos-card"
import { LoginScreenCard } from "@/components/settings/login-screen-card"
import { SettingsSection } from "@/components/settings/settings-section"
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
 * (« ?tab=plans »). Sont remplis : le nom de la marque, le logotype et le monogramme (Identité de l'admin), les
 * formules et la langue de l'admin (Avancé).
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
            {value === "admin" ? (
              // Des sections de réglages : le titre à gauche, la carte à droite ; empilées
              // sur un écran étroit (conteneur, maquette docs/maquettes/parametres-identite.html).
              <div className="@container space-y-8 pt-4">
                <SettingsSection
                  title={labels.adminIdentity.title}
                  description={labels.adminIdentity.description}
                >
                  <AdminIdentityCard />
                </SettingsSection>
                <SettingsSection
                  title={labels.adminIdentity.files.loginScreen.title}
                  description={
                    labels.adminIdentity.files.loginScreen.description
                  }
                >
                  <LoginScreenCard />
                </SettingsSection>
                <SettingsSection
                  title={labels.adminIdentity.files.title}
                  description={labels.adminIdentity.files.description}
                >
                  <BrandLogosCard />
                </SettingsSection>
              </div>
            ) : value === "plans" ? (
              <AccessLevelsCard />
            ) : value === "advanced" ? (
              <div className="@container space-y-8 pt-4">
                <SettingsSection
                  title={labels.advanced.language.title}
                  description={labels.advanced.language.description}
                >
                  <AdminLanguageCard />
                </SettingsSection>
              </div>
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
