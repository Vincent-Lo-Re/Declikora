import { Outlet, useLocation } from "react-router"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { UploadAnnouncer } from "@/components/media/upload-announcer"
import { UploadWindow } from "@/components/media/upload-window"
import { SidebarInset, SidebarWrapper } from "@/components/ui/sidebar"

/**
 * Les pages avec le header et le menu à gauche. L'éditeur, lui, prend tout l'écran. D'une page à l'autre, le
 * menu ne bouge pas : le contenu seul s'ouvre à neuf (une page n'en reprend jamais une autre, par
 * exemple la recherche du Fil dans Radio Éclaircies), en fondu.
 */
export function AppLayout() {
  const { pathname } = useLocation()
  return (
    // Le header sur toute la largeur, puis le menu et le contenu côte à côte (comme l'exemple
    // « sidebar-16 » de shadcn). La fenêtre ne défile pas : seul le contenu défile, dans son
    // panneau (SidebarInset), comme sur la page du preset. L'ensemble est posé sur la fenêtre
    // (fixed inset-0) plutôt que sur 100svh, qui peut dépasser ce qu'elle montre (une barre
    // d'information de Chrome en haut, par exemple) et faire défiler la page.
    <SidebarWrapper className="fixed inset-0 min-h-0 flex-col overflow-hidden">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        {/* min-w-0 : la zone de droite ne s'élargit pas selon son contenu (sinon la page défile
            sur le côté au lieu de laisser rétrécir, par exemple, la recherche de la médiathèque). */}
        <SidebarInset className="min-w-0">
          {/* En bas, de la place pour la fenêtre des envois quand elle est ouverte (index.css). */}
          <div key={pathname} data-page-fade className="flex-1 p-8 pb-page">
            <Outlet />
          </div>
          {/* Envois de la médiathèque : suivis dans toute l'admin. */}
          <UploadAnnouncer />
          <UploadWindow />
        </SidebarInset>
      </div>
    </SidebarWrapper>
  )
}
