import { Outlet } from "react-router"

import { SmallScreenNotice } from "@/components/small-screen-notice"
import { useScrollMemory } from "@/hooks/use-scroll-memory"

/**
 * L'admin est faite pour un ordinateur : en dessous de 1 024 px, un message la remplace. Chaque
 * page retrouve sa place en revenant sur ses pas (useScrollMemory).
 */
export function RootLayout() {
  useScrollMemory()
  return (
    <>
      <SmallScreenNotice />
      <div className="hidden lg:block">
        <Outlet />
      </div>
    </>
  )
}
