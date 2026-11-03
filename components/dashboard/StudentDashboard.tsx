import type { Role } from "@/lib/menu";

export type DashboardLearningItem = {
  subject: string;
  code: string;
  nilai: number;
};

export type DashboardChild = {
  id: string;
  nama: string;
  nis: string;
  kelas: string;
};

type Props = {
  role: Role;
  name: string;
  selectedSemester: string;
  dashboardChild: DashboardChild | null;
  dashboardError: string;
  dashboardLoading: boolean;
  dashboardAverage: number | null;
  dashboardLearning: DashboardLearningItem[];
  dashboardAttendance: { hadir: number; izin: number; sakit: number; alpa: number } | null;
  dashboardOutstanding: number | null;
  onOpenMenu: (menu: string) => void;
};

export default function StudentDashboard({
  role,
  name,
  selectedSemester,
  dashboardChild,
  dashboardError,
  dashboardLoading,
  dashboardAverage,
  dashboardLearning,
  dashboardAttendance,
  dashboardOutstanding,
  onOpenMenu: openMenu,
}: Props) {
  return (
                <>
                  <div className="mb-6 rounded-3xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 p-6 text-white shadow-sm">
                    <p className="text-sm text-emerald-100">
                      {role === "Orang Tua" ? "Ringkasan belajar anak" : "Ringkasan belajar Anda"}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold">{dashboardChild?.nama ?? name} 👋</h1>
                    <p className="mt-2 text-sm text-emerald-100">
                      {dashboardChild ? `Kelas ${dashboardChild.kelas} • NIS ${dashboardChild.nis}` : "Memuat data belajar..."}
                    </p>
                  </div>

                  {dashboardError && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      Gagal memuat ringkasan dashboard: {dashboardError}
                    </div>
                  )}

                  {dashboardLoading ? (
                    <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">Memuat ringkasan hasil belajar...</div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border bg-white p-5 shadow-sm">
                          <p className="text-sm text-gray-500">Rata-rata Nilai</p>
                          <p className="mt-2 text-3xl font-bold text-emerald-700">{dashboardAverage ?? "-"}</p>
                          <p className="mt-1 text-xs text-gray-400">Semester {selectedSemester}</p>
                        </div>
                        <div className="rounded-2xl border bg-white p-5 shadow-sm">
                          <p className="text-sm text-gray-500">Mapel Dinilai</p>
                          <p className="mt-2 text-3xl font-bold">{dashboardLearning.length}</p>
                          <p className="mt-1 text-xs text-gray-400">Data nilai yang tersedia</p>
                        </div>
                        <div className="rounded-2xl border bg-white p-5 shadow-sm">
                          <p className="text-sm text-gray-500">Kehadiran</p>
                          <p className="mt-2 text-3xl font-bold text-blue-700">
                            {dashboardAttendance && (dashboardAttendance.hadir + dashboardAttendance.izin + dashboardAttendance.sakit + dashboardAttendance.alpa) > 0
                              ? `${Math.round((dashboardAttendance.hadir / (dashboardAttendance.hadir + dashboardAttendance.izin + dashboardAttendance.sakit + dashboardAttendance.alpa)) * 100)}%`
                              : "-"}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">Berdasarkan absensi tersimpan</p>
                        </div>
                        <div className="rounded-2xl border bg-white p-5 shadow-sm">
                          <p className="text-sm text-gray-500">Tagihan Belum Dibayar</p>
                          <p className="mt-2 text-2xl font-bold text-orange-600">
                            {dashboardOutstanding === null ? "-" : `Rp ${dashboardOutstanding.toLocaleString("id-ID")}`}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">Ringkasan administrasi</p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-6 xl:grid-cols-3">
                        <div className="rounded-2xl border bg-white p-6 xl:col-span-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-bold">Grafik Hasil Belajar</h3>
                              <p className="text-sm text-gray-500">Nilai akhir per mata pelajaran semester {selectedSemester}</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">0–100</span>
                          </div>

                          {dashboardLearning.length === 0 ? (
                            <div className="mt-8 rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                              Belum ada nilai yang tersimpan untuk semester ini.
                            </div>
                          ) : (
                            <div className="mt-6 space-y-4">
                              {dashboardLearning.map((item) => (
                                <div key={item.code || item.subject}>
                                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                                    <span className="font-semibold text-gray-700">{item.subject}</span>
                                    <span className="font-bold text-emerald-700">{item.nilai}</span>
                                  </div>
                                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                                    <div
                                      className="h-full rounded-full bg-emerald-500 transition-all"
                                      style={{ width: `${Math.max(0, Math.min(100, item.nilai))}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border bg-white p-6">
                          <h3 className="font-bold">Ringkasan Kehadiran</h3>
                          <p className="text-sm text-gray-500">Rekap absensi yang tersimpan</p>
                          <div className="mt-5 space-y-3">
                            {[
                              ["Hadir", dashboardAttendance?.hadir ?? 0, "bg-emerald-50 text-emerald-700"],
                              ["Izin", dashboardAttendance?.izin ?? 0, "bg-blue-50 text-blue-700"],
                              ["Sakit", dashboardAttendance?.sakit ?? 0, "bg-yellow-50 text-yellow-700"],
                              ["Alpa", dashboardAttendance?.alpa ?? 0, "bg-red-50 text-red-700"],
                            ].map(([label, value, cls]) => (
                              <div key={String(label)} className={`flex items-center justify-between rounded-xl px-4 py-3 ${cls}`}>
                                <span className="text-sm font-semibold">{label}</span>
                                <span className="font-bold">{value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                            <p className="font-semibold text-gray-800">💡 Fokus belajar</p>
                            <p className="mt-1">Gunakan grafik nilai untuk melihat mapel yang perlu dipertahankan atau ditingkatkan.</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <button type="button" onClick={() => openMenu("Nilai & Raport")} className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50">
                          <p className="text-2xl">📊</p>
                          <p className="mt-2 font-bold">Lihat Nilai</p>
                          <p className="mt-1 text-xs text-gray-500">Detail nilai per mata pelajaran</p>
                        </button>
                        <button type="button" onClick={() => openMenu("Absensi")} className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
                          <p className="text-2xl">📋</p>
                          <p className="mt-2 font-bold">Lihat Absensi</p>
                          <p className="mt-1 text-xs text-gray-500">Cek riwayat kehadiran</p>
                        </button>
                        <button type="button" onClick={() => openMenu("SPP & Administrasi")} className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-50">
                          <p className="text-2xl">💳</p>
                          <p className="mt-2 font-bold">Administrasi</p>
                          <p className="mt-1 text-xs text-gray-500">Lihat status tagihan sekolah</p>
                        </button>
                      </div>
                    </>
                  )}
                </>
  );
}
