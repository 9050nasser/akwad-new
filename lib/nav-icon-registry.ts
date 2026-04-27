import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  Database,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Clock3,
  Cog,
  FileBarChart2,
  Flag,
  FolderKanban,
  Gauge,
  Globe2,
  ListChecks,
  ListTree,
  LogIn,
  LogOut,
  MinusCircle,
  MonitorSmartphone,
  Plane,
  PlusCircle,
  Shield,
  UserCircle2,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

/** مفاتيح أيقونات القائمة — قابلة للتسلسل من السيرفر إلى عميل مثل `Sidebar`. */
export const NAV_ICON_MAP = {
  activity: Activity,
  building2: Building2,
  calendarDays: CalendarDays,
  calendarRange: CalendarRange,
  clipboardList: ClipboardList,
  clock3: Clock3,
  cog: Cog,
  database: Database,
  fileBarChart2: FileBarChart2,
  flag: Flag,
  folderKanban: FolderKanban,
  gauge: Gauge,
  globe2: Globe2,
  listChecks: ListChecks,
  listTree: ListTree,
  logIn: LogIn,
  logOut: LogOut,
  minusCircle: MinusCircle,
  monitorSmartphone: MonitorSmartphone,
  plane: Plane,
  plusCircle: PlusCircle,
  shield: Shield,
  userCircle2: UserCircle2,
  userPlus: UserPlus,
  users: Users,
  usersRound: UsersRound,
  wallet: Wallet,
} as const satisfies Record<string, LucideIcon>;

export type NavIconKey = keyof typeof NAV_ICON_MAP;

export function getNavIcon(key: NavIconKey): LucideIcon {
  return NAV_ICON_MAP[key];
}
