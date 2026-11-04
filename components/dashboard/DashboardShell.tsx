"use client";

import { useState, type ReactNode } from "react";
import MenuIcon from "@/components/MenuIcon";
import { getSidebarGroups, type MenuIconName, type Role } from "@/lib/menu";

const SCHOOL_LOGO_URL = "/logo-sd.png";

export type PortalNotification = {
  id: string;
  title: string;
  message: string;
  category: string;
  created_at: string;
  read_at: string | null;
  resolved_at: string | null;
};

type Props = {
  role: Role;
  name: string;
  displayName: string; // userProfile.nama || name
  photoUrl: string; // userProfile.fotoUrl
  activeMenu: string;
  onOpenMenu: (menu: string) => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  notifications?: PortalNotification[];
  unreadNotificationCount?: number;
  notificationToast?: PortalNotification | null;
  onNotificationsViewed?: () => void;
  onDismissNotificationToast?: () => void;
  children: ReactNode;
};

// Daftar menu sidebar; item yang muncul mengikuti role user yang sedang login.
function NavGroups({
  role,
  activeMenu,
  onOpenMenu,
  variant,
}: {
  role: Role;
  activeMenu: string;
  onOpenMenu: (menu: string) => void;
  variant: "desktop" | "mobile";
}) {
  const groups = getSidebarGroups(role);
  const desktop = variant === "desktop";

  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="mb-7 last:mb-0">
          <p className="mb-2.5 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {group.label}
          </p>
          <nav className="space-y-1">
            {group.items.map((item) => {
              const active = activeMenu === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onOpenMenu(item.name)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 text-left font-medium transition-all duration-300 ease-out touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 ${
                    desktop ? "min-h-10 py-2 text-[13px]" : "min-h-11 py-2 text-sm"
                  } ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : "text-slate-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white"
                    }`}
                  >
                    <MenuIcon name={item.icon as MenuIconName} size={17} />
                  </span>
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ))}
    </>
  );
}

function SidebarBrand({ role, compact }: { role: Role; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-md shadow-black/20 ring-1 ring-white/10 ${
          compact ? "h-10 w-10" : "h-11 w-11"
        }`}
      >
        <img src={SCHOOL_LOGO_URL} alt="Logo SD Islam Al-Barkah" className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold tracking-tight text-white">SD Islam Al-Barkah</h1>
        <p className="truncate text-[11px] text-slate-400">{compact ? role : "Academic Management System"}</p>
      </div>
    </div>
  );
}

function SidebarFooter({ role, name, onLogout, mobile }: { role: Role; name: string; onLogout: () => void; mobile?: boolean }) {
  return (
    <div className={`shrink-0 border-t border-white/10 p-4 ${mobile ? "pb-[max(1rem,env(safe-area-inset-bottom))]" : ""}`}>
      <div className="mb-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <p className="truncate text-xs font-semibold text-white">{name}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">{role}</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition-all duration-300 hover:bg-red-500/10 hover:text-red-400 touch-manipulation"
      >
        <MenuIcon name="logout" size={17} />
        Keluar dari Portal
      </button>
    </div>
  );
}

