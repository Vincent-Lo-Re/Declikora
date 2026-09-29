import { CircleUser, LogOut, Monitor, Moon, Palette, Sun } from "lucide-react"
import { useNavigate } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { isTheme, useTheme } from "@/components/theme/theme-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initial } from "@/lib/initial"
import { authPaths, sections } from "@/navigation"
import { texts } from "@/texts"

const themes = [
  { value: "light", label: texts.theme.light, icon: Sun },
  { value: "dark", label: texts.theme.dark, icon: Moon },
  { value: "system", label: texts.theme.system, icon: Monitor },
] as const

/**
 * L'avatar du membre (initiale du prénom), en haut à droite : son nom et son e-mail, « Mon
 * compte », le thème et « Se déconnecter ».
 */
export function AccountMenu() {
  const { profile } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  if (!profile) return null
  const name = profile.full_name?.trim() || profile.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={texts.accountMenu.open}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar size="lg">
          <AvatarFallback>
            {initial(profile.full_name, profile.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
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
          <CircleUser />
          {texts.sections.account.title}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette />
            {texts.theme.title}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => {
                if (isTheme(value)) setTheme(value)
              }}
            >
              {themes.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void navigate(authPaths.signOut)}>
          <LogOut />
          {texts.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
