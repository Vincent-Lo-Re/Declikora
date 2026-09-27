import type { RouteObject } from "react-router"

import { AppLayout } from "@/layouts/app-layout"
import { RootLayout } from "@/layouts/root-layout"
import { sections, type SectionKey } from "@/navigation"
import { AccountPage } from "@/pages/account-page"
import { ErrorPage } from "@/pages/error-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { SectionPage } from "@/pages/section-page"

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
  "team",
  "settings",
]

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            // Une page qui plante garde le menu autour du message d'erreur.
            errorElement: <ErrorPage />,
            children: [
              ...upcomingSections.map((section) => ({
                path: sections[section].path,
                element: <SectionPage section={section} />,
              })),
              { path: sections.account.path, element: <AccountPage /> },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]
