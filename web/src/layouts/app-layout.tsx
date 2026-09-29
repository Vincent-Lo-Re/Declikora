import { Outlet } from "react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { UploadAnnouncer } from "@/components/media/upload-announcer"
import { UploadWindow } from "@/components/media/upload-window"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { UPLOAD_WINDOW_SPACE } from "@/lib/media/constants"

/** Les pages avec le menu à gauche. L'éditeur, lui, prendra tout l'écran. */
export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-12 shrink-0 items-center border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
        {/* En bas, de la place pour la fenêtre des envois quand elle est ouverte. */}
        <div
          className="flex-1 p-8"
          style={{
            paddingBottom: `calc(2rem + var(${UPLOAD_WINDOW_SPACE}, 0px))`,
          }}
        >
          <Outlet />
        </div>
        {/* Envois de la médiathèque : suivis dans toute l'admin. */}
        <UploadAnnouncer />
        <UploadWindow />
      </SidebarInset>
    </SidebarProvider>
  )
}
