import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  BarChart3,
  Boxes,
  FileStack,
  Gift,
  LayoutDashboard,
  Megaphone,
  Package,
  PanelTop,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
  ImageIcon,
  ScrollText,
  Database,
  HeartHandshake,
  Mail,
  MousePointerClick,
  Navigation,
} from "lucide-react";
import type { PermissionKey } from "@/server/auth/permissions";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: PermissionKey;
  keywords?: string[];
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const adminNav: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        permission: "dashboard.view",
        keywords: ["home", "kpi"],
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
        permission: "analytics.view",
        keywords: ["reports", "revenue"],
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        href: "/admin/products",
        label: "Products",
        icon: Package,
        permission: "products.view",
      },
      {
        href: "/admin/inventory",
        label: "Inventory",
        icon: Warehouse,
        permission: "inventory.manage",
      },
      {
        href: "/admin/brands",
        label: "Brands",
        icon: Tags,
        permission: "products.edit",
      },
      {
        href: "/admin/collections",
        label: "Collections",
        icon: Boxes,
        permission: "products.edit",
      },
      {
        href: "/admin/media",
        label: "Media library",
        icon: ImageIcon,
        permission: "media.manage",
      },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        href: "/admin/orders",
        label: "Orders",
        icon: ShoppingBag,
        permission: "orders.view",
      },
      {
        href: "/admin/customers",
        label: "Customers",
        icon: Users,
        permission: "customers.view",
      },
      {
        href: "/admin/returns",
        label: "Returns",
        icon: HeartHandshake,
        permission: "orders.refund",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        href: "/admin/cms",
        label: "Homepage builder",
        icon: PanelTop,
        permission: "cms.view",
      },
      {
        href: "/admin/cms/navigation",
        label: "Navigation",
        icon: Navigation,
        permission: "cms.view",
      },
      {
        href: "/admin/cms/footer",
        label: "Footer",
        icon: FileStack,
        permission: "cms.view",
      },
      {
        href: "/admin/cms/announcement",
        label: "Announcement",
        icon: Megaphone,
        permission: "cms.view",
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        href: "/admin/marketing/coupons",
        label: "Coupons",
        icon: BadgePercent,
        permission: "marketing.view",
      },
      {
        href: "/admin/marketing/gift-cards",
        label: "Gift cards",
        icon: Gift,
        permission: "marketing.view",
      },
      {
        href: "/admin/marketing/campaigns",
        label: "Campaigns",
        icon: Mail,
        permission: "marketing.view",
      },
      {
        href: "/admin/marketing/popups",
        label: "Popups",
        icon: MousePointerClick,
        permission: "marketing.view",
      },
      {
        href: "/admin/marketing/discounts",
        label: "Discount rules",
        icon: BadgePercent,
        permission: "marketing.view",
      },
      {
        href: "/admin/marketing/abandoned",
        label: "Abandoned carts",
        icon: ShoppingCart,
        permission: "marketing.view",
      },
      {
        href: "/admin/marketing/loyalty",
        label: "Loyalty & referrals",
        icon: HeartHandshake,
        permission: "marketing.view",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/admin/system",
        label: "System health",
        icon: Database,
        permission: "system.view",
      },
      {
        href: "/admin/system/audit",
        label: "Audit logs",
        icon: ScrollText,
        permission: "system.view",
      },
      {
        href: "/admin/system/roles",
        label: "Roles & access",
        icon: Shield,
        permission: "users.manage",
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        permission: "system.manage",
      },
    ],
  },
];

export function flattenAdminNav() {
  return adminNav.flatMap((group) => group.items);
}
