import { LogOut } from "lucide-react"
import { useNavigate } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { displayName, initial } from "@/lib/people"
import { authPaths, sections } from "@/navigation"
import { texts } from "@/texts"

/**
 * Le membre, en bas du menu de gauche : son avatar (initiale du prénom), son nom et, dessous, son
 * rôle ; le tout ouvre son menu (nom et e-mail, « Mon compte », puis « Se déconnecter » ; Mon compte
 * est aussi dans le header, avec le thème).
 * L'avatar commence avec les icônes du menu (les marges d'une ligne du menu).
 */
export function AccountMenu() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  if (!profile) return null
  const name = displayName(profile)
  const AccountIcon = sections.account.icon

  return (
    <DropdownMenu>
      {/* Encadré comme les blocs de la colonne de gauche de la page du preset (ring-foreground/10). */}
      <DropdownMenuTrigger className="flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left ring-1 ring-sidebar-foreground/15 outline-none hover:bg-sidebar-accent focus-visible:ring-sidebar-foreground/50 data-popup-open:bg-sidebar-accent">
        {/*
          Le bouton se lit par ce qu'il montre, le nom puis le rôle, et ce qu'il fait ; pas
          l'initiale. Les espaces séparent ces mots à la lecture (une grille ou une rangée ne les
          affiche pas).
        */}
        <Avatar size="lg" aria-hidden>
          <AvatarFallback>{initial(profile)}</AvatarFallback>
        </Avatar>
        <span className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate text-sm font-medium">{name}</span>{" "}
          <span className="truncate text-xs text-sidebar-foreground/70">
            {texts.roles[profile.role]}
          </span>
        </span>{" "}
        <span className="sr-only">{texts.accountMenu.open}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 text-sm">
            <span className="truncate text-foreground">{name}</span>
            {name !== profile.email && (
              <span className="truncate text-xs font-normal">
                {profile.email}
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void navigate(sections.account.path)}>
          <AccountIcon />
          {texts.sections.account.title}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void navigate(authPaths.signOut)}>
          <LogOut />
          {texts.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
