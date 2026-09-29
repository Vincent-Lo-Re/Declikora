import { Outlet } from "react-router"

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
      <SidebarInset>
        <div className="flex h-12 shrink-0 items-center border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
        {/* En bas, de la place pour la fenêtre des envois quand elle est ouverte (index.css). */}
        <div className="flex-1 p-8 pb-[calc(--spacing(8)+var(--upload-window-space))]">
          <Outlet />
        </div>
        {/* Envois de la médiathèque : suivis dans toute l'admin. */}
        <UploadAnnouncer />
        <UploadWindow />
      </SidebarInset>
    </SidebarProvider>
  )
}
