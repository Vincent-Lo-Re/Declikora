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
import { BrandFileCard } from "@/components/settings/brand-file-card"
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
 * (« ?onglet=formules »). Sont remplis : le nom de la marque, le logotype et le monogramme (Identité de l'admin) et les
 * formules.
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
              <div className="grid items-start gap-6 xl:grid-cols-2">
                {/* Le nom sur toute la largeur, puis les deux fichiers côte à côte. */}
                <div className="xl:col-span-2">
                  <AdminIdentityCard />
                </div>
                {/* Une carte par fichier (le modèle « Cover Art » de shadcn). */}
                <div className="space-y-3 xl:col-span-2">
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    <BrandFileCard kind="logotype" surface="light" />
                    <BrandFileCard kind="logotype" surface="dark" />
                    <BrandFileCard kind="monogram" surface="light" />
                    <BrandFileCard kind="monogram" surface="dark" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {labels.adminIdentity.files.hint}
                  </p>
                </div>
              </div>
            ) : value === "plans" ? (
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
