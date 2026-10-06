import { Outlet, useLocation } from "react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { UploadAnnouncer } from "@/components/media/upload-announcer"
import { UploadWindow } from "@/components/media/upload-window"
import { SidebarInset, SidebarWrapper } from "@/components/ui/sidebar"

/**
 * Les pages avec le menu à gauche. L'éditeur, lui, prend tout l'écran. D'une page à l'autre, le
 * menu ne bouge pas : le contenu seul s'ouvre à neuf (une page n'en reprend jamais une autre, par
 * exemple la recherche du Fil dans Radio Éclaircies), en fondu.
 */
export function AppLayout() {
  const { pathname } = useLocation()
  return (
    <SidebarWrapper>
      <AppSidebar />
      {/* min-w-0 : la zone de droite ne s'élargit pas selon son contenu (sinon la page défile
          sur le côté au lieu de laisser rétrécir, par exemple, la recherche de la médiathèque). */}
      <SidebarInset className="min-w-0">
        {/* Pas de barre du haut. En bas, de la place pour la fenêtre des envois quand elle est
            ouverte (index.css). */}
        <div key={pathname} data-page-fade className="flex-1 p-8 pb-page">
          <Outlet />
        </div>
        {/* Envois de la médiathèque : suivis dans toute l'admin. */}
        <UploadAnnouncer />
        <UploadWindow />
      </SidebarInset>
    </SidebarWrapper>
  )
}
