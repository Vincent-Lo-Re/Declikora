import { Outlet } from "react-router"

import { SmallScreenNotice } from "@/components/small-screen-notice"

/** L'admin est faite pour un ordinateur : en dessous de 1 024 px, un message la remplace. */
export function RootLayout() {
  return (
    <>
      <SmallScreenNotice />
      <div className="hidden lg:block">
        <Outlet />
      </div>
    </>
  )
}
