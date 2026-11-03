import { useMemo, useState, type FormEvent } from "react";
import MenuIcon from "@/components/MenuIcon";
import type { MenuIconName, Role } from "@/lib/menu";

export type TeacherMorningRow = { id: string; nama: string; status: string; jamMasuk: string | null; isPiket: boolean };
export type ClassAttendanceRow = { id: string; guru: string; kelas: string; mapel: string; status: string; isPiket: boolean };
export type ClassProgressRow = { id: string; kelas: string; totalSiswa: number; tercatat: number; hadir: number; status: string };
export type SchoolEvent = { id: string; judul: string; deskripsi: string; kategori: string; tanggalMulai: string; tanggalSelesai: string | null; penting: boolean };
export type TeacherLesson = { id: string; classId: string; className: string; subjectId: string; subjectName: string; room: string; sessions: { start: string; end: string }[] };
export type TeacherLessonAction = "attendance" | "journal" | "bk";
export type SchoolStats = {
  totalSiswa: number; totalGuru: number; totalRombel: number;
  attendancePercent: number | null; attendancePresent: number; attendanceTotal: number; attendanceExpected?: number;
  teacherMorningPercent?: number | null; teacherMorningPresent?: number; teacherMorningTotal?: number; teacherMorningRows?: TeacherMorningRow[];
  classAttendancePercent?: number | null; classAttendanceDone?: number; classAttendanceExpected?: number; classAttendanceTodayRows?: ClassAttendanceRow[];
  classProgressRows?: ClassProgressRow[]; schoolEvents?: SchoolEvent[]; teacherTodaySchedules?: TeacherLesson[];
};
export type ActivityRow = {
  id: number; table_name: string; action: string; actor_id: string | null;
  actor_name: string | null; target_name: string | null; created_at: string;
};
type Props = {
  name: string; role: Role; currentUserId: string | null; dashboardLoading: boolean;
  dashboardSchoolStats: SchoolStats; activityRows: ActivityRow[];
  onCreateAnnouncement: (payload: { judul: string; deskripsi: string; kategori: string; tanggal_mulai: string; tanggal_selesai: string | null; penting: boolean }) => Promise<void>;
  onOpenMenu: (menuName: string) => void | Promise<void>;
  onOpenTeacherLesson: (lesson: TeacherLesson, action: TeacherLessonAction) => void | Promise<void>;
};

type DetailPanel = "morning" | "students" | "class" | null;
const jakartaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dateLabel = (value: string) => {
  if (!value) return "Tanggal belum ditentukan";
  return new Date(`${value}T12:00:00+07:00`).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });
};