export default function DashboardShell({
  role,
  name,
  displayName,
  photoUrl,
  activeMenu,
  onOpenMenu,
  onLogout,
  darkMode,
  onToggleDarkMode,
  mobileMenuOpen,
  setMobileMenuOpen,
  notifications = [],
  unreadNotificationCount = 0,
  notificationToast = null,
  onNotificationsViewed,
  onDismissNotificationToast,
  children,
}: Props) {
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const showNotificationBell = role === "Admin" || role === "Kepala Sekolah" || role === "Guru";
  const toggleNotifications = () => {
    const nextOpen = !notificationPanelOpen;
    setNotificationPanelOpen(nextOpen);
    if (nextOpen) {
      onNotificationsViewed?.();
      onDismissNotificationToast?.();
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950">
      {/* ===== Sidebar desktop ===== */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[272px] flex-col border-r border-white/5 bg-slate-900 shadow-xl shadow-slate-900/20 lg:flex">
        <div className="flex h-[72px] shrink-0 items-center border-b border-white/10 px-6">
          <SidebarBrand role={role} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 [scrollbar-color:theme(colors.slate.700)_transparent] [scrollbar-width:thin]">
          <NavGroups role={role} activeMenu={activeMenu} onOpenMenu={onOpenMenu} variant="desktop" />
        </div>

        <SidebarFooter role={role} name={name} onLogout={onLogout} />
      </aside>

      {/* ===== Sidebar mobile ===== */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-white/5 bg-slate-900 shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 px-5">
          <SidebarBrand role={role} compact />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl text-slate-400 transition-colors duration-300 hover:bg-white/10 hover:text-white touch-manipulation"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          <NavGroups role={role} activeMenu={activeMenu} onOpenMenu={onOpenMenu} variant="mobile" />
        </div>

        <SidebarFooter role={role} name={name} onLogout={onLogout} mobile />
      </aside>

      {/* ===== Navbar atas + konten ===== */}
      <main className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Buka menu"
                aria-expanded={mobileMenuOpen}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors duration-200 hover:bg-slate-50 touch-manipulation lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <MenuIcon name="menu" size={20} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span>Portal Sekolah</span>
                  <span>/</span>
                  <span className="truncate text-blue-600 dark:text-blue-400">{activeMenu}</span>
                </div>
                <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl dark:text-white">
                  {activeMenu}
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label={darkMode ? "Gunakan white mode" : "Gunakan dark mode"}
                title={darkMode ? "White mode" : "Dark mode"}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <MenuIcon name={darkMode ? "sun" : "moon"} size={18} />
              </button>

              {showNotificationBell && <div className="relative">
                <button
                  type="button"
                  onClick={toggleNotifications}
                  aria-label="Buka riwayat notifikasi"
                  aria-expanded={notificationPanelOpen}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <MenuIcon name="bell" size={18} />
                  {unreadNotificationCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">{Math.min(unreadNotificationCount, 99)}</span>}
                </button>
                {notificationPanelOpen && <div className="absolute right-0 top-full z-50 mt-3 w-[min(90vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div><h3 className="font-bold">Riwayat Notifikasi</h3><p className="text-[11px] text-slate-500 dark:text-slate-400">Pengingat agenda dan kehadiran</p></div>
                    <button type="button" onClick={() => setNotificationPanelOpen(false)} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-200/70 dark:hover:bg-slate-800">Tutup</button>
                  </div>
                  <div className="max-h-[min(65vh,440px)] space-y-0 overflow-y-auto">
                    {notifications.length ? notifications.map((item) => <article key={item.id} className="border-b border-slate-100 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!item.read_at && !item.resolved_at ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{item.category}</span>{item.resolved_at && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Selesai</span>}</div>
                          <p className="mt-1 text-sm font-semibold">{item.title}</p>
                          <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-600 dark:text-slate-300">{item.message}</p>
                          <p className="mt-2 text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}</p>
                        </div>
                      </div>
                    </article>) : <p className="px-4 py-8 text-center text-sm text-slate-500">Belum ada riwayat notifikasi.</p>}
                  </div>
                </div>}
              </div>}

              <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" aria-hidden="true" />

              <div className="flex items-center gap-3">
                {photoUrl ? (
                  <img src={photoUrl} alt="Foto profil" className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-100 dark:ring-slate-700" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 ring-2 ring-blue-100 dark:ring-slate-700">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[180px] truncate text-sm font-semibold leading-tight text-slate-800 dark:text-white">{name}</p>
                  <p className="mt-0.5 text-xs leading-tight text-slate-500 dark:text-slate-400">{role}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                aria-label="Keluar dari portal"
                title="Keluar"
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 touch-manipulation dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <MenuIcon name="logout" size={17} />
                <span className="hidden md:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {showNotificationBell && notificationToast && <div className="fixed right-4 top-[84px] z-[70] w-[min(92vw,390px)] animate-in slide-in-from-top-2 duration-200">
          <div role="status" aria-live="polite" className="rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl shadow-slate-900/10 dark:border-blue-900 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><MenuIcon name="bell" size={18}/></span>
              <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">Pengingat Sekolah</p><p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{notificationToast.title}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{notificationToast.message}</p></div>
              <button type="button" aria-label="Tutup pemberitahuan" onClick={onDismissNotificationToast} className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">×</button>
            </div>
          </div>
        </div>}

        {/* Area konten: dibatasi 1600px, di tengah, dengan jarak konsisten */}
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}