import { BookOpen, Calendar, ClipboardCheck, ClipboardList, type LucideIcon, Tags, Users } from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const memberSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Library",
    items: [
      { id: "shelves", title: "My shelf", url: "/dashboard/shelves", icon: BookOpen },
      { id: "events", title: "Events", url: "/dashboard/events", icon: Calendar },
    ],
  },
];

export const adminSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Library",
    items: [
      { id: "shelves", title: "Shelves", url: "/dashboard/shelves", icon: BookOpen },
      { id: "events", title: "Events", url: "/dashboard/events", icon: Calendar },
    ],
  },
  {
    id: 2,
    label: "Admin",
    items: [
      { id: "members", title: "Members", url: "/dashboard/admin/members", icon: Users },
      { id: "proposals", title: "Shelf proposals", url: "/dashboard/admin/proposals", icon: ClipboardList },
      {
        id: "event-proposals",
        title: "Event proposals",
        url: "/dashboard/admin/event-proposals",
        icon: ClipboardCheck,
      },
      { id: "categories", title: "Categories", url: "/dashboard/admin/categories", icon: Tags },
    ],
  },
];

export const sidebarItems = memberSidebarItems;
