"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "cn"

import { Separator } from "@/components/ui/separator"

// Le menu de gauche est toujours ouvert (docs/ADMINISTRATION.md § 7) : ni repli en icônes, ni
// raccourci, ni version mobile (l'admin est faite pour 1 024 px de large au moins). Le menu et le
// contenu sont deux panneaux gris arrondis sur la page blanche, séparés par --page-gap ; le menu
// passe en diagonale (du coin en haut à gauche au coin en bas à droite) de son gris à celui du
// contenu.
const SIDEBAR_WIDTH = "16rem"

function SidebarWrapper({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-wrapper"
      style={
        {
          "--sidebar-width": SIDEBAR_WIDTH,
          ...style,
        } as React.CSSProperties
      }
      className={cn("flex min-h-svh w-full", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function Sidebar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar" className="text-sidebar-foreground">
      {/* La place du menu, à côté de la page : le menu lui-même reste fixe quand elle défile. */}
      <div
        data-slot="sidebar-gap"
        className="w-[calc(var(--sidebar-width)+var(--page-gap))]"
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          "fixed inset-y-0 left-0 z-10 flex h-svh w-[calc(var(--sidebar-width)+var(--page-gap))] py-(--page-gap) pl-(--page-gap)",
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex size-full flex-col overflow-hidden rounded-2xl bg-linear-to-br from-sidebar to-panel ring-1 ring-muted dark:ring-foreground/10"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "relative m-(--page-gap) flex min-h-[calc(100svh-2*var(--page-gap))] min-w-0 flex-1 flex-col rounded-2xl bg-panel ring-1 ring-muted dark:ring-foreground/10",
        className
      )}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("mx-2 bg-sidebar-border data-horizontal:w-auto", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div"> & React.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "sidebar-group-label",
      sidebar: "group-label",
    },
  })
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
}

function SidebarMenuButton({
  render,
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean
  }) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "sidebar-menu-button",
      sidebar: "menu-button",
      active: isActive,
    },
  })
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarWrapper,
}
