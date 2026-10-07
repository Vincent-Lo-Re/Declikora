import { NavLink, useLocation } from "react-router"

import { AccountMenu } from "@/components/account-menu"
import { BrandLogo } from "@/components/brand-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { isInSection, menu, sections, type SectionKey } from "@/navigation"
import { texts } from "@/texts"

/** Le menu de gauche, toujours ouvert (docs/ADMINISTRATION.md § 7). */
export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex h-8 items-center px-2 text-sm font-medium">
          {/* Le menu est une carte sombre : la version pour fond sombre. */}
          <BrandLogo kind="logotype" surface="dark" className="h-6" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label={texts.nav.label}>
          <SidebarGroup>
            <SidebarGroupContent>
              <MenuItems sectionKeys={menu.top} />
            </SidebarGroupContent>
          </SidebarGroup>
          {menu.groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <MenuItems sectionKeys={group.items} />
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      {/* L'avatar du membre : son menu a « Se déconnecter » (le compte, l'équipe, les
          paramètres et le thème sont dans le header). */}
      <SidebarFooter>
        <AccountMenu />
      </SidebarFooter>
    </Sidebar>
  )
}

function MenuItems({ sectionKeys }: { sectionKeys: SectionKey[] }) {
  const { pathname } = useLocation()

  return (
    <SidebarMenu>
      {sectionKeys.map((key) => {
        const { path, icon: Icon } = sections[key]
        const { title } = texts.sections[key]
        return (
          <SidebarMenuItem key={key}>
            <SidebarMenuButton
              render={<NavLink to={path} end={path === "/"} />}
              isActive={isInSection(path, pathname)}
            >
              <Icon />
              <span>{title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
