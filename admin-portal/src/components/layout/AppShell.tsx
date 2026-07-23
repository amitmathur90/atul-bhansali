import { StaffRole, type StaffRole as StaffRoleType } from "@abc/shared";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const NAV_ITEMS: { to: string; label: string; roles: StaffRoleType[] }[] = [
  { to: "/dashboard", label: "Dashboard", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/complaints", label: "Complaints", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/my-complaints", label: "My Complaints", roles: [StaffRole.STAFF] },
  { to: "/citizens", label: "Citizens", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/staff", label: "Staff Management", roles: [StaffRole.SUPER_ADMIN] },
  { to: "/announcements", label: "Announcements", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  {
    to: "/development-projects",
    label: "Development Projects",
    roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN],
  },
  {
    to: "/emergency-contacts",
    label: "Emergency Contacts",
    roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN],
  },
  { to: "/appointments", label: "Appointments", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  {
    to: "/welfare-schemes",
    label: "Welfare Schemes",
    roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN],
  },
  { to: "/reports", label: "Reports", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
  { to: "/lookups", label: "Categories, Wards & Depts", roles: [StaffRole.SUPER_ADMIN] },
  { to: "/settings", label: "Settings", roles: [StaffRole.MLA, StaffRole.SUPER_ADMIN] },
];

export function AppShell() {
  const navigate = useNavigate();
  const staff = useAuthStore((s) => s.staff);
  const logout = useAuthStore((s) => s.logout);

  const visibleNav = NAV_ITEMS.filter((item) => !staff || item.roles.includes(staff.role));

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="w-60 shrink-0 bg-brand-navy">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-sm font-semibold text-white">Citizen Connect</p>
          <p className="text-xs text-white/60">Admin Portal</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md border-l-4 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-brand-saffron bg-white/10 text-white"
                    : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
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
              Logout
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
