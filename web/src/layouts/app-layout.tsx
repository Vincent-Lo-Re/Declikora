import { Outlet } from "react-router"

import { AppSidebar } from "@/components/app-sidebar"
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
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
