"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Command as CommandIcon,
  Menu,
  Search,
  Store,
} from "lucide-react";
import { adminNav, flattenAdminNav } from "@/config/admin-nav";
import {
  permissionsForRole,
  type PermissionKey,
} from "@/server/auth/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { Role } from "@prisma/client";

type Props = {
  user: { email: string; name?: string | null; role: Role };
  children: React.ReactNode;
};

function useCan(role: Role) {
  const allowed = useMemo(() => new Set(permissionsForRole(role)), [role]);
  return (permission: PermissionKey) => allowed.has(permission);
}

function NavLinks({
  role,
  collapsed,
  onNavigate,
}: {
  role: Role;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const can = useCan(role);

  return (
    <div className="space-y-6">
      {adminNav.map((group) => {
        const items = group.items.filter((item) => can(item.permission));
        if (!items.length) return null;
        return (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-accent/15 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommandPalette({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const can = useCan(role);
  const items = flattenAdminNav().filter((item) => can(item.permission));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        // reserved for sidebar toggle handled by shell
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden h-9 w-64 justify-between text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Search className="h-3.5 w-3.5" /> Search admin…
        </span>
        <kbd className="inline-flex items-center gap-1 rounded border px-1.5 text-[10px]">
          <CommandIcon className="h-3 w-3" /> K
        </kbd>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, products, orders…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick actions">
            {can("products.edit") && (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/admin/products/new");
                }}
              >
                Create product
              </CommandItem>
            )}
            {can("orders.view") && (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/admin/orders");
                }}
              >
                View orders
              </CommandItem>
            )}
            {can("cms.publish") && (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/admin/cms");
                }}
              >
                Open homepage builder
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function AdminShell({ user, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card/80 backdrop-blur-xl transition-[width] duration-300 md:flex md:flex-col",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <div>
              <Link href="/admin" className="font-display text-2xl tracking-wider">
                LORVEX
              </Link>
              <p className="text-[10px] uppercase tracking-[0.18em] text-accent">
                Administration
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2 py-4">
          <NavLinks role={user.role} collapsed={collapsed} />
        </ScrollArea>
        <div className="border-t border-border p-3">
          <Link
            href="/fr"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Store className="h-4 w-4" />
            {!collapsed && "View storefront"}
          </Link>
        </div>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-300",
          collapsed ? "md:pl-[72px]" : "md:pl-64",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="border-b border-border p-4">
                <p className="font-display text-2xl tracking-wider">LORVEX</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-accent">
                  Administration
                </p>
              </div>
              <ScrollArea className="h-[calc(100vh-5rem)] px-2 py-4">
                <NavLinks
                  role={user.role}
                  onNavigate={() => setMobileOpen(false)}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <CommandPalette role={user.role} />

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium">{user.name || user.email}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </div>
        </header>
        <main className="min-w-0 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
