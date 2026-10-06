import type { ReactNode } from "react"
import type { RouteObject } from "react-router"

import { RequireAdmin, RequireTeamMember } from "@/auth/guards"
import { LoadingScreen } from "@/components/loading-screen"
import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"
import { RootLayout } from "@/layouts/root-layout"
import type { ContentKind } from "@/lib/contents/api"
import {
  prepareCategories,
  prepareContentList,
  prepareEditor,
  prepareHome,
  prepareMedia,
  prepareSettings,
  prepareTeam,
  prepareTemplates,
  prepareTrash,
} from "@/lib/page-preparations"
import {
  pageLoader,
  preparedOnArrival,
  type PageHandle,
  type Prepare,
} from "@/lib/preparation"
import {
  authPaths,
  categoriesPath,
  menuRouteId,
  sections,
  type SectionKey,
} from "@/navigation"
import { ErrorPage } from "@/pages/error-page"

/**
 * Une page de l'admin, chargée à part (le premier chargement est plus léger) et préparée avant
 * d'être montrée (lib/preparation.ts). prepare : ce qu'elle lit en arrivant, null si elle ne lit
 * rien ; warm : son code se télécharge dès l'ouverture de l'admin.
 */
function page<M>(
  path: string,
  code: () => Promise<M>,
  render: (module: M) => ReactNode,
  prepare: Prepare | null,
  { warm = false } = {}
): RouteObject {
  const handle: PageHandle = { code, prepare, warm }
  return {
    path,
    lazy: async () => ({ element: render(await code()) }),
    loader: pageLoader(prepare),
    shouldRevalidate: preparedOnArrival,
    handle,
  }
}

/** Une page de connexion, chargée à part : sans membre, rien n'est préparé. */
function authPage<M>(
  path: string,
  code: () => Promise<M>,
  render: (module: M) => ReactNode
): RouteObject {
  const handle: PageHandle = { code, prepare: null }
  return {
    path,
    lazy: async () => ({ element: render(await code()) }),
    handle,
  }
}

const editorCode = () => import("@/pages/editor-page")
const listCode = () => import("@/pages/content-list-page")
const categoriesCode = () => import("@/pages/categories-page")
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

const editorRoutes: EditorRoute[] = [
  sectionEditor("blog", "article"),
  sectionEditor("podcasts", "episode"),
  sectionEditor("pages", "page"),
  // L'éditeur d'un modèle : le même éditeur plein écran, « ← Modèles ».
  sectionEditor("templates", "template"),
]

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    // Premier chargement : le temps de télécharger le code de la page demandée.
    hydrateFallbackElement: <LoadingScreen />,
    children: [
      {
        // Connexion : sans menu, accessible sans session.
        element: <AuthLayout />,
        children: [
          authPage(
            authPaths.signIn,
            () => import("@/pages/sign-in-page"),
            (m) => <m.SignInPage />
          ),
          authPage(
            authPaths.mfa,
            () => import("@/pages/mfa-page"),
            (m) => <m.MfaPage />
          ),
          authPage(
            authPaths.invitation,
            () => import("@/pages/invitation-page"),
            (m) => <m.InvitationPage />
          ),
          authPage(
            authPaths.signOut,
            () => import("@/pages/sign-out-page"),
            (m) => <m.SignOutPage />
          ),
        ],
      },
      {
        // Le reste de l'admin : connecté, double vérification faite.
        element: <RequireTeamMember />,
        children: [
          // L'éditeur prend tout l'écran : le menu se cache, « ← Blog » ramène à la liste.
          ...editorRoutes.map(({ section, kind, path }) => ({
            // Chargé à part : Tiptap et le glisser-déposer ne pèsent que sur l'éditeur ; son code
            // se télécharge dès l'ouverture de l'admin.
            ...page(
              path,
              editorCode,
              (m) => <m.EditorPage section={section} kind={kind} />,
              prepareEditor(kind),
              { warm: true }
            ),
            errorElement: <ErrorPage />,
          })),
          {
            id: menuRouteId,
            element: <AppLayout />,
            children: [
              {
                // Une page qui plante garde le menu autour du message d'erreur.
                errorElement: <ErrorPage />,
                children: [
                  page(
                    sections.home.path,
                    () => import("@/pages/home-page"),
                    (m) => <m.HomePage />,
                    prepareHome
                  ),
                  page(
                    sections.blog.path,
                    listCode,
                    (m) => <m.ContentListPage section="blog" kind="article" />,
                    prepareContentList("article")
                  ),
                  // Adresse fixe : elle passe avant « /blog/<id> » (l'éditeur).
                  page(
                    categoriesPath("blog"),
                    categoriesCode,
                    (m) => <m.CategoriesPage section="blog" />,
                    prepareCategories("blog")
                  ),
                  page(
                    sections.podcasts.path,
                    listCode,
                    (m) => (
                      <m.ContentListPage section="podcasts" kind="episode" />
                    ),
                    prepareContentList("episode")
                  ),
                  page(
                    categoriesPath("podcasts"),
                    categoriesCode,
                    (m) => <m.CategoriesPage section="podcasts" />,
                    prepareCategories("podcasts")
                  ),
                  page(
                    sections.pages.path,
                    listCode,
                    (m) => <m.ContentListPage section="pages" kind="page" />,
                    prepareContentList("page")
                  ),
                  page(
                    sections.templates.path,
                    () => import("@/pages/templates-page"),
                    (m) => <m.TemplatesPage />,
                    prepareTemplates
                  ),
                  page(
                    sections.media.path,
                    () => import("@/pages/media-page"),
                    (m) => <m.MediaPage />,
                    prepareMedia
                  ),
                  page(
                    sections.trash.path,
                    () => import("@/pages/trash-page"),
                    (m) => <m.TrashPage />,
                    prepareTrash
                  ),
                  {
                    element: <RequireAdmin />,
                    children: [
                      page(
                        sections.team.path,
                        () => import("@/pages/team-page"),
                        (m) => <m.TeamPage />,
                        prepareTeam
                      ),
                      page(
                        sections.settings.path,
                        () => import("@/pages/settings-page"),
                        (m) => <m.SettingsPage />,
                        prepareSettings
                      ),
                    ],
                  },
                  // Mon compte : la fiche du membre, déjà lue à la connexion.
                  page(
                    sections.account.path,
                    () => import("@/pages/account-page"),
                    (m) => <m.AccountPage />,
                    null
                  ),
                  page(
                    "*",
                    () => import("@/pages/not-found-page"),
                    (m) => <m.NotFoundPage />,
                    null
                  ),
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]
