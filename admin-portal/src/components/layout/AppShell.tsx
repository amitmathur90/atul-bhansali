import { StaffRole, type StaffRole as StaffRoleType } from "@abc/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import mlaPhoto from "../../assets/mla-photo.png";
import { useAuthStore } from "../../store/authStore";

interface NavLeaf {
  to: string;
  label: string;
  roles: StaffRoleType[];
}

interface NavGroup {
  label: string;
  roles: StaffRoleType[];
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const NAV_ITEMS: NavEntry[] = [
  { to: "/dashboard", label: "डैशबोर्ड", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  {
    label: "शिकायत प्रबंधन",
    roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN],
    children: [
      { to: "/complaints", label: "शिकायतें", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
      { to: "/lookups", label: "श्रेणियां", roles: [StaffRole.SUPER_ADMIN] },
    ],
  },
  { to: "/my-complaints", label: "मेरी शिकायतें", roles: [StaffRole.STAFF] },
  { to: "/staff", label: "अधिकारी प्रबंधन", roles: [StaffRole.SUPER_ADMIN] },
  { to: "/citizens", label: "नागरिक", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/development-projects", label: "विकास कार्य", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/announcements", label: "नोटिस / घोषणा", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/appointments", label: "अपॉइंटमेंट", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/welfare-schemes", label: "कल्याण योजनाएं", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/emergency-contacts", label: "आपातकालीन संपर्क", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/reports", label: "रिपोर्ट और एनालिटिक्स", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/settings", label: "सेटिंग्स", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
];

function filterByRole(items: NavEntry[], role: StaffRoleType | undefined): NavEntry[] {
  return items
    .filter((item) => !role || item.roles.includes(role))
    .map((item) =>
      isGroup(item) ? { ...item, children: item.children.filter((c) => !role || c.roles.includes(role)) } : item,
    )
    .filter((item) => !isGroup(item) || item.children.length > 0);
}

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md border-l-4 px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "border-brand-saffron bg-white/10 text-white"
      : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
  }`;

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const staff = useAuthStore((s) => s.staff);
  const logout = useAuthStore((s) => s.logout);

  const visibleNav = filterByRole(NAV_ITEMS, staff?.role);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="w-64 shrink-0 bg-brand-navy">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <img src={mlaPhoto} alt="MLA" className="h-11 w-11 rounded-full border-2 border-brand-saffron object-cover" />
          <div>
            <p className="text-sm font-semibold text-white">अतुल भंसाली</p>
            <p className="text-xs text-white/60">MLA, जोधपुर</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visibleNav.map((item) =>
            isGroup(item) ? (
              <NavGroupItem key={item.label} group={item} currentPath={location.pathname} />
            ) : (
              <NavLink key={item.to} to={item.to} className={linkClasses}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b-2 border-brand-saffron bg-white px-6 py-3 dark:bg-slate-900">
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{staff?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{staff?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              लॉगआउट
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavGroupItem({ group, currentPath }: { group: NavGroup; currentPath: string }) {
  const containsActive = group.children.some((c) => currentPath.startsWith(c.to));
  const [open, setOpen] = useState(containsActive);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-md border-l-4 px-3 py-2 text-sm font-medium transition-colors ${
          containsActive ? "border-brand-saffron text-white" : "border-transparent text-white/70 hover:text-white"
        }`}
      >
        {group.label}
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && (
        <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-2">
          {group.children.map((child) => (
            <NavLink key={child.to} to={child.to} className={linkClasses}>
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
