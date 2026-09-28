import type { RouteObject } from "react-router"

import { RequireAdmin, RequireTeamMember } from "@/auth/guards"
import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"
import { RootLayout } from "@/layouts/root-layout"
import { authPaths, sections, type SectionKey } from "@/navigation"
import { AccountPage } from "@/pages/account-page"
import { ContentListPage } from "@/pages/content-list-page"
import { ErrorPage } from "@/pages/error-page"
import { InvitationPage } from "@/pages/invitation-page"
import { MediaPage } from "@/pages/media-page"
import { MfaPage } from "@/pages/mfa-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { SectionPage } from "@/pages/section-page"
import { SettingsPage } from "@/pages/settings-page"
import { SignInPage } from "@/pages/sign-in-page"
import { SignOutPage } from "@/pages/sign-out-page"
import { TeamPage } from "@/pages/team-page"
import { TemplatesPage } from "@/pages/templates-page"
import { TrashPage } from "@/pages/trash-page"

// Sections pas encore construites : elles affichent « Bientôt disponible ».
const upcomingSections: SectionKey[] = ["home", "blog", "podcasts", "methods"]

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
            // L'éditeur prend tout l'écran : le menu se cache, « ← Pages » ramène à la liste.
            path: `${sections.pages.path}/:contentId`,
            // Chargé à part : Tiptap et le glisser-déposer ne pèsent que sur l'éditeur.
            lazy: async () => {
              const { EditorPage } = await import("@/pages/editor-page")
              return { element: <EditorPage section="pages" kind="page" /> }
            },
            errorElement: <ErrorPage />,
          },
          {
            // L'éditeur d'un modèle : le même éditeur plein écran, « ← Modèles ».
            path: `${sections.templates.path}/:contentId`,
            lazy: async () => {
              const { EditorPage } = await import("@/pages/editor-page")
              return {
                element: <EditorPage section="templates" kind="template" />,
              }
            },
            errorElement: <ErrorPage />,
          },
          {
            element: <AppLayout />,
            children: [
              {
                // Une page qui plante garde le menu autour du message d'erreur.
                errorElement: <ErrorPage />,
                children: [
                  ...upcomingSections.map(sectionRoute),
                  {
                    path: sections.pages.path,
                    element: <ContentListPage section="pages" kind="page" />,
                  },
                  {
                    path: sections.templates.path,
                    element: <TemplatesPage />,
                  },
                  { path: sections.media.path, element: <MediaPage /> },
                  { path: sections.trash.path, element: <TrashPage /> },
                  {
                    element: <RequireAdmin />,
                    children: [
                      { path: sections.team.path, element: <TeamPage /> },
                      {
                        path: sections.settings.path,
                        element: <SettingsPage />,
                      },
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
