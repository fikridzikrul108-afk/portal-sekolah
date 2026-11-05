export type Role = "Admin" | "Kepala Sekolah" | "Guru" | "Siswa" | "Orang Tua";

export type MenuIconName = "user" | "dashboard" | "students" | "teachers" | "calendar" | "report" | "journal" | "remedial" | "bk" | "attendance" | "billing" | "settings" | "help" | "ai" | "logout" | "menu" | "search" | "bell" | "sun" | "moon";

export const menuItems: { name: string; icon: string; roles: Role[] }[] = [
  {
    name: "Profil Saya",
    icon: "user",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "Dashboard",
    icon: "dashboard",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "Data Siswa",
    icon: "students",
    roles: ["Admin", "Kepala Sekolah", "Guru"],
  },
  {
    name: "Data Guru",
    icon: "teachers",
    roles: ["Admin", "Kepala Sekolah"],
  },
  {
    name: "Jadwal",
    icon: "calendar",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "Kalender Akademik",
    icon: "calendar",
    roles: ["Admin", "Kepala Sekolah", "Guru"],
  },
  {
    name: "Nilai",
    icon: "report",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "Rapor",
    icon: "report",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "Journal",
    icon: "journal",
    roles: ["Admin", "Kepala Sekolah", "Guru"],
  },
  {
    name: "Remedial & Pengayaan",
    icon: "remedial",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa"],
  },
  {
    name: "Program BK",
    icon: "bk",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa"],
  },
  {
    name: "Absensi",
    icon: "attendance",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "SPP & Administrasi",
    icon: "billing",
    roles: ["Admin", "Kepala Sekolah", "Siswa", "Orang Tua"],
  },
  {
    name: "Pengaturan Sekolah",
    icon: "settings",
    roles: ["Admin", "Kepala Sekolah"],
  },
  {
    name: "Pusat Bantuan",
    icon: "help",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
];

// Grup menu sidebar. Item yang tampil ditentukan oleh role user yang sedang login.
const SIDEBAR_GROUPS = [
  { label: "HOME", items: ["Profil Saya", "Dashboard"] },
  { label: "AKADEMIK", items: ["Data Siswa", "Data Guru", "Jadwal", "Kalender Akademik", "Nilai", "Rapor"] },
  { label: "PEMBELAJARAN", items: ["Journal", "Remedial & Pengayaan", "Program BK", "Absensi"] },
  { label: "ADMINISTRASI", items: ["SPP & Administrasi"] },
  { label: "SISTEM", items: ["Pusat Bantuan", "Pengaturan Sekolah"] },
];

export function getSidebarGroups(role: Role) {
  const visibleMenuItems = menuItems.filter((item) => item.roles.includes(role));
  return SIDEBAR_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .map((name) => visibleMenuItems.find((item) => item.name === name))
      .filter(Boolean) as typeof visibleMenuItems,
  }));
}
