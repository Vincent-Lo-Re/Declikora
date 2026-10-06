import { NavLink, useLocation } from "react-router"

import { AccountMenu } from "@/components/account-menu"
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
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useAuth } from "@/auth/auth-context"
import {
  adminOnlySections,
  isInSection,
  menu,
  sections,
  type SectionKey,
} from "@/navigation"
import { texts } from "@/texts"

/** Le menu de gauche, toujours ouvert (docs/ADMINISTRATION.md § 7). */
export function AppSidebar() {
  const { profile } = useAuth()
  // Équipe et Paramètres n'apparaissent que pour les admins.
  const bottom =
    profile?.role === "admin"
      ? menu.bottom
      : menu.bottom.filter((key) => !adminOnlySections.includes(key))

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex h-8 items-center px-2 text-sm font-medium">
          {texts.app.name}
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

      {/*
        Équipe et Paramètres (admins), un trait, puis l'avatar du membre : « Mon compte », le
        thème et « Se déconnecter » sont dans son menu.
      */}
      <SidebarFooter>
        {bottom.length > 0 && (
          <>
            <nav aria-label={texts.nav.footerLabel}>
              <MenuItems sectionKeys={bottom} />
            </nav>
            <SidebarSeparator />
          </>
        )}
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
