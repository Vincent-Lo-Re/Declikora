import { Outlet } from "react-router"

import { NavigationBar } from "@/components/navigation-bar"
import { SmallScreenNotice } from "@/components/small-screen-notice"
import { useShownPages } from "@/hooks/use-preparation"
import { useScrollMemory } from "@/hooks/use-scroll-memory"

/**
 * L'admin est faite pour un ordinateur : en dessous de 1 024 px, un message la remplace. Chaque
 * page retrouve sa place en revenant sur ses pas (useScrollMemory) ; pendant que la suivante se
 * prépare, une fine barre court en haut (NavigationBar).
 */
export function RootLayout() {
  useScrollMemory()
  useShownPages()
  return (
    <>
      <NavigationBar />
      <SmallScreenNotice />
      <div className="hidden lg:block">
        <Outlet />
      </div>
    </>
  )
}
