import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckSquare,
  Contact,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/tasks", label: "Tasks & Follow-Ups", icon: CheckSquare },
  { href: "/viewings", label: "Viewings Calendar", icon: CalendarDays },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
