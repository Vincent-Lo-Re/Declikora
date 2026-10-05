import type { RouteObject } from "react-router"

import { RequireAdmin, RequireTeamMember } from "@/auth/guards"
import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"
import { RootLayout } from "@/layouts/root-layout"
import type { ContentKind } from "@/lib/contents/api"
import {
  authPaths,
  categoriesPath,
  methodElementSegments,
  type MethodElementKind,
  sections,
  type SectionKey,
} from "@/navigation"
import { AccountPage } from "@/pages/account-page"
import { CategoriesPage } from "@/pages/categories-page"
import { ContentListPage } from "@/pages/content-list-page"
import { ErrorPage } from "@/pages/error-page"
import { HomePage } from "@/pages/home-page"
import { InvitationPage } from "@/pages/invitation-page"
import { MediaPage } from "@/pages/media-page"
import { MfaPage } from "@/pages/mfa-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { SettingsPage } from "@/pages/settings-page"
import { SignInPage } from "@/pages/sign-in-page"
import { SignOutPage } from "@/pages/sign-out-page"
import { TeamPage } from "@/pages/team-page"
import { TemplatesPage } from "@/pages/templates-page"
import { TrashPage } from "@/pages/trash-page"

// Les éditeurs plein écran : la section (pour « ← Blog »), la sorte de contenu et l'adresse.
type EditorRoute = { section: SectionKey; kind: ContentKind; path: string }

const sectionEditor = (
  section: SectionKey,
  kind: ContentKind
): EditorRoute => ({
  section,
  kind,
  path: `${sections[section].path}/:contentId`,
})

const methodElementEditor = (kind: MethodElementKind): EditorRoute => ({
  section: "methods",
  kind,
  path: `${sections.methods.path}/${methodElementSegments[kind]}/:contentId`,
})

const editorRoutes: EditorRoute[] = [
  sectionEditor("blog", "article"),
  sectionEditor("podcasts", "episode"),
  // Une méthode : sa fiche et son plan (« ← Méthodes »).
  sectionEditor("methods", "method"),
  // Un chapitre, une leçon et un exercice : l'éditeur de blocs, « ← nom de la méthode ».
  methodElementEditor("chapter"),
  methodElementEditor("lesson"),
  methodElementEditor("exercise"),
  sectionEditor("pages", "page"),
  // L'éditeur d'un modèle : le même éditeur plein écran, « ← Modèles ».
  sectionEditor("templates", "template"),
]

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
          // L'éditeur prend tout l'écran : le menu se cache, « ← Blog » ramène à la liste.
          ...editorRoutes.map(({ section, kind, path }) => ({
            path,
            // Chargé à part : Tiptap et le glisser-déposer ne pèsent que sur l'éditeur.
            lazy: async () => {
              const { EditorPage } = await import("@/pages/editor-page")
              return { element: <EditorPage section={section} kind={kind} /> }
            },
            errorElement: <ErrorPage />,
          })),
          {
            element: <AppLayout />,
            children: [
              {
                // Une page qui plante garde le menu autour du message d'erreur.
                errorElement: <ErrorPage />,
                children: [
                  { path: sections.home.path, element: <HomePage /> },
                  {
                    path: sections.methods.path,
                    element: (
                      <ContentListPage section="methods" kind="method" />
                    ),
                  },
                  {
                    path: sections.blog.path,
                    element: <ContentListPage section="blog" kind="article" />,
                  },
                  {
                    // Adresse fixe : elle passe avant « /blog/<id> » (l'éditeur).
                    path: categoriesPath("blog"),
                    element: <CategoriesPage section="blog" />,
                  },
                  {
                    path: sections.podcasts.path,
                    element: (
                      <ContentListPage section="podcasts" kind="episode" />
                    ),
                  },
                  {
                    path: categoriesPath("podcasts"),
                    element: <CategoriesPage section="podcasts" />,
                  },
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
