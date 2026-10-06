import { Outlet, useLocation, useMatches } from "react-router"

import { NavigationBar } from "@/components/navigation-bar"
import { SmallScreenNotice } from "@/components/small-screen-notice"
import { useShownPages } from "@/hooks/use-preparation"
import { useScrollMemory } from "@/hooks/use-scroll-memory"
import { menuRouteId } from "@/navigation"

/**
 * L'admin est faite pour un ordinateur : en dessous de 1 024 px, un message la remplace. Chaque
 * page retrouve sa place en revenant sur ses pas (useScrollMemory) ; pendant que la suivante se
 * prépare, une fine barre court en haut (NavigationBar). Une nouvelle page apparaît en fondu
 * (data-page-fade, index.css) : toute la page d'un éditeur à une liste, d'un éditeur à l'autre ou
 * vers la connexion ; entre deux pages avec le menu, leur contenu seulement (AppLayout).
 */
export function RootLayout() {
  useScrollMemory()
  useShownPages()
  const { pathname } = useLocation()
  const inMenu = useMatches().some((match) => match.id === menuRouteId)
  return (
    <>
      <NavigationBar />
      <SmallScreenNotice />
      <div
        key={inMenu ? menuRouteId : pathname}
        data-page-fade
        className="hidden lg:block"
      >
        <Outlet />
      </div>
    </>
  )
}
