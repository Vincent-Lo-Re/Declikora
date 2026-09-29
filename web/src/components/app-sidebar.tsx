import { NavLink, useLocation } from "react-router"

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
  SidebarRail,
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

export function AppSidebar() {
  const { profile } = useAuth()
  // Équipe et Paramètres n'apparaissent que pour les admins.
  const bottom =
    profile?.role === "admin"
      ? menu.bottom
      : menu.bottom.filter((key) => !adminOnlySections.includes(key))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-8 items-center px-2 text-sm font-semibold">
          <span className="group-data-[collapsible=icon]:hidden">
            {texts.app.name}
          </span>
          <span
            aria-hidden
            className="hidden group-data-[collapsible=icon]:inline"
          >
            {texts.app.name.charAt(0)}
          </span>
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

      {/* Équipe et Paramètres (admins). « Mon compte » est dans le menu de l'avatar, en haut. */}
      {bottom.length > 0 && (
        <SidebarFooter>
          <nav aria-label={texts.nav.footerLabel}>
            <MenuItems sectionKeys={bottom} />
          </nav>
        </SidebarFooter>
      )}

      <SidebarRail />
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
              tooltip={title}
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
