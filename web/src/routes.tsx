import type { RouteObject } from "react-router"

import { RequireAdmin, RequireTeamMember } from "@/auth/guards"
import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"
import { RootLayout } from "@/layouts/root-layout"
import { authPaths, sections, type SectionKey } from "@/navigation"
import { AccountPage } from "@/pages/account-page"
import { ErrorPage } from "@/pages/error-page"
import { InvitationPage } from "@/pages/invitation-page"
import { MfaPage } from "@/pages/mfa-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { SectionPage } from "@/pages/section-page"
import { SignInPage } from "@/pages/sign-in-page"
import { SignOutPage } from "@/pages/sign-out-page"
import { TeamPage } from "@/pages/team-page"

// Sections pas encore construites : elles affichent « Bientôt disponible ».
const upcomingSections: SectionKey[] = [
  "home",
  "blog",
  "podcasts",
  "methods",
  "pages",
  "templates",
  "media",
  "trash",
]

const sectionRoute = (section: SectionKey) => ({
  path: sections[section].path,
  element: <SectionPage section={section} />,
})

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        // Connexion : sans menu, accessible sans session.
        element: <AuthLayout />,
        children: [
          { path: authPaths.signIn, element: <SignInPage /> },
          { path: authPaths.mfa, element: <MfaPage /> },
          { path: authPaths.invitation, element: <InvitationPage /> },
          { path: authPaths.signOut, element: <SignOutPage /> },
        ],
      },
      {
        // Le reste de l'admin : connecté, double vérification faite.
        element: <RequireTeamMember />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                // Une page qui plante garde le menu autour du message d'erreur.
                errorElement: <ErrorPage />,
                children: [
                  ...upcomingSections.map(sectionRoute),
                  {
                    element: <RequireAdmin />,
                    children: [
                      { path: sections.team.path, element: <TeamPage /> },
                      sectionRoute("settings"),
                    ],
                  },
                  { path: sections.account.path, element: <AccountPage /> },
                  { path: "*", element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]
