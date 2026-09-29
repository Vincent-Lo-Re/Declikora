import { Outlet } from "react-router"

import { AccountMenu } from "@/components/account-menu"
import { AppSidebar } from "@/components/app-sidebar"
import { UploadAnnouncer } from "@/components/media/upload-announcer"
import { UploadWindow } from "@/components/media/upload-window"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

/** Les pages avec le menu à gauche. L'éditeur, lui, prendra tout l'écran. */
export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* min-w-0 : la zone de droite ne s'élargit pas selon son contenu (sinon la page défile
          sur le côté au lieu de laisser rétrécir, par exemple, la recherche de la médiathèque). */}
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <AccountMenu />
        </header>
        {/* En bas, de la place pour la fenêtre des envois quand elle est ouverte (index.css). */}
        <div className="flex-1 p-8 pb-page">
          <Outlet />
        </div>
        {/* Envois de la médiathèque : suivis dans toute l'admin. */}
        <UploadAnnouncer />
        <UploadWindow />
      </SidebarInset>
    </SidebarProvider>
  )
}