export default function StaffDashboard({ name, role, currentUserId, dashboardLoading, dashboardSchoolStats: stats, activityRows, onCreateAnnouncement, onOpenMenu, onOpenTeacherLesson }: Props) {
  const [selectedTeacherLessonId, setSelectedTeacherLessonId] = useState<string | null>(null);
  const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);
  const [announcementFormOpen, setAnnouncementFormOpen] = useState(false);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");
  const [announcementForm, setAnnouncementForm] = useState({ judul: "", deskripsi: "", kategori: "Pengumuman", tanggal_mulai: jakartaDate(), tanggal_selesai: "", penting: false });
  const [agendaMonth, setAgendaMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const managementDashboard = role === "Admin" || role === "Kepala Sekolah";
  const events = stats.schoolEvents ?? [];
  const today = jakartaDate();
  const todayLabel = new Date(`${today}T12:00:00+07:00`).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const agendaMonthStart = `${agendaMonth.getFullYear()}-${String(agendaMonth.getMonth() + 1).padStart(2, "0")}-01`;
  const agendaMonthEndDate = new Date(agendaMonth.getFullYear(), agendaMonth.getMonth() + 1, 0);
  const agendaMonthEnd = `${agendaMonthEndDate.getFullYear()}-${String(agendaMonthEndDate.getMonth() + 1).padStart(2, "0")}-${String(agendaMonthEndDate.getDate()).padStart(2, "0")}`;
  const agendaMonthLabel = agendaMonth.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", month: "long", year: "numeric" });
  // Dashboard Admin dan Kepala Sekolah menampilkan agenda penting yang
  // tanggalnya beririsan dengan bulan terpilih. Agenda di bulan lain tetap
  // tersedia pada menu Kalender Akademik.
  const monthlyEvents = useMemo(
    () => events
      .filter((event) => {
        const eventEnd = event.tanggalSelesai || event.tanggalMulai;
        return (managementDashboard ? event.penting : true) && event.tanggalMulai <= agendaMonthEnd && eventEnd >= agendaMonthStart;
      })
      .sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai) || a.judul.localeCompare(b.judul, "id")),
    [events, agendaMonthStart, agendaMonthEnd, managementDashboard],
  );
  const teacherTodaySchedules = stats.teacherTodaySchedules ?? [];
  const selectedTeacherLesson = teacherTodaySchedules.find((lesson) => lesson.id === selectedTeacherLessonId) ?? null;
  const jakartaClock = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const [jakartaHour, jakartaMinute] = jakartaClock.split(":").map(Number);
  const jakartaMinutes = jakartaHour * 60 + jakartaMinute;

  const submitAnnouncement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnnouncementError("");
    if (!announcementForm.judul.trim() || !announcementForm.tanggal_mulai) {
      setAnnouncementError("Judul dan tanggal mulai wajib diisi.");
      return;
    }
    if (announcementForm.tanggal_selesai && announcementForm.tanggal_selesai < announcementForm.tanggal_mulai) {
      setAnnouncementError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    setAnnouncementSaving(true);
    try {
      await onCreateAnnouncement({
        judul: announcementForm.judul.trim(), deskripsi: announcementForm.deskripsi.trim(),
        kategori: announcementForm.kategori, tanggal_mulai: announcementForm.tanggal_mulai,
        tanggal_selesai: announcementForm.tanggal_selesai || null, penting: announcementForm.penting,
      });
      setAnnouncementForm({ judul: "", deskripsi: "", kategori: "Pengumuman", tanggal_mulai: jakartaDate(), tanggal_selesai: "", penting: false });
      setAnnouncementFormOpen(false);
    } catch (error) {
      setAnnouncementError(error instanceof Error ? error.message : "Pengumuman gagal disimpan.");
    } finally {
      setAnnouncementSaving(false);
    }
  };

  return <>
    <div className="mb-6 flex items-start justify-between gap-3">
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-xl sm:p-7">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-medium text-slate-300">Selamat datang kembali,</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{name} 👋</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Anda masuk sebagai {role}. Berikut pemantauan kegiatan sekolah.</p>
          <p className="mt-3 text-xs font-semibold text-emerald-200">{todayLabel}</p>
        </div>
      </div>
    </div>

    {(managementDashboard || role === "Guru") && <section className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Pusat informasi sekolah</p><h2 className="mt-1 text-lg font-bold text-slate-900">Informasi & Pengumuman</h2><p className="mt-1 text-sm text-slate-500">{role === "Guru" ? "Menampilkan agenda dan pengumuman sekolah pada bulan terpilih. Agenda bulan lain tersedia di Kalender Akademik." : "Menampilkan agenda penting pada satu bulan terpilih. Agenda bulan lain tersedia di Kalender Akademik."}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onOpenMenu("Kalender Akademik")} className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Lihat Kalender Lengkap →</button>
          {managementDashboard && <button type="button" onClick={() => setAnnouncementFormOpen((value) => !value)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">{announcementFormOpen ? "Tutup formulir" : "+ Buat Pengumuman"}</button>}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Agenda bulan</p>
          <p className="text-base font-bold capitalize text-slate-900">{agendaMonthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Bulan sebelumnya" onClick={() => setAgendaMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50">‹</button>
          <button type="button" onClick={() => { const now = new Date(); setAgendaMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50">Bulan ini</button>
          <button type="button" aria-label="Bulan berikutnya" onClick={() => setAgendaMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50">›</button>
        </div>
      </div>
      {managementDashboard && announcementFormOpen && <form onSubmit={submitAnnouncement} className="mb-5 grid gap-3 rounded-xl border border-emerald-100 bg-white p-4 md:grid-cols-2">
        <label className="md:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Judul acara / pengumuman *</span><input value={announcementForm.judul} onChange={(e) => setAnnouncementForm((old) => ({ ...old, judul: e.target.value }))} required maxLength={160} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" placeholder="Contoh: Peringatan Hari Guru Nasional" /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">Kategori</span><select value={announcementForm.kategori} onChange={(e) => setAnnouncementForm((old) => ({ ...old, kategori: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"><option>Pengumuman</option><option>Agenda Sekolah</option><option>Peringatan Nasional</option><option>Libur Sekolah</option><option>Ujian</option><option>Rapat</option></select></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">Tanggal mulai *</span><input type="date" value={announcementForm.tanggal_mulai} onChange={(e) => setAnnouncementForm((old) => ({ ...old, tanggal_mulai: e.target.value }))} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">Tanggal selesai (opsional)</span><input type="date" value={announcementForm.tanggal_selesai} min={announcementForm.tanggal_mulai} onChange={(e) => setAnnouncementForm((old) => ({ ...old, tanggal_selesai: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700"><input type="checkbox" checked={announcementForm.penting} onChange={(e) => setAnnouncementForm((old) => ({ ...old, penting: e.target.checked }))} className="h-4 w-4 accent-emerald-700" /> Tandai sebagai informasi penting</label>
        <label className="md:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Keterangan</span><textarea value={announcementForm.deskripsi} onChange={(e) => setAnnouncementForm((old) => ({ ...old, deskripsi: e.target.value }))} rows={3} maxLength={2000} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" placeholder="Tuliskan detail acara atau pengumuman…" /></label>
        {announcementError && <p className="md:col-span-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{announcementError}</p>}
        <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={announcementSaving} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{announcementSaving ? "Menyimpan…" : "Simpan Pengumuman"}</button></div>
      </form>}
      {monthlyEvents.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{monthlyEvents.map((event) => <article key={event.id} className={`rounded-xl border bg-white p-4 ${event.penting ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"}`}>
        <div className="flex items-start justify-between gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">{event.kategori}</span>{event.penting && <span className="text-[11px] font-bold text-amber-700">PENTING</span>}</div>
        <h3 className="mt-3 font-bold text-slate-900">{event.judul}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{dateLabel(event.tanggalMulai)}{event.tanggalSelesai && event.tanggalSelesai !== event.tanggalMulai ? ` – ${dateLabel(event.tanggalSelesai)}` : ""}</p>
        {event.deskripsi && <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-600">{event.deskripsi}</p>}
      </article>)}</div> : <div className="rounded-xl border border-dashed border-emerald-200 bg-white/80 p-5 text-center"><p className="text-sm font-semibold text-slate-700">{role === "Guru" ? "Belum ada informasi sekolah pada bulan ini." : "Belum ada agenda penting pada bulan ini."}</p><p className="mt-1 text-xs text-slate-500">Belum ada agenda penting pada bulan yang dipilih. Pilih bulan lain atau buat pengumuman baru. Agenda pendukung tetap tersedia di Kalender Akademik.</p></div>}
    </section>}

    <div className={`grid gap-4 sm:grid-cols-2 ${managementDashboard ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
      <StatCard title={role === "Guru" ? "Siswa Kelas Saya" : "Total Siswa"} value={dashboardLoading ? "…" : String(stats.totalSiswa)} detail={role === "Guru" ? "Siswa dari kelas yang diampu" : "Siswa aktif dari database"} icon="students" />
      <StatCard title="Total Guru" value={dashboardLoading ? "…" : String(stats.totalGuru)} detail="Data guru dari master sekolah" icon="teachers" />
      <StatCard title={role === "Guru" ? "Kelas Saya" : "Rombel"} value={dashboardLoading ? "…" : String(stats.totalRombel)} detail={role === "Guru" ? "Kelas yang ditugaskan" : "Kelas dari database"} icon="dashboard" />
      {managementDashboard && <StatCard title="Kehadiran Siswa Hari Ini" value={dashboardLoading ? "…" : `${stats.attendancePercent ?? 0}%`} detail={`${stats.attendancePresent} dari ${stats.attendanceExpected ?? stats.totalSiswa} siswa hadir · ${stats.attendanceTotal} sudah tercatat`} icon="attendance" />}
    </div>

    {managementDashboard && <>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <button type="button" onClick={() => setDetailPanel((current) => current === "morning" ? null : "morning")} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">Kehadiran Guru Pagi</span><MenuIcon name="teachers" size={21}/></div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{dashboardLoading ? "…" : `${stats.teacherMorningPercent ?? 0}%`}</p>
          <p className="mt-1 text-xs text-slate-500">{stats.teacherMorningPresent ?? 0} hadir dari {stats.teacherMorningTotal ?? 0} guru wajib hadir</p>
          <p className="mt-3 text-xs font-bold text-emerald-700">Lihat guru sudah/belum absen →</p>
        </button>
        <button type="button" onClick={() => setDetailPanel((current) => current === "students" ? null : "students")} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">Absensi Siswa Hari Ini</span><MenuIcon name="attendance" size={21}/></div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{dashboardLoading ? "…" : `${stats.attendancePercent ?? 0}%`}</p>
          <p className="mt-1 text-xs text-slate-500">{stats.attendanceTotal} siswa tercatat dari {stats.totalSiswa} siswa aktif</p>
          <p className="mt-3 text-xs font-bold text-emerald-700">Lihat status setiap kelas →</p>
        </button>
        <button type="button" onClick={() => setDetailPanel((current) => current === "class" ? null : "class")} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">Absensi Guru di Kelas</span><MenuIcon name="dashboard" size={21}/></div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{dashboardLoading ? "…" : `${stats.classAttendancePercent ?? 0}%`}</p>
          <p className="mt-1 text-xs text-slate-500">{stats.classAttendanceDone ?? 0} dari {stats.classAttendanceExpected ?? 0} kewajiban sampai hari ini</p>
          <p className="mt-3 text-xs font-bold text-emerald-700">Lihat guru sudah/belum mengisi →</p>
        </button>
      </div>

      {detailPanel && <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold text-slate-900">{detailPanel === "morning" ? "Detail Absensi Pagi Guru" : detailPanel === "students" ? "Detail Absensi Siswa per Kelas" : "Detail Pelaksanaan Absensi Guru di Kelas"}</h3><p className="mt-1 text-xs text-slate-500">Data harian · {todayLabel}</p></div><button type="button" onClick={() => setDetailPanel(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Tutup</button></div>
        {detailPanel === "morning" && <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Nama Guru</th><th className="p-3">Jam Masuk</th><th className="p-3">Status</th></tr></thead><tbody>{(stats.teacherMorningRows ?? []).map((row) => <tr key={row.id} className="border-t"><td className="p-3 font-medium">{row.nama}{row.isPiket && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Guru Piket</span>}</td><td className="p-3">{row.jamMasuk ? String(row.jamMasuk).slice(0, 5) : "—"}</td><td className="p-3"><StatusPill value={row.status}/></td></tr>)}</tbody></table>{!stats.teacherMorningRows?.length && <p className="p-5 text-center text-sm text-slate-500">Tidak ada guru yang dijadwalkan hadir pagi ini.</p>}</div>}
        {detailPanel === "students" && <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Kelas</th><th className="p-3">Siswa Hadir</th><th className="p-3">Sudah Tercatat</th><th className="p-3">Status</th></tr></thead><tbody>{(stats.classProgressRows ?? []).map((row) => <tr key={row.id} className="border-t"><td className="p-3 font-medium">{row.kelas}</td><td className="p-3">{row.hadir} / {row.totalSiswa}</td><td className="p-3">{row.tercatat} / {row.totalSiswa}</td><td className="p-3"><StatusPill value={row.status}/></td></tr>)}</tbody></table>{!stats.classProgressRows?.length && <p className="p-5 text-center text-sm text-slate-500">Data kelas belum tersedia.</p>}</div>}
        {detailPanel === "class" && <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Guru</th><th className="p-3">Kelas</th><th className="p-3">Mata Pelajaran</th><th className="p-3">Status</th></tr></thead><tbody>{(stats.classAttendanceTodayRows ?? []).map((row) => <tr key={row.id} className="border-t"><td className="p-3 font-medium">{row.guru}{row.isPiket && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Pengganti</span>}</td><td className="p-3">{row.kelas}</td><td className="p-3">{row.mapel}</td><td className="p-3"><StatusPill value={row.status}/></td></tr>)}</tbody></table>{!stats.classAttendanceTodayRows?.length && <p className="p-5 text-center text-sm text-slate-500">Tidak ada kewajiban absensi kelas pada hari ini.</p>}</div>}
      </section>}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Aktivitas Terbaru</h3><p className="mt-1 text-xs text-slate-500">Aktivitas pengguna yang tercatat di sistem.</p></div><button type="button" onClick={() => onOpenMenu("Absensi")} className="text-xs font-bold text-emerald-700">Buka absensi →</button></div><div className="mt-4 space-y-4">{activityRows.length === 0 ? <p className="text-sm text-slate-500">Belum ada aktivitas tercatat.</p> : activityRows.slice(0, 8).map((item) => <Activity key={item.id} title={`${item.actor_name || "Pengguna"} ${item.action}${item.target_name ? ` — ${item.target_name}` : ""}`} time={new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}/>)}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Akses Cepat</h3><p className="mt-1 text-xs text-slate-500">Buka halaman pemantauan lebih lengkap.</p></div><MenuIcon name="dashboard" size={22}/></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><QuickLink label="Data Guru" onClick={() => onOpenMenu("Data Guru")}/><QuickLink label="Data Siswa" onClick={() => onOpenMenu("Data Siswa")}/><QuickLink label="Jadwal Pelajaran" onClick={() => onOpenMenu("Jadwal")}/><QuickLink label="Absensi" onClick={() => onOpenMenu("Absensi")}/><QuickLink label="Kalender Akademik" onClick={() => onOpenMenu("Kalender Akademik")}/></div><p className="mt-4 text-xs text-slate-400">Kalender akademik juga disediakan sebagai halaman tersendiri.</p></section>
      </div>
    </>}

    {role === "Guru" && <>
      <section className="mt-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><MenuIcon name="calendar" size={19}/></span><div><h2 className="font-bold text-slate-900">Jadwal Pembelajaran & Kehadiran Hari Ini</h2><p className="text-xs text-slate-500">Pilih kelas sesuai jam mengajar Anda.</p></div></div>
        </div>
        {dashboardLoading ? <p className="py-8 text-center text-sm text-slate-500">Memuat jadwal pembelajaran…</p> : teacherTodaySchedules.length ? <div className="grid gap-3 md:grid-cols-2">
          {teacherTodaySchedules.map((lesson) => {
            const sortedSessions = [...lesson.sessions].sort((a, b) => a.start.localeCompare(b.start));
            const firstStart = sortedSessions[0]?.start ?? "23:59";
            const startMinutes = Number(firstStart.slice(0, 2)) * 60 + Number(firstStart.slice(3, 5));
            const available = jakartaMinutes >= startMinutes;
            const label = startMinutes < 10 * 60 ? "Sesi Pagi" : startMinutes < 12 * 60 ? "Sesi Siang" : "Sesi Dzuhur";
            const timeLabel = sortedSessions.map((session) => `${session.start}–${session.end}`).join(" · ");
            return <article key={lesson.id} className={`rounded-2xl border p-4 transition ${available ? "border-blue-100 bg-white shadow-sm" : "border-slate-200 bg-slate-100/80 opacity-75"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${available ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{label} · {firstStart}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{lesson.room || "Ruang belum diatur"}</span></div>
              <h3 className={`mt-3 font-bold ${available ? "text-slate-900" : "text-slate-500"}`}>{lesson.subjectName}</h3>
              <p className={`mt-1 text-sm ${available ? "text-slate-600" : "text-slate-400"}`}>Kelas {lesson.className}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><div className={`flex items-center gap-1.5 text-xs ${available ? "text-slate-600" : "text-slate-400"}`}><MenuIcon name="calendar" size={14}/><span>{timeLabel}</span></div>
                <button type="button" disabled={!available} onClick={() => setSelectedTeacherLessonId((current) => current === lesson.id ? null : lesson.id)} className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${available ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-slate-200 text-slate-400"}`}>{!available ? "Belum Dimulai" : "Masuk Kelas"}</button>
              </div>
            </article>;
          })}
        </div> : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center"><p className="font-semibold text-slate-700">Tidak ada jadwal mengajar untuk {todayLabel}.</p><p className="mt-1 text-xs text-slate-500">Jadwal akan muncul otomatis pada hari sesuai penugasan kelas dan mata pelajaran akun Guru.</p></div>}
      </section>

      {selectedTeacherLesson && <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Ruang kerja pembelajaran</p><h3 className="mt-1 text-lg font-bold text-slate-900">{selectedTeacherLesson.subjectName} · Kelas {selectedTeacherLesson.className}</h3><p className="mt-1 text-xs text-slate-600">Pilih aktivitas yang akan dilakukan untuk jadwal ini.</p></div><button type="button" onClick={() => setSelectedTeacherLessonId(null)} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-100">Tutup</button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => void onOpenTeacherLesson(selectedTeacherLesson, "attendance")} className="rounded-xl border border-blue-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"><MenuIcon name="attendance" size={22}/><p className="mt-2 font-bold text-slate-900">Absen Siswa</p><p className="mt-1 text-xs text-slate-500">Isi kehadiran siswa kelas ini.</p></button>
          <button type="button" onClick={() => void onOpenTeacherLesson(selectedTeacherLesson, "journal")} className="rounded-xl border border-blue-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"><MenuIcon name="journal" size={22}/><p className="mt-2 font-bold text-slate-900">Jurnal Pembelajaran</p><p className="mt-1 text-xs text-slate-500">Catat materi dan kegiatan mengajar.</p></button>
          <button type="button" onClick={() => void onOpenTeacherLesson(selectedTeacherLesson, "bk")} className="rounded-xl border border-blue-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"><MenuIcon name="bk" size={22}/><p className="mt-2 font-bold text-slate-900">Program BK</p><p className="mt-1 text-xs text-slate-500">Catat pendampingan siswa kelas ini.</p></button>
        </div>
      </section>}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3"><h3 className="font-bold text-slate-900">Aktivitas Terbaru</h3><p className="mt-1 text-xs text-slate-500">Informasi aktivitas yang tercatat di portal.</p></div>{activityRows.length ? <div className="space-y-3">{activityRows.slice(0, 6).map((item) => <Activity key={item.id} title={`${item.actor_name || "Pengguna"} ${item.action}${item.target_name ? ` — ${item.target_name}` : ""}`} time={new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}/>)}</div> : <p className="text-sm text-slate-500">Belum ada aktivitas terbaru.</p>}</section>
    </>}
  </>;
}
function StatusPill({ value }: { value: string }) {
  const good = value === "Hadir" || value === "Sudah Mengisi" || value === "Lengkap" || value.includes("sudah mengisi");
  const warn = value === "Sebagian" || value === "Izin" || value === "Sakit" || value === "Pengganti — sudah mengisi";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${good ? "bg-emerald-50 text-emerald-700" : warn ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{value}</span>;
}
function QuickLink({ label, onClick }: { label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-xl border border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50">{label} <span className="float-right text-emerald-700">→</span></button>; }
function StatCard({title,value,detail,icon}:{title:string;value:string;detail:string;icon:string}) { return <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg"><MenuIcon name={icon as MenuIconName} size={19}/></div></div></div>; }
function Attendance({title,value}:{title:string;value:string}) { return <div className="rounded-xl bg-gray-50 p-4"><p className="text-sm text-gray-500">{title}</p><p className="mt-1 text-2xl font-bold text-emerald-600">{value}</p></div>; }
function Activity({title,time}:{title:string;time:string}) { return <div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full bg-emerald-500"/><div className="flex-1"><p className="text-sm font-medium">{title}</p><p className="text-xs text-gray-400">{time}</p></div></div>; }
