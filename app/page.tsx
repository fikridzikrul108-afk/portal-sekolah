"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import PortalLogin from "./PortalLogin";
import MenuIcon from "@/components/MenuIcon";
import type { MenuIconName, Role } from "@/lib/menu";
import DashboardShell from "@/components/dashboard/DashboardShell";
import StaffDashboard, { type TeacherLesson, type TeacherLessonAction } from "@/components/dashboard/StaffDashboard";
import StudentDashboard, {
  type DashboardChild,
  type DashboardLearningItem,
} from "@/components/dashboard/StudentDashboard";


type PortalNotification = {
  id: string;
  title: string;
  message: string;
  category: string;
  created_at: string;
  read_at: string | null;
  resolved_at: string | null;
};


// Menjaga proses start kamera agar tidak bertumpuk saat komponen dipasang ulang.
let employeeQrStartQueue: Promise<void> = Promise.resolve();

function EmployeeQrScanner({ onScan }: { onScan: (token: string) => void }) {
  const generatedId = useId();
  const readerId = `employee-qr-reader-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState("");
  const [scanState, setScanState] = useState<"starting" | "scanning" | "success">("starting");

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    let cancelled = false;
    let decoded = false;
    let scanner: Html5Qrcode | null = null;
    let startFinished = false;

    const stopScanner = async () => {
      if (!scanner || !startFinished) return;
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        // Kamera mungkin sudah berhenti.
      }
      try {
        scanner.clear();
      } catch {
        // Elemen reader mungkin sudah dibersihkan.
      }
    };

    const startScanner = async () => {
      if (cancelled) return;
      const element = document.getElementById(readerId);
      if (!element) return;

      try {
        element.replaceChildren();
        scanner = new Html5Qrcode(readerId, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        });

        await scanner.start(
          // Bentuk constraint standar html5-qrcode; browser memilih kamera belakang.
          { facingMode: "environment" },
          {
            // Area pemindaian lebih besar agar QR kecil pada kartu lebih mudah terbaca.
            fps: 15,
            qrbox: (width: number, height: number) => {
              const side = Math.floor(Math.min(width, height) * 0.9);
              const safeSide = Math.min(Math.max(140, side), width, height);
              return { width: safeSide, height: safeSide };
            },
            disableFlip: true,
          },
          (decodedText) => {
            const token = decodedText.trim();
            if (cancelled || decoded || !token) return;
            decoded = true;
            setScanState("success");
            onScanRef.current(token);
            void stopScanner();
          },
          () => {
            // Tetap memindai sampai QR dikenali.
          },
        );

        startFinished = true;
        if (cancelled) {
          await stopScanner();
        } else {
          setScanState("scanning");
        }
      } catch (error: unknown) {
        startFinished = true;
        if (!cancelled) {
          setCameraError(error instanceof Error ? error.message : "Kamera tidak dapat dibuka. Periksa izin kamera browser.");
        }
        try {
          scanner?.clear();
        } catch {
          // Reader mungkin belum selesai dibuat.
        }
      }
    };

    // Serialisasi mencegah dua permintaan kamera berjalan bersamaan saat
    // React memasang ulang komponen dengan cepat.
    const queuedStart = employeeQrStartQueue.then(startScanner, startScanner);
    employeeQrStartQueue = queuedStart.then(() => undefined, () => undefined);

    return () => {
      cancelled = true;
      if (startFinished) void stopScanner();
      // Jika start masih berlangsung, startScanner akan menghentikan kamera
      // segera setelah proses start selesai.
    };
  }, [readerId]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-md">
      <style>{`
        .employee-qr-camera { position: relative; width: min(100%, 360px); max-width: 100%; margin: 0 auto; overflow: hidden; border-radius: 16px; background: #111827; isolation: isolate; }
        .employee-qr-camera > div[id^="employee-qr-reader"] { width: 100% !important; min-height: 0 !important; border: 0 !important; overflow: hidden !important; }
        /* Biarkan html5-qrcode mengatur ukuran video dan canvas sesuai perangkat. */
        .employee-qr-camera video { display: block !important; max-width: 100% !important; border-radius: 16px !important; }
        .employee-qr-camera canvas { max-width: 100% !important; }
        .employee-qr-camera [id$="__dashboard"] { display: none !important; }
        .employee-qr-scan-frame { position:absolute; z-index:20; inset:10%; border:2px solid rgba(45,212,191,.95); border-radius:18px; pointer-events:none; box-shadow:0 0 0 999px rgba(2,6,23,.12),0 0 22px rgba(45,212,191,.3); }
        .employee-qr-scan-line { position:absolute; z-index:21; left:4%; right:4%; height:3px; top:8%; border-radius:999px; background:#5eead4; box-shadow:0 0 12px 3px rgba(45,212,191,.7); animation:employee-qr-scan 2.2s ease-in-out infinite alternate; }
        .employee-qr-scan-frame:after { content:""; position:absolute; inset:0; border-radius:16px; background:linear-gradient(180deg,transparent,rgba(45,212,191,.10),transparent); animation:employee-qr-pulse 2s ease-in-out infinite; }
        @keyframes employee-qr-scan { from{top:8%} to{top:90%} }
        @keyframes employee-qr-pulse { 0%,100%{opacity:.2} 50%{opacity:.8} }
        @media (prefers-reduced-motion: reduce) { .employee-qr-scan-line,.employee-qr-scan-frame:after { animation:none; } }
      `}</style>
      <div className="mb-3 text-center">
        <p className="text-sm font-semibold text-slate-800">
          {scanState === "success" ? "QR berhasil dibaca" : scanState === "starting" ? "Menyiapkan kamera…" : "Arahkan QR kartu ke kamera"}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Posisikan satu QR di tengah kamera, jaga jarak sekitar 10–20 cm, dan pastikan seluruh pola QR terlihat tajam tanpa silau.
        </p>
      </div>
      <div className="employee-qr-camera">
        <div id={readerId} />
        {scanState !== "success" && <div className="employee-qr-scan-frame" aria-hidden="true"><div className="employee-qr-scan-line" /></div>}
        {scanState === "success" && <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/60 text-white"><div className="rounded-2xl border border-emerald-200/70 bg-emerald-900/80 px-5 py-4 text-center shadow-xl"><div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-2xl font-black text-emerald-950">✓</div><p className="font-bold">QR berhasil dibaca</p><p className="mt-1 text-xs">Memverifikasi identitas…</p></div></div>}
      </div>
      {cameraError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Kamera tidak bisa dibuka: {cameraError}. Izinkan akses kamera browser dan buka portal melalui localhost atau HTTPS.
        </div>
      )}
    </div>
  );
}

function downloadEmployeeQr(profileId: string, employeeName: string) {
  const svg = document.getElementById(`employee-qr-${profileId}`);
  if (!(svg instanceof SVGSVGElement)) {
    alert("QR belum siap diunduh. Muat daftar QR terlebih dahulu.");
    return;
  }
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const source = new XMLSerializer().serializeToString(cloned);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = employeeName.trim().replace(/[^a-z0-9_-]+/gi, "-") || profileId;
  link.href = url;
  link.download = `QR-${safeName}.svg`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Jangan revoke URL langsung; beberapa browser membatalkan unduhan jika terlalu cepat.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Titik pusat GPS sekolah. Radius absensi tetap 100 meter.
const SCHOOL_LOCATION = { latitude: -7.064855, longitude: 107.568025, radiusMeters: 100 };
// GPS dan validasi radius absensi aktif.
const ATTENDANCE_GPS_TEST_MODE = false;

// Jadwal hari wajib hadir dan batas tepat waktu absensi pagi (WIB).
// Guru yang tidak tercantum mengikuti jadwal umum Senin–Jumat.
const TEACHER_ATTENDANCE_SCHEDULE: Record<string, { days: number[]; thursdayCutoff?: string }> = {
  "sofian": { days: [2, 3] },
  "niky komala dewi s pd": { days: [2, 4, 5], thursdayCutoff: "09:45" },
  "sumiati": { days: [1, 2, 3, 4, 5] },
  "indra priadi": { days: [1, 2, 3, 4, 5] },
  "annisa fauzi": { days: [2, 3, 4] },
  "siti nurf": { days: [1, 2, 3, 5] },
  "dandi zaenudin s pd": { days: [1, 2, 3, 4] },
  "rika meliana s pd": { days: [1, 2, 3, 4, 5] },
  "ihsan fauzan": { days: [1, 2, 3, 4, 5] },
  "ceng imam qusaeri s pd": { days: [1, 2, 3, 4, 5] },
  "eggi gismanto s pd": { days: [3] },
  "siti mutiara": { days: [3, 4, 5] },
  "fawaz naufal s h": { days: [1, 2, 3, 4, 5] },
  "yopi irawan": { days: [3, 4, 5] },
  "faisal akbar yusuf s pd": { days: [1, 2, 3, 4, 5] },
  "azkiya khoerunnisa": { days: [1, 2, 3, 4, 5] },
};

const normalizeAttendanceTeacherName = (value: unknown) =>
  String(value ?? "")
    .toLocaleLowerCase("id-ID")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const getTeacherAttendanceSchedule = (name: unknown) => {
  const normalizedName = normalizeAttendanceTeacherName(name);
  const exact = TEACHER_ATTENDANCE_SCHEDULE[normalizedName];
  if (exact) return exact;
  // Toleransi untuk variasi titik/koma/gelar yang kadang tersimpan di profil.
  const key = Object.keys(TEACHER_ATTENDANCE_SCHEDULE).find((item) =>
    normalizedName.startsWith(item) || item.startsWith(normalizedName)
  );
  return key ? TEACHER_ATTENDANCE_SCHEDULE[key] : { days: [1, 2, 3, 4, 5] };
};

const isTeacherScheduledOnDate = (name: unknown, date: string) => {
  const day = new Date(`${date}T12:00:00+07:00`).getDay();
  return getTeacherAttendanceSchedule(name).days.includes(day);
};

const getTeacherMorningCutoff = (name: unknown, date: string) => {
  const schedule = getTeacherAttendanceSchedule(name);
  const day = new Date(`${date}T12:00:00+07:00`).getDay();
  return day === 4 && schedule.thursdayCutoff ? schedule.thursdayCutoff : "06:30";
};

const isTeacherOnTime = (name: unknown, date: string, timestamp: string | Date) => {
  const time = new Date(timestamp).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  return time <= getTeacherMorningCutoff(name, date);
};

type StudentRecord = {
  id: string;
  name: string;
  nis: string;
  nisn: string;
  class: string;
  status: string;
};

type TeacherRecord = {
  id: string;
  name: string;
  nip: string;
  position: string;
  subject: string;
  classes: string[];
  waliKelas: string;
  status: string;
};

const demoTeachers: TeacherRecord[] = [
  { id: "demo-1", name: "Ahmad Fauzi, S.Pd.", nip: "198501152010011001", position: "Guru Mata Pelajaran", subject: "Matematika", classes: ["6"], waliKelas: "Kelas 6", status: "Hadir" },
  { id: "demo-2", name: "Siti Rahma, S.Pd.", nip: "198704202012022001", position: "Guru Mata Pelajaran", subject: "Bahasa Indonesia", classes: ["5", "6"], waliKelas: "-", status: "Hadir" },
  { id: "demo-3", name: "Ujang Hidayat, S.Pd.", nip: "198903102015031001", position: "Guru Mata Pelajaran", subject: "PJOK", classes: ["1", "2", "3", "4 Umar", "4 Ali", "5", "6"], waliKelas: "-", status: "Izin" },
  { id: "demo-4", name: "Rina Amelia, S.Pd.", nip: "199002182016042001", position: "Guru Kelas", subject: "Guru Kelas", classes: ["5"], waliKelas: "Kelas 5", status: "Hadir" },
];

const subjects = [
  {
    name: "Matematika",
    code: "MTK",
    tugas: 90,
    uts: 86,
    uas: 88,
    akhir: 88,
  },
  {
    name: "Bahasa Indonesia",
    code: "BIN",
    tugas: 92,
    uts: 89,
    uas: 90,
    akhir: 90,
  },
  {
    name: "Bahasa Inggris",
    code: "ENG",
    tugas: 85,
    uts: 87,
    uas: 86,
    akhir: 86,
  },
  {
    name: "Pendidikan Agama Islam",
    code: "PAI",
    tugas: 94,
    uts: 91,
    uas: 92,
    akhir: 92,
  },
  {
    name: "IPAS",
    code: "IPAS",
    tugas: 88,
    uts: 90,
    uas: 89,
    akhir: 89,
  },
  {
    name: "PP",
    code: "PP",
    tugas: 92,
    uts: 90,
    uas: 91,
    akhir: 91,
  },
  {
    name: "PJOK",
    code: "PJOK",
    tugas: 88,
    uts: 86,
    uas: 87,
    akhir: 87,
  },
  {
    name: "Bahasa Arab",
    code: "BAR",
    tugas: 90,
    uts: 89,
    uas: 90,
    akhir: 90,
  },
  {
    name: "Tahfiz Al-Qur'an",
    code: "TAHFIZ",
    tugas: 95,
    uts: 93,
    uas: 94,
    akhir: 94,
  },
];


const schoolDays = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

const classNames = ["1", "2", "3", "4 Umar", "4 Ali", "5", "6"];

const attendanceStatuses = ["Hadir", "Izin", "Sakit", "Alpa"] as const;
type AttendanceStatus = (typeof attendanceStatuses)[number];

type AttendanceStudent = {
  id: string;
  name: string;
  class: string;
  classId: string;
};

const scheduleData: Record<
  string,
  Record<
    string,
    {
      time: string;
      subject: string;
      teacher: string;
    }[]
  >
> = {
  "1A": {
    Senin: [
      { time: "07:30 - 08:30", subject: "Pendidikan Agama Islam", teacher: "Bu Aisyah" },
      { time: "08:30 - 09:30", subject: "Bahasa Indonesia", teacher: "Bu Siti" },
      { time: "10:00 - 11:00", subject: "Matematika", teacher: "Pak Ahmad" },
    ],
    Selasa: [
      { time: "07:30 - 08:30", subject: "Matematika", teacher: "Pak Ahmad" },
      { time: "08:30 - 09:30", subject: "PJOK", teacher: "Pak Deni" },
      { time: "10:00 - 11:00", subject: "Bahasa Arab", teacher: "Bu Fatimah" },
    ],
    Rabu: [
      { time: "07:30 - 08:30", subject: "Bahasa Arab", teacher: "Bu Fatimah" },
      { time: "08:30 - 09:30", subject: "Seni Budaya", teacher: "Bu Rina" },
      { time: "10:00 - 11:00", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
    ],
    Kamis: [
      { time: "07:30 - 08:30", subject: "IPAS", teacher: "Bu Lina" },
      { time: "08:30 - 09:30", subject: "Pendidikan Pancasila", teacher: "Pak Arif" },
    ],
    Jumat: [
      { time: "07:30 - 08:30", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
      { time: "08:30 - 09:30", subject: "PJOK", teacher: "Pak Deni" },
    ],
  },
  "2A": {
    Senin: [
      { time: "07:30 - 08:30", subject: "Matematika", teacher: "Bu Rina" },
      { time: "08:30 - 09:30", subject: "Pendidikan Agama Islam", teacher: "Ust. Hasan" },
      { time: "10:00 - 11:00", subject: "Bahasa Indonesia", teacher: "Bu Siti" },
    ],
    Selasa: [
      { time: "07:30 - 08:30", subject: "Bahasa Indonesia", teacher: "Bu Siti" },
      { time: "08:30 - 09:30", subject: "IPAS", teacher: "Pak Dedi" },
      { time: "10:00 - 11:00", subject: "PJOK", teacher: "Pak Deni" },
    ],
    Rabu: [
      { time: "07:30 - 08:30", subject: "PJOK", teacher: "Pak Deni" },
      { time: "08:30 - 09:30", subject: "Bahasa Arab", teacher: "Bu Fatimah" },
      { time: "10:00 - 11:00", subject: "Seni Budaya", teacher: "Bu Rina" },
    ],
    Kamis: [
      { time: "07:30 - 08:30", subject: "Pendidikan Pancasila", teacher: "Pak Arif" },
      { time: "08:30 - 09:30", subject: "Seni Budaya", teacher: "Bu Rina" },
    ],
    Jumat: [
      { time: "07:30 - 08:30", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
      { time: "08:30 - 09:30", subject: "Pendidikan Agama Islam", teacher: "Ust. Hasan" },
    ],
  },
  "3A": {
    Senin: [
      { time: "07:30 - 08:30", subject: "Bahasa Indonesia", teacher: "Bu Siti" },
      { time: "08:30 - 09:30", subject: "Matematika", teacher: "Pak Ahmad" },
      { time: "10:00 - 11:00", subject: "IPAS", teacher: "Bu Lina" },
    ],
    Selasa: [
      { time: "07:30 - 08:30", subject: "Pendidikan Agama Islam", teacher: "Ust. Hasan" },
      { time: "08:30 - 09:30", subject: "Bahasa Arab", teacher: "Bu Fatimah" },
      { time: "10:00 - 11:00", subject: "PJOK", teacher: "Pak Deni" },
    ],
    Rabu: [
      { time: "07:30 - 08:30", subject: "Matematika", teacher: "Pak Ahmad" },
      { time: "08:30 - 09:30", subject: "Pendidikan Pancasila", teacher: "Pak Arif" },
      { time: "10:00 - 11:00", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
    ],
    Kamis: [
      { time: "07:30 - 08:30", subject: "Seni Budaya", teacher: "Bu Rina" },
      { time: "08:30 - 09:30", subject: "Bahasa Indonesia", teacher: "Bu Siti" },
    ],
    Jumat: [
      { time: "07:30 - 08:30", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
      { time: "08:30 - 09:30", subject: "PJOK", teacher: "Pak Deni" },
    ],
  },
  "4A": {
    Senin: [
      { time: "07:30 - 08:30", subject: "IPAS", teacher: "Bu Lina" },
      { time: "08:30 - 09:30", subject: "Matematika", teacher: "Pak Ahmad" },
      { time: "10:00 - 11:00", subject: "Bahasa Indonesia", teacher: "Bu Siti" },
    ],
    Selasa: [
      { time: "07:30 - 08:30", subject: "Bahasa Arab", teacher: "Bu Fatimah" },
      { time: "08:30 - 09:30", subject: "Pendidikan Agama Islam", teacher: "Ust. Hasan" },
      { time: "10:00 - 11:00", subject: "Seni Budaya", teacher: "Bu Rina" },
    ],
    Rabu: [
      { time: "07:30 - 08:30", subject: "Matematika", teacher: "Pak Ahmad" },
      { time: "08:30 - 09:30", subject: "PJOK", teacher: "Pak Deni" },
      { time: "10:00 - 11:00", subject: "Pendidikan Pancasila", teacher: "Pak Arif" },
    ],
    Kamis: [
      { time: "07:30 - 08:30", subject: "Bahasa Indonesia", teacher: "Bu Siti" },
      { time: "08:30 - 09:30", subject: "IPAS", teacher: "Bu Lina" },
    ],
    Jumat: [
      { time: "07:30 - 08:30", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
      { time: "08:30 - 09:30", subject: "Bahasa Arab", teacher: "Bu Fatimah" },
    ],
  },
  "5A": {
    Senin: [
      { time: "07:30 - 08:30", subject: "Matematika", teacher: "Pak Ahmad" },
      { time: "08:30 - 09:30", subject: "IPAS", teacher: "Bu Lina" },
      { time: "10:00 - 11:00", subject: "Pendidikan Agama Islam", teacher: "Ust. Hasan" },
    ],
    Selasa: [
      { time: "07:30 - 08:30", subject: "Bahasa Indonesia", teacher: "Bu Siti" },
      { time: "08:30 - 09:30", subject: "Pendidikan Pancasila", teacher: "Pak Arif" },
      { time: "10:00 - 11:00", subject: "PJOK", teacher: "Pak Deni" },
    ],
    Rabu: [
      { time: "07:30 - 08:30", subject: "Bahasa Inggris", teacher: "Bu Nisa" },
      { time: "08:30 - 09:30", subject: "Matematika", teacher: "Pak Ahmad" },
      { time: "10:00 - 11:00", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
    ],
    Kamis: [
      { time: "07:30 - 08:30", subject: "Bahasa Arab", teacher: "Bu Fatimah" },
      { time: "08:30 - 09:30", subject: "Seni Budaya", teacher: "Bu Rina" },
    ],
    Jumat: [
      { time: "07:30 - 08:30", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
      { time: "08:30 - 09:30", subject: "Pendidikan Agama Islam", teacher: "Ust. Hasan" },
    ],
  },
  "6A": {
    Senin: [
      { time: "07:30 - 08:30", subject: "Matematika", teacher: "Guru Al-Barkah" },
      { time: "08:30 - 09:30", subject: "Bahasa Indonesia", teacher: "Guru Al-Barkah" },
      { time: "10:00 - 11:00", subject: "IPAS", teacher: "Bu Lina" },
    ],
    Selasa: [
      { time: "07:30 - 08:30", subject: "Pendidikan Agama Islam", teacher: "Ust. Hasan" },
      { time: "08:30 - 09:30", subject: "Bahasa Inggris", teacher: "Bu Nisa" },
      { time: "10:00 - 11:00", subject: "PJOK", teacher: "Pak Deni" },
    ],
    Rabu: [
      { time: "07:30 - 08:30", subject: "Matematika", teacher: "Guru Al-Barkah" },
      { time: "08:30 - 09:30", subject: "Pendidikan Pancasila", teacher: "Pak Arif" },
      { time: "10:00 - 11:00", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
    ],
    Kamis: [
      { time: "07:30 - 08:30", subject: "Bahasa Indonesia", teacher: "Guru Al-Barkah" },
      { time: "08:30 - 09:30", subject: "Bahasa Arab", teacher: "Bu Fatimah" },
      { time: "10:00 - 11:00", subject: "Seni Budaya", teacher: "Bu Rina" },
    ],
    Jumat: [
      { time: "07:30 - 08:30", subject: "Tahfiz Al-Qur'an", teacher: "Ust. Yusuf" },
      { time: "08:30 - 09:30", subject: "PJOK", teacher: "Pak Deni" },
    ],
  },
};


type GradeClass = {
  id: string;
  nama: string;
  tahunAjaran: string;
};

type GradeSubject = {
  id: string;
  name: string;
  code: string;
};

type GradeStudent = {
  id: string;
  name: string;
  nis: string;
};

type SumatifDraft = {
  materi: string;
  tujuanPembelajaran: string;
  nilai: string;
};

type GradeDraft = {
  id?: string;
  studentId: string;
  nilaiNonTes: string;
  nilaiUtsPts: string;
  nilaiSas: string;
  nilaiAkhir: string;
  catatanTpTertinggi: string;
  catatanTpTerendah: string;
  deskripsiCapaian: string;
  sumatif: SumatifDraft[];
};

const NILAI_NON_TES_WEIGHT = 30;
const NILAI_UTS_WEIGHT = 30;
const NILAI_SAS_WEIGHT = 40;

const hitungNilaiAkhir = (nilaiNonTes: string | number | null, nilaiUtsPts: string | number | null, nilaiSas: string | number | null) => {
  const nonTes = nilaiNonTes === "" || nilaiNonTes == null ? null : Number(nilaiNonTes);
  const uts = nilaiUtsPts === "" || nilaiUtsPts == null ? null : Number(nilaiUtsPts);
  const sas = nilaiSas === "" || nilaiSas == null ? null : Number(nilaiSas);

  if ([nonTes, uts, sas].some((value) => value == null || !Number.isFinite(value))) return null;
  return Math.round(((nonTes! * NILAI_NON_TES_WEIGHT) + (uts! * NILAI_UTS_WEIGHT) + (sas! * NILAI_SAS_WEIGHT)) / 100 * 100) / 100;
};

const getPredikatNilai = (nilai: number | null) => {
  if (nilai == null) return "-";
  if (nilai >= 90) return "A";
  if (nilai >= 80) return "B";
  if (nilai >= 70) return "C";
  return "D";
};

const MADIN_SUBJECT_NAMES = new Set(["Fikih", "Akhlak", "Bahasa Arab", "Tahfidz", "BTQ"]);
const SCHOOL_REPORT_SUBJECT_NAMES = new Set([
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Bahasa Sunda",
  "IPAS",
  "Matematika",
  "PJOK",
  "Pendidikan Agama Islam",
  "PP",
  "Seni",
]);
const normalizeReportSubjectName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
const isMadinReportSubject = (name: string) => MADIN_SUBJECT_NAMES.has(name) || normalizeReportSubjectName(name) === "btq";
const isPencakSilatSubject = (name: string) => normalizeReportSubjectName(name) === "pencaksilat";
const isSchoolReportSubject = (name: string) => SCHOOL_REPORT_SUBJECT_NAMES.has(name);

type ReportSumatifDetail = {
  materi: string;
  tujuanPembelajaran: string;
  nilai: number | null;
};

type ReportGradeSummary = {
  gradeId: string;
  subjectId: string;
  subjectName: string;
  nilaiNonTes: number | null;
  nilaiUtsPts: number | null;
  nilaiSas: number | null;
  nilaiAkhir: number | null;
  predikat: string;
  deskripsiCapaian: string;
  sumatif: ReportSumatifDetail[];
};

type ReportExtracurricular = {
  id?: string;
  nama: string;
  predikat: string;
  keterangan: string;
};

type ReportCardDraft = {
  id?: string;
  studentId: string;
  sakit: string;
  izin: string;
  tanpaKeterangan: string;
  catatanWaliKelas: string;
  kokurikuler: string;
  keteranganNaikKelas: string;
  keteranganLulus: string;
  tanggalRaport: string;
  namaWaliKelas: string;
  nipWaliKelas: string;
  namaOrangTua: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  status: "draft" | "final";
};


type SppBill = {
  id: string;
  studentId: string;
  studentName: string;
  nis: string;
  feeTypeId: string;
  feeName: string;
  feeCode: string;
  periode: string;
  jatuhTempo: string | null;
  nominal: number;
  status: "Belum Lunas" | "Sebagian" | "Lunas" | "Dibatalkan";
  keterangan: string;
  totalBayar: number;
};

type SppFeeType = {
  id: string;
  kode: string;
  nama: string;
  nominalDefault: number;
  frekuensi: string;
};

type SchoolSettings = {
  namaSekolah: string;
  npsn: string;
  nss: string;
  alamat: string;
  desaKelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodePos: string;
  telepon: string;
  email: string;
  website: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  tahunAjaran: string;
  semester: "1" | "2";
  logoUrl: string;
};

type RemedialRow = {
  id: string;
  student_id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  jenis: "remedial" | "pengayaan";
  tanggal: string;
  nilai_awal: number | null;
  nilai_hasil: number | null;
  materi: string | null;
  catatan: string | null;
  status: "direncanakan" | "selesai";
  studentName: string;
  className: string;
  subjectName: string;
  teacherName: string;
};

type BkRow = {
  id: string;
  student_id: string;
  guru_id: string;
  class_id: string;
  tanggal: string;
  jenis_program: string;
  ringkasan: string;
  tindak_lanjut: string | null;
  status: "dipantau" | "selesai";
  studentName: string;
  className: string;
  guruName: string;
};

type UserProfile = {
  nama: string;
  email: string;
  noHp: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: "Laki-laki" | "Perempuan" | "";
  alamat: string;
  bio: string;
  fotoUrl: string;
};

const emptyUserProfile: UserProfile = {
  nama: "",
  email: "",
  noHp: "",
  tempatLahir: "",
  tanggalLahir: "",
  jenisKelamin: "",
  alamat: "",
  bio: "",
  fotoUrl: "",
};

const SCHOOL_LOGO_URL = "/logo-sd.png";

const emptySchoolSettings: SchoolSettings = {
  namaSekolah: "SD Islam Al-Barkah",
  npsn: "", nss: "", alamat: "", desaKelurahan: "", kecamatan: "",
  kabupatenKota: "", provinsi: "", kodePos: "", telepon: "", email: "", website: "",
  namaKepalaSekolah: "", nipKepalaSekolah: "", tahunAjaran: "2026/2027", semester: "1", logoUrl: SCHOOL_LOGO_URL,
};


type AttendanceCardResult = {
  profile_id: string;
  qr_token: string;
  nama: string;
  role: string;
  foto_url: string | null;
  mode: string;
  time: string;
  date: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
};

function AttendanceIdCard({
  result,
  schoolName,
  onClose,
}: {
  result: AttendanceCardResult;
  schoolName: string;
  onClose: () => void;
}) {
  const roleLabel = result.role.replace(/_/g, " ");
  return (
    <div className="attendance-card-backdrop" role="dialog" aria-modal="true" aria-label="Kartu bukti absensi">
      <style>{`
        .attendance-card-backdrop { position:fixed; z-index:9999; inset:0; display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; background:rgba(15,23,42,.58); backdrop-filter:blur(5px); animation:attendance-backdrop-in .18s ease-out both; }
        .attendance-id-card { position:relative; isolation:isolate; width:min(100%,340px); max-height:calc(100dvh - 32px); overflow-y:auto; border:1px solid #dbe5f4; border-radius:22px; background-color:#fbfbfc; background-image:repeating-radial-gradient(ellipse at 15% 12%, transparent 0 18px, rgba(148,163,184,.14) 19px 20px, transparent 21px 34px), repeating-radial-gradient(ellipse at 90% 40%, transparent 0 24px, rgba(148,163,184,.10) 25px 26px, transparent 27px 43px); box-shadow:0 24px 70px rgba(2,6,23,.3); animation:attendance-card-pop .28s cubic-bezier(.2,.8,.2,1) both; }
        .attendance-id-card .id-blue-ribbon { position:absolute; z-index:-1; width:86px; height:205px; top:-82px; right:-10px; border-radius:0 0 60px 60px; background:#1d5eea; transform:rotate(-12deg); }
        .attendance-id-card .id-blue-swoosh { position:absolute; z-index:-1; width:260px; height:75px; left:-112px; top:148px; border-radius:50%; background:#1d5eea; transform:rotate(-14deg); }
        @keyframes attendance-backdrop-in { from{opacity:0} to{opacity:1} }
        @keyframes attendance-card-pop { from{opacity:0;transform:translateY(12px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @media (max-width:480px) { .attendance-card-backdrop { padding:10px; } .attendance-id-card { width:min(100%,320px); max-height:calc(100dvh - 20px); } }
        @media (prefers-reduced-motion:reduce) { .attendance-card-backdrop,.attendance-id-card { animation:none; } }
        @media print { body * { visibility:hidden !important; } .attendance-card-backdrop { position:static !important; display:block !important; padding:0 !important; background:white !important; backdrop-filter:none !important; } .attendance-id-card,.attendance-id-card * { visibility:visible !important; } .attendance-id-card { position:fixed !important; inset:8mm auto auto 50% !important; transform:translateX(-50%) !important; width:85mm !important; max-width:none !important; max-height:none !important; overflow:visible !important; box-shadow:none !important; print-color-adjust:exact; -webkit-print-color-adjust:exact; } .attendance-id-card .id-card-actions { display:none !important; } }
      `}</style>
      <div className="attendance-id-card">
        <div className="id-blue-ribbon" aria-hidden="true" />
        <div className="id-blue-swoosh" aria-hidden="true" />
        <div className="relative px-4 pb-3 pt-3">
          <div className="flex items-center justify-center border-b border-blue-100/80 pb-2 text-center">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-blue-700">Bukti Absensi Digital</p>
          </div>

          <div className="relative mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-blue-600 bg-slate-950 p-0.5 shadow-md">
            {result.foto_url ? (
              <img src={result.foto_url} alt={`Foto profil ${result.nama}`} className="h-full w-full rounded-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-center text-xs font-semibold text-white">
                <svg viewBox="0 0 80 80" className="h-16 w-16" role="img" aria-label="Ilustrasi foto profil"><circle cx="40" cy="28" r="14" fill="#f0c7a4"/><path d="M25 27c0-13 7-19 16-19 11 0 17 8 15 21l-5-9-8-4-12 5-6 6Z" fill="#334155"/><path d="M15 80c1-19 11-29 25-29s24 10 25 29" fill="#1d5eea"/><path d="M31 48h18l-3 9-6 6-6-6Z" fill="#f0c7a4"/></svg>
              </div>
            )}
          </div>

          <div className="mt-3 min-h-[48px] text-center">
            <h3 className="break-words text-lg font-black leading-tight text-slate-950">{result.nama}</h3>
            <p className="mt-0.5 text-sm font-bold capitalize text-slate-800">{roleLabel}</p>
            <p className="mt-0.5 text-[10px] text-slate-600">{result.date}</p>
          </div>

          <div className="mx-auto mt-3 flex h-[94px] w-[94px] items-center justify-center rounded-xl border-2 border-slate-900 bg-white p-1.5">
            {result.qr_token ? <QRCodeSVG value={result.qr_token} size={78} level="M" includeMargin /> : <span className="text-[10px] text-slate-400">QR tidak tersedia</span>}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white/95 p-3">
            <div><p className="text-[8px] font-bold uppercase tracking-wide text-blue-700">Jenis absensi</p><p className="mt-0.5 text-xs font-extrabold text-slate-950">{result.mode === "masuk" ? "Absen Masuk" : "Absen Pulang"}</p></div>
            <div className="text-right"><p className="text-[8px] font-bold uppercase tracking-wide text-blue-700">Waktu (WIB)</p><p className="mt-0.5 text-base font-black text-slate-950">{result.time}</p></div>
            <div className="col-span-2 border-t border-slate-100 pt-2"><p className="text-[8px] font-bold uppercase tracking-wide text-blue-700">Informasi GPS / Lokasi</p><p className="mt-0.5 break-words text-[10px] leading-relaxed text-slate-700">{result.address}</p>{result.latitude != null && result.longitude != null && <p className="mt-0.5 text-[9px] text-slate-500">Koordinat: {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}</p>}</div>
            <div className="col-span-2 flex items-center justify-between border-t border-slate-100 pt-2"><span className="text-[8px] font-bold uppercase tracking-wide text-blue-700">Status</span><span className={`text-[10px] font-extrabold ${result.status === "Terlambat" ? "text-red-700" : "text-emerald-700"}`}>{result.status}</span></div>
          </div>
        </div>
        <div className="h-2.5 bg-blue-600" />
        <div className="id-card-actions flex justify-center p-2.5">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800">Tutup kartu</button>
        </div>
      </div>
    </div>
  );
}


type AcademicCalendarEvent = {
  id: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  penting: boolean;
};

function calendarDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function AcademicCalendarView({
  events,
  onRefresh,
  role,
  onUpdateEvent,
}: {
  events: AcademicCalendarEvent[];
  onRefresh: () => Promise<void>;
  role: Role;
  onUpdateEvent: (id: string, payload: { judul: string; deskripsi: string; kategori: string; tanggal_mulai: string; tanggal_selesai: string | null; penting: boolean }) => Promise<void>;
}) {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [viewDate, setViewDate] = useState(() => new Date(`${todayKey.slice(0, 7)}-01T12:00:00+07:00`));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [refreshing, setRefreshing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ judul: "", deskripsi: "", kategori: "Pengumuman", tanggalMulai: "", tanggalSelesai: "", penting: false });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = calendarDateKey(year, month, 1);
  const monthEnd = calendarDateKey(year, month, daysInMonth);
  const monthEvents = events
    .filter((event) => event.tanggalMulai <= monthEnd && (event.tanggalSelesai || event.tanggalMulai) >= monthStart)
    .sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));
  const selectedEvents = events.filter((event) =>
    event.tanggalMulai <= selectedDate && (event.tanggalSelesai || event.tanggalMulai) >= selectedDate
  );
  const monthLabel = viewDate.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", month: "long", year: "numeric" });
  const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const moveMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1, 12);
    setViewDate(next);
    setSelectedDate(calendarDateKey(next.getFullYear(), next.getMonth(), 1));
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };
  const startEditEvent = (event: AcademicCalendarEvent) => {
    if (role !== "Admin") return;
    setEditingEventId(event.id);
    setEditDraft({ judul: event.judul, deskripsi: event.deskripsi, kategori: event.kategori, tanggalMulai: event.tanggalMulai, tanggalSelesai: event.tanggalSelesai ?? "", penting: event.penting });
    setEditError("");
  };
  const saveEditedEvent = async () => {
    if (role !== "Admin" || !editingEventId) return;
    if (!editDraft.judul.trim() || !editDraft.tanggalMulai || (editDraft.tanggalSelesai && editDraft.tanggalSelesai < editDraft.tanggalMulai)) {
      setEditError("Lengkapi judul dan tanggal dengan benar."); return;
    }
    setSavingEdit(true); setEditError("");
    try {
      await onUpdateEvent(editingEventId, { judul: editDraft.judul.trim(), deskripsi: editDraft.deskripsi, kategori: editDraft.kategori, tanggal_mulai: editDraft.tanggalMulai, tanggal_selesai: editDraft.tanggalSelesai || null, penting: editDraft.penting });
      setEditingEventId(null);
    } catch (error) { setEditError(error instanceof Error ? error.message : "Perubahan agenda gagal disimpan."); }
    finally { setSavingEdit(false); }
  };
  const formatDate = (value: string) => new Date(`${value}T12:00:00+07:00`).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric",
  });
  const categoryColor = (category: string) => {
    const value = category.toLowerCase();
    if (value.includes("libur")) return "bg-rose-100 text-rose-800";
    if (value.includes("ujian") || value.includes("asesmen")) return "bg-amber-100 text-amber-800";
    if (value.includes("peringatan")) return "bg-violet-100 text-violet-800";
    return "bg-emerald-100 text-emerald-800";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="min-w-0">
          <p className="font-bold text-blue-950">Acuan Disdik Provinsi Jawa Barat</p>
          <p className="mt-1 text-sm leading-5 text-blue-900">Pedoman Kalender Pendidikan TA 2026/2027 · Surat Nomor 30234/PK.02.01.05/PSMA, 18 Juni 2026.</p>
          <p className="mt-1 text-xs text-blue-800">Tanggal berlabel perkiraan dapat berubah mengikuti keputusan pemerintah dan penyesuaian satuan pendidikan.</p>
        </div>
        <button type="button" onClick={handleRefresh} disabled={refreshing} className="shrink-0 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-100 disabled:opacity-60">{refreshing ? "Memuat…" : "Muat ulang"}</button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Kalender bulanan</p><h3 className="mt-1 text-xl font-bold capitalize text-slate-900">{monthLabel}</h3></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => moveMonth(-1)} aria-label="Bulan sebelumnya" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg hover:bg-slate-50">‹</button>
              <button type="button" onClick={() => { const current = new Date(`${todayKey}T12:00:00+07:00`); setViewDate(new Date(current.getFullYear(), current.getMonth(), 1, 12)); setSelectedDate(todayKey); }} className="rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Hari ini</button>
              <button type="button" onClick={() => moveMonth(1)} aria-label="Bulan berikutnya" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg hover:bg-slate-50">›</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {weekdays.map((day) => <div key={day} className="py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{day}</div>)}
            {Array.from({ length: firstWeekday }, (_, index) => <div key={`blank-${index}`} className="min-h-[68px] rounded-xl bg-slate-50/60 sm:min-h-[78px]" />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const dateKey = calendarDateKey(year, month, day);
              const dayEvents = events.filter((event) => event.tanggalMulai <= dateKey && (event.tanggalSelesai || event.tanggalMulai) >= dateKey);
              const selected = selectedDate === dateKey;
              const isToday = todayKey === dateKey;
              return (
                <button key={dateKey} type="button" onClick={() => setSelectedDate(dateKey)} className={`flex min-h-[68px] flex-col items-center rounded-xl border p-1.5 text-sm transition sm:min-h-[78px] ${selected ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isToday ? "bg-emerald-600 text-white" : selected ? "text-blue-800" : "text-slate-700"}`}>{day}</span>
                  <span className="mt-1 flex min-h-2 flex-wrap justify-center gap-0.5">{dayEvents.slice(0, 3).map((event) => <i key={event.id} title={event.judul} className={`h-1.5 w-1.5 rounded-full ${event.kategori.toLowerCase().includes("libur") ? "bg-rose-500" : event.kategori.toLowerCase().includes("ujian") ? "bg-amber-500" : "bg-emerald-500"}`} />)}</span>
                  {dayEvents.length > 0 && <span className="mt-0.5 text-[9px] font-semibold text-slate-500">{dayEvents.length} agenda</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500"/> Agenda sekolah</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500"/> Ujian/asesmen</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-500"/> Libur</span></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Agenda terpilih</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{formatDate(selectedDate)}</h3>
          <div className="mt-4 space-y-3">
            {selectedEvents.length ? selectedEvents.map((event) => <article key={event.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${categoryColor(event.kategori)}`}>{event.kategori}</span>{event.penting && <span className="text-[10px] font-bold text-amber-700">PENTING</span>}</div>
              <h4 className="mt-2 text-sm font-bold text-slate-900">{event.judul}</h4>
              {event.deskripsi && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{event.deskripsi}</p>}
              {event.tanggalSelesai && event.tanggalSelesai !== event.tanggalMulai && <p className="mt-2 text-[10px] font-semibold text-slate-400">{formatDate(event.tanggalMulai)} – {formatDate(event.tanggalSelesai)}</p>}
              {role === "Admin" && <button type="button" onClick={() => startEditEvent(event)} className="mt-3 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Edit</button>}
              {editingEventId === event.id && <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <input value={editDraft.judul} onChange={(e) => setEditDraft((d) => ({ ...d, judul: e.target.value }))} placeholder="Judul agenda" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={editDraft.kategori} onChange={(e) => setEditDraft((d) => ({ ...d, kategori: e.target.value }))} placeholder="Kategori" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-500">Tanggal mulai<input type="date" value={editDraft.tanggalMulai} onChange={(e) => setEditDraft((d) => ({ ...d, tanggalMulai: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" /></label><label className="text-xs text-slate-500">Tanggal selesai<input type="date" value={editDraft.tanggalSelesai} onChange={(e) => setEditDraft((d) => ({ ...d, tanggalSelesai: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" /></label></div>
                <textarea value={editDraft.deskripsi} onChange={(e) => setEditDraft((d) => ({ ...d, deskripsi: e.target.value }))} placeholder="Deskripsi" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={editDraft.penting} onChange={(e) => setEditDraft((d) => ({ ...d, penting: e.target.checked }))} /> Tandai sebagai agenda penting</label>
                {editError && <p className="text-xs text-rose-600">{editError}</p>}
                <div className="flex gap-2"><button type="button" disabled={savingEdit} onClick={saveEditedEvent} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{savingEdit ? "Menyimpan…" : "Simpan Perubahan"}</button><button type="button" onClick={() => setEditingEventId(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Batal</button></div>
              </div>}
            </article>) : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><p className="text-sm font-semibold text-slate-600">Tidak ada agenda pada tanggal ini.</p><p className="mt-1 text-xs text-slate-400">Pilih tanggal bertanda titik untuk melihat kegiatan.</p></div>}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">Agenda bulan {monthLabel}</h3><p className="mt-1 text-xs text-slate-500">{monthEvents.length} agenda terdaftar</p></div></div>
        {monthEvents.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{monthEvents.map((event) => <article key={event.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${categoryColor(event.kategori)}`}>{event.kategori}</span>{event.penting && <span className="text-[10px] font-bold text-amber-700">PENTING</span>}</div>
          <h4 className="mt-2 font-bold text-slate-900">{event.judul}</h4>
          <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(event.tanggalMulai)}{event.tanggalSelesai && event.tanggalSelesai !== event.tanggalMulai ? ` – ${formatDate(event.tanggalSelesai)}` : ""}</p>
          {event.deskripsi && <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{event.deskripsi}</p>}
        </article>)}</div> : <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Belum ada agenda untuk bulan ini.</p>}
      </section>
    </div>
  );
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Admin");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile>(emptyUserProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [photoCropSrc, setPhotoCropSrc] = useState<string>("");
  const [photoCropZoom, setPhotoCropZoom] = useState(1);
  const [photoCropOffset, setPhotoCropOffset] = useState({ x: 0, y: 0 });
  const [photoCropDragging, setPhotoCropDragging] = useState(false);
  const photoCropDragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("albarkah-theme") === "dark");
  const [loginLoading, setLoginLoading] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<{ type: "denied" | "success"; message: string } | null>(null);
  const [welcomeName, setWelcomeName] = useState("");
  const [welcomeRole, setWelcomeRole] = useState<Role>("Siswa");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("albarkah-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((current) => !current);

  const [selectedSemester, setSelectedSemester] = useState("1");
  const [selectedReportClass, setSelectedReportClass] = useState("6A");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentRows, setStudentRows] = useState<StudentRecord[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [studentEditingId, setStudentEditingId] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState({ name: "", nis: "", nisn: "", className: "", status: "Aktif" });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherRows, setTeacherRows] = useState<TeacherRecord[]>(demoTeachers);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherSaving, setTeacherSaving] = useState(false);
  const [teacherError, setTeacherError] = useState("");
  const [teacherFormOpen, setTeacherFormOpen] = useState(false);
  const [teacherEditingId, setTeacherEditingId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: "", nip: "", position: "Guru Mata Pelajaran", subject: "", classes: "", waliKelas: "", status: "Aktif",
  });
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);
  const [scheduleRows, setScheduleRows] = useState<
    {
      id: string;
      className: string;
      subjectName: string;
      subjectCode: string;
      teacherName: string;
      hari: string;
      jamMulai: string;
      jamSelesai: string;
      ruang: string;
    }[]
  >([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleClasses, setScheduleClasses] = useState<{ id: string; nama: string }[]>([]);
  const [scheduleSubjects, setScheduleSubjects] = useState<{ id: string; nama: string; kode: string }[]>([]);
  const [scheduleTeachers, setScheduleTeachers] = useState<{ id: string; nama: string }[]>([]);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleEditingId, setScheduleEditingId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    classId: "",
    subjectId: "",
    teacherId: "",
    hari: "Senin",
    jamMulai: "07:00",
    jamSelesai: "08:00",
    ruang: "",
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [attendancePanel, setAttendancePanel] = useState<"menu" | "siswa" | "guru" | "rekap-guru" | "rekap-siswa" | "qr-pegawai" | "scan-qr">("menu");
  const [teacherAttendanceRows, setTeacherAttendanceRows] = useState<(TeacherAttendanceToday & { guru_id: string; nama_guru: string; role_label: string; attendancePercentage: number; attendedWorkdays: number; workdaysElapsed: number; status?: string; izinDays: number; sakitDays: number; alfaDays: number })[]>([]);
  const [teacherAttendanceReportLoading, setTeacherAttendanceReportLoading] = useState(false);
  const [employeeQrRows, setEmployeeQrRows] = useState<{ profile_id: string; qr_token: string; is_active: boolean; nama: string; role: string; foto_url: string | null }[]>([]);
  const [ownEmployeeQr, setOwnEmployeeQr] = useState<{ qr_token: string; is_active: boolean } | null>(null);
  const [ownEmployeeQrLoading, setOwnEmployeeQrLoading] = useState(false);
  const [ownEmployeeQrError, setOwnEmployeeQrError] = useState("");
  const [ownQrScannerOpen, setOwnQrScannerOpen] = useState(false);
  const [ownQrScannerMessage, setOwnQrScannerMessage] = useState("");
  const [employeeQrLoading, setEmployeeQrLoading] = useState(false);
  const [employeeQrError, setEmployeeQrError] = useState("");
  const [scannedEmployee, setScannedEmployee] = useState<{ profile_id: string; qr_token: string; nama: string; role: string; foto_url: string | null } | null>(null);
  const [qrAttendanceMode, setQrAttendanceMode] = useState<"masuk" | "pulang">("masuk");
  const [qrAttendanceBusy, setQrAttendanceBusy] = useState(false);
  const [qrAttendanceResult, setQrAttendanceResult] = useState<{ profile_id: string; qr_token: string; nama: string; role: string; foto_url: string | null; mode: string; time: string; date: string; address: string; latitude: number | null; longitude: number | null; status: string } | null>(null);

  const [teacherAttendanceReportError, setTeacherAttendanceReportError] = useState("");
  const [attendanceClassChosen, setAttendanceClassChosen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState("1");
  const [studentAttendance, setStudentAttendance] = useState<Record<string, AttendanceStatus>>({});
  type TeacherAttendanceToday = {
    id: string;
    tanggal: string;
    jam_masuk: string | null;
    selfie_masuk: string | null;
    jam_pulang: string | null;
    selfie_pulang: string | null;
    latitude_masuk?: number | null;
    longitude_masuk?: number | null;
    alamat_masuk?: string | null;
    latitude_pulang?: number | null;
    longitude_pulang?: number | null;
    alamat_pulang?: string | null;
    status?: "hadir" | "izin" | "sakit" | "alfa";
  };
  const [teacherAttendanceToday, setTeacherAttendanceToday] = useState<TeacherAttendanceToday | null>(null);
  const [teacherAttendanceMode, setTeacherAttendanceMode] = useState<"masuk" | "pulang">("masuk");
  const [locationChecking, setLocationChecking] = useState(false);
  const [teacherLocationStatus, setTeacherLocationStatus] = useState("");
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const today = new Date();
  const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [attendanceDate, setAttendanceDate] = useState(todayDateString);
  const [selectedPdfAttendanceDate, setSelectedPdfAttendanceDate] = useState(todayDateString);
  const [selectedPdfAttendanceMonth, setSelectedPdfAttendanceMonth] = useState(todayDateString.slice(0, 7));
  const [selectedTeacherStatusProfile, setSelectedTeacherStatusProfile] = useState("");
  const [selectedTeacherStatusDate, setSelectedTeacherStatusDate] = useState(todayDateString);
  const [selectedTeacherStatus, setSelectedTeacherStatus] = useState<"izin" | "sakit" | "alfa">("izin");
  const [teacherStatusSaving, setTeacherStatusSaving] = useState(false);
  const [attendanceMonth, setAttendanceMonth] = useState(today.getMonth());
  const [attendanceYear] = useState(today.getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceStudents, setAttendanceStudents] = useState<AttendanceStudent[]>([]);
  const [attendanceSubjects, setAttendanceSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<{ subjectId: string; subjectName: string; subjectCode: string; classId: string; className: string; isWaliKelas: boolean }[]>([]);
  type JournalRow = {
    id: string;
    tanggal: string;
    jam: string;
    kegiatan: string;
    tujuan_pembelajaran: string | null;
    materi_pembelajaran: string | null;
    catatan: string | null;
    guru_id: string;
    class_id: string;
    subject_id: string | null;
    tahun_ajaran: string;
    className: string;
    subjectName: string;
    absenceRows: { studentId: string; studentName: string; keterangan: string }[];
  };
  const [journalRows, setJournalRows] = useState<JournalRow[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalError, setJournalError] = useState("");
  const [journalMonth, setJournalMonth] = useState(String(new Date().getMonth() + 1));
  const [journalYear, setJournalYear] = useState(String(new Date().getFullYear()));
  const [journalClassId, setJournalClassId] = useState("");
  const [journalSubjectId, setJournalSubjectId] = useState("");
  const [journalEditingId, setJournalEditingId] = useState<string | null>(null);
  const [journalFormOpen, setJournalFormOpen] = useState(false);
  const [journalForm, setJournalForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jam: "",
    kegiatan: "",
    tujuan_pembelajaran: "",
    materi_pembelajaran: "",
    catatan: "",
  });
  const [journalAbsences, setJournalAbsences] = useState<Record<string, string>>({});
  const [journalStudentAttendance, setJournalStudentAttendance] = useState<Record<string, string>>({});
  const [journalAttendanceLoading, setJournalAttendanceLoading] = useState(false);

  const [programClasses, setProgramClasses] = useState<{ id: string; nama: string }[]>([]);
  const [programStudents, setProgramStudents] = useState<{ id: string; nama: string; nis: string; class_id: string }[]>([]);
  const [programSubjects, setProgramSubjects] = useState<{ id: string; nama: string; kode: string }[]>([]);

  const [remedialRows, setRemedialRows] = useState<RemedialRow[]>([]);
  const [remedialLoading, setRemedialLoading] = useState(false);
  const [remedialError, setRemedialError] = useState("");
  const [remedialClassId, setRemedialClassId] = useState("");
  const [remedialSubjectId, setRemedialSubjectId] = useState("");
  const [remedialTypeFilter, setRemedialTypeFilter] = useState("all");
  const [remedialFormOpen, setRemedialFormOpen] = useState(false);
  const [remedialEditingId, setRemedialEditingId] = useState<string | null>(null);
  const [remedialSaving, setRemedialSaving] = useState(false);
  const [remedialForm, setRemedialForm] = useState({
    studentId: "", classId: "", subjectId: "", jenis: "remedial" as "remedial" | "pengayaan",
    tanggal: new Date().toISOString().slice(0, 10), nilaiAwal: "", nilaiHasil: "", materi: "", catatan: "", status: "direncanakan" as "direncanakan" | "selesai",
  });

  const [bkRows, setBkRows] = useState<BkRow[]>([]);
  const [bkLoading, setBkLoading] = useState(false);
  const [bkError, setBkError] = useState("");
  const [bkClassId, setBkClassId] = useState("");
  const [bkStatusFilter, setBkStatusFilter] = useState("all");
  const [bkFormOpen, setBkFormOpen] = useState(false);
  const [bkEditingId, setBkEditingId] = useState<string | null>(null);
  const [bkSaving, setBkSaving] = useState(false);
  const [bkForm, setBkForm] = useState({
    studentId: "", classId: "", tanggal: new Date().toISOString().slice(0, 10),
    jenisProgram: "Pendampingan belajar", ringkasan: "", tindakLanjut: "", status: "dipantau" as "dipantau" | "selesai",
  });

  const [attendanceSubjectId, setAttendanceSubjectId] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [portalNotifications, setPortalNotifications] = useState<PortalNotification[]>([]);
  const [notificationToast, setNotificationToast] = useState<PortalNotification | null>(null);
  const notificationToastTimerRef = useRef<number | null>(null);
  const [activityRows, setActivityRows] = useState<Array<{
    id: number;
    table_name: string;
    action: string;
    actor_id: string | null;
    actor_name: string | null;
    target_name: string | null;
    created_at: string;
  }>>([]);
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [isGuruPiket, setIsGuruPiket] = useState(false);
  const canEditGrades = role === "Admin" || role === "Guru";
  const canViewReport = role === "Admin" || role === "Orang Tua" || isWaliKelas;
  const canEditReport = role === "Admin" || isWaliKelas;
  const isParentReadOnly = role === "Orang Tua";
  const [gradeTab, setGradeTab] = useState<"input" | "raport">("input");
  const [reportType, setReportType] = useState<"school" | "madin">("school");
  const [gradeClasses, setGradeClasses] = useState<GradeClass[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<GradeSubject[]>([]);
  const [gradeStudents, setGradeStudents] = useState<GradeStudent[]>([]);
  const [selectedGradeClassId, setSelectedGradeClassId] = useState("");
  const [selectedGradeSubjectId, setSelectedGradeSubjectId] = useState("");
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>({});
  const [selectedTahfidzStudentId, setSelectedTahfidzStudentId] = useState("");
  const [tahfidzStudentSearch, setTahfidzStudentSearch] = useState("");
  const [tahfidzSetoranRows, setTahfidzSetoranRows] = useState<any[]>([]);
  const [tahfidzSetoranForm, setTahfidzSetoranForm] = useState({ tanggal: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }), namaSurat: "", status: "Tuntas" as "Tuntas" | "Ulang", nilai: "", predikat: "", catatan: "" });
  const [tahfidzSetoranSaving, setTahfidzSetoranSaving] = useState(false);
  const [tahfidzSetoranError, setTahfidzSetoranError] = useState("");
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeSaved, setGradeSaved] = useState(false);
  const [gradeError, setGradeError] = useState("");
  const [expandedGradeStudent, setExpandedGradeStudent] = useState<string | null>(null);
  const [reportStudents, setReportStudents] = useState<GradeStudent[]>([]);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState("");
  const [reportDraft, setReportDraft] = useState<ReportCardDraft | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportGrades, setReportGrades] = useState<ReportGradeSummary[]>([]);
  const [reportDescriptionLoading, setReportDescriptionLoading] = useState(false);
  const [reportExtracurricular, setReportExtracurricular] = useState<ReportExtracurricular[]>([
    { nama: "Pramuka", predikat: "", keterangan: "" },
    { nama: "Pencak Silat", predikat: "", keterangan: "" },
  ]);
  const [reportAttendanceLoading, setReportAttendanceLoading] = useState(false);
  const [sppBills, setSppBills] = useState<SppBill[]>([]);
  const [sppFeeTypes, setSppFeeTypes] = useState<SppFeeType[]>([]);
  const [sppStudents, setSppStudents] = useState<{ id: string; nama: string; nis: string }[]>([]);
  const [sppLoading, setSppLoading] = useState(false);
  const [sppSaving, setSppSaving] = useState(false);
  const [sppStudentId, setSppStudentId] = useState("");
  const [sppFeeTypeId, setSppFeeTypeId] = useState("");
  const [sppPeriode, setSppPeriode] = useState("2026-10");
  const [sppNominal, setSppNominal] = useState("");
  const [sppJatuhTempo, setSppJatuhTempo] = useState("2026-10-10");
  const [sppPaymentBillId, setSppPaymentBillId] = useState("");
  const [sppPaymentNominal, setSppPaymentNominal] = useState("");
  const [sppPaymentMethod, setSppPaymentMethod] = useState("Tunai");
  const [sppSearch, setSppSearch] = useState("");
  const [sppOnlineLoading, setSppOnlineLoading] = useState(false);
  const [sppDummyBill, setSppDummyBill] = useState<SppBill | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(emptySchoolSettings);
  const [schoolSettingsLoading, setSchoolSettingsLoading] = useState(false);
  const [schoolSettingsSaving, setSchoolSettingsSaving] = useState(false);
  const [schoolSettingsSaved, setSchoolSettingsSaved] = useState(false);
  const [dashboardLearning, setDashboardLearning] = useState<DashboardLearningItem[]>([]);
  const [dashboardAverage, setDashboardAverage] = useState<number | null>(null);
  const [dashboardAttendance, setDashboardAttendance] = useState<{ hadir: number; izin: number; sakit: number; alpa: number } | null>(null);
  const [dashboardChild, setDashboardChild] = useState<DashboardChild | null>(null);
  const [dashboardOutstanding, setDashboardOutstanding] = useState<number | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardSchoolStats, setDashboardSchoolStats] = useState({
    totalSiswa: 0,
    totalGuru: 0,
    totalRombel: 0,
    attendancePercent: 0,
    attendancePresent: 0,
    attendanceTotal: 0,
    attendanceExpected: 0,
    teacherMorningPercent: 0,
    teacherMorningPresent: 0,
    teacherMorningTotal: 0,
    teacherMorningRows: [] as { id: string; nama: string; status: string; jamMasuk: string | null; isPiket: boolean }[],
    classAttendancePercent: 0,
    classAttendanceDone: 0,
    classAttendanceExpected: 0,
    classAttendanceTodayRows: [] as { id: string; guru: string; kelas: string; mapel: string; status: string; isPiket: boolean }[],
    classProgressRows: [] as { id: string; kelas: string; totalSiswa: number; tercatat: number; hadir: number; status: string }[],
    schoolEvents: [] as { id: string; judul: string; deskripsi: string; kategori: string; tanggalMulai: string; tanggalSelesai: string | null; penting: boolean }[],
    teacherTodaySchedules: [] as TeacherLesson[],
  });

  useEffect(() => {
    if (!currentUserId) return;

    const loadUserProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const authEmail = authData.user?.email ?? "";

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nama, role, email, no_hp, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, bio, foto_url")
        .eq("id", currentUserId)
        .maybeSingle();

      if (error) {
        console.error("Gagal memuat profil pribadi:", error);
        setUserProfile((current) => ({ ...current, nama: name, email: authEmail || current.email }));
        return;
      }

      if (data) {
        setUserProfile({
          nama: data.nama ?? name,
          email: data.email ?? authEmail,
          noHp: data.no_hp ?? "",
          tempatLahir: data.tempat_lahir ?? "",
          tanggalLahir: data.tanggal_lahir ?? "",
          jenisKelamin: data.jenis_kelamin === "Laki-laki" || data.jenis_kelamin === "Perempuan" ? data.jenis_kelamin : "",
          alamat: data.alamat ?? "",
          bio: data.bio ?? "",
          fotoUrl: data.foto_url ?? "",
        });
      } else {
        setUserProfile((current) => ({ ...current, nama: name, email: authEmail || current.email }));
      }
    };

    void loadUserProfile();
  }, [currentUserId, name]);

  const saveUserProfile = async () => {
    if (!currentUserId) {
      alert("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    if (!userProfile.nama.trim()) {
      alert("Nama lengkap wajib diisi.");
      return;
    }

    setProfileSaving(true);
    setProfileSaved(false);

    try {
      const payload = {
        nama: userProfile.nama.trim(),
        email: userProfile.email.trim() || null,
        no_hp: userProfile.noHp.trim() || null,
        tempat_lahir: userProfile.tempatLahir.trim() || null,
        tanggal_lahir: userProfile.tanggalLahir || null,
        jenis_kelamin: userProfile.jenisKelamin || null,
        alamat: userProfile.alamat.trim() || null,
        bio: userProfile.bio.trim() || null,
        foto_url: userProfile.fotoUrl || null,
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", currentUserId)
        .select("id, nama, role, email, no_hp, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, bio, foto_url")
        .single();

      if (error) {
        console.error("Profil gagal disimpan:", error);
        alert(`Profil gagal disimpan: ${error.message}`);
        return;
      }

      setUserProfile({
        nama: data.nama ?? userProfile.nama,
        email: data.email ?? userProfile.email,
        noHp: data.no_hp ?? "",
        tempatLahir: data.tempat_lahir ?? "",
        tanggalLahir: data.tanggal_lahir ?? "",
        jenisKelamin: data.jenis_kelamin === "Laki-laki" || data.jenis_kelamin === "Perempuan" ? data.jenis_kelamin : "",
        alamat: data.alamat ?? "",
        bio: data.bio ?? "",
        fotoUrl: data.foto_url ?? "",
      });
      setName(data.nama ?? userProfile.nama);
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2500);
      alert("Profil berhasil disimpan ke database. ✅");
    } catch (error) {
      console.error("Gagal menyimpan profil:", error);
      alert(error instanceof Error ? error.message : "Profil gagal disimpan.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfilePhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Pilih file gambar (JPG, PNG, atau WEBP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran foto maksimal 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoCropSrc(String(reader.result ?? ""));
      setPhotoCropZoom(1);
      setPhotoCropOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const saveCroppedProfilePhoto = () => {
    if (!photoCropSrc) return;
    const image = new Image();
    image.onload = () => {
      const outputSize = 640;
      const baseScale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight);
      const scale = baseScale * photoCropZoom;
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) { alert("Foto belum bisa diproses. Coba pilih foto lain."); return; }
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      context.drawImage(image, (outputSize - drawWidth) / 2 + photoCropOffset.x * (outputSize / 280), (outputSize - drawHeight) / 2 + photoCropOffset.y * (outputSize / 280), drawWidth, drawHeight);
      const croppedPhoto = canvas.toDataURL("image/jpeg", 0.88);
      setUserProfile((current) => ({ ...current, fotoUrl: croppedPhoto }));
      setPhotoCropSrc("");
      setPhotoCropZoom(1);
      setPhotoCropOffset({ x: 0, y: 0 });
      setProfileSaved(false);
    };
    image.onerror = () => alert("Foto tidak dapat dibaca. Silakan pilih gambar lain.");
    image.src = photoCropSrc;
  };


  // Cetak format administrasi pembelajaran. Dari dialog cetak browser,
  // pengguna dapat memilih printer atau "Save as PDF".
  const printSchoolLearningDocument = (
    title: string,
    headers: string[],
    rows: (string | number)[][],
    teacherLabel = name || "Guru Mata Pelajaran",
    subjectOverride?: string,
  ) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up diblokir. Izinkan pop-up untuk portal sekolah lalu coba lagi.");
      return;
    }
    const esc = (value: unknown) => String(value ?? "-")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const tableHead = headers.map((h) => `<th>${esc(h)}</th>`).join("");
    const tableRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");
    const school = schoolSettings.namaSekolah || "SD Islam Al-Barkah";
    const subject = subjectOverride || (title.includes("Remedial") ? "Berbagai Mata Pelajaran"
      : title.includes("Bimbingan Konseling") ? "Bimbingan Konseling"
      : journalSubjectOptions.find((item) => item.id === journalSubjectId)?.name || "Berbagai Mata Pelajaran");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
      @page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;font-size:9px;margin:0}
      h1{text-align:center;color:#176d68;font-size:18px;margin:0 0 3px}
      .meta{text-align:center;font-size:10px;margin-bottom:9px;color:#475569}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      th,td{border:1px solid #9aa7b4;padding:3px 4px;text-align:left;vertical-align:top;overflow-wrap:anywhere;font-size:8px}
      th{background:#dff4f1;text-align:center;font-weight:bold}
      .signatures{display:flex;justify-content:space-between;margin-top:12px;page-break-inside:avoid;break-inside:avoid}
      .sign{width:28%;text-align:center;min-height:48px;font-size:9px}.line{width:72%;margin:24px auto 0;border-top:1px solid #333;padding-top:4px}
      .print-note{text-align:center;color:#64748b;font-size:9px;margin-top:12px}
      @media print{.print-note{display:none}}
      </style></head><body><h1>${esc(title)}</h1>
      <div class="meta">${esc(school)} &nbsp;•&nbsp; Tahun Pelajaran ${esc(schoolSettings.tahunAjaran || "2026/2027")} &nbsp;•&nbsp; ${esc(subject)}</div>
      <table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows || `<tr><td colspan="${headers.length}" style="text-align:center">Belum ada data</td></tr>`}</tbody></table>
      <div class="signatures"><div class="sign">Mengetahui,<br>Kepala Sekolah<div class="line">${esc(schoolSettings.namaKepalaSekolah || "Sofian, S.Pd.I., M.Pd., Gr")}</div></div>
      <div class="sign">Guru Mata Pelajaran<div class="line">${esc(teacherLabel)}</div></div></div>
      <p class="print-note">Pilih Cetak atau Simpan sebagai PDF pada tujuan printer.</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),350);</script></body></html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };


  const downloadExcelTable = (filename: string, title: string, headers: string[], rows: (string | number)[][]) => {
    const esc = (value: string | number) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><h2>${esc(title)}</h2><table border="1"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printTablePdf = (title: string, headers: string[], rows: (string | number)[][], targetWindow?: Window | null) => {
    const printWindow = targetWindow ?? window.open("", "_blank");
    if (!printWindow) {
      alert("Popup diblokir browser. Izinkan popup untuk mencetak PDF.");
      return;
    }
    const esc = (value: string | number) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{font-size:20px;margin:0 0 6px}p{color:#666;font-size:12px;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ccc;padding:7px;text-align:left}th{background:#f3f4f6} @media print{button{display:none}}</style></head><body><h1>${esc(schoolSettings.namaSekolah || "SD Islam Al-Barkah")}</h1><p>${esc(title)}</p><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`);
    printWindow.document.close();
  };

  const exportGrades = async (mode: "excel" | "pdf") => {
    const { data, error } = await supabase
      .from("grades")
      .select("student_id, nilai, semester, tahun_ajaran, nilai_non_tes, nilai_uts_pts, nilai_sas, nilai_akhir, students(nama, nis, kelas), subjects(nama, kode), classes(nama)")
      .order("student_id");
    if (error) { alert(`Gagal mengambil data nilai: ${error.message}`); return; }
    const rows = (data ?? []).map((r: any, i: number) => [i + 1, r.students?.nis ?? "", r.students?.nama ?? "", r.classes?.nama ?? r.students?.kelas ?? "", r.subjects?.nama ?? "", r.semester ?? "", r.tahun_ajaran ?? "", r.nilai_non_tes ?? "", r.nilai_uts_pts ?? "", r.nilai_sas ?? "", r.nilai_akhir ?? r.nilai ?? ""]);
    const headers = ["No", "NIS", "Nama Siswa", "Kelas", "Mata Pelajaran", "Semester", "Tahun Ajaran", "Non-Tes", "UTS/PTS", "SAS", "Nilai Akhir"];
    const title = "Rekap Nilai Siswa";
    if (mode === "excel") downloadExcelTable(`Rekap_Nilai_${new Date().toISOString().slice(0,10)}.xls`, title, headers, rows);
    else printTablePdf(title, headers, rows);
  };

  const exportStudentAttendanceBySubjectMonthlyPdf = async () => {
    // Buka tab secara langsung saat klik agar tidak mudah diblokir browser.
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      alert("Popup diblokir browser. Izinkan popup untuk portal sekolah, lalu coba lagi.");
      return;
    }
    reportWindow.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Menyiapkan rekap absensi</title></head><body style='font-family:Arial;padding:24px'>Menyiapkan rekap absensi siswa...</body></html>");
    const monthStart = `${attendanceYear}-${String(attendanceMonth + 1).padStart(2, "0")}-01`;
    const daysInMonth = new Date(attendanceYear, attendanceMonth + 1, 0).getDate();
    const monthEnd = `${attendanceYear}-${String(attendanceMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const [{ data: studentRows, error: studentsError }, { data: attendanceRows, error: attendanceError }] = await Promise.all([
      supabase.from("students").select("id, nama, nis, nisn, kelas, class_id, classes(nama)").order("nama"),
      supabase.from("attendance").select("student_id, tanggal, status, subject_id, class_id, subjects(nama), classes(nama)").gte("tanggal", monthStart).lte("tanggal", monthEnd),
    ]);
    if (studentsError || attendanceError) {
      reportWindow.close();
      alert(`Gagal mengambil data rekap: ${(studentsError ?? attendanceError)?.message ?? "Kesalahan tidak diketahui"}`);
      return;
    }

    // Admin dapat melihat seluruh kelas. Wali kelas hanya melihat kelas yang
    // memang ditugaskan kepadanya; guru mapel bukan pengguna fitur laporan ini.
    if (role !== "Admin" && !isWaliKelas) {
      reportWindow.close();
      alert("PDF rekap bulanan hanya tersedia untuk Admin dan Wali Kelas.");
      return;
    }
    const allowedWaliClassIds = new Set(
      teacherAssignments.filter((assignment) => assignment.isWaliKelas).map((assignment) => assignment.classId)
    );
    const students = (studentRows ?? []).filter((x: any) =>
      x.class_id && (role === "Admin" || allowedWaliClassIds.has(x.class_id))
    ).map((x: any) => ({
      id: x.id, name: x.nama ?? "", nis: x.nis ?? "", nisn: x.nisn ?? "",
      classId: x.class_id, className: x.classes?.nama ?? x.kelas ?? "-",
    }));
    const allowedStudentIds = new Set(students.map((student: any) => student.id));
    const attendance = (attendanceRows ?? []).filter((row: any) =>
      allowedStudentIds.has(row.student_id) && (role === "Admin" || allowedWaliClassIds.has(row.class_id ?? students.find((student: any) => student.id === row.student_id)?.classId))
    );
    const groups = new Map<string, { subjectId: string; subjectName: string; classId: string; className: string }>();
    for (const row of attendance as any[]) {
      if (!row.subject_id) continue;
      const student = students.find((x: any) => x.id === row.student_id);
      const classId = row.class_id ?? student?.classId;
      const className = row.classes?.nama ?? student?.className ?? "-";
      if (!classId) continue;
      const subjectName = row.subjects?.nama ?? attendanceSubjects.find((x) => x.id === row.subject_id)?.name ?? "Mata Pelajaran";
      const key = `${row.subject_id}:${classId}`;
      if (!groups.has(key)) groups.set(key, { subjectId: row.subject_id, subjectName, classId, className });
    }
    // Jika bulan tersebut belum memiliki absensi, jangan mengarang mapel atau status.
    if (!groups.size) {
      reportWindow.document.body.innerHTML = "<p>Belum ada catatan absensi bermata pelajaran pada bulan yang dipilih.</p>";
      return;
    }
    const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
    const monthLabel = new Date(attendanceYear, attendanceMonth, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const pages = Array.from(groups.values()).map((group) => {
      const classStudents = students.filter((x: any) => x.classId === group.classId).sort((a: any, b: any) => a.name.localeCompare(b.name, "id"));
      const byStudentDate = new Map<string, string>();
      for (const row of attendance as any[]) {
        if (row.subject_id !== group.subjectId) continue;
        const st = students.find((x: any) => x.id === row.student_id);
        if (!st || st.classId !== group.classId) continue;
        const day = Number(String(row.tanggal).slice(8, 10));
        byStudentDate.set(`${row.student_id}:${day}`, String(row.status ?? ""));
      }
      const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      const bodyRows = classStudents.map((student: any, i: number) => {
        const statuses = dates.map((day) => byStudentDate.get(`${student.id}:${day}`) ?? "");
        const count = (s: string) => statuses.filter((x) => x.toLowerCase() === s.toLowerCase()).length;
        return `<tr><td>${i + 1}</td><td>${esc(student.nisn || student.nis || "-")}</td><td class="name">${esc(student.name)}</td><td>${esc(student.className)}</td>${statuses.map((x) => `<td>${esc(x ? ({Hadir:"H", Sakit:"S", Izin:"I", Alpa:"A"} as Record<string,string>)[x] ?? x : "")}</td>`).join("")}<td>${count("Hadir")}</td><td>${count("Sakit")}</td><td>${count("Izin")}</td><td>${count("Alpa")}</td></tr>`;
      }).join("");
      const headers = dates.map((d) => `<th>${String(d).padStart(2, "0")}</th>`).join("");
      return `<section class="page"><h1>${esc(schoolSettings.namaSekolah || "SD Islam Al-Barkah")}</h1><h2>REKAP ABSENSI SISWA PER MATA PELAJARAN</h2><p>Mapel: <b>${esc(group.subjectName)}</b> &nbsp; | &nbsp; Kelas: <b>${esc(group.className)}</b> &nbsp; | &nbsp; Periode: ${esc(monthLabel)}</p><table><thead><tr><th>No.</th><th>NISN / NIS</th><th>Nama Siswa</th><th>Kelas</th>${headers}<th>H</th><th>S</th><th>I</th><th>A</th></tr></thead><tbody>${bodyRows}</tbody></table><p class="legend">H = Hadir · S = Sakit · I = Izin · A = Alpa. Kolom kosong berarti belum ada catatan absensi, bukan otomatis alpa.</p></section>`;
    }).join("");
    reportWindow.document.open();
    reportWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rekap Absensi ${esc(monthLabel)}</title><style>@page{size:A4 landscape;margin:7mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0}h1{text-align:center;font-size:15px;margin:0 0 3px}h2{text-align:center;font-size:12px;margin:0 0 5px}p{font-size:9px;text-align:center;margin:0 0 8px}.page{page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:6.5px}th,td{border:1px solid #555;padding:3px 1px;text-align:center;overflow-wrap:anywhere}th{background:#e8f2ec}th:nth-child(3),td.name{text-align:left;width:30mm}th:nth-child(2){width:18mm}th:nth-child(1){width:7mm}th:nth-child(4){width:13mm}.legend{margin-top:6px;font-size:8px;color:#444}@media screen{body{padding:14px}.page{margin:0 auto 18px;padding:10px;max-width:1100px;border:1px solid #ddd}}@media print{.page{padding:0}}</style></head><body>${pages}<script>window.onload=function(){window.print()}</script></body></html>`);
    reportWindow.document.close();
  };

  const exportAttendance = async (mode: "excel" | "pdf") => {
    const { data, error } = await supabase
      .from("attendance")
      .select("tanggal, status, keterangan, students(nama, nis, kelas), classes(nama), subjects(nama, kode)")
      .order("tanggal", { ascending: false });
    if (error) { alert(`Gagal mengambil data absensi: ${error.message}`); return; }
    const rows = (data ?? []).map((r: any, i: number) => [i + 1, r.tanggal ?? "", r.students?.nis ?? "", r.students?.nama ?? "", r.classes?.nama ?? r.students?.kelas ?? "", r.subjects?.nama ?? "", r.status ?? "", r.keterangan ?? ""]);
    const headers = ["No", "Tanggal", "NIS", "Nama Siswa", "Kelas", "Mata Pelajaran", "Status", "Keterangan"];
    const title = "Rekap Absensi Siswa";
    if (mode === "excel") downloadExcelTable(`Rekap_Absensi_${new Date().toISOString().slice(0,10)}.xls`, title, headers, rows);
    else printTablePdf(title, headers, rows);
  };

  const exportSpp = async (mode: "excel" | "pdf") => {
    const { data, error } = await supabase
      .from("student_bills")
      .select("periode, jatuh_tempo, nominal, status, keterangan, students(nama, nis, kelas), fee_types(nama), student_payments(nominal, tanggal_bayar, metode, nomor_bukti)")
      .order("periode", { ascending: false });
    if (error) { alert(`Gagal mengambil data pembayaran: ${error.message}`); return; }
    const rows = (data ?? []).map((r: any, i: number) => {
      const paid = (r.student_payments ?? []).reduce((sum: number, p: any) => sum + Number(p.nominal ?? 0), 0);
      return [i + 1, r.students?.nis ?? "", r.students?.nama ?? "", r.students?.kelas ?? "", r.fee_types?.nama ?? "", r.periode ?? "", r.nominal ?? 0, paid, Math.max(0, Number(r.nominal ?? 0) - paid), r.status ?? ""];
    });
    const headers = ["No", "NIS", "Nama Siswa", "Kelas", "Jenis Tagihan", "Periode", "Tagihan", "Dibayar", "Sisa", "Status"];
    const title = "Rekap Tagihan & Pembayaran SPP";
    if (mode === "excel") downloadExcelTable(`Rekap_SPP_${new Date().toISOString().slice(0,10)}.xls`, title, headers, rows);
    else printTablePdf(title, headers, rows);
  };

  const syncedClassNames = Array.from(
    new Set([
      ...classNames,
      ...gradeClasses.map((item) => item.nama),
      ...scheduleClasses.map((item) => item.nama),
      ...attendanceStudents.map((student) => student.class),
    ])
  ).filter(Boolean);

  // Kelas absensi Guru mengikuti penugasan mengajar + kelas yang diwalikan.
  // Admin tetap dapat memilih semua kelas.
  const waliAttendanceClassIds = new Set(
    teacherAssignments.filter((item) => item.isWaliKelas).map((item) => item.classId)
  );
  const waliAttendanceClassNames = teacherAssignments
    .filter((item) => item.isWaliKelas && item.className)
    .map((item) => item.className);

  // Mapel Wali Kelas:
  // Kelas 1-2 : Bahasa Indonesia, PP, Matematika, Bahasa Sunda, Fikih, Seni
  // Kelas 3-6 : keenam mapel di atas + IPAS
  //
  // Database sekolah kadang menyimpan nama "PP" sebagai "Pendidikan Pancasila"
  // dan "Seni" sebagai "Seni Budaya". Karena itu pencocokan dilakukan dengan
  // alias, tetapi nama asli dari tabel subjects tetap yang ditampilkan.
  const waliKelasBaseSubjectNames = new Set([
    "Bahasa Indonesia",
    "PP",
    "Matematika",
    "Bahasa Sunda",
    "Fikih",
    "Seni",
  ]);

  const normalizeSubjectName = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

  const isWaliKelasSubject = (subjectName: string, className: string) => {
    const normalized = normalizeSubjectName(subjectName);
    const baseAliases = new Set([
      "bahasaindonesia",
      "pp",
      "pendidikanpancasila",
      "matematika",
      "bahasasunda",
      "fikih",
      "fiqih",
      "seni",
      "senibudaya",
    ]);
    const match = className.match(/(?:kelas\s*)?(\d+)/i);
    const level = match ? Number(match[1]) : 0;
    if (baseAliases.has(normalized)) return true;
    return level >= 3 && level <= 6 && normalized === "ipas";
  };

  const waliKelasSubjectNamesForClass = (className: string) => {
    const match = className.match(/(?:kelas\s*)?(\d+)/i);
    const level = match ? Number(match[1]) : 0;
    if (level >= 3 && level <= 6) {
      return new Set([...waliKelasBaseSubjectNames, "IPAS"]);
    }
    return waliKelasBaseSubjectNames;
  };

  // Daftar ini dipakai bersama oleh Nilai & Raport serta Absensi untuk semua Wali Kelas.

  const attendanceClassOptions =
    role === "Admin" || isGuruPiket
      ? syncedClassNames
      : Array.from(
          new Set([
            ...teacherAssignments.filter((item) => item.className).map((item) => item.className),
            ...waliAttendanceClassNames,
          ])
        );

  const scheduleClassOptions = syncedClassNames;

  const loadAttendanceData = async () => {
    const { data: subjectRows, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, nama, kode")
      .order("nama");

    if (subjectsError) {
      console.error("Gagal memuat mata pelajaran untuk absensi:", subjectsError);
    } else {
      setAttendanceSubjects(
        (subjectRows ?? []).map((subject) => ({
          id: subject.id,
          name: subject.nama,
          code: subject.kode,
        }))
      );
    }

    const { data: studentRows, error: studentsError } = await supabase
      .from("students")
      .select("id, nama, kelas, class_id, user_id, classes(id, nama)")
      .order("nama");

    if (studentsError) {
      console.error("Gagal memuat siswa untuk absensi:", studentsError);
      return;
    }

    const normalizedStudents: AttendanceStudent[] = (studentRows ?? [])
      .filter((student: any) => student.class_id)
      .map((student: any) => ({
        id: student.id,
        name: student.nama,
        class: student.classes?.nama ?? student.kelas ?? "",
        classId: student.class_id,
      }))
      .filter((student) => student.class);

    setAttendanceStudents(normalizedStudents);

    const { data: attendanceRows, error: attendanceError } = await supabase
      .from("attendance")
      .select("student_id, tanggal, status, subject_id");

    if (attendanceError) {
      console.error("Gagal memuat data absensi:", attendanceError);
      return;
    }

    const nextRecords: Record<string, AttendanceStatus> = {};

    for (const row of attendanceRows ?? []) {
      if (attendanceStatuses.includes(row.status as AttendanceStatus)) {
        if (row.subject_id) {
          nextRecords[`${row.tanggal}:${row.student_id}:${row.subject_id}`] = row.status as AttendanceStatus;
        }
      }
    }

    setAttendanceRecords(nextRecords);

    const classStudents = normalizedStudents.filter(
      (student) => student.class === attendanceClass
    );

    const nextStudentAttendance: Record<string, AttendanceStatus> = {};
    for (const student of classStudents) {
      const saved = attendanceSubjectId
        ? nextRecords[`${attendanceDate}:${student.id}:${attendanceSubjectId}`]
        : undefined;
      if (saved) nextStudentAttendance[student.id] = saved;
    }
    setStudentAttendance(nextStudentAttendance);
  };


  const emptyGradeDraft = (studentId: string): GradeDraft => ({
    studentId,
    nilaiNonTes: "",
    nilaiUtsPts: "",
    nilaiSas: "",
    nilaiAkhir: "",
    catatanTpTertinggi: "",
    catatanTpTerendah: "",
    deskripsiCapaian: "",
    sumatif: [{ materi: "", tujuanPembelajaran: "", nilai: "" }],
  });

  const loadGradeSetup = async (userRole: Role, assignmentSource = teacherAssignments, userId = currentUserId) => {
    setGradeLoading(true);
    setGradeError("");

    const { data: classRows, error: classError } = await supabase
      .from("classes")
      .select("id, nama, tingkat, tahun_ajaran, wali_guru_id")
      .order("tingkat", { ascending: true });

    if (classError) {
      setGradeError(`Gagal memuat kelas: ${classError.message}`);
      setGradeLoading(false);
      return;
    }

    const normalizedClasses = (classRows ?? []).map((item) => ({
      id: item.id,
      nama: item.nama,
      tingkat: item.tingkat,
      tahunAjaran: item.tahun_ajaran,
      waliGuruId: item.wali_guru_id ?? null,
    }));
    setGradeClasses(normalizedClasses);

    const { data: subjectRows, error: subjectError } = await supabase
      .from("subjects")
      .select("id, nama, kode")
      .order("nama");

    if (subjectError) {
      setGradeError(`Gagal memuat mata pelajaran: ${subjectError.message}`);
      setGradeLoading(false);
      return;
    }

    const allSubjects: GradeSubject[] = (subjectRows ?? []).map((item) => ({
      id: item.id,
      name: item.nama,
      code: item.kode,
    }));

    let nextClasses = normalizedClasses;
    let nextSubjects = allSubjects;

    if (userRole === "Siswa" && userId) {
      const { data: ownStudent, error: ownStudentError } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (ownStudentError) {
        setGradeError(`Gagal memuat data siswa: ${ownStudentError.message}`);
        setGradeLoading(false);
        return;
      }

      if (ownStudent?.class_id) {
        nextClasses = normalizedClasses.filter((item) => item.id === ownStudent.class_id);
      } else {
        nextClasses = [];
      }

      const { data: ownGradeSubjects, error: ownGradeSubjectsError } = await supabase
        .from("grades")
        .select("subject_id")
        .eq("student_id", ownStudent?.id ?? "00000000-0000-0000-0000-000000000000");

      if (ownGradeSubjectsError) {
        setGradeError(`Gagal memuat mata pelajaran siswa: ${ownGradeSubjectsError.message}`);
        setGradeLoading(false);
        return;
      }

      const ownSubjectIds = new Set((ownGradeSubjects ?? []).map((item) => item.subject_id));
      nextSubjects = allSubjects.filter((item) => ownSubjectIds.has(item.id));
    }

    if (userRole === "Orang Tua" && userId) {
      const { data: parentLinks, error: parentLinksError } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", userId);

      if (parentLinksError) {
        setGradeError(`Gagal memuat hubungan orang tua: ${parentLinksError.message}`);
        setGradeLoading(false);
        return;
      }

      const childIds = (parentLinks ?? []).map((item) => item.student_id).filter(Boolean);
      if (childIds.length === 0) {
        nextClasses = [];
        nextSubjects = [];
      } else {
        const { data: childRows, error: childError } = await supabase
          .from("students")
          .select("id, class_id")
          .in("id", childIds);

        if (childError) {
          setGradeError(`Gagal memuat data anak: ${childError.message}`);
          setGradeLoading(false);
          return;
        }

        const childClassIds = Array.from(new Set((childRows ?? []).map((item) => item.class_id).filter(Boolean)));
        nextClasses = normalizedClasses.filter((item) => childClassIds.includes(item.id));

        const { data: childGrades, error: childGradesError } = await supabase
          .from("grades")
          .select("subject_id")
          .in("student_id", childIds);

        if (childGradesError) {
          setGradeError(`Gagal memuat mata pelajaran anak: ${childGradesError.message}`);
          setGradeLoading(false);
          return;
        }

        const childSubjectIds = new Set((childGrades ?? []).map((item) => item.subject_id));
        nextSubjects = allSubjects.filter((item) => childSubjectIds.has(item.id));
      }
    }

    if (userRole === "Guru") {
      // Wali kelas tetap tidak otomatis menjadi guru semua mata pelajaran.
      // Input nilai hanya menampilkan kelas + mapel yang benar-benar ada
      // di teaching_assignments. Hak raport wali kelas tetap dipisahkan
      // melalui tab Raport.
      const ownAssignments = assignmentSource.filter(
        (item) => item.classId && item.subjectId
      );
      const allowedClassIds = Array.from(
        new Set(ownAssignments.map((assignment) => assignment.classId))
      );
      const allowedSubjectIds = Array.from(
        new Set(ownAssignments.map((assignment) => assignment.subjectId))
      );

      const waliClassIds = new Set(
        assignmentSource
          .filter((assignment) => assignment.isWaliKelas)
          .map((assignment) => assignment.classId)
      );

      // Kelas wali tetap muncul di halaman Nilai & Report, walaupun guru
      // tersebut belum mempunyai teaching_assignment untuk mata pelajaran.
      // Hak input nilai tetap dibatasi oleh teaching_assignments.
      nextClasses = normalizedClasses.filter(
        (item) => allowedClassIds.includes(item.id) || waliClassIds.has(item.id)
      );
      // Susun mapel berdasarkan SEMUA kelas yang boleh dipilih guru.
      // Ini penting karena pilihan kelas bisa lebih dari satu (contoh Indra:
      // Kelas 3 sebagai wali + Kelas 1 dan 2 sebagai guru PJOK).
      // Jangan memakai selectedGradeClassId di sini karena saat login nilainya
      // masih bisa kosong/stale.
      nextSubjects = allSubjects.filter((subject) =>
        nextClasses.some((classItem) => {
          const isWaliClass = waliClassIds.has(classItem.id);
          const isOwnTeaching = ownAssignments.some(
            (assignment) =>
              assignment.classId === classItem.id &&
              assignment.subjectId === subject.id
          );

          return isWaliClass
            ? isWaliKelasSubject(subject.name, classItem.nama) || isOwnTeaching
            : isOwnTeaching;
        })
      );

      const waliClass = normalizedClasses.find((item) =>
        waliClassIds.has(item.id) || (userId && item.waliGuruId === userId)
      );
      if (waliClass && nextClasses.some((item) => item.id === waliClass.id)) {
        setSelectedGradeClassId(waliClass.id);
        setSelectedReportClass(waliClass.nama);
      }
    }

    setGradeClasses(nextClasses);
    setGradeSubjects(nextSubjects);

    // Jangan menimpa fokus kelas wali yang sudah ditentukan di atas.
    const waliClassId = userRole === "Guru"
      ? assignmentSource.find((assignment) => assignment.isWaliKelas)?.classId
      : undefined;
    const firstClass =
      (waliClassId && nextClasses.find((item) => item.id === waliClassId)) ??
      nextClasses.find((item) => item.nama === selectedReportClass) ??
      nextClasses[0];

    if (firstClass) {
      setSelectedGradeClassId(firstClass.id);
      setSelectedReportClass(firstClass.nama);
    } else {
      setSelectedGradeClassId("");
      setSelectedReportClass("");
    }

    if (userRole === "Siswa" || userRole === "Orang Tua") {
      const firstSubject = nextSubjects[0];
      setSelectedGradeSubjectId(firstSubject?.id ?? "");
      if (firstClass && firstSubject) {
        await loadGradesForSelection(firstClass.id, firstSubject.id, userId, selectedSemester, userRole);
      } else {
        setGradeStudents([]);
        setGradeDrafts({});
      }
    }

    if (userRole === "Guru") {
      // Wali kelas tetap masuk ke Input Nilai karena wali kelas bisa
      // sekaligus mengajar beberapa mata pelajaran. Tab Raport tetap
      // tersedia melalui canViewReport.
      setGradeTab("input");
      setSelectedGradeSubjectId("");
      setGradeStudents([]);
      setGradeDrafts({});
    }

    setGradeLoading(false);
  };

  const loadGradesForSelection = async (
    classId = selectedGradeClassId,
    subjectId = selectedGradeSubjectId,
    userId = currentUserId,
    semester = selectedSemester,
    userRole: Role = role
  ) => {
    if (!classId || !subjectId) {
      setGradeStudents([]);
      setGradeDrafts({});
      return;
    }

    setGradeLoading(true);
    setGradeError("");

    let { data: studentRows, error: studentError } = await supabase
       .from("students")
      .select("id, nama, nis")
      .eq("class_id", classId)
      .eq("status", "aktif")
      .order("nama");

    // Siswa hanya boleh memuat record dirinya sendiri.
    // Ini juga diperkuat oleh RLS di Supabase.
    if (userRole === "Siswa") {
      if (!userId) {
        setGradeStudents([]);
        setGradeDrafts({});
        setGradeLoading(false);
        return;
      }
      studentRows = (await supabase
        .from("students")
        .select("id, nama, nis")
        .eq("class_id", classId)
        .eq("status", "aktif")
        .eq("user_id", userId)
        .order("nama")).data;
    }

    if (userRole === "Orang Tua") {
      if (!userId) {
        setGradeStudents([]);
        setGradeDrafts({});
        setGradeLoading(false);
        return;
      }
      const { data: parentLinks, error: parentLinksError } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", userId);

      if (parentLinksError) {
        setGradeError(`Gagal memuat anak: ${parentLinksError.message}`);
        setGradeLoading(false);
        return;
      }

      const childIds = (parentLinks ?? []).map((item) => item.student_id).filter(Boolean);
      studentRows = (await supabase
        .from("students")
        .select("id, nama, nis")
        .eq("class_id", classId)
        .eq("status", "aktif")
        .in("id", childIds)
        .order("nama")).data;
    }

    if (studentError) {
      setGradeError(`Gagal memuat siswa: ${studentError.message}`);
      setGradeLoading(false);
      return;
    }

    const normalizedStudents: GradeStudent[] = (studentRows ?? []).map((item) => ({
      id: item.id,
      name: item.nama,
      nis: item.nis,
    }));
    setGradeStudents(normalizedStudents);

    let gradeQuery = supabase
      .from("grades")
      .select("id, student_id, nilai_sas, nilai_uts_pts, nilai_non_tes, nilai_akhir, catatan_tp_tertinggi, catatan_tp_terendah, keterangan, deskripsi_capaian")
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("semester", Number(semester))
      .eq("tahun_ajaran", gradeClasses.find((item) => item.id === classId)?.tahunAjaran ?? "2026/2027");

    if (userRole === "Siswa" && userId) {
      const ownStudentId = normalizedStudents[0]?.id;
      if (!ownStudentId) {
        setGradeDrafts({});
        setGradeStudents([]);
        setGradeLoading(false);
        return;
      }
      gradeQuery = gradeQuery.eq("student_id", ownStudentId);
    }

    if (userRole === "Orang Tua") {
      const childIds = normalizedStudents.map((student) => student.id);
      if (childIds.length === 0) {
        setGradeDrafts({});
        setGradeStudents([]);
        setGradeLoading(false);
        return;
      }
      gradeQuery = gradeQuery.in("student_id", childIds);
    }

    const { data: gradeRows, error: gradeErrorResult } = await gradeQuery;

    if (gradeErrorResult) {
      setGradeError(`Gagal memuat nilai: ${gradeErrorResult.message}`);
      setGradeLoading(false);
      return;
    }

    const ids = (gradeRows ?? []).map((item) => item.id);
    let detailRows: any[] = [];

    if (ids.length > 0) {
      const { data, error } = await supabase
        .from("grade_sumatif_materi")
        .select("grade_id, materi, tujuan_pembelajaran, nilai, urutan")
        .in("grade_id", ids)
        .order("urutan", { ascending: true });

      if (error) {
        setGradeError(`Gagal memuat sumatif materi: ${error.message}`);
        setGradeLoading(false);
        return;
      }
      detailRows = data ?? [];
    }

    const nextDrafts: Record<string, GradeDraft> = {};

    for (const student of normalizedStudents) {
      const existing: any = (gradeRows ?? []).find((row) => row.student_id === student.id);
      const details = existing
        ? detailRows.filter((row) => row.grade_id === existing.id)
        : [];

      nextDrafts[student.id] = {
        id: existing?.id,
        studentId: student.id,
        nilaiNonTes: existing?.nilai_non_tes != null ? String(existing.nilai_non_tes) : "",
        nilaiUtsPts: existing?.nilai_uts_pts != null ? String(existing.nilai_uts_pts) : "",
        nilaiSas: existing?.nilai_sas != null ? String(existing.nilai_sas) : "",
        nilaiAkhir: existing?.nilai_akhir != null ? String(existing.nilai_akhir) : "",
        catatanTpTertinggi: existing?.catatan_tp_tertinggi ?? "",
        catatanTpTerendah: existing?.catatan_tp_terendah ?? "",
        deskripsiCapaian: existing?.deskripsi_capaian ?? "",
        sumatif: details.length > 0
          ? details.map((row) => ({
              materi: row.materi ?? "",
              tujuanPembelajaran: row.tujuan_pembelajaran ?? "",
              nilai: row.nilai != null ? String(row.nilai) : "",
            }))
          : [{ materi: "", tujuanPembelajaran: "", nilai: "" }],
      };
    }

    setGradeDrafts(nextDrafts);
    setGradeSaved(false);
    setGradeLoading(false);
  };

  const loadTahfidzSetoran = async (studentId: string, semesterValue = selectedSemester) => {
    setSelectedTahfidzStudentId(studentId);
    setTahfidzSetoranError("");
    if (!studentId) { setTahfidzSetoranRows([]); return; }
    const { data, error } = await supabase
      .from("tahfidz_setoran")
      .select("id, student_id, tanggal, nama_surat, status, nilai, predikat, catatan")
      .eq("student_id", studentId)
      .eq("semester", Number(semesterValue))
      .eq("tahun_ajaran", gradeClasses.find((item) => item.id === selectedGradeClassId)?.tahunAjaran ?? "2026/2027")
      .order("tanggal", { ascending: false });
    if (error) {
      setTahfidzSetoranRows([]);
      setTahfidzSetoranError(`Gagal memuat riwayat setoran Tahfidz: ${error.message}. Pastikan migrasi tabel tahfidz_setoran sudah dijalankan.`);
      return;
    }
    setTahfidzSetoranRows(data ?? []);
  };

  const saveTahfidzSetoran = async () => {
    if (!selectedTahfidzStudentId || !currentUserId) { alert("Pilih siswa terlebih dahulu."); return; }
    if (!tahfidzSetoranForm.tanggal || !tahfidzSetoranForm.namaSurat.trim()) { alert("Tanggal dan nama surat wajib diisi."); return; }
    const nilai = tahfidzSetoranForm.nilai === "" ? null : Number(tahfidzSetoranForm.nilai);
    if (nilai !== null && (!Number.isFinite(nilai) || nilai < 0 || nilai > 100)) { alert("Nilai harus berada pada rentang 0 sampai 100."); return; }
    const classRow = gradeClasses.find((item) => item.id === selectedGradeClassId);
    setTahfidzSetoranSaving(true);
    setTahfidzSetoranError("");
    const { error } = await supabase.from("tahfidz_setoran").insert({
      student_id: selectedTahfidzStudentId,
      class_id: selectedGradeClassId,
      teacher_id: currentUserId,
      tanggal: tahfidzSetoranForm.tanggal,
      nama_surat: tahfidzSetoranForm.namaSurat.trim(),
      status: tahfidzSetoranForm.status,
      nilai,
      predikat: tahfidzSetoranForm.predikat.trim() || null,
      catatan: tahfidzSetoranForm.catatan.trim() || null,
      semester: Number(selectedSemester),
      tahun_ajaran: classRow?.tahunAjaran ?? "2026/2027",
    });
    setTahfidzSetoranSaving(false);
    if (error) { setTahfidzSetoranError(`Setoran gagal disimpan: ${error.message}`); return; }
    setTahfidzSetoranForm({ tanggal: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }), namaSurat: "", status: "Tuntas", nilai: "", predikat: "", catatan: "" });
    await loadTahfidzSetoran(selectedTahfidzStudentId);
  };

  const deleteTahfidzSetoran = async (id: string) => {
    if (!canEditGrades || !window.confirm("Hapus catatan setoran hafalan ini?")) return;
    const { error } = await supabase.from("tahfidz_setoran").delete().eq("id", id);
    if (error) { setTahfidzSetoranError(`Setoran gagal dihapus: ${error.message}`); return; }
    await loadTahfidzSetoran(selectedTahfidzStudentId);
  };

  const updateGradeDraft = (studentId: string, patch: Partial<GradeDraft>) => {
    setGradeDrafts((current) => {
      const previous = current[studentId] ?? emptyGradeDraft(studentId);
      const next = { ...previous, ...patch };
      const shouldRecalculate = Object.prototype.hasOwnProperty.call(patch, "nilaiNonTes") || Object.prototype.hasOwnProperty.call(patch, "nilaiUtsPts") || Object.prototype.hasOwnProperty.call(patch, "nilaiSas");

      if (shouldRecalculate) {
        const calculated = hitungNilaiAkhir(next.nilaiNonTes, next.nilaiUtsPts, next.nilaiSas);
        next.nilaiAkhir = calculated == null ? "" : String(calculated);
      }

      return { ...current, [studentId]: next };
    });
    setGradeSaved(false);
  };

  const updateSumatifDraft = (
    studentId: string,
    index: number,
    patch: Partial<SumatifDraft>
  ) => {
    const current = gradeDrafts[studentId] ?? emptyGradeDraft(studentId);
    const sumatif = current.sumatif.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    );
    updateGradeDraft(studentId, { sumatif });
  };

  const addSumatifRow = (studentId: string) => {
    const current = gradeDrafts[studentId] ?? emptyGradeDraft(studentId);
    updateGradeDraft(studentId, {
      sumatif: [
        ...current.sumatif,
        { materi: "", tujuanPembelajaran: "", nilai: "" },
      ],
    });
  };

  const removeSumatifRow = (studentId: string, index: number) => {
    const current = gradeDrafts[studentId] ?? emptyGradeDraft(studentId);
    const sumatif = current.sumatif.filter((_, itemIndex) => itemIndex !== index);
    updateGradeDraft(studentId, {
      sumatif: sumatif.length > 0 ? sumatif : [{ materi: "", tujuanPembelajaran: "", nilai: "" }],
    });
  };

  const saveGrades = async () => {
    if (!currentUserId || !selectedGradeClassId || !selectedGradeSubjectId) {
      alert("Lengkapi kelas dan mata pelajaran terlebih dahulu.");
      return;
    }

    // Wali kelas tidak otomatis menjadi guru semua mata pelajaran.
    // Hanya teaching_assignments yang boleh dipakai untuk menyimpan nilai.
    if (role === "Guru") {
      const selectedSubjectRow = gradeSubjects.find((subject) => subject.id === selectedGradeSubjectId);
      const selectedClassName = gradeClasses.find((item) => item.id === selectedGradeClassId)?.nama ?? "";
      const waliKelasAllowed =
        isWaliKelas &&
        teacherAssignments.some((assignment) => assignment.isWaliKelas && assignment.classId === selectedGradeClassId) &&
        Boolean(
          selectedSubjectRow &&
          isWaliKelasSubject(
            selectedSubjectRow.name,
            gradeClasses.find((item) => item.id === selectedGradeClassId)?.nama ?? ""
          )
        );
      const ownTeachingOnSelectedClass = teacherAssignments.some(
        (assignment) =>
          assignment.classId === selectedGradeClassId &&
          assignment.subjectId === selectedGradeSubjectId &&
          Boolean(assignment.subjectId)
      );
      const allowed = teacherAssignments.some(
        (assignment) =>
          assignment.classId === selectedGradeClassId &&
          assignment.subjectId === selectedGradeSubjectId &&
          !assignment.isWaliKelas
      );

      if (!allowed && !waliKelasAllowed && !ownTeachingOnSelectedClass) {
        alert("Anda hanya dapat menginput nilai sesuai kelas wali atau penugasan mata pelajaran yang Anda ampu.");
        return;
      }
    }

    const selectedClassRow = gradeClasses.find((item) => item.id === selectedGradeClassId);
    const tahunAjaran = selectedClassRow?.tahunAjaran ?? "2026/2027";

    setGradeSaving(true);
    setGradeError("");

    const selectedSubjectForSave = gradeSubjects.find((subject) => subject.id === selectedGradeSubjectId);
    const isTahfidzSubjectForSave = normalizeReportSubjectName(selectedSubjectForSave?.name ?? "").includes("tahfidz");
    const studentsToSave = isTahfidzSubjectForSave ? gradeStudents.filter((student) => student.id === selectedTahfidzStudentId) : gradeStudents;
    if (isTahfidzSubjectForSave && studentsToSave.length === 0) { setGradeSaving(false); alert("Pilih siswa Tahfidz terlebih dahulu."); return; }

    for (const student of studentsToSave) {
      const draft = gradeDrafts[student.id] ?? emptyGradeDraft(student.id);
      const nilaiSas = draft.nilaiSas === "" ? null : Number(draft.nilaiSas);
      const nilaiUtsPts = draft.nilaiUtsPts === "" ? null : Number(draft.nilaiUtsPts);
      const nilaiNonTes = draft.nilaiNonTes === "" ? null : Number(draft.nilaiNonTes);
      const calculatedNilaiAkhir = hitungNilaiAkhir(nilaiNonTes, nilaiUtsPts, nilaiSas);
      const nilaiAkhir = calculatedNilaiAkhir ?? (draft.nilaiAkhir === "" ? null : Number(draft.nilaiAkhir));

      for (const value of [nilaiSas, nilaiUtsPts, nilaiNonTes, nilaiAkhir]) {
        if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
          setGradeSaving(false);
          alert(`Nilai ${student.name} harus berada di antara 0 sampai 100.`);
          return;
        }
      }

      let gradeId = draft.id;

      if (gradeId) {
        const { error } = await supabase
          .from("grades")
          .update({
            nilai_sas: nilaiSas,
            nilai_uts_pts: nilaiUtsPts,
            nilai_non_tes: nilaiNonTes,
            nilai_akhir: nilaiAkhir,
            catatan_tp_tertinggi: draft.catatanTpTertinggi || null,
            catatan_tp_terendah: draft.catatanTpTerendah || null,
            deskripsi_capaian: draft.deskripsiCapaian || null,
          })
          .eq("id", gradeId);

        if (error) {
          setGradeSaving(false);
          setGradeError(`Gagal menyimpan ${student.name}: ${error.message}`);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("grades")
          .insert({
            student_id: student.id,
            teacher_id: currentUserId,
            subject_id: selectedGradeSubjectId,
            class_id: selectedGradeClassId,
            nilai: nilaiAkhir ?? 0,
            nilai_sas: nilaiSas,
            nilai_uts_pts: nilaiUtsPts,
            nilai_non_tes: nilaiNonTes,
            nilai_akhir: nilaiAkhir,
            semester: Number(selectedSemester),
            tahun_ajaran: tahunAjaran,
            catatan_tp_tertinggi: draft.catatanTpTertinggi || null,
            catatan_tp_terendah: draft.catatanTpTerendah || null,
            deskripsi_capaian: draft.deskripsiCapaian || null,
          })
          .select("id")
          .single();

        if (error || !data) {
          setGradeSaving(false);
          setGradeError(`Gagal menyimpan ${student.name}: ${error?.message ?? "ID nilai tidak ditemukan"}`);
          return;
        }

        gradeId = data.id;
        setGradeDrafts((current) => ({
          ...current,
          [student.id]: { ...draft, id: data.id },
        }));
      }

      if (!gradeId) continue;

      if (!isTahfidzSubjectForSave) {
      const validDetails = draft.sumatif.filter(
        (item) => item.materi.trim() || item.tujuanPembelajaran.trim() || item.nilai !== ""
      );

      for (const item of validDetails) {
        const nilai = Number(item.nilai);
        if (!Number.isFinite(nilai) || nilai < 0 || nilai > 100 || !item.materi.trim()) {
          setGradeSaving(false);
          alert(`Detail Sumatif Materi untuk ${student.name} belum lengkap. Materi wajib diisi dan nilai 0-100.`);
          return;
        }
      }

      const { error: deleteDetailError } = await supabase
        .from("grade_sumatif_materi")
        .delete()
        .eq("grade_id", gradeId);

      if (deleteDetailError) {
        setGradeSaving(false);
        setGradeError(`Gagal memperbarui Sumatif Materi ${student.name}: ${deleteDetailError.message}`);
        return;
      }

      if (validDetails.length > 0) {
        const { error: detailInsertError } = await supabase
          .from("grade_sumatif_materi")
          .insert(
            validDetails.map((item, index) => ({
              grade_id: gradeId,
              materi: item.materi.trim(),
              tujuan_pembelajaran: item.tujuanPembelajaran.trim() || null,
              nilai: Number(item.nilai),
              urutan: index + 1,
            }))
          );

        if (detailInsertError) {
          setGradeSaving(false);
          setGradeError(`Gagal menyimpan Sumatif Materi ${student.name}: ${detailInsertError.message}`);
          return;
        }
      }
      }
    }

    setGradeSaving(false);
    setGradeSaved(true);
    await loadGradesForSelection();
  };

  const emptyReportDraft = (studentId: string): ReportCardDraft => ({
    studentId,
    sakit: "0",
    izin: "0",
    tanpaKeterangan: "0",
    catatanWaliKelas: "",
    kokurikuler: "",
    keteranganNaikKelas: "",
    keteranganLulus: "",
    tanggalRaport: "",
    namaWaliKelas: name,
    nipWaliKelas: "",
    namaOrangTua: "",
    namaKepalaSekolah: "",
    nipKepalaSekolah: "",
    status: "draft",
  });

  const loadReportStudents = async (classId = selectedGradeClassId) => {
    if (!classId || !canViewReport) return;
    setReportLoading(true);
    setReportError("");

    let data: any[] = [];
    let error: any = null;

    if (role === "Orang Tua" && currentUserId) {
      const { data: links, error: linksError } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", currentUserId);
      if (linksError) {
        setReportError(`Gagal memuat hubungan anak: ${linksError.message}`);
        setReportLoading(false);
        return;
      }
      const childIds = (links ?? []).map((item) => item.student_id).filter(Boolean);
      if (childIds.length > 0) {
        const result = await supabase
          .from("students")
          .select("id, nama, nis")
          .eq("class_id", classId)
          .eq("status", "aktif")
          .in("id", childIds)
          .order("nama");
        data = result.data ?? [];
        error = result.error;
      }
    } else {
      const result = await supabase
        .from("students")
        .select("id, nama, nis")
        .eq("class_id", classId)
        .eq("status", "aktif")
        .order("nama");
      data = result.data ?? [];
      error = result.error;
    }

    if (error) {
      setReportError(`Gagal memuat siswa raport: ${error.message}`);
      setReportLoading(false);
      return;
    }

    const nextStudents: GradeStudent[] = (data ?? []).map((item) => ({
      id: item.id,
      name: item.nama,
      nis: item.nis,
    }));
    setReportStudents(nextStudents);
    if (!nextStudents.some((item) => item.id === selectedReportStudentId)) {
      setSelectedReportStudentId(nextStudents[0]?.id ?? "");
    }
    setReportLoading(false);
  };

  const loadReportDraft = async (studentId: string) => {
    if (!studentId || !selectedGradeClassId) {
      setReportDraft(null);
      setReportGrades([]);
      setReportDescriptionLoading(false);
      setReportExtracurricular([{ nama: "Pramuka", predikat: "", keterangan: "" }, { nama: "Pencak Silat", predikat: "", keterangan: "" }]);
      return;
    }

    setReportLoading(true);
    setReportError("");

    const classRow = gradeClasses.find((item) => item.id === selectedGradeClassId);
    const tahunAjaran = classRow?.tahunAjaran ?? "2026/2027";

    const [reportResult, gradeResult] = await Promise.all([
      supabase
        .from("report_cards")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", selectedGradeClassId)
        .eq("semester", Number(selectedSemester))
        .eq("tahun_ajaran", tahunAjaran)
        .maybeSingle(),
      supabase
        .from("grades")
        .select("id, subject_id, nilai_non_tes, nilai_uts_pts, nilai_sas, nilai_akhir, deskripsi_capaian, catatan_tp_tertinggi, catatan_tp_terendah, subjects(nama)")
        .eq("student_id", studentId)
        .eq("class_id", selectedGradeClassId)
        .eq("semester", Number(selectedSemester))
        .eq("tahun_ajaran", tahunAjaran),
    ]);

    const { data, error } = reportResult;
    const { data: gradeRows, error: gradeError } = gradeResult;

    let extraRows: any[] = [];
    let extraError: any = null;
    if (data?.id) {
      const result = await supabase
        .from("report_card_extracurricular")
        .select("id, nama, predikat, keterangan")
        .eq("report_card_id", data.id)
        .order("created_at", { ascending: true });
      extraRows = result.data ?? [];
      extraError = result.error;
    }

    if (error) {
      setReportError(`Gagal memuat raport: ${error.message}`);
      setReportLoading(false);
      return;
    }
    if (gradeError) {
      setReportError(`Gagal memuat nilai raport: ${gradeError.message}`);
      setReportLoading(false);
      return;
    }
    if (extraError) {
      setReportError(`Gagal memuat ekstrakurikuler: ${extraError.message}`);
      setReportLoading(false);
      return;
    }

    const gradeIds = (gradeRows ?? []).map((row: any) => row.id).filter(Boolean);
    let sumatifRows: any[] = [];
    if (gradeIds.length > 0) {
      const sumatifResult = await supabase
        .from("grade_sumatif_materi")
        .select("grade_id, materi, tujuan_pembelajaran, nilai, urutan")
        .in("grade_id", gradeIds)
        .order("urutan", { ascending: true });
      if (sumatifResult.error) {
        setReportError(`Gagal memuat detail capaian: ${sumatifResult.error.message}`);
        setReportLoading(false);
        return;
      }
      sumatifRows = sumatifResult.data ?? [];
    }

    const buildCapaianDescription = (row: any, details: ReportSumatifDetail[]) => {
      if (row.deskripsi_capaian?.trim()) return row.deskripsi_capaian.trim();
      const validDetails = details.filter((item) => item.nilai != null);
      const nilaiAkhir = hitungNilaiAkhir(row.nilai_non_tes, row.nilai_uts_pts, row.nilai_sas) ?? (row.nilai_akhir == null ? null : Number(row.nilai_akhir));
      const predikat = getPredikatNilai(nilaiAkhir);
      if (validDetails.length === 0) {
        if (nilaiAkhir == null) return "Belum terdapat data capaian yang cukup untuk dideskripsikan.";
        const level = predikat === "A" ? "sangat baik" : predikat === "B" ? "baik" : predikat === "C" ? "cukup" : "perlu bimbingan lebih lanjut";
        return `Menunjukkan capaian ${level} pada mata pelajaran ini dengan nilai akhir ${nilaiAkhir}.`;
      }
      const sorted = [...validDetails].sort((a, b) => (b.nilai ?? 0) - (a.nilai ?? 0));
      const highest = sorted[0];
      const lowest = sorted[sorted.length - 1];
      const level = predikat === "A" ? "sangat baik" : predikat === "B" ? "baik" : predikat === "C" ? "cukup" : "yang masih perlu dikembangkan";
      const highestText = highest?.tujuanPembelajaran?.trim() || highest?.materi?.trim();
      const lowestText = lowest?.tujuanPembelajaran?.trim() || lowest?.materi?.trim();
      let text = `Menunjukkan capaian ${level}, terutama pada ${highestText || "materi yang dipelajari"} dengan nilai ${highest?.nilai ?? "-"}.`;
      if (lowest && highest && lowest !== highest && lowest?.nilai != null && lowest.nilai < 80 && lowestText) {
        text += ` Capaian pada ${lowestText} dengan nilai ${lowest.nilai} masih perlu dikembangkan melalui latihan dan pendampingan yang konsisten.`;
      } else {
        text += " Mampu mengikuti pembelajaran dan menerapkan kompetensi yang dipelajari dengan baik.";
      }
      return text;
    };

    setReportGrades((gradeRows ?? []).map((row: any) => {
      const details: ReportSumatifDetail[] = sumatifRows
        .filter((detail) => detail.grade_id === row.id)
        .map((detail) => ({
          materi: detail.materi ?? "",
          tujuanPembelajaran: detail.tujuan_pembelajaran ?? "",
          nilai: detail.nilai == null ? null : Number(detail.nilai),
        }));
      const nilaiAkhir = hitungNilaiAkhir(row.nilai_non_tes, row.nilai_uts_pts, row.nilai_sas) ?? (row.nilai_akhir == null ? null : Number(row.nilai_akhir));
      return {
        gradeId: row.id,
        subjectId: row.subject_id,
        subjectName: row.subjects?.nama ?? "Mata Pelajaran",
        nilaiNonTes: row.nilai_non_tes == null ? null : Number(row.nilai_non_tes),
        nilaiUtsPts: row.nilai_uts_pts == null ? null : Number(row.nilai_uts_pts),
        nilaiSas: row.nilai_sas == null ? null : Number(row.nilai_sas),
        nilaiAkhir,
        predikat: getPredikatNilai(nilaiAkhir),
        deskripsiCapaian: buildCapaianDescription(row, details),
        sumatif: details,
      };
    }));
    const savedPramuka = (extraRows ?? []).find((row: any) => normalizeReportSubjectName(row.nama ?? "") === "pramuka");
    const savedPencak = (extraRows ?? []).find((row: any) => isPencakSilatSubject(row.nama ?? ""));
    setReportExtracurricular([
      { id: savedPramuka?.id, nama: "Pramuka", predikat: "", keterangan: savedPramuka?.keterangan ?? "" },
      { id: savedPencak?.id, nama: "Pencak Silat", predikat: "", keterangan: savedPencak?.keterangan ?? "" },
    ]);

    if (!data) {
      setReportDraft(emptyReportDraft(studentId));
    } else {
      setReportDraft({
        id: data.id,
        studentId,
        sakit: String(data.sakit ?? 0),
        izin: String(data.izin ?? 0),
        tanpaKeterangan: String(data.tanpa_keterangan ?? 0),
        catatanWaliKelas: data.catatan_wali_kelas ?? "",
        kokurikuler: data.kokurikuler ?? "",
        keteranganNaikKelas: data.keterangan_naik_kelas ?? "",
        keteranganLulus: data.keterangan_lulus ?? "",
        tanggalRaport: data.tanggal_raport ?? "",
        namaWaliKelas: data.nama_wali_kelas ?? name,
        nipWaliKelas: data.nip_wali_kelas ?? "",
        namaOrangTua: data.nama_orang_tua ?? "",
        namaKepalaSekolah: data.nama_kepala_sekolah ?? "",
        nipKepalaSekolah: data.nip_kepala_sekolah ?? "",
        status: data.status === "final" ? "final" : "draft",
      });
    }

    setReportSaved(false);
    setReportLoading(false);
  };

  const loadReportAttendance = async () => {
    if (!reportDraft || !selectedGradeClassId) return;
    setReportAttendanceLoading(true);
    const { data, error } = await supabase
      .from("attendance")
      .select("tanggal, status")
      .eq("student_id", reportDraft.studentId)
      .eq("class_id", selectedGradeClassId);

    if (error) {
      setReportAttendanceLoading(false);
      setReportError(`Gagal mengambil rekap absensi: ${error.message}`);
      return;
    }

    const semester = Number(selectedSemester);
    const rows = (data ?? []).filter((row: any) => {
      const month = new Date(`${row.tanggal}T00:00:00`).getMonth() + 1;
      return semester === 1 ? month <= 6 : month >= 7;
    });

    const count = (status: string) => rows.filter((row: any) => row.status === status).length;
    updateReportDraft({
      sakit: String(count("Sakit")),
      izin: String(count("Izin")),
      tanpaKeterangan: String(count("Alpa")),
    });
    setReportAttendanceLoading(false);
  };

  const updateReportExtracurricular = (index: number, patch: Partial<ReportExtracurricular>) => {
    setReportExtracurricular((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    setReportSaved(false);
  };

  const updateReportDraft = (patch: Partial<ReportCardDraft>) => {
    setReportDraft((current) => current ? { ...current, ...patch } : current);
    setReportSaved(false);
  };

  const generateWaliKelasDraft = () => {
    if (!reportDraft) return;

    const student = reportStudents.find((item) => item.id === reportDraft.studentId);
    const validGrades = reportActiveGrades.filter((item) => item.nilaiAkhir != null);
    const average = validGrades.length > 0
      ? validGrades.reduce((total, item) => total + (item.nilaiAkhir ?? 0), 0) / validGrades.length
      : null;
    const sortedGrades = [...validGrades].sort((a, b) => (b.nilaiAkhir ?? 0) - (a.nilaiAkhir ?? 0));
    const highest = sortedGrades[0];
    const lowest = sortedGrades[sortedGrades.length - 1];
    const extracurricularNames = reportExtracurricular.map((item) => item.nama.trim()).filter(Boolean);
    const attendanceParts = [
      Number(reportDraft.sakit) > 0 ? `sakit ${reportDraft.sakit} hari` : null,
      Number(reportDraft.izin) > 0 ? `izin ${reportDraft.izin} hari` : null,
      Number(reportDraft.tanpaKeterangan) > 0 ? `tanpa keterangan ${reportDraft.tanpaKeterangan} hari` : null,
    ].filter(Boolean);

    let opening = "Berdasarkan rekap hasil belajar semester ini";
    if (average == null) {
      opening += ", data nilai belum cukup untuk membuat deskripsi capaian secara otomatis.";
    } else if (average >= 90) {
      opening += `, peserta didik menunjukkan hasil belajar yang sangat baik dengan rata-rata nilai akhir ${average.toFixed(1)}.`;
    } else if (average >= 80) {
      opening += `, peserta didik menunjukkan hasil belajar yang baik dengan rata-rata nilai akhir ${average.toFixed(1)}.`;
    } else if (average >= 70) {
      opening += `, peserta didik menunjukkan hasil belajar yang cukup baik dengan rata-rata nilai akhir ${average.toFixed(1)}.`;
    } else {
      opening += `, peserta didik perlu meningkatkan hasil belajar dengan rata-rata nilai akhir ${average.toFixed(1)}.`;
    }

    const sentences = [opening];
    if (highest?.subjectName) {
      sentences.push(`Capaian nilai tertinggi terdapat pada mata pelajaran ${highest.subjectName} dengan nilai ${highest.nilaiAkhir}.`);
    }
    if (lowest && highest && lowest.subjectId !== highest.subjectId) {
      sentences.push(`Perlu perhatian dan pendampingan lebih lanjut pada mata pelajaran ${lowest.subjectName} dengan nilai ${lowest.nilaiAkhir}.`);
    }
    if (attendanceParts.length > 0) {
      sentences.push(`Rekap ketidakhadiran tercatat ${attendanceParts.join(", ")}.`);
    } else {
      sentences.push("Rekap ketidakhadiran pada semester ini tidak menunjukkan adanya catatan sakit, izin, atau tanpa keterangan.");
    }
    if (extracurricularNames.length > 0) {
      sentences.push(`Kegiatan ekstrakurikuler yang tercatat: ${extracurricularNames.join(", ")}.`);
    }
    sentences.push("Tetap pertahankan capaian yang sudah baik dan tingkatkan konsistensi belajar pada aspek yang masih perlu dikembangkan.");

    updateReportDraft({ catatanWaliKelas: `${student?.name ?? "Peserta didik"}: ${sentences.join(" ")}` });
  };

  const updateReportGradeDescription = (gradeId: string, description: string) => {
    setReportGrades((current) => current.map((item) => item.gradeId === gradeId ? { ...item, deskripsiCapaian: description } : item));
    setReportSaved(false);
  };



  const getReportFileName = () => {
    const student = reportStudents.find((item) => item.id === reportDraft?.studentId);
    const safeName = (student?.name ?? "Siswa").replace(/[^a-zA-Z0-9\s_-]/g, "").trim().replace(/\s+/g, "_");
    return `Raport_${safeName}_Semester_${selectedSemester}.pdf`;
  };

  const printReport = (downloadPdf = false) => {
    if (!reportDraft) {
      alert("Buka raport siswa terlebih dahulu.");
      return;
    }

    const previousTitle = document.title;
    document.title = getReportFileName().replace(/\.pdf$/i, "");

    if (downloadPdf) {
      alert(
        `Dialog cetak akan dibuka.\n\nPilih printer “Save as PDF” / “Simpan sebagai PDF”, lalu klik Simpan.\nNama file yang disarankan: ${getReportFileName()}`
      );
    }

    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 1000);
  };

  const saveReport = async () => {
    if (!reportDraft || !selectedGradeClassId || !canEditReport) {
      alert("Raport hanya dapat dikelola Admin dan Wali Kelas.");
      return;
    }

    const classRow = gradeClasses.find((item) => item.id === selectedGradeClassId);
    const payload = {
      student_id: reportDraft.studentId,
      class_id: selectedGradeClassId,
      wali_kelas_id: isWaliKelas ? currentUserId : null,
      semester: Number(selectedSemester),
      tahun_ajaran: classRow?.tahunAjaran ?? "2026/2027",
      sakit: Math.max(0, Number(reportDraft.sakit) || 0),
      izin: Math.max(0, Number(reportDraft.izin) || 0),
      tanpa_keterangan: Math.max(0, Number(reportDraft.tanpaKeterangan) || 0),
      catatan_wali_kelas: reportDraft.catatanWaliKelas || null,
      kokurikuler: reportDraft.kokurikuler || null,
      keterangan_naik_kelas: reportDraft.keteranganNaikKelas || null,
      keterangan_lulus: reportDraft.keteranganLulus || null,
      tanggal_raport: reportDraft.tanggalRaport || null,
      nama_wali_kelas: reportDraft.namaWaliKelas || null,
      nip_wali_kelas: reportDraft.nipWaliKelas || null,
      nama_orang_tua: reportDraft.namaOrangTua || null,
      nama_kepala_sekolah: reportDraft.namaKepalaSekolah || null,
      nip_kepala_sekolah: reportDraft.nipKepalaSekolah || null,
      status: reportDraft.status,
    };

    setReportSaving(true);
    setReportError("");

    let error;
    let reportId = reportDraft.id;
    if (reportId) {
      ({ error } = await supabase.from("report_cards").update(payload).eq("id", reportId));
    } else {
      const result = await supabase.from("report_cards").insert(payload).select("id").single();
      error = result.error;
      reportId = result.data?.id;
      if (reportId) {
        setReportDraft((current) => current ? { ...current, id: reportId } : current);
      }
    }

    if (error || !reportId) {
      setReportSaving(false);
      setReportError(`Raport gagal disimpan: ${error?.message ?? "ID raport tidak ditemukan"}`);
      return;
    }

    const validExtra = reportExtracurricular
      .filter((item) => ["Pramuka", "Pencak Silat"].includes(item.nama) && item.keterangan.trim())
      .map((item) => ({ ...item, predikat: "" }));
    const { error: deleteExtraError } = await supabase
      .from("report_card_extracurricular")
      .delete()
      .eq("report_card_id", reportId);

    if (deleteExtraError) {
      setReportSaving(false);
      setReportError(`Gagal memperbarui ekstrakurikuler: ${deleteExtraError.message}`);
      return;
    }

    if (validExtra.length > 0) {
      const { error: insertExtraError } = await supabase
        .from("report_card_extracurricular")
        .insert(validExtra.map((item) => ({
          report_card_id: reportId,
          nama: item.nama.trim(),
          predikat: null,
          keterangan: item.keterangan || null,
        })));

      if (insertExtraError) {
        setReportSaving(false);
        setReportError(`Gagal menyimpan ekstrakurikuler: ${insertExtraError.message}`);
        return;
      }
    }

    setReportSaving(false);
    setReportSaved(true);
  };

  const loadSchoolDashboard = async (
    userRole: Role,
    assignments: { classId: string; className: string; subjectId: string; subjectName: string; subjectCode: string; isWaliKelas: boolean }[] = [],
    teacherProfileName: string = name,
  ) => {
    if (userRole !== "Admin" && userRole !== "Kepala Sekolah" && userRole !== "Guru") return;

    setDashboardLoading(true);
    setDashboardError("");
    try {
      const classIds = Array.from(new Set(assignments.map((item) => item.classId).filter(Boolean)));
      const studentQuery = userRole === "Guru" && classIds.length > 0
        ? supabase.from("students").select("id, class_id, status").in("class_id", classIds)
        : supabase.from("students").select("id, class_id, status");
      const classQuery = userRole === "Guru" && classIds.length > 0
        ? supabase.from("classes").select("id, nama").in("id", classIds)
        : supabase.from("classes").select("id, nama");

      const [studentResult, teacherResult, classResult] = await Promise.all([
        studentQuery,
        supabase.from("school_teachers").select("id", { count: "exact", head: true }),
        classQuery,
      ]);
      const errors = [studentResult.error, teacherResult.error, classResult.error].filter(Boolean);
      if (errors.length) setDashboardError(errors.map((error: any) => error.message).join(" | "));

      const activeStudents = (studentResult.data ?? []).filter((student: any) => {
        const status = String(student.status ?? "Aktif").trim().toLowerCase();
        return status === "aktif" || status === "active" || status === "";
      });
      const studentCount = activeStudents.length;
      const teacherCount = teacherResult.count ?? 0;
      const classRows = classResult.data ?? [];
      const classCount = classRows.length;
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date());

      // Absensi siswa dihitung per siswa unik, bukan per baris mata pelajaran.
      // Jika siswa memiliki beberapa catatan pada hari yang sama, catatan terakhir dipakai.
      const attendanceQuery = userRole === "Guru" && classIds.length > 0
        ? supabase.from("attendance").select("student_id, class_id, status, created_at").eq("tanggal", today).in("class_id", classIds).order("created_at", { ascending: false })
        : supabase.from("attendance").select("student_id, class_id, status, created_at").eq("tanggal", today).order("created_at", { ascending: false });
      const { data: attendanceRows, error: attendanceError } = await attendanceQuery;
      if (attendanceError) setDashboardError((current) => current ? `${current} | ${attendanceError.message}` : attendanceError.message);
      const activeStudentIds = new Set(activeStudents.map((student: any) => student.id));
      const latestAttendanceByStudent = new Map<string, any>();
      for (const row of attendanceRows ?? []) {
        if (row.student_id && activeStudentIds.has(row.student_id) && !latestAttendanceByStudent.has(row.student_id)) latestAttendanceByStudent.set(row.student_id, row);
      }
      const attendanceTotal = latestAttendanceByStudent.size;
      const attendancePresent = [...latestAttendanceByStudent.values()].filter((row: any) => String(row.status ?? "").toLowerCase() === "hadir").length;
      const attendancePercent = studentCount ? Math.round((attendancePresent / studentCount) * 100) : 0;

      let teacherMorningPercent = 0;
      let teacherMorningPresent = 0;
      let teacherMorningTotal = 0;
      let teacherMorningRows: { id: string; nama: string; status: string; jamMasuk: string | null; isPiket: boolean }[] = [];
      let classAttendancePercent = 0;
      let classAttendanceDone = 0;
      let classAttendanceExpected = 0;
      let classAttendanceTodayRows: { id: string; guru: string; kelas: string; mapel: string; status: string; isPiket: boolean }[] = [];
      let classProgressRows: { id: string; kelas: string; totalSiswa: number; tercatat: number; hadir: number; status: string }[] = [];
      let schoolEvents: { id: string; judul: string; deskripsi: string; kategori: string; tanggalMulai: string; tanggalSelesai: string | null; penting: boolean }[] = [];
      let teacherTodaySchedules: TeacherLesson[] = [];

      if (userRole === "Admin" || userRole === "Kepala Sekolah") {
        const monthStart = `${today.slice(0, 7)}-01`;
        const [profileRes, morningRes, assignmentRes, scheduleRes, classAttendanceRes, eventRes, studentHistoryRes] = await Promise.all([
          supabase.from("profiles").select("id, nama, role, is_guru_piket").eq("role", "guru"),
          supabase.from("teacher_attendance").select("guru_id, jam_masuk, status").eq("tanggal", today),
          supabase.from("teaching_assignments").select("guru_id, class_id, subject_id"),
          supabase.from("schedules").select("id, hari, class_id, subject_id, classes(nama), subjects(nama)"),
          supabase.from("attendance").select("created_by, class_id, subject_id, tanggal").gte("tanggal", monthStart).lte("tanggal", today),
          supabase.from("school_events").select("id, judul, deskripsi, kategori, tanggal_mulai, tanggal_selesai, penting, is_published").eq("is_published", true).order("tanggal_mulai", { ascending: true }).limit(120),
          supabase.from("attendance").select("student_id, class_id, status, created_at").eq("tanggal", today).order("created_at", { ascending: false }),
        ]);
        const guruProfiles = profileRes.data ?? [];
        const eventRows = eventRes.data ?? [];
        const isSchoolHoliday = (dateKey: string) => eventRows.some((event: any) =>
          String(event.kategori ?? "").toLowerCase().includes("libur")
          && event.tanggal_mulai <= dateKey
          && (!event.tanggal_selesai || event.tanggal_selesai >= dateKey)
        );
        const morningExpectedProfiles = isSchoolHoliday(today) ? [] : guruProfiles.filter((profile: any) => isTeacherScheduledOnDate(profile.nama, today));
        teacherMorningTotal = morningExpectedProfiles.length;
        const morningByProfile = new Map((morningRes.data ?? []).map((row: any) => [row.guru_id, row]));
        teacherMorningRows = morningExpectedProfiles.map((profile: any) => {
          const record: any = morningByProfile.get(profile.id);
          const rawStatus = String(record?.status ?? "").toLowerCase();
          const status = record?.jam_masuk ? "Hadir" : rawStatus === "izin" ? "Izin" : rawStatus === "sakit" ? "Sakit" : rawStatus === "alfa" ? "Alfa" : "Belum Absen";
          return { id: profile.id, nama: profile.nama ?? "Nama belum diatur", status, jamMasuk: record?.jam_masuk ?? null, isPiket: Boolean(profile.is_guru_piket) || String(profile.nama ?? "").toLowerCase().includes("azkiya") };
        }).sort((a, b) => a.status === "Belum Absen" ? -1 : b.status === "Belum Absen" ? 1 : a.nama.localeCompare(b.nama, "id"));
        teacherMorningPresent = teacherMorningRows.filter((row) => row.status === "Hadir").length;
        teacherMorningPercent = teacherMorningTotal ? Math.round((teacherMorningPresent / teacherMorningTotal) * 100) : 0;

        const profileById = new Map(guruProfiles.map((profile: any) => [profile.id, profile]));
        const schedules = scheduleRes.data ?? [];
        const assignmentsData = assignmentRes.data ?? [];
        const weekdayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const todayDay = weekdayNames[new Date(`${today}T12:00:00+07:00`).getDay()];
        const classNameById = new Map(classRows.map((item: any) => [item.id, item.nama]));
        const subjectNameByPair = new Map<string, string>();
        const scheduledDaysByPair = new Map<string, Set<string>>();
        for (const schedule of schedules as any[]) {
          const pair = `${schedule.class_id}|${schedule.subject_id}`;
          subjectNameByPair.set(pair, schedule.subjects?.nama ?? "Mata Pelajaran");
          if (!scheduledDaysByPair.has(pair)) scheduledDaysByPair.set(pair, new Set<string>());
          scheduledDaysByPair.get(pair)!.add(schedule.hari);
        }
        const expectedKeys = new Set<string>();
        const todayExpected = new Map<string, { id: string; guru: string; kelas: string; mapel: string; status: string; isPiket: boolean }>();
        const monthStartDate = new Date(`${monthStart}T12:00:00+07:00`);
        const todayDate = new Date(`${today}T12:00:00+07:00`);
        for (const assignment of assignmentsData as any[]) {
          const profile: any = profileById.get(assignment.guru_id);
          // Guru piket/pengganti tidak memiliki kewajiban rutin berdasarkan jadwal mapel.
          if (!profile || profile.is_guru_piket || String(profile.nama ?? "").toLowerCase().includes("azkiya")) continue;
          const pair = `${assignment.class_id}|${assignment.subject_id}`;
          const scheduledDays = scheduledDaysByPair.get(pair) ?? new Set<string>();
          for (let date = new Date(monthStartDate); date <= todayDate; date.setDate(date.getDate() + 1)) {
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const dayName = weekdayNames[date.getDay()];
            if (!scheduledDays.has(dayName) || isSchoolHoliday(dateKey)) continue;
            const key = `${assignment.guru_id}|${assignment.class_id}|${assignment.subject_id}|${dateKey}`;
            expectedKeys.add(key);
            if (dateKey === today) todayExpected.set(key, {
              id: key,
              guru: profile.nama ?? "Guru",
              kelas: classNameById.get(assignment.class_id) ?? "Kelas",
              mapel: subjectNameByPair.get(pair) ?? "Mata Pelajaran",
              status: "Belum Mengisi",
              isPiket: false,
            });
          }
        }
        const completedRows = classAttendanceRes.data ?? [];
        const completedKeys = new Set(completedRows.filter((row: any) => row.created_by && row.class_id && row.subject_id).map((row: any) => `${row.created_by}|${row.class_id}|${row.subject_id}|${row.tanggal}`));
        classAttendanceExpected = expectedKeys.size;
        classAttendanceDone = [...expectedKeys].filter((key) => completedKeys.has(key)).length;
        classAttendancePercent = classAttendanceExpected ? Math.round((classAttendanceDone / classAttendanceExpected) * 100) : 0;
        for (const [key, item] of todayExpected.entries()) if (completedKeys.has(key)) todayExpected.set(key, { ...item, status: "Sudah Mengisi" });

        // Aktivitas pengganti piket ditampilkan, tetapi tidak menambah denominator guru terjadwal.
        const profileByIdAll = new Map(guruProfiles.map((profile: any) => [profile.id, profile]));
        const todayAttendanceByTeacherClassSubject = new Set((completedRows as any[]).filter((row) => row.tanggal === today && row.created_by && row.class_id && row.subject_id).map((row) => `${row.created_by}|${row.class_id}|${row.subject_id}`));
        for (const row of todayAttendanceByTeacherClassSubject) {
          const [creatorId, classId, subjectId] = row.split("|");
          const profile: any = profileByIdAll.get(creatorId);
          if (!profile || !(profile.is_guru_piket || String(profile.nama ?? "").toLowerCase().includes("azkiya"))) continue;
          const pair = `${classId}|${subjectId}`;
          todayExpected.set(`piket|${row}`, {
            id: `piket|${row}`, guru: profile.nama ?? "Guru Piket",
            kelas: classNameById.get(classId) ?? "Kelas",
            mapel: subjectNameByPair.get(pair) ?? "Mata Pelajaran",
            status: "Pengganti — sudah mengisi", isPiket: true,
          });
        }
        classAttendanceTodayRows = [...todayExpected.values()].sort((a, b) => a.status === "Belum Mengisi" ? -1 : b.status === "Belum Mengisi" ? 1 : a.guru.localeCompare(b.guru, "id"));

        // Rekap cakupan absensi siswa per kelas, dengan satu catatan terbaru per siswa.
        const latestByStudent = new Map<string, any>();
        for (const row of studentHistoryRes.data ?? []) if (row.student_id && !latestByStudent.has(row.student_id)) latestByStudent.set(row.student_id, row);
        const studentsByClass = new Map<string, any[]>();
        for (const student of activeStudents as any[]) {
          if (!studentsByClass.has(student.class_id)) studentsByClass.set(student.class_id, []);
          studentsByClass.get(student.class_id)!.push(student);
        }
        classProgressRows = classRows.map((classRow: any) => {
          const classStudents = studentsByClass.get(classRow.id) ?? [];
          const classStudentIds = new Set(classStudents.map((student: any) => student.id));
          const records = [...latestByStudent.values()].filter((row: any) => row.class_id === classRow.id && classStudentIds.has(row.student_id));
          const recorded = records.length;
          const present = records.filter((row: any) => String(row.status ?? "").toLowerCase() === "hadir").length;
          const status = !recorded ? "Belum Mengisi" : recorded >= classStudents.length ? "Lengkap" : "Sebagian";
          return { id: classRow.id, kelas: classRow.nama ?? "Kelas", totalSiswa: classStudents.length, tercatat: recorded, hadir: present, status };
        }).sort((a: any, b: any) => String(a.kelas).localeCompare(String(b.kelas), "id"));

        schoolEvents = eventRows.map((event: any) => ({
          id: event.id, judul: event.judul, deskripsi: event.deskripsi ?? "", kategori: event.kategori ?? "Pengumuman",
          tanggalMulai: event.tanggal_mulai, tanggalSelesai: event.tanggal_selesai ?? null, penting: Boolean(event.penting),
        }));
        const extraErrors = [profileRes.error, morningRes.error, assignmentRes.error, scheduleRes.error, classAttendanceRes.error, studentHistoryRes.error].filter(Boolean);
        if (extraErrors.length) setDashboardError((current) => [current, ...extraErrors.map((error: any) => error.message)].filter(Boolean).join(" | "));
        // school_events dibuat melalui migrasi SQL terpisah; jika belum ada, dashboard inti tetap berjalan.
        if (eventRes.error && !String(eventRes.error.message ?? "").toLowerCase().includes("school_events")) {
          setDashboardError((current) => current ? `${current} | ${eventRes.error.message}` : eventRes.error.message);
        }
      }

      if (userRole === "Guru") {
        const weekdayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const todayDay = weekdayNames[new Date(`${today}T12:00:00+07:00`).getDay()];
        const validAssignments = assignments.filter((item) => item.classId && item.subjectId);
        const allowedPairs = new Set(validAssignments.map((item) => `${item.classId}|${item.subjectId}`));
        const [eventResult, scheduleResult, schoolTeacherResult] = await Promise.all([
          supabase.from("school_events").select("id, judul, deskripsi, kategori, tanggal_mulai, tanggal_selesai, penting, is_published").eq("is_published", true).order("tanggal_mulai", { ascending: true }).limit(100),
          // Jadwal menyimpan teacher_id ke school_teachers.id, bukan profiles.id.
          // Ambil jadwal hari ini tanpa membatasi class_id dari teaching_assignments,
          // karena tabel penugasan akun dan master jadwal memakai relasi guru berbeda.
          supabase.from("schedules").select("id, hari, jam_mulai, jam_selesai, ruang, class_id, subject_id, teacher_id, teacher_id_2, classes(nama), subjects(nama)").eq("hari", todayDay).order("jam_mulai", { ascending: true }),
          supabase.from("school_teachers").select("id, nama"),
        ]);
        if (eventResult.error) setDashboardError((current) => current ? `${current} | ${eventResult.error.message}` : eventResult.error.message);
        if (scheduleResult.error) setDashboardError((current) => current ? `${current} | ${scheduleResult.error.message}` : scheduleResult.error.message);
        if (schoolTeacherResult.error) setDashboardError((current) => current ? `${current} | ${schoolTeacherResult.error.message}` : schoolTeacherResult.error.message);
        schoolEvents = (eventResult.data ?? []).map((event: any) => ({
          id: event.id, judul: event.judul, deskripsi: event.deskripsi ?? "", kategori: event.kategori ?? "Pengumuman",
          tanggalMulai: event.tanggal_mulai, tanggalSelesai: event.tanggal_selesai ?? null, penting: Boolean(event.penting),
        }));
        // Cocokkan nama login dengan master school_teachers. Ini menjembatani
        // profiles.id (akun login) ke schedules.teacher_id / teacher_id_2.
        // Nama dinormalisasi agar gelar seperti S.Pd. atau Gr. tidak menghalangi.
        const normalizeTeacherName = (value: unknown) => String(value ?? "")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\b(s\.?\s?pd\.?\s?i?|s\.?\s?h\.?|m\.?\s?pd\.?|gr\.?|pd\.?\s?i?)\b/gi, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .trim()
          .replace(/\s+/g, " ");
        const loginNameKey = normalizeTeacherName(teacherProfileName);
        // Nama pada profiles dan school_teachers tidak selalu identik:
        // ada variasi gelar, tanda baca, serta typo ringan (mis. Fauziyah/Fauziah,
        // Yusup/Yusuf, atau Meilana/Meliana). Gunakan pencocokan bertingkat
        // dengan ambang dan pemeriksaan kandidat kedua agar tidak asal memasangkan.
        const nameSimilarity = (left: string, right: string) => {
          if (!left || !right) return 0;
          if (left === right) return 1;
          const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
          for (let i = 1; i <= left.length; i++) {
            let diagonal = previous[0];
            previous[0] = i;
            for (let j = 1; j <= right.length; j++) {
              const above = previous[j];
              const cost = left[i - 1] === right[j - 1] ? 0 : 1;
              previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + cost);
              diagonal = above;
            }
          }
          return 1 - previous[right.length] / Math.max(left.length, right.length);
        };
        const teacherNameCandidates = (schoolTeacherResult.data ?? [])
          .map((teacher: any) => ({ id: teacher.id as string, key: normalizeTeacherName(teacher.nama) }))
          .filter((teacher: any) => teacher.id && teacher.key);
        const exactTeacherMatches = teacherNameCandidates.filter((teacher: any) => teacher.key === loginNameKey);
        let matchedSchoolTeacherIds: string[] = exactTeacherMatches.map((teacher: any) => teacher.id);
        if (matchedSchoolTeacherIds.length === 0 && loginNameKey.length >= 6) {
          const rankedMatches = teacherNameCandidates
            .map((teacher: any) => ({ ...teacher, score: nameSimilarity(loginNameKey, teacher.key) }))
            .sort((a: any, b: any) => b.score - a.score);
          const best = rankedMatches[0];
          const second = rankedMatches[1];
          // Terima hanya kecocokan sangat kuat dan tidak ambigu.
          if (best && best.score >= 0.88 && (!second || best.score - second.score >= 0.04)) {
            matchedSchoolTeacherIds = [best.id];
          }
        }

        const allTodayScheduleRows = scheduleResult.data ?? [];
        const directlyAssignedRows = allTodayScheduleRows.filter((row: any) =>
          matchedSchoolTeacherIds.includes(row.teacher_id) || matchedSchoolTeacherIds.includes(row.teacher_id_2)
        );
        // teaching_assignments memakai profiles.id, sedangkan schedules memakai
        // school_teachers.id. Gabungkan kedua bukti, jangan memilih salah satu:
        // ini menjaga semua akun guru tetap mendapat jadwal meski sebagian jadwal
        // belum memiliki teacher_id yang terisi konsisten.
        const assignmentLinkedRows = allTodayScheduleRows.filter((row: any) =>
          allowedPairs.has(`${row.class_id}|${row.subject_id}`)
        );
        const scheduleRowsById = new Map<string, any>();
        for (const row of [...directlyAssignedRows, ...assignmentLinkedRows]) {
          scheduleRowsById.set(String(row.id), row);
        }
        const teacherScheduleRows = [...scheduleRowsById.values()];

        const groupedLessons = new Map<string, TeacherLesson>();
        for (const row of teacherScheduleRows) {
          const pair = `${row.class_id}|${row.subject_id}`;
          const classRelation = Array.isArray(row.classes) ? row.classes[0] : row.classes;
          const subjectRelation = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
          const existing: TeacherLesson = groupedLessons.get(pair) ?? {
            id: pair,
            classId: row.class_id,
            className: classRelation?.nama ?? validAssignments.find((item) => item.classId === row.class_id)?.className ?? "Kelas",
            subjectId: row.subject_id,
            subjectName: subjectRelation?.nama ?? validAssignments.find((item) => item.classId === row.class_id && item.subjectId === row.subject_id)?.subjectName ?? "Mata Pelajaran",
            room: row.ruang ?? "",
            sessions: [],
          };
          const slot = { start: String(row.jam_mulai ?? "").slice(0, 5), end: String(row.jam_selesai ?? "").slice(0, 5) };
          if (slot.start && slot.end && !existing.sessions.some((item) => item.start === slot.start && item.end === slot.end)) existing.sessions.push(slot);
          if (!existing.room && row.ruang) existing.room = row.ruang;
          groupedLessons.set(pair, existing);
        }
        teacherTodaySchedules = [...groupedLessons.values()]
          .map((lesson) => ({ ...lesson, sessions: [...lesson.sessions].sort((a, b) => a.start.localeCompare(b.start)) }))
          .sort((a, b) => (a.sessions[0]?.start ?? "").localeCompare(b.sessions[0]?.start ?? "") || a.className.localeCompare(b.className, "id"));
      }

      setDashboardSchoolStats({
        totalSiswa: studentCount, totalGuru: teacherCount, totalRombel: classCount,
        attendancePercent, attendancePresent, attendanceTotal, attendanceExpected: studentCount,
        teacherMorningPercent, teacherMorningPresent, teacherMorningTotal, teacherMorningRows,
        classAttendancePercent, classAttendanceDone, classAttendanceExpected, classAttendanceTodayRows, classProgressRows, schoolEvents, teacherTodaySchedules,
      });
    } finally {
      setDashboardLoading(false);
    }
  };

  const createSchoolAnnouncement = async (payload: { judul: string; deskripsi: string; kategori: string; tanggal_mulai: string; tanggal_selesai: string | null; penting: boolean }) => {
    if ((role !== "Admin" && role !== "Kepala Sekolah") || !currentUserId) throw new Error("Hanya Admin atau Kepala Sekolah yang dapat membuat pengumuman.");
    const { error } = await supabase.from("school_events").insert({ ...payload, is_published: true, created_by: currentUserId });
    if (error) throw error;
    await loadSchoolDashboard(role, teacherAssignments, name);
  };

  const loadAcademicCalendar = async () => {
    const { data, error } = await supabase.from("school_events")
      .select("id, judul, deskripsi, kategori, tanggal_mulai, tanggal_selesai, penting, is_published")
      .eq("is_published", true)
      .order("tanggal_mulai", { ascending: true });
    if (error) throw error;
    setDashboardSchoolStats((current) => ({
      ...current,
      schoolEvents: (data ?? []).map((event: any) => ({
        id: event.id, judul: event.judul, deskripsi: event.deskripsi ?? "", kategori: event.kategori ?? "Pengumuman",
        tanggalMulai: event.tanggal_mulai, tanggalSelesai: event.tanggal_selesai ?? null, penting: Boolean(event.penting),
      })),
    }));
  };

  const updateAcademicCalendarEvent = async (id: string, payload: { judul: string; deskripsi: string; kategori: string; tanggal_mulai: string; tanggal_selesai: string | null; penting: boolean }) => {
    if (role !== "Admin") throw new Error("Hanya Admin yang dapat mengubah agenda.");
    const { error } = await supabase.from("school_events").update(payload).eq("id", id);
    if (error) throw error;
    await loadAcademicCalendar();
  };

  const loadStudentParentDashboard = async (userRole: Role, userId: string) => {
    if (userRole !== "Siswa" && userRole !== "Orang Tua") return;

    setDashboardLoading(true);
    setDashboardError("");
    setDashboardLearning([]);
    setDashboardAverage(null);
    setDashboardAttendance(null);
    setDashboardChild(null);
    setDashboardOutstanding(null);

    let childIds: string[] = [];

    if (userRole === "Siswa") {
      const { data: ownStudent, error: ownStudentError } = await supabase
        .from("students")
        .select("id, nama, nis, kelas, class_id, classes(id, nama)")
        .eq("user_id", userId)
        .maybeSingle();

      if (ownStudentError || !ownStudent) {
        setDashboardError(ownStudentError?.message ?? "Data siswa belum ditemukan.");
        setDashboardLoading(false);
        return;
      }

      childIds = [ownStudent.id];
      setDashboardChild({
        id: ownStudent.id,
        nama: ownStudent.nama,
        nis: ownStudent.nis,
        kelas: (ownStudent as any).classes?.nama ?? ownStudent.kelas ?? "-",
      });
    } else {
      const { data: links, error: linksError } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", userId);

      if (linksError) {
        setDashboardError(linksError.message);
        setDashboardLoading(false);
        return;
      }

      childIds = (links ?? []).map((row) => row.student_id).filter(Boolean);

      if (childIds.length === 0) {
        setDashboardLoading(false);
        return;
      }

      const { data: childRows, error: childError } = await supabase
        .from("students")
        .select("id, nama, nis, kelas, class_id, classes(id, nama)")
        .in("id", childIds)
        .order("nama");

      if (childError || !childRows?.length) {
        setDashboardError(childError?.message ?? "Data anak belum ditemukan.");
        setDashboardLoading(false);
        return;
      }

      const child = childRows[0] as any;
      setDashboardChild({
        id: child.id,
        nama: child.nama,
        nis: child.nis,
        kelas: child.classes?.nama ?? child.kelas ?? "-",
      });
      childIds = [child.id];
    }

    const targetStudentId = childIds[0];
    if (!targetStudentId) {
      setDashboardLoading(false);
      return;
    }

    const { data: gradeRows, error: gradeError } = await supabase
      .from("grades")
      .select("student_id, subject_id, nilai_akhir, nilai, semester, tahun_ajaran, subjects(nama, kode)")
      .eq("student_id", targetStudentId)
      .eq("semester", Number(selectedSemester));

    if (gradeError) {
      setDashboardError(gradeError.message);
    } else {
      const latestBySubject = new Map<string, DashboardLearningItem>();
      for (const row of gradeRows ?? []) {
        const value = Number(row.nilai_akhir ?? row.nilai ?? 0);
        if (!row.subject_id || !Number.isFinite(value)) continue;
        latestBySubject.set(row.subject_id, {
          subject: (row as any).subjects?.nama ?? "Mapel",
          code: (row as any).subjects?.kode ?? "",
          nilai: value,
        });
      }
      const learning = Array.from(latestBySubject.values()).sort((a, b) => b.nilai - a.nilai);
      setDashboardLearning(learning);
      if (learning.length) {
        setDashboardAverage(Number((learning.reduce((sum, item) => sum + item.nilai, 0) / learning.length).toFixed(1)));
      }
    }

    const { data: attendanceRows, error: attendanceError } = await supabase
      .from("attendance")
      .select("status, tanggal")
      .eq("student_id", targetStudentId);

    if (!attendanceError) {
      const counts = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
      for (const row of attendanceRows ?? []) {
        if (row.status === "Hadir") counts.hadir += 1;
        if (row.status === "Izin") counts.izin += 1;
        if (row.status === "Sakit") counts.sakit += 1;
        if (row.status === "Alpa") counts.alpa += 1;
      }
      setDashboardAttendance(counts);
    }

    const { data: bills, error: billsError } = await supabase
      .from("student_bills")
      .select("id, nominal, status, student_payments(nominal)")
      .eq("student_id", targetStudentId)
      .neq("status", "Dibatalkan");

    if (!billsError) {
      const outstanding = (bills ?? []).reduce((sum, bill: any) => {
        const paid = (bill.student_payments ?? []).reduce((paymentSum: number, payment: any) => paymentSum + Number(payment.nominal ?? 0), 0);
        return sum + Math.max(0, Number(bill.nominal ?? 0) - paid);
      }, 0);
      setDashboardOutstanding(outstanding);
    }

    setDashboardLoading(false);
  };

  const login = async (selectedRole: "siswa" | "guru" | "admin") => {
    const loginInput = loginName.trim();
    const password = loginPassword;

    // Siswa: masukkan NIS/username tanpa @.
    // Akun lain: tetap masukkan email seperti biasa.
    const email = loginInput.includes("@")
      ? loginInput
      : `${loginInput.replace(/\./g, "")}@albarkah.sch.id`;

    if (!email || !password) {
      alert("Masukkan email/username dan password.");
      return;
    }

    setLoginLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      if (!data.user) {
        alert("Login gagal.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("nama, role, is_guru_piket")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        alert("Akun berhasil login, tetapi profil belum ditemukan.");
        return;
      }

      setName(profile.nama);
      setUserProfile((current) => ({
        ...current,
        nama: profile.nama ?? "",
        email: data.user.email ?? current.email,
      }));

      const roleMap: Record<string, Role> = {
        admin: "Admin",
        kepala_sekolah: "Kepala Sekolah",
        guru: "Guru",
        siswa: "Siswa",
        orang_tua: "Orang Tua",
      };

      const resolvedRole = roleMap[profile.role] ?? "Siswa";

      // Validasi jalur login berdasarkan tab yang dipilih di PortalLogin.
      // Jika tidak cocok, batalkan sesi agar akun tidak dapat masuk lewat peran lain.
      const allowedRolesByTab: Record<"siswa" | "guru" | "admin", Role[]> = {
        siswa: ["Siswa", "Orang Tua"],
        guru: ["Guru", "Kepala Sekolah"],
        admin: ["Admin"],
      };
      if (!allowedRolesByTab[selectedRole].includes(resolvedRole)) {
        await supabase.auth.signOut();
        const expectedRoleLabel =
          selectedRole === "admin" ? "Admin" :
          selectedRole === "guru" ? "Guru / Kepala Sekolah" :
          "Siswa / Orang Tua";
        setLoginFeedback({
          type: "denied",
          message: `Akun ini bukan ${expectedRoleLabel}. Silakan pilih tab login sesuai peran akun Anda.`,
        });
        window.setTimeout(() => setLoginFeedback(null), 3200);
        return;
      }

      setRole(resolvedRole);
      setIsGuruPiket(resolvedRole === "Guru" && profile.is_guru_piket === true);

      let loginAssignments: { subjectId: string; subjectName: string; subjectCode: string; classId: string; className: string; isWaliKelas: boolean }[] = [];

      if (resolvedRole === "Guru") {
        // Ambil tugas mengajar guru.
        const { data: assignments, error: assignmentsError } = await supabase
          .from("teaching_assignments")
          .select("subject_id, class_id, is_wali_kelas, subjects(id, nama, kode), classes(id, nama)")
          .eq("guru_id", data.user.id);

        if (assignmentsError) {
          console.error("Gagal memuat tugas mengajar guru:", assignmentsError);
        } else {
          loginAssignments = (assignments ?? []).map((assignment: any) => ({
            subjectId: assignment.subject_id ?? "",
            subjectName: assignment.subjects?.nama ?? "",
            subjectCode: assignment.subjects?.kode ?? "",
            classId: assignment.class_id,
            className: assignment.classes?.nama ?? "",
            isWaliKelas: Boolean(assignment.is_wali_kelas),
          }));
        }

        // Tambahkan assignment wali kelas dari tabel khusus wali_kelas_assignments.
        const { data: waliAssignments, error: waliAssignmentsError } = await supabase
          .from("wali_kelas_assignments")
          .select("class_id, tahun_ajaran, aktif, classes(id, nama)")
          .eq("guru_id", data.user.id)
          .eq("aktif", true);

        if (waliAssignmentsError) {
          console.error("Gagal memuat assignment wali kelas:", waliAssignmentsError);
        } else {
          for (const wali of waliAssignments ?? []) {
            // Supabase dapat mengembalikan relasi classes sebagai object atau array,
            // tergantung tipe relasi yang terdeteksi. Normalisasi agar aman di TypeScript.
            const waliClass = Array.isArray(wali.classes) ? wali.classes[0] : wali.classes;
            const waliClassName = waliClass?.nama ?? "";
            const existingIndex = loginAssignments.findIndex(
              (assignment) => assignment.classId === wali.class_id
            );

            if (existingIndex >= 0) {
              loginAssignments[existingIndex] = {
                ...loginAssignments[existingIndex],
                isWaliKelas: true,
                className: loginAssignments[existingIndex].className || waliClassName,
              };
            } else {
              loginAssignments.push({
                subjectId: "",
                subjectName: "",
                subjectCode: "",
                classId: wali.class_id,
                className: waliClassName,
                isWaliKelas: true,
              });
            }
          }
        }

        // Penugasan khusus guru yang juga merangkap wali kelas.
        // Ini menjadi fallback agar pilihan kelas/mapel tetap muncul walaupun
        // teaching_assignments belum lengkap di database. Jika assignment sudah
        // ada, tidak dibuat duplikat.
        const guruName = (profile.nama ?? "").toLowerCase();
        const waliClassNamesForSpecialRole = (waliAssignments ?? []).map((wali: any) => {
          const waliClass = Array.isArray(wali.classes) ? wali.classes[0] : wali.classes;
          return String(waliClass?.nama ?? "").toLowerCase();
        });
        const isIndra =
          guruName.includes("indra") ||
          waliClassNamesForSpecialRole.some((className) => /(?:kelas\s*)?3\b/i.test(className));
        const isDandi =
          guruName.includes("dandi") ||
          waliClassNamesForSpecialRole.some((className) => /4\s*ali/i.test(className));

        if (isIndra || isDandi) {
          const [{ data: specialClasses }, { data: specialSubjects }] = await Promise.all([
            supabase.from("classes").select("id, nama, tingkat").order("tingkat", { ascending: true }),
            supabase.from("subjects").select("id, nama, kode").order("nama", { ascending: true }),
          ]);

          const pjokSubject = (specialSubjects ?? []).find((subject: any) => {
            const subjectName = String(subject.nama ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
            return subjectName === "pjok" || subjectName === "olahraga" || subjectName.includes("pendidikanjasmani");
          });

          if (pjokSubject) {
            const targetClasses = (specialClasses ?? []).filter((classRow: any) => {
              const level = Number(classRow.tingkat ?? String(classRow.nama ?? "").match(/(?:kelas\s*)?(\d+)/i)?.[1] ?? 0);
              const className = String(classRow.nama ?? "").toLowerCase();

              // Indra: wali Kelas 3 + guru PJOK Kelas 1 dan 2.
              if (isIndra) return level === 1 || level === 2;

              // Dandi/Ali: wali Kelas 4 Ali + guru PJOK Kelas 4 Umar, 5, dan 6.
              // Kelas 4 Ali juga diberi PJOK agar peran guru mapelnya konsisten.
              if (isDandi) {
                return level === 5 || level === 6 || (level === 4 && /ali|umar/.test(className));
              }
              return false;
            });

            for (const classRow of targetClasses) {
              const exists = loginAssignments.some(
                (assignment) =>
                  assignment.classId === classRow.id &&
                  assignment.subjectId === pjokSubject.id
              );
              if (!exists) {
                loginAssignments.push({
                  subjectId: pjokSubject.id,
                  subjectName: pjokSubject.nama ?? "PJOK",
                  subjectCode: pjokSubject.kode ?? "PJOK",
                  classId: classRow.id,
                  className: classRow.nama ?? "",
                  isWaliKelas: false,
                });
              }
            }
          }
        }

        const waliKelasAktif = loginAssignments.some(
          (assignment) => assignment.isWaliKelas
        );

        setTeacherAssignments(loginAssignments);
        setIsWaliKelas(waliKelasAktif);

        if (loginAssignments.length > 0) {
          const firstAssignment =
            loginAssignments.find((assignment) => assignment.className) ?? loginAssignments[0];
          setAttendanceClass(firstAssignment.className);
          setAttendanceSubjectId(firstAssignment.subjectId ?? "");
        }
      } else {
        setTeacherAssignments([]);
        setIsWaliKelas(false);
        setAttendanceSubjectId("");
      }

      setCurrentUserId(data.user.id);
      await loadSchoolDashboard(resolvedRole, loginAssignments, profile.nama ?? "");
      await loadGradeSetup(resolvedRole, loginAssignments, data.user.id);
      await loadAttendanceData();
      await loadStudentParentDashboard(resolvedRole, data.user.id);

      setLoginFeedback({
        type: "success",
        message: `Selamat datang, ${profile.nama ?? "pengguna"}! Anda berhasil masuk sebagai ${resolvedRole}.`,
      });
      await new Promise((resolve) => window.setTimeout(resolve, 950));
      setLoggedIn(true);
      setActiveMenu("Dashboard");
      setSelectedSubject(null);
      setSelectedClass(null);
      setSelectedDay(null);

      // Tampilkan sambutan premium setelah akun berhasil masuk.
      setWelcomeName(profile.nama ?? "");
      setWelcomeRole(resolvedRole);
      setWelcomeVisible(true);
      window.setTimeout(() => setWelcomeVisible(false), 2600);
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();

    setLoggedIn(false);
    setName("");
    setRole("Admin");
    setLoginName("");
    setLoginPassword("");
    setActiveMenu("Dashboard");
    setSelectedSubject(null);
    setSelectedClass(null);
    setWelcomeVisible(false);
    setWelcomeName("");
    setSelectedDay(null);
    setIsWaliKelas(false);
    setIsGuruPiket(false);
    setCurrentUserId(null);
    setAttendanceStudents([]);
    setAttendanceSubjects([]);
    setTeacherAssignments([]);
    setTeacherAttendanceToday(null);
    setTeacherAttendanceMode("masuk");
    setTeacherLocationStatus("");
    setAttendanceSubjectId("");
    setAttendanceRecords({});
    setStudentAttendance({});
    setDashboardLearning([]);
    setDashboardAverage(null);
    setDashboardAttendance(null);
    setDashboardChild(null);
    setDashboardOutstanding(null);
    setDashboardError("");
  };

  const updateStudentAttendance = (studentId: string, status: AttendanceStatus) => {
    setStudentAttendance((current) => ({
      ...current,
      [studentId]: status,
    }));
    setAttendanceSaved(false);
  };

  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getCurrentTeacherLocation = (): Promise<{ latitude: number; longitude: number; accuracy: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Perangkat/browser tidak mendukung GPS."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
        (error) => reject(new Error(error.code === 1 ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk SIAKAD." : error.code === 2 ? "Lokasi tidak dapat ditemukan. Aktifkan GPS lalu coba lagi." : "Permintaan lokasi terlalu lama. Coba lagi di area terbuka.")),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    });

  const getApproximateAddress = async (latitude: number, longitude: number) => {
    try {
      // Koordinat dikirim ke layanan OpenStreetMap Nominatim untuk mencari alamat perkiraan.
      // Jangan biarkan layanan alamat yang lambat menahan proses absensi terlalu lama.
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 2500);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) return "Alamat tidak tersedia; koordinat tersimpan";
        const data = await response.json();
        return typeof data.display_name === "string" ? data.display_name : "Alamat tidak tersedia; koordinat tersimpan";
      } finally {
        window.clearTimeout(timeoutId);
      }
    } catch {
      return "Alamat tidak tersedia; koordinat tersimpan";
    }
  };

  const loadTeacherAttendanceToday = async () => {
    if (!currentUserId || !attendanceDate || !["Guru", "Admin", "Kepala Sekolah"].includes(role)) return;

    const { data, error } = await supabase
      .from("teacher_attendance")
      .select("id, tanggal, jam_masuk, selfie_masuk, jam_pulang, selfie_pulang, latitude_masuk, longitude_masuk, alamat_masuk, latitude_pulang, longitude_pulang, alamat_pulang, status")
      .eq("guru_id", currentUserId)
      .eq("tanggal", attendanceDate)
      .maybeSingle();

    if (error) {
      console.error("Gagal memuat absensi guru:", error);
      return;
    }

    setTeacherAttendanceToday(data);
    setTeacherAttendanceMode(data?.jam_masuk && !data?.jam_pulang ? "pulang" : "masuk");
  };

  useEffect(() => {
    if (loggedIn && ["Guru", "Admin", "Kepala Sekolah"].includes(role) && currentUserId && attendanceDate) {
      void loadTeacherAttendanceToday();
    }
  }, [loggedIn, role, currentUserId, attendanceDate]);


  // Pusat notifikasi berbasis database. Agenda penting dibuat pada hari H,
  // sedangkan pengingat absensi pagi dibuat untuk akun Guru setelah 06.30 WIB.
  useEffect(() => {
    if (!loggedIn || !currentUserId || !["Guru", "Admin", "Kepala Sekolah"].includes(role)) {
      setPortalNotifications([]);
      setNotificationToast(null);
      return;
    }

    let cancelled = false;
    let isChecking = false;

    const jakartaToday = () => new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const jakartaMinutesNow = () => {
      const value = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(new Date());
      const [hour, minute] = value.split(":").map(Number);
      return hour * 60 + minute;
    };

    const checkNotifications = async () => {
      if (cancelled || isChecking) return;
      isChecking = true;
      try {
        const today = jakartaToday();
        const nowIso = new Date().toISOString();
        const newlyCreated: PortalNotification[] = [];

        // Pengumuman penting hanya memunculkan notifikasi tepat pada tanggal mulai.
        const { data: events, error: eventsError } = await supabase
          .from("school_events")
          .select("id, judul, deskripsi, kategori, tanggal_mulai, penting, is_published")
          .eq("is_published", true)
          .eq("penting", true)
          .eq("tanggal_mulai", today);

        if (eventsError) {
          console.error("Gagal memeriksa agenda notifikasi:", eventsError.message);
        } else {
          for (const event of events ?? []) {
            const key = `school-event:${event.id}:${today}`;
            const { data: inserted, error: insertError } = await supabase
              .from("user_notifications")
              .upsert({
                user_id: currentUserId, notification_key: key,
                title: event.judul,
                message: event.deskripsi || `Agenda ${event.judul} berlangsung hari ini.`,
                category: event.kategori || "Agenda Sekolah",
                source_type: "school_event", source_id: event.id,
                created_at: nowIso,
              }, { onConflict: "user_id,notification_key", ignoreDuplicates: true })
              .select("id, title, message, category, created_at, read_at, resolved_at");
            if (insertError) console.error("Gagal menyimpan notifikasi agenda:", insertError.message);
            if (inserted?.length) newlyCreated.push(inserted[0] as PortalNotification);
          }
        }

        // Pengingat absensi pagi HANYA untuk akun Guru yang benar-benar memiliki
        // jadwal mengajar pada hari ini. Acuan jadwal adalah schedules.teacher_id
        // dan teacher_id_2 (school_teachers.id), bukan asumsi Senin-Jumat.
        if (role === "Guru") {
          const key = `teacher-morning-missing:${today}`;
          const weekdayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
          const todayDay = weekdayNames[new Date(`${today}T12:00:00+07:00`).getDay()];

          const [profileResult, schoolTeachersResult, todaySchedulesResult] = await Promise.all([
            supabase.from("profiles").select("nama").eq("id", currentUserId).maybeSingle(),
            supabase.from("school_teachers").select("id, nama"),
            supabase.from("schedules").select("teacher_id, teacher_id_2").eq("hari", todayDay),
          ]);

          const reminderDataError = profileResult.error || schoolTeachersResult.error || todaySchedulesResult.error;
          if (reminderDataError) {
            console.error("Gagal memeriksa jadwal guru untuk pengingat absensi pagi:", reminderDataError.message);
          } else {
            const normalizeName = (value: unknown) => String(value ?? "")
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/\b(s\.?\s?pd\.?\s?i?|s\.?\s?h\.?|m\.?\s?pd\.?|gr\.?|pd\.?\s?i?)\b/gi, " ")
              .replace(/[^a-z0-9]+/g, " ")
              .trim()
              .replace(/\s+/g, " ");
            const distanceScore = (left: string, right: string) => {
              if (!left || !right) return 0;
              if (left === right) return 1;
              const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
              for (let i = 1; i <= left.length; i++) {
                let diagonal = previous[0];
                previous[0] = i;
                for (let j = 1; j <= right.length; j++) {
                  const above = previous[j];
                  const cost = left[i - 1] === right[j - 1] ? 0 : 1;
                  previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + cost);
                  diagonal = above;
                }
              }
              return 1 - previous[right.length] / Math.max(left.length, right.length);
            };

            const profileName = normalizeName(profileResult.data?.nama || name);
            const teacherCandidates = (schoolTeachersResult.data ?? [])
              .map((teacher: any) => ({ id: String(teacher.id), key: normalizeName(teacher.nama) }))
              .filter((teacher: any) => teacher.id && teacher.key);
            const exactMatches = teacherCandidates.filter((teacher: any) => teacher.key === profileName);
            let matchedTeacherIds: string[] = exactMatches.length === 1 ? [exactMatches[0].id] : [];

            if (matchedTeacherIds.length === 0 && exactMatches.length === 0 && profileName.length >= 6) {
              const ranked = teacherCandidates
                .map((teacher: any) => ({ ...teacher, score: distanceScore(profileName, teacher.key) }))
                .sort((a: any, b: any) => b.score - a.score);
              const best = ranked[0];
              const second = ranked[1];
              if (best && best.score >= 0.88 && (!second || best.score - second.score >= 0.04)) {
                matchedTeacherIds = [best.id];
              }
            }

            const hasScheduleToday = matchedTeacherIds.length > 0 && (todaySchedulesResult.data ?? []).some((row: any) =>
              matchedTeacherIds.includes(String(row.teacher_id ?? "")) || matchedTeacherIds.includes(String(row.teacher_id_2 ?? ""))
            );

            // Akun tanpa jadwal hari ini (termasuk guru piket/pengganti) tidak
            // menerima pengingat rutin. Jika pengingat lama sudah sempat dibuat,
            // selesaikan agar tidak terus muncul sebagai notifikasi aktif.
            if (!hasScheduleToday || jakartaMinutesNow() < 6 * 60 + 30) {
              await supabase.from("user_notifications")
                .update({ resolved_at: nowIso, read_at: nowIso })
                .eq("user_id", currentUserId)
                .eq("notification_key", key)
                .is("resolved_at", null);
            } else {
              const { data: morningRecord, error: morningError } = await supabase
                .from("teacher_attendance")
                .select("id, jam_masuk, status")
                .eq("guru_id", currentUserId)
                .eq("tanggal", today)
                .maybeSingle();

              if (morningError) {
                console.error("Gagal memeriksa absensi pagi untuk notifikasi:", morningError.message);
              } else {
                const status = String(morningRecord?.status ?? "").toLowerCase();
                const alreadyAccounted = Boolean(morningRecord?.jam_masuk) || ["izin", "sakit", "alfa"].includes(status);
                if (alreadyAccounted) {
                  await supabase.from("user_notifications")
                    .update({ resolved_at: nowIso, read_at: nowIso })
                    .eq("user_id", currentUserId)
                    .eq("notification_key", key)
                    .is("resolved_at", null);
                } else {
                  const { data: inserted, error: insertError } = await supabase
                    .from("user_notifications")
                    .upsert({
                      user_id: currentUserId, notification_key: key,
                      title: "Anda belum melakukan absen kehadiran pagi",
                      message: "Anda memiliki jadwal mengajar hari ini dan belum melakukan absensi masuk setelah pukul 06.30 WIB. Silakan lakukan absensi pagi melalui menu Absensi.",
                      category: "Pengingat Absensi Pagi",
                      source_type: "teacher_attendance", source_id: null, created_at: nowIso,
                    }, { onConflict: "user_id,notification_key", ignoreDuplicates: true })
                    .select("id, title, message, category, created_at, read_at, resolved_at");
                  if (insertError) console.error("Gagal menyimpan pengingat absensi pagi:", insertError.message);
                  if (inserted?.length) newlyCreated.push(inserted[0] as PortalNotification);
                }
              }
            }
          }
        }

        const { data: rows, error: rowsError } = await supabase
          .from("user_notifications")
          .select("id, title, message, category, created_at, read_at, resolved_at")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (rowsError) {
          console.error("Gagal memuat riwayat notifikasi:", rowsError.message);
        } else if (!cancelled) {
          setPortalNotifications((rows ?? []) as PortalNotification[]);
        }

        if (!cancelled && newlyCreated.length > 0) {
          const nextToast = newlyCreated[0];
          setNotificationToast(nextToast);
          if (notificationToastTimerRef.current) window.clearTimeout(notificationToastTimerRef.current);
          notificationToastTimerRef.current = window.setTimeout(() => {
            setNotificationToast(null);
            notificationToastTimerRef.current = null;
          }, 7000);
        }
      } catch (error) {
        console.error("Pemeriksaan notifikasi gagal:", error);
      } finally {
        isChecking = false;
      }
    };

    void checkNotifications();
    const interval = window.setInterval(() => { void checkNotifications(); }, 30_000);
    const refreshOnFocus = () => { void checkNotifications(); };
    window.addEventListener("focus", refreshOnFocus);
    const channel = supabase
      .channel(`notification-refresh-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_attendance", filter: `guru_id=eq.${currentUserId}` }, () => { void checkNotifications(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "school_events" }, () => { void checkNotifications(); })
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      void supabase.removeChannel(channel);
      if (notificationToastTimerRef.current) window.clearTimeout(notificationToastTimerRef.current);
    };
  }, [loggedIn, currentUserId, role]);

  const markPortalNotificationsRead = async () => {
    if (!currentUserId) return;
    const unreadIds = portalNotifications.filter((item) => !item.read_at && !item.resolved_at).map((item) => item.id);
    if (unreadIds.length) {
      const readAt = new Date().toISOString();
      setPortalNotifications((current) => current.map((item) => unreadIds.includes(item.id) ? { ...item, read_at: readAt } : item));
      const { error } = await supabase.from("user_notifications")
        .update({ read_at: readAt })
        .eq("user_id", currentUserId)
        .is("read_at", null);
      if (error) console.error("Gagal menandai notifikasi sudah dibaca:", error.message);
    }
    if (notificationToastTimerRef.current) window.clearTimeout(notificationToastTimerRef.current);
    notificationToastTimerRef.current = null;
    setNotificationToast(null);
  };

        useEffect(() => {
    if (!loggedIn || !currentUserId) {
      setActivityRows([]);
      return;
    }

    let active = true;
    const loadActivities = async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, table_name, action, actor_id, actor_name, target_name, created_at")
        .order("created_at", { ascending: false })
        .limit(8);

      if (!active) return;
      if (error) {
        console.error("Gagal memuat aktivitas terbaru:", error.message);
        return;
      }
      setActivityRows((data ?? []) as typeof activityRows);
    };

    void loadActivities();
    const channel = supabase
      .channel("school-activity-feed")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "activity_logs",
      }, () => { void loadActivities(); })
      .subscribe();

    const refreshOnFocus = () => { void loadActivities(); };
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [loggedIn, currentUserId]);

  const exportTeacherAttendanceMonthlyPdf = async () => {
    if ((role !== "Admin" && role !== "Kepala Sekolah") || !currentUserId) {
      alert("Laporan PDF absensi pegawai hanya dapat diakses admin dan kepala sekolah.");
      return;
    }

    // Buka tab langsung dari klik tombol agar tidak dianggap popup otomatis.
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Tab PDF diblokir browser. Izinkan pop-up untuk situs portal sekolah, lalu coba lagi.");
      return;
    }
    printWindow.document.write("<!doctype html><html><head><meta charset='UTF-8'><title>Menyiapkan PDF</title></head><body style='font-family:Arial;padding:24px'>Menyiapkan laporan absensi harian...</body></html>");
    printWindow.document.close();

    try {
      const jakartaParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(new Date());
      const part = (type: string) => jakartaParts.find((item) => item.type === type)?.value ?? "";
      const currentJakartaDate = `${part("year")}-${part("month")}-${part("day")}`;
      const reportDate = selectedPdfAttendanceDate || currentJakartaDate;
      if (reportDate > currentJakartaDate) throw new Error("Tanggal laporan tidak boleh melewati hari ini.");
      const [year, month] = reportDate.split("-").map(Number);
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const reportDateLabel = new Date(`${reportDate}T12:00:00+07:00`).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });

      const [{ data: profiles, error: profileError }, { data: attendanceData, error: attendanceError }] = await Promise.all([
        supabase.from("profiles").select("id, nama, role").in("role", ["guru", "admin", "kepala_sekolah"]),
        supabase.from("teacher_attendance")
          .select("id, guru_id, tanggal, jam_masuk, jam_pulang, latitude_masuk, longitude_masuk, alamat_masuk, status")
          .gte("tanggal", monthStart).lte("tanggal", reportDate).order("tanggal", { ascending: true }),
      ]);
      if (profileError) throw profileError;
      if (attendanceError) throw attendanceError;

      const workDates: string[] = [];
      for (let d = new Date(`${monthStart}T12:00:00+07:00`); d <= new Date(`${reportDate}T12:00:00+07:00`); d.setDate(d.getDate() + 1)) {
        const weekday = d.getDay();
        if (weekday !== 0 && weekday !== 6) {
          workDates.push(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(d));
        }
      }

      const roleLabels: Record<string, string> = { guru: "Guru", admin: "Admin", kepala_sekolah: "Kepala Sekolah" };
      const esc = (value: unknown) => String(value ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const sortedProfiles = [...(profiles ?? [])].sort((a: any, b: any) => {
        const order: Record<string, number> = { kepala_sekolah: 0, admin: 1, guru: 2 };
  return (order[String(a.role).toLowerCase()] ?? 3) - (order[String(b.role).toLowerCase()] ?? 3) || String(a.nama ?? "").localeCompare(String(b.nama ?? ""), "id");
      });
      const rows = sortedProfiles.map((profile: any, index: number) => {
        const records = (attendanceData ?? []).filter((item: any) => item.guru_id === profile.id);
        const profileWorkDates = workDates.filter((date) => isTeacherScheduledOnDate(profile.nama, date));
        const profileRecords = records.filter((item: any) => profileWorkDates.includes(item.tanggal));
        const todayIsScheduled = isTeacherScheduledOnDate(profile.nama, reportDate);
        const todayRecord = todayIsScheduled ? records.find((item: any) => item.tanggal === reportDate) : undefined;
        const presentDates = new Set(profileRecords.filter((item: any) => (item.status ?? "hadir") === "hadir" && Boolean(item.jam_masuk)).map((item: any) => item.tanggal));
        const percentage = profileWorkDates.length ? Math.round((presentDates.size / profileWorkDates.length) * 100) : 0;
        let status = todayIsScheduled ? "Alfa" : "Tidak terjadwal";
        let statusClass = todayIsScheduled ? "absent" : "";
        const savedStatus = String(todayRecord?.status ?? "hadir").toLowerCase();
        if (!todayIsScheduled) { status = "Tidak terjadwal"; statusClass = ""; }
        else if (savedStatus === "izin") { status = "Izin"; statusClass = "absent"; }
        else if (savedStatus === "sakit") { status = "Sakit"; statusClass = "absent"; }
        else if (savedStatus === "alfa") { status = "Alfa"; statusClass = "absent"; }
        else if (todayRecord?.jam_masuk) {
          if (isTeacherOnTime(profile.nama, reportDate, todayRecord.jam_masuk)) { status = "Hadir · Tepat waktu"; statusClass = "ontime"; }
          else { status = "Hadir · Terlambat"; statusClass = "late"; }
        } else if (todayRecord) { status = "Hadir"; statusClass = "ontime"; }
        return `<tr><td class="center">${index + 1}</td><td>${esc(profile.nama ?? "Nama belum diatur")}</td><td>${esc(roleLabels[String(profile.role ?? "").toLowerCase()] ?? profile.role ?? "Pegawai")}</td><td class="center">${todayRecord?.jam_masuk ? esc(new Date(todayRecord.jam_masuk).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false })) : "—"}</td><td class="status ${statusClass}">${status}</td><td class="center">${todayRecord?.jam_pulang ? esc(new Date(todayRecord.jam_pulang).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false })) : "—"}</td><td class="center">${percentage}%</td><td>${todayRecord?.alamat_masuk || todayRecord?.latitude_masuk != null || todayRecord?.longitude_masuk != null ? "GPS tercatat" : "Belum ada data GPS"}</td></tr>`;
      }).join("");

      const title = `Laporan Absensi Harian Pegawai — ${reportDateLabel}`;
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${esc(title)}</title><style>
        @page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:10px}h1{font-size:19px;margin:0 0 5px}h2{font-size:13px;margin:0 0 5px}p{margin:3px 0 12px;color:#444;font-size:10px}.meta{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}.legend{font-size:9px;color:#444;margin-top:9px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cbd5e1;padding:6px 5px;text-align:left;overflow-wrap:anywhere}th{background:#e2e8f0;font-size:9px}td{font-size:9px}.center{text-align:center}.status{font-weight:bold;text-align:center}.ontime{color:#166534;background:#dcfce7}.late{color:#991b1b;background:#fee2e2}.absent{color:#475569;background:#f1f5f9}tr{break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body><h1>${esc(schoolSettings.namaSekolah || "SD Islam Al-Barkah")}</h1><h2>Rekap Absensi Pegawai Harian</h2><div class="meta"><p>Tanggal laporan: <b>${esc(reportDateLabel)}</b><br>Batas tepat waktu mengikuti ketentuan jadwal masing-masing guru</p><p>Persentase = hari hadir ÷ hari wajib sesuai jadwal masing-masing sampai tanggal laporan.</p></div><table><thead><tr><th style="width:4%">No.</th><th style="width:19%">Nama Pegawai</th><th style="width:13%">Jabatan</th><th style="width:9%">Jam Masuk</th><th style="width:17%">Hadir / Status</th><th style="width:9%">Jam Pulang</th><th style="width:8%">Persentase</th><th style="width:21%">Lokasi</th></tr></thead><tbody>${rows}</tbody></table><div class="legend">Hijau: hadir tepat waktu · Merah: hadir terlambat · Abu-abu: tidak hadir. Status yang sama berlaku untuk admin, kepala sekolah, dan guru.</div><script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250)};</script></body></html>`);
      printWindow.document.close();
    } catch (error) {
      printWindow.document.body.innerHTML = `<p style="font-family:Arial;color:#b91c1c;padding:24px">Gagal membuat laporan PDF: ${String(error instanceof Error ? error.message : "Terjadi kesalahan.")}</p>`;
      alert(`Gagal membuat laporan PDF: ${error instanceof Error ? error.message : "Terjadi kesalahan."}`);
    }
  };


  const exportTeacherAttendanceMonthlySummaryPdf = async () => {
    if ((role !== "Admin" && role !== "Kepala Sekolah") || !currentUserId) {
      alert("Laporan PDF absensi pegawai hanya dapat diakses admin dan kepala sekolah.");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Tab PDF diblokir browser. Izinkan pop-up untuk situs portal sekolah, lalu coba lagi.");
      return;
    }
    printWindow.document.write("<!doctype html><html><head><meta charset='UTF-8'><title>Menyiapkan PDF bulanan</title></head><body style='font-family:Arial;padding:24px'>Menyiapkan rekap absensi bulanan...</body></html>");
    printWindow.document.close();
    try {
      const jakartaParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const part = (type: string) => jakartaParts.find((item) => item.type === type)?.value ?? "";
      const today = `${part("year")}-${part("month")}-${part("day")}`;
      const [year, month] = (selectedPdfAttendanceMonth || today.slice(0, 7)).split("-").map(Number);
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const reportEndDate = monthStart.slice(0, 7) === today.slice(0, 7) ? today : (monthEnd > today ? today : monthEnd);
      const jakartaClockParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      const clockPart = (type: string) => jakartaClockParts.find((item) => item.type === type)?.value ?? "00";
      const jakartaMinutesNow = Number(clockPart("hour")) * 60 + Number(clockPart("minute"));
      if (monthStart > today) throw new Error("Pilih bulan yang tidak melewati bulan berjalan.");
      const monthLabel = new Date(`${monthStart}T12:00:00+07:00`).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", month: "long", year: "numeric" });
      const [{ data: profiles, error: profileError }, { data: attendanceData, error: attendanceError }] = await Promise.all([
        supabase.from("profiles").select("id, nama, role").in("role", ["guru", "admin", "kepala_sekolah"]),
        supabase.from("teacher_attendance").select("id, guru_id, tanggal, jam_masuk, jam_pulang, latitude_masuk, longitude_masuk, alamat_masuk, status").gte("tanggal", monthStart).lte("tanggal", reportEndDate).order("tanggal", { ascending: true }),
      ]);
      if (profileError) throw profileError;
      if (attendanceError) throw attendanceError;
      // Hari wajib satu bulan penuh untuk penyebut persentase.
      // Data hadir hanya dihitung sampai tanggal laporan; tanggal mendatang
      // tidak dimasukkan ke kolom alfa/belum tercatat.
      const fullMonthWorkDates: string[] = [];
      const elapsedWorkDates: string[] = [];
      for (let d = new Date(`${monthStart}T00:00:00Z`); d <= new Date(`${monthEnd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
        const weekday = d.getUTCDay();
        if (weekday !== 0 && weekday !== 6) {
          const date = d.toISOString().slice(0, 10);
          fullMonthWorkDates.push(date);
          // Hari sebelum hari ini sudah selesai. Hari ini baru masuk hitungan alfa
          // setelah batas absensi pegawai tersebut terlewati (WIB).
          if (date < today) elapsedWorkDates.push(date);
          else if (date === today) {
            // Jadwal khusus Niky Kamis 09.45; pegawai lain 06.30 WIB.
            // Nama pegawai dipetakan di bawah, sehingga keputusan hari ini
            // diterapkan per profil, bukan satu cutoff untuk semua orang.
          }
        }
      }
      const roleLabels: Record<string, string> = { guru: "Guru", admin: "Admin", kepala_sekolah: "Kepala Sekolah" };
      const esc = (value: unknown) => String(value ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const sortedProfiles = [...(profiles ?? [])].sort((a: any, b: any) => {
        const order: Record<string, number> = { kepala_sekolah: 0, admin: 1, guru: 2 };
        return (order[String(a.role).toLowerCase()] ?? 3) - (order[String(b.role).toLowerCase()] ?? 3) || String(a.nama ?? "").localeCompare(String(b.nama ?? ""), "id");
      });
      const rows = sortedProfiles.map((profile: any, index: number) => {
        // Gunakan satu aturan yang sama untuk PDF dan tampilan portal:
        // nama yang memiliki jadwal khusus (termasuk Sofian) mengikuti jadwal itu,
        // sedangkan nama tanpa jadwal khusus memakai Senin–Jumat.
        const profileFullMonthDates = fullMonthWorkDates.filter((date) => isTeacherScheduledOnDate(profile.nama, date));
        const profileElapsedDates = elapsedWorkDates.filter((date) => isTeacherScheduledOnDate(profile.nama, date));
        if (today >= monthStart && today <= monthEnd && isTeacherScheduledOnDate(profile.nama, today)) {
          const [cutoffHour, cutoffMinute] = getTeacherMorningCutoff(profile.nama, today).split(":").map(Number);
          if (jakartaMinutesNow >= cutoffHour * 60 + cutoffMinute) profileElapsedDates.push(today);
        }
        const records = (attendanceData ?? []).filter((item: any) => item.guru_id === profile.id && profileElapsedDates.includes(item.tanggal));
        const presentRecords = records.filter((item: any) => (item.status ?? "hadir") === "hadir" && Boolean(item.jam_masuk));
        const presentDates = new Set(presentRecords.map((item: any) => item.tanggal));
        const onTime = presentRecords.filter((item: any) => isTeacherOnTime(profile.nama, item.tanggal, item.jam_masuk)).length;
        const late = presentRecords.length - onTime;
        const izin = records.filter((item: any) => item.status === "izin").length;
        const sakit = records.filter((item: any) => item.status === "sakit").length;
        const alfa = records.filter((item: any) => item.status === "alfa" || (!item.status && !item.jam_masuk)).length;
        const unrecorded = Math.max(0, profileElapsedDates.length - presentDates.size - izin - sakit - alfa);
        const percentage = profileFullMonthDates.length ? Math.round((presentDates.size / profileFullMonthDates.length) * 100) : 0;
        return `<tr><td class="center">${index + 1}</td><td>${esc(profile.nama ?? "Nama belum diatur")}</td><td>${esc(roleLabels[String(profile.role ?? "").toLowerCase()] ?? profile.role ?? "Pegawai")}</td><td class="center">${presentDates.size}</td><td class="center">${profileFullMonthDates.length}</td><td class="center ontime">${onTime}</td><td class="center late">${late}</td><td class="center">${izin}</td><td class="center">${sakit}</td><td class="center absent">${alfa + unrecorded}</td><td class="center"><b>${percentage}%</b></td></tr>`;
      }).join("");

      // Halaman berikutnya memakai format laporan harian yang sudah ada,
      // dibuat satu halaman untuk setiap hari kerja dalam bulan terpilih.
      const dailyDates: string[] = [];
      for (let d = new Date(`${monthStart}T00:00:00Z`); d <= new Date(`${reportEndDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
        const weekday = d.getUTCDay();
        if (weekday >= 1 && weekday <= 5) dailyDates.push(d.toISOString().slice(0, 10));
      }
      const dailyPages = dailyDates.map((date) => {
        const dateLabel = new Date(`${date}T12:00:00+07:00`).toLocaleDateString("id-ID", {
          timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
        const dailyRows = sortedProfiles.map((profile: any, index: number) => {
          const scheduled = isTeacherScheduledOnDate(profile.nama, date);
          const record = scheduled ? (attendanceData ?? []).find((item: any) => item.guru_id === profile.id && item.tanggal === date) : undefined;
          const savedStatus = String(record?.status ?? "hadir").toLowerCase();
          let status = scheduled ? "Alfa" : "Tidak terjadwal";
          let statusClass = scheduled ? "absent" : "";
          if (!scheduled) { status = "Tidak terjadwal"; statusClass = ""; }
          else if (savedStatus === "izin") { status = "Izin"; statusClass = "absent"; }
          else if (savedStatus === "sakit") { status = "Sakit"; statusClass = "absent"; }
          else if (savedStatus === "alfa") { status = "Alfa"; statusClass = "absent"; }
          else if (record?.jam_masuk) {
            if (isTeacherOnTime(profile.nama, date, record.jam_masuk)) { status = "Hadir · Tepat waktu"; statusClass = "ontime"; }
            else { status = "Hadir · Terlambat"; statusClass = "late"; }
          } else if (record) { status = "Hadir"; statusClass = "ontime"; }
          const timeIn = record?.jam_masuk ? new Date(record.jam_masuk).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";
          const timeOut = record?.jam_pulang ? new Date(record.jam_pulang).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";
          const location = record?.alamat_masuk || record?.latitude_masuk != null || record?.longitude_masuk != null ? "GPS tercatat" : "Belum ada data GPS";
          return `<tr><td class="center">${index + 1}</td><td>${esc(profile.nama ?? "Nama belum diatur")}</td><td>${esc(roleLabels[String(profile.role ?? "").toLowerCase()] ?? profile.role ?? "Pegawai")}</td><td class="center">${esc(timeIn)}</td><td class="status ${statusClass}">${esc(status)}</td><td class="center">${esc(timeOut)}</td><td>${esc(location)}</td></tr>`;
        }).join("");
        return `<section class="daily-page"><h1>${esc(schoolSettings.namaSekolah || "SD Islam Al-Barkah")}</h1><h2>Rekap Absensi Pegawai Harian</h2><div class="meta"><p>Tanggal laporan: <b>${esc(dateLabel)}</b><br>Batas tepat waktu mengikuti ketentuan jadwal masing-masing guru</p></div><table><thead><tr><th style="width:4%">No.</th><th style="width:22%">Nama Pegawai</th><th style="width:14%">Jabatan</th><th style="width:10%">Jam Masuk</th><th style="width:18%">Hadir / Status</th><th style="width:10%">Jam Pulang</th><th style="width:22%">Lokasi</th></tr></thead><tbody>${dailyRows}</tbody></table><div class="legend">Hijau: hadir tepat waktu · Merah: hadir terlambat · Abu-abu: tidak hadir. Status yang sama berlaku untuk admin, kepala sekolah, dan guru.</div></section>`;
      }).join("");
      const title = `Rekap Absensi Pegawai Bulanan dan Harian — ${monthLabel}`;
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${esc(title)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:10px}h1{font-size:19px;margin:0 0 5px}h2{font-size:14px;margin:0 0 6px}p{margin:4px 0 12px;color:#444;font-size:10px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cbd5e1;padding:7px 6px;text-align:left;overflow-wrap:anywhere}th{background:#e2e8f0;font-size:10px}td{font-size:10px}.center{text-align:center}.ontime{color:#166534;background:#dcfce7}.late{color:#991b1b;background:#fee2e2}.absent{color:#475569;background:#f1f5f9}.note,.legend{margin-top:10px;font-size:9px;color:#475569}.monthly-signature{width:100%;margin-top:4px;text-align:right;padding-right:45px;font-size:10px;line-height:1.25;break-inside:avoid;page-break-inside:avoid}.signature-space{height:24px}.daily-page{break-before:page;page-break-before:always}.daily-page:first-of-type{break-before:page}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><h1>${esc(schoolSettings.namaSekolah || "SD Islam Al-Barkah")}</h1><h2>Rekap Absensi Pegawai Bulanan</h2><p>Bulan laporan: <b>${esc(monthLabel)}</b> · Total hari wajib dihitung untuk satu bulan penuh sesuai jadwal masing-masing pegawai. Kehadiran, izin, sakit, dan alfa dicatat sampai tanggal ${esc(new Date(`${reportEndDate}T12:00:00+07:00`).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }))}.</p><table><thead><tr><th style="width:4%">No.</th><th style="width:21%">Nama Pegawai</th><th style="width:15%">Jabatan</th><th style="width:9%">Hari Hadir</th><th style="width:9%">Hari Wajib</th><th style="width:10%">Tepat Waktu</th><th style="width:8%">Terlambat</th><th style="width:7%">Izin</th><th style="width:7%">Sakit</th><th style="width:10%">Alfa / Belum tercatat</th><th style="width:7%">Persentase</th></tr></thead><tbody>${rows}</tbody></table><div class="note">Hijau: tepat waktu sesuai batas masing-masing guru. Merah: terlambat setelah batas jadwal. Perhitungan hari kerja mengikuti jadwal masing-masing guru. Abu-abu: tidak hadir. Persentase = hari hadir ÷ total hari wajib satu bulan penuh sesuai jadwal. Tanggal setelah tanggal laporan belum dihitung sebagai alfa/belum tercatat. Rekap otomatis dihitung dari data absensi yang tersimpan.</div><div class="monthly-signature"><div>Bandung, 30 November 2026</div><div>Mengetahui,</div><div>Kepala Sekolah</div><div class="signature-space"></div><div><b>Sofian, S.Pd.I., M.Pd., Gr.</b></div><div>NIP. ____________________</div></div>${dailyPages}<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250)};</script></body></html>`);
      printWindow.document.close();
    } catch (error) {
      const message = String(error instanceof Error ? error.message : "Terjadi kesalahan.");
      printWindow.document.body.innerHTML = `<p style="font-family:Arial;color:#b91c1c;padding:24px">Gagal membuat laporan PDF: ${message.replace(/</g, "&lt;")}</p>`;
      alert(`Gagal membuat laporan PDF: ${message}`);
    }
  };

  const loadTeacherAttendanceReport = async () => {
    if (!currentUserId || (role !== "Admin" && role !== "Kepala Sekolah")) return;
    setTeacherAttendanceReportLoading(true);
    setTeacherAttendanceReportError("");
    try {
      const [{ data: profiles, error: profileError }, { data: attendanceData, error: attendanceError }] = await Promise.all([
        supabase.from("profiles").select("id, nama, role").in("role", ["guru", "admin", "kepala_sekolah"]),
        supabase
          .from("teacher_attendance")
          .select("id, guru_id, tanggal, jam_masuk, selfie_masuk, jam_pulang, selfie_pulang, latitude_masuk, longitude_masuk, alamat_masuk, latitude_pulang, longitude_pulang, alamat_pulang, status")
          .order("tanggal", { ascending: false }),
      ]);
      if (profileError) throw profileError;
      if (attendanceError) throw attendanceError;

      const jakartaToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      const jakartaClock = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
      const [clockHour, clockMinute] = jakartaClock.split(":").map(Number);
      const jakartaMinutesNow = clockHour * 60 + clockMinute;
      const [year, month] = jakartaToday.split("-").map(Number);
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const fullMonthDates: string[] = [];
      const elapsedDates: string[] = [];
      for (let day = 1; day <= lastDayOfMonth; day++) {
        const date = new Date(Date.UTC(year, month - 1, day));
        const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const weekday = date.getUTCDay();
        if (weekday !== 0 && weekday !== 6) {
          fullMonthDates.push(dateString);
          if (dateString < jakartaToday) elapsedDates.push(dateString);
        }
      }

      const rows = attendanceData ?? [];
      const roleLabels: Record<string, string> = {
        guru: "Guru",
        admin: "Admin",
        kepala_sekolah: "Kepala Sekolah",
      };
      const reportRows = (profiles ?? []).map((profile: any) => {
        const personRecords = rows.filter((item: any) => item.guru_id === profile.id && item.tanggal >= monthStart && item.tanggal <= jakartaToday);
        // Sinkron dengan PDF: jadwal khusus dicocokkan berdasarkan nama,
        // tanpa mengabaikan jadwal Sofian hanya karena jabatannya Kepala Sekolah.
        // Admin yang tidak punya jadwal khusus otomatis memakai Senin–Jumat.
        const scheduledFullMonth = fullMonthDates.filter((date) => isTeacherScheduledOnDate(profile.nama, date));
        const scheduledElapsed = elapsedDates.filter((date) => isTeacherScheduledOnDate(profile.nama, date));
        const todayIsScheduled = isTeacherScheduledOnDate(profile.nama, jakartaToday);
        const [cutoffHour, cutoffMinute] = getTeacherMorningCutoff(profile.nama, jakartaToday).split(":").map(Number);
        const todayCutoffPassed = jakartaMinutesNow >= cutoffHour * 60 + cutoffMinute;
        if (todayIsScheduled && todayCutoffPassed) scheduledElapsed.push(jakartaToday);
        const attendedDates = new Set(personRecords.filter((item: any) => (item.status ?? "hadir") === "hadir" && Boolean(item.jam_masuk) && scheduledElapsed.includes(item.tanggal)).map((item: any) => item.tanggal));
        const izinDays = personRecords.filter((item: any) => item.status === "izin" && scheduledElapsed.includes(item.tanggal)).length;
        const sakitDays = personRecords.filter((item: any) => item.status === "sakit" && scheduledElapsed.includes(item.tanggal)).length;
        // Alfa otomatis: hanya tanggal wajib yang sudah terlewati (atau hari ini
        // setelah cutoff), dan tidak memiliki absensi Hadir maupun status Izin/Sakit
        // dari Admin. Status alfa yang diinput Admin juga tetap dihitung.
        const alfaDays = scheduledElapsed.filter((date) => {
          const dayRecord = personRecords.find((item: any) => item.tanggal === date);
          if (!dayRecord) return true;
          const status = String(dayRecord.status ?? "").toLowerCase();
          if (status === "izin" || status === "sakit") return false;
          if (status === "hadir" && Boolean(dayRecord.jam_masuk)) return false;
          return status === "alfa" || !dayRecord.jam_masuk;
        }).length;
        const latestRecord = personRecords[0];
        const attendedWorkdays = attendedDates.size;
        const attendancePercentage = scheduledFullMonth.length ? Math.round((attendedWorkdays / scheduledFullMonth.length) * 100) : 0;
        return {
          id: String(profile.id),
          guru_id: String(profile.id),
          nama_guru: String(profile.nama ?? "Nama belum diatur"),
          role_label: roleLabels[String(profile.role ?? "").toLowerCase()] ?? String(profile.role ?? "Pegawai"),
          tanggal: String(latestRecord?.tanggal ?? jakartaToday),
          jam_masuk: latestRecord?.jam_masuk ?? null,
          selfie_masuk: latestRecord?.selfie_masuk ?? null,
          jam_pulang: latestRecord?.jam_pulang ?? null,
          selfie_pulang: latestRecord?.selfie_pulang ?? null,
          latitude_masuk: latestRecord?.latitude_masuk ?? null,
          longitude_masuk: latestRecord?.longitude_masuk ?? null,
          alamat_masuk: latestRecord?.alamat_masuk ?? null,
          latitude_pulang: latestRecord?.latitude_pulang ?? null,
          longitude_pulang: latestRecord?.longitude_pulang ?? null,
          alamat_pulang: latestRecord?.alamat_pulang ?? null,
          status: latestRecord?.status ?? "hadir",
          izinDays,
          sakitDays,
          alfaDays,
          attendancePercentage,
          attendedWorkdays,
          workdaysElapsed: scheduledFullMonth.length,
        };
      }).sort((a: any, b: any) => {
        const roleOrder: Record<string, number> = { "Kepala Sekolah": 0, Admin: 1, Guru: 2 };
        return (roleOrder[a.role_label] ?? 3) - (roleOrder[b.role_label] ?? 3) || a.nama_guru.localeCompare(b.nama_guru, "id");
      });
      setTeacherAttendanceRows(reportRows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat rekap absensi pegawai.";
      setTeacherAttendanceReportError(message);
    } finally {
      setTeacherAttendanceReportLoading(false);
    }
  };

  const saveTeacherAttendanceStatus = async () => {
    if (role !== "Admin") {
      alert("Hanya Admin yang dapat mencatat status Izin, Sakit, atau Alfa.");
      return;
    }
    if (!selectedTeacherStatusProfile || !selectedTeacherStatusDate) {
      alert("Pilih nama pegawai dan tanggal terlebih dahulu.");
      return;
    }
    setTeacherStatusSaving(true);
    try {
      const { error } = await supabase.from("teacher_attendance").upsert({
        guru_id: selectedTeacherStatusProfile,
        tanggal: selectedTeacherStatusDate,
        status: selectedTeacherStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: "guru_id,tanggal" });
      if (error) throw error;
      await loadTeacherAttendanceReport();
      alert(`Status ${selectedTeacherStatus.toUpperCase()} berhasil disimpan.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menyimpan status absensi.");
    } finally {
      setTeacherStatusSaving(false);
    }
  };

  useEffect(() => {
    if (loggedIn && currentUserId && (role === "Admin" || role === "Kepala Sekolah")) {
      void loadTeacherAttendanceReport();
    }
  }, [loggedIn, currentUserId, role]);

  const loadOwnEmployeeQr = async () => {
    if (!currentUserId || !["Guru", "Admin", "Kepala Sekolah"].includes(role)) return;
    setOwnEmployeeQrLoading(true);
    setOwnEmployeeQrError("");
    try {
      const { data, error } = await supabase
        .from("teacher_attendance_qr")
        .select("qr_token, is_active")
        .eq("profile_id", currentUserId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setOwnEmployeeQr(null);
        setOwnEmployeeQrError("QR pribadi belum dibuat. Minta admin membuka menu Kelola QR Pegawai satu kali untuk membuat QR semua pegawai.");
        return;
      }
      if (!data.is_active) {
        setOwnEmployeeQr(data);
        setOwnEmployeeQrError("QR pribadi sedang dinonaktifkan. Hubungi admin sekolah.");
        return;
      }
      setOwnEmployeeQr(data);
    } catch (error) {
      setOwnEmployeeQrError(error instanceof Error ? error.message : "QR pribadi belum dapat dimuat.");
    } finally {
      setOwnEmployeeQrLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn && currentUserId && ["Guru", "Admin", "Kepala Sekolah"].includes(role)) {
      void loadOwnEmployeeQr();
    } else {
      setOwnEmployeeQr(null);
    }
  }, [loggedIn, currentUserId, role]);

  const loadEmployeeQrRows = async () => {
    if (role !== "Admin") return;
    setEmployeeQrLoading(true);
    setEmployeeQrError("");
    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles").select("id, nama, role, foto_url")
        .in("role", ["admin", "kepala_sekolah", "guru"]).order("nama");
      if (profileError) throw profileError;
      const { data: qrRows, error: qrError } = await supabase
        .from("teacher_attendance_qr").select("profile_id, qr_token, is_active");
      if (qrError) throw qrError;
      const qrByProfile = new Map((qrRows || []).map((row: any) => [row.profile_id, row]));
      const missing = (profiles || []).filter((profile: any) => !qrByProfile.has(profile.id));
      if (missing.length) {
        const { error: createError } = await supabase.from("teacher_attendance_qr")
          .insert(missing.map((profile: any) => ({ profile_id: profile.id })));
        if (createError) throw createError;
        const { data: refreshed, error: refreshError } = await supabase
          .from("teacher_attendance_qr").select("profile_id, qr_token, is_active");
        if (refreshError) throw refreshError;
        (refreshed || []).forEach((row: any) => qrByProfile.set(row.profile_id, row));
      }
      setEmployeeQrRows((profiles || []).map((profile: any) => {
        const qr: any = qrByProfile.get(profile.id);
        return { profile_id: profile.id, nama: profile.nama, role: profile.role, foto_url: profile.foto_url, qr_token: qr?.qr_token || "", is_active: qr?.is_active ?? true };
      }).filter((row: any) => row.qr_token));
    } catch (error) {
      setEmployeeQrError(error instanceof Error ? error.message : "Gagal memuat QR pegawai.");
    } finally {
      setEmployeeQrLoading(false);
    }
  };

  const handleEmployeeQrScan = async (token: string) => {
    if (role !== "Admin") return;
    setEmployeeQrError("");
    const { data: qr, error } = await supabase.from("teacher_attendance_qr")
      .select("profile_id, qr_token, is_active").eq("qr_token", token).eq("is_active", true).maybeSingle();
    if (error || !qr) {
      setScannedEmployee(null);
      setEmployeeQrError("QR tidak ditemukan atau sudah dinonaktifkan.");
      return;
    }
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("id, nama, role, foto_url").eq("id", qr.profile_id).maybeSingle();
    if (profileError || !profile || !["admin", "kepala_sekolah", "guru"].includes(profile.role)) {
      setScannedEmployee(null);
      setEmployeeQrError("Profil pegawai untuk QR ini tidak ditemukan.");
      return;
    }
    setScannedEmployee({ profile_id: profile.id, qr_token: qr.qr_token, nama: profile.nama, role: profile.role, foto_url: profile.foto_url });
    setEmployeeQrError("");
  };

  const recordScannedEmployeeAttendance = async () => {
    if (role !== "Admin" || !scannedEmployee) return;
    const now = new Date();
    const jakartaToday = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    if (!isTeacherScheduledOnDate(scannedEmployee.nama, jakartaToday)) {
      setEmployeeQrError(`${scannedEmployee.nama} tidak memiliki jadwal mengajar/kehadiran pada hari ini.`);
      return;
    }
    setQrAttendanceBusy(true);
    setEmployeeQrError("");
    try {
      const { data: existing, error: existingError } = await supabase.from("teacher_attendance")
        .select("id, jam_masuk, jam_pulang").eq("guru_id", scannedEmployee.profile_id).eq("tanggal", jakartaToday).maybeSingle();
      if (existingError) throw existingError;
      if (qrAttendanceMode === "masuk" && existing?.jam_masuk) throw new Error("Pegawai ini sudah tercatat absen masuk hari ini.");
      if (qrAttendanceMode === "pulang" && !existing?.jam_masuk) throw new Error("Pegawai harus absen masuk terlebih dahulu.");
      if (qrAttendanceMode === "pulang" && existing?.jam_pulang) throw new Error("Pegawai ini sudah tercatat absen pulang hari ini.");
      let latitude: number | null = null;
      let longitude: number | null = null;
      let address = "GPS dinonaktifkan sementara untuk uji coba";
      if (!ATTENDANCE_GPS_TEST_MODE) {
        if (!navigator.geolocation) throw new Error("Perangkat ini tidak mendukung GPS.");
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        if (accuracy > 100) throw new Error(`Akurasi GPS kurang baik (${Math.round(accuracy)} m). Coba aktifkan lokasi presisi.`);
        const distance = getDistanceMeters(latitude, longitude, SCHOOL_LOCATION.latitude, SCHOOL_LOCATION.longitude);
        if (distance > SCHOOL_LOCATION.radiusMeters) throw new Error(`Lokasi sekitar ${Math.round(distance)} m dari titik uji sekolah, melebihi batas ${SCHOOL_LOCATION.radiusMeters} m.`);
        address = await getApproximateAddress(latitude, longitude);
      }
      const timestamp = new Date().toISOString();
      const timeLabel = new Date(timestamp).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
      const isLate = !isTeacherOnTime(scannedEmployee.nama, jakartaToday, timestamp);
      const statusLabel = qrAttendanceMode === "masuk" ? (isLate ? "Terlambat" : "Tepat waktu") : "Absen pulang";
      if (qrAttendanceMode === "masuk") {
        const payload = { guru_id: scannedEmployee.profile_id, tanggal: jakartaToday, jam_masuk: timestamp, ...(ATTENDANCE_GPS_TEST_MODE ? {} : { latitude_masuk: latitude, longitude_masuk: longitude, alamat_masuk: address }), keterangan: statusLabel };
        const { error: saveError } = await supabase.from("teacher_attendance").insert(payload);
        if (saveError) throw saveError;
      } else {
        const { error: saveError } = await supabase.from("teacher_attendance").update({ jam_pulang: timestamp, updated_at: timestamp, ...(ATTENDANCE_GPS_TEST_MODE ? {} : { latitude_pulang: latitude, longitude_pulang: longitude, alamat_pulang: address }) }).eq("id", existing?.id).is("jam_pulang", null);
        if (saveError) throw saveError;
      }
      setQrAttendanceResult({ profile_id: scannedEmployee.profile_id, qr_token: scannedEmployee.qr_token, nama: scannedEmployee.nama, role: scannedEmployee.role, foto_url: scannedEmployee.foto_url, mode: qrAttendanceMode, time: timeLabel, date: new Date(timestamp).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" }), address, latitude, longitude, status: statusLabel });
      alert(`Absensi ${qrAttendanceMode} ${scannedEmployee.nama} berhasil disimpan.`);
      setScannedEmployee(null);
    } catch (error) {
      setEmployeeQrError(error instanceof Error ? error.message : "Absensi QR gagal disimpan.");
    } finally {
      setQrAttendanceBusy(false);
    }
  };

  const handleOwnAttendanceQrScan = async (token: string) => {
    if (!ownEmployeeQr?.is_active || !ownEmployeeQr.qr_token) {
      setOwnQrScannerMessage("QR pribadi belum tersedia. Minta admin membuat QR pegawai terlebih dahulu.");
      setOwnQrScannerOpen(false);
      return;
    }
    if (token.trim() !== ownEmployeeQr.qr_token) {
      setOwnQrScannerMessage("QR tidak cocok dengan akun yang sedang login. Silakan pindai kartu QR milik Anda sendiri.");
      setOwnQrScannerOpen(false);
      return;
    }
    setOwnQrScannerMessage("QR cocok. Memverifikasi GPS dan menyimpan absensi...");
    setOwnQrScannerOpen(false);
    await confirmTeacherAttendance();
  };

  const confirmTeacherAttendance = async () => {
    if (!currentUserId) {
      alert("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }
    const jakartaToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    const attendanceProfileName = userProfile.nama || name || "Nama belum tersedia";
    if (!isTeacherScheduledOnDate(attendanceProfileName, jakartaToday)) {
      alert("Hari ini bukan jadwal kehadiran Anda sesuai jadwal sekolah.");
      return;
    }
    if (!["Guru", "Admin", "Kepala Sekolah"].includes(role)) {
      alert("Akun ini tidak memiliki akses absensi pribadi.");
      return;
    }
    if (teacherAttendanceMode === "pulang" && !teacherAttendanceToday?.jam_masuk) {
      alert("Anda harus melakukan absen masuk terlebih dahulu.");
      return;
    }
    if (teacherAttendanceMode === "pulang" && teacherAttendanceToday?.jam_pulang) {
      alert("Absen pulang hari ini sudah tersimpan.");
      return;
    }
    if (teacherAttendanceMode === "masuk" && teacherAttendanceToday?.jam_masuk) {
      alert("Absen masuk hari ini sudah tersimpan.");
      return;
    }

    setAttendanceSaving(true);
    setLocationChecking(true);
    setTeacherLocationStatus(ATTENDANCE_GPS_TEST_MODE ? "Mode uji coba: GPS dan radius sementara dinonaktifkan." : "Memeriksa lokasi perangkat...");
    try {
      let location: { latitude: number; longitude: number; accuracy: number } | null = null;
      let address = "GPS dinonaktifkan sementara untuk uji coba";
      if (!ATTENDANCE_GPS_TEST_MODE) {
        location = await getCurrentTeacherLocation();
        const distance = getDistanceMeters(location.latitude, location.longitude, SCHOOL_LOCATION.latitude, SCHOOL_LOCATION.longitude);
        if (location.accuracy > 100) throw new Error(`Akurasi GPS belum cukup (${Math.round(location.accuracy)} meter). Aktifkan lokasi presisi dan coba lagi.`);
        if (distance > SCHOOL_LOCATION.radiusMeters) throw new Error(`Absensi ditolak. Lokasi terdeteksi sekitar ${Math.round(distance)} meter dari titik sekolah, sedangkan batasnya ${SCHOOL_LOCATION.radiusMeters} meter.`);
        address = await getApproximateAddress(location.latitude, location.longitude);
      }
      const timestamp = new Date().toISOString();
      const isMasuk = teacherAttendanceMode === "masuk";
      const locationFields = ATTENDANCE_GPS_TEST_MODE ? {} : isMasuk
        ? { latitude_masuk: location!.latitude, longitude_masuk: location!.longitude, alamat_masuk: address }
        : { latitude_pulang: location!.latitude, longitude_pulang: location!.longitude, alamat_pulang: address };

      if (isMasuk) {
        const { data, error } = await supabase
          .from("teacher_attendance")
          .upsert({ guru_id: currentUserId, tanggal: attendanceDate, jam_masuk: timestamp, ...locationFields }, { onConflict: "guru_id,tanggal" })
          .select("id, tanggal, jam_masuk, selfie_masuk, jam_pulang, selfie_pulang, latitude_masuk, longitude_masuk, alamat_masuk, latitude_pulang, longitude_pulang, alamat_pulang, status")
          .single();
        if (error) throw new Error(`Absen masuk gagal disimpan: ${error.message}`);
        setTeacherAttendanceToday(data);
        setTeacherAttendanceMode("pulang");
        setTeacherLocationStatus(ATTENDANCE_GPS_TEST_MODE ? "Mode uji coba: GPS dan radius sementara dinonaktifkan." : `Lokasi terverifikasi (${Math.round(getDistanceMeters(location!.latitude, location!.longitude, SCHOOL_LOCATION.latitude, SCHOOL_LOCATION.longitude))} m dari titik sekolah).`);
        const timestampDate = new Date(timestamp);
        setQrAttendanceResult({ profile_id: currentUserId, qr_token: ownEmployeeQr?.qr_token || "", nama: userProfile.nama || name || "Nama belum tersedia", role: role.toLowerCase().replace(/ /g, "_"), foto_url: userProfile.fotoUrl || null, mode: "masuk", time: timestampDate.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }), date: timestampDate.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" }), address, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, status: isTeacherOnTime(attendanceProfileName, attendanceDate, timestamp) ? "Tepat waktu" : "Terlambat" });

      } else {
        const { data, error } = await supabase
          .from("teacher_attendance")
          .update({ jam_pulang: timestamp, updated_at: timestamp, ...locationFields })
          .eq("id", teacherAttendanceToday?.id ?? "")
          .is("jam_pulang", null)
          .select("id, tanggal, jam_masuk, selfie_masuk, jam_pulang, selfie_pulang, latitude_masuk, longitude_masuk, alamat_masuk, latitude_pulang, longitude_pulang, alamat_pulang, status")
          .single();
        if (error) throw new Error(`Absen pulang gagal disimpan: ${error.message}`);
        setTeacherAttendanceToday(data);
        setTeacherLocationStatus(ATTENDANCE_GPS_TEST_MODE ? "Mode uji coba: GPS dan radius sementara dinonaktifkan." : `Lokasi terverifikasi (${Math.round(getDistanceMeters(location!.latitude, location!.longitude, SCHOOL_LOCATION.latitude, SCHOOL_LOCATION.longitude))} m dari titik sekolah).`);
        const timestampDate = new Date(timestamp);
        setQrAttendanceResult({ profile_id: currentUserId, qr_token: ownEmployeeQr?.qr_token || "", nama: userProfile.nama || name || "Nama belum tersedia", role: role.toLowerCase().replace(/ /g, "_"), foto_url: userProfile.fotoUrl || null, mode: "pulang", time: timestampDate.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }), date: timestampDate.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" }), address, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, status: "Absen pulang" });

      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan saat memverifikasi lokasi.";
      setTeacherLocationStatus(message);
      alert(message);
    } finally {
      setAttendanceSaving(false);
      setLocationChecking(false);
    }
  };

  const saveStudentAttendance = async () => {
    if (!currentUserId) {
      alert("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    if (!attendanceDate) {
      alert("Pilih tanggal absensi terlebih dahulu.");
      return;
    }

    const selectedStudents = attendanceStudents.filter(
      (student) => student.class === attendanceClass
    );

    if (!attendanceSubjectId) {
      alert("Pilih mata pelajaran terlebih dahulu.");
      return;
    }

    if (role === "Guru" && !isGuruPiket) {
      const ownAssignment = teacherAssignments.some(
        (assignment) =>
          assignment.className === attendanceClass &&
          assignment.subjectId === attendanceSubjectId
      );
      const waliClassAccess = teacherAssignments.some(
        (assignment) =>
          assignment.isWaliKelas &&
          assignment.className === attendanceClass
      );
      if (!ownAssignment && !waliClassAccess) {
        alert("Anda tidak memiliki hak untuk mengisi absensi kelas dan mata pelajaran ini.");
        return;
      }
    }

    if (selectedStudents.length === 0) {
      alert(`Belum ada data siswa untuk kelas ${attendanceClass}.`);
      return;
    }

    const missing = selectedStudents.filter(
      (student) => !studentAttendance[student.id]
    );

    if (missing.length > 0) {
      alert(`Masih ada ${missing.length} siswa yang belum diabsen.`);
      return;
    }

    setAttendanceSaving(true);
    setAttendanceSaved(false);

    const payload = selectedStudents.map((student) => ({
      student_id: student.id,
      class_id: student.classId,
      subject_id: attendanceSubjectId,
      tanggal: attendanceDate,
      status: studentAttendance[student.id],
      created_by: currentUserId,
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(payload, { onConflict: "student_id,tanggal,subject_id" });

    if (error) {
      console.error("Gagal menyimpan absensi:", error);
      alert(`Absensi gagal disimpan: ${error.message}`);
      setAttendanceSaving(false);
      return;
    }

    setAttendanceRecords((current) => {
      const next = { ...current };
      for (const student of selectedStudents) {
        next[`${attendanceDate}:${student.id}:${attendanceSubjectId}`] = studentAttendance[student.id];
      }
      return next;
    });

    setAttendanceSaved(true);
    setAttendanceSaving(false);
  };


  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

  const loadSppData = async () => {
    setSppLoading(true);
    const [feeResult, studentResult, billResult] = await Promise.all([
      supabase.from("fee_types").select("id, kode, nama, nominal_default, frekuensi").eq("aktif", true).order("nama"),
      supabase.from("students").select("id, nama, nis").order("nama"),
      supabase.from("student_bills").select("id, student_id, fee_type_id, periode, jatuh_tempo, nominal, status, keterangan, students(nama, nis), fee_types(nama, kode)").order("periode", { ascending: false }),
    ]);

    if (feeResult.error) console.error("Gagal memuat jenis tagihan:", feeResult.error);
    if (studentResult.error) console.error("Gagal memuat siswa SPP:", studentResult.error);
    if (billResult.error) {
      console.error("Gagal memuat tagihan SPP:", billResult.error);
      alert(`Data SPP gagal dimuat: ${billResult.error.message}`);
      setSppLoading(false);
      return;
    }

    setSppFeeTypes((feeResult.data ?? []).map((x: any) => ({
      id: x.id, kode: x.kode, nama: x.nama, nominalDefault: Number(x.nominal_default ?? 0), frekuensi: x.frekuensi,
    })));
    setSppStudents((studentResult.data ?? []).map((x: any) => ({ id: x.id, nama: x.nama, nis: x.nis })));

    const billIds = (billResult.data ?? []).map((x: any) => x.id);
    let paymentMap: Record<string, number> = {};
    if (billIds.length > 0) {
      const paymentResult = await supabase.from("student_payments").select("bill_id, nominal").in("bill_id", billIds);
      if (!paymentResult.error) {
        paymentMap = (paymentResult.data ?? []).reduce((acc: Record<string, number>, row: any) => {
          acc[row.bill_id] = (acc[row.bill_id] ?? 0) + Number(row.nominal ?? 0);
          return acc;
        }, {});
      }
    }

    setSppBills((billResult.data ?? []).map((x: any) => {
      const student = Array.isArray(x.students) ? x.students[0] : x.students;
      const fee = Array.isArray(x.fee_types) ? x.fee_types[0] : x.fee_types;
      return {
        id: x.id, studentId: x.student_id, studentName: student?.nama ?? "-", nis: student?.nis ?? "-",
        feeTypeId: x.fee_type_id, feeName: fee?.nama ?? "-", feeCode: fee?.kode ?? "-", periode: x.periode,
        jatuhTempo: x.jatuh_tempo, nominal: Number(x.nominal ?? 0), status: x.status, keterangan: x.keterangan ?? "",
        totalBayar: paymentMap[x.id] ?? 0,
      };
    }));
    setSppLoading(false);
  };

  const createSppBill = async () => {
    if (role !== "Admin") return alert("Hanya Admin yang dapat membuat tagihan.");
    if (!sppStudentId || !sppFeeTypeId || !sppPeriode || !sppNominal) return alert("Lengkapi siswa, jenis tagihan, periode, dan nominal.");
    setSppSaving(true);
    const { error } = await supabase.from("student_bills").insert({
      student_id: sppStudentId, fee_type_id: sppFeeTypeId, periode: sppPeriode,
      jatuh_tempo: sppJatuhTempo || null, nominal: Number(sppNominal), status: "Belum Lunas",
      keterangan: "Tagihan dibuat melalui portal",
    });
    if (error) alert(`Tagihan gagal dibuat: ${error.message}`);
    else { alert("Tagihan berhasil dibuat."); setSppNominal(""); await loadSppData(); }
    setSppSaving(false);
  };

  const startSppOnlinePayment = async (billId: string) => {
    if (role !== "Siswa" && role !== "Orang Tua") {
      return alert("Pembayaran online dilakukan dari akun Siswa atau Orang Tua.");
    }
    const bill = sppBills.find((x) => x.id === billId);
    if (!bill) return alert("Tagihan tidak ditemukan.");
    if (bill.status === "Lunas" || bill.status === "Dibatalkan") return;
    setSppDummyBill(bill);
  };

  const simulateDummyQrisPayment = async () => {
    if (!sppDummyBill) return;
    setSppOnlineLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");

      const response = await fetch("/api/payments/dummy/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ billId: sppDummyBill.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Simulasi pembayaran gagal.");

      setSppDummyBill(null);
      alert(result.alreadyPaid ? "Tagihan sudah lunas." : "Pembayaran dummy berhasil! Status tagihan sekarang Lunas. ✅");
      await loadSppData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Simulasi pembayaran gagal.");
    } finally {
      setSppOnlineLoading(false);
    }
  };

  const saveSppPayment = async () => {
    if (role !== "Admin") return alert("Hanya Admin yang dapat mencatat pembayaran.");
    const bill = sppBills.find((x) => x.id === sppPaymentBillId);
    const amount = Number(sppPaymentNominal);
    if (!bill || !amount || amount <= 0) return alert("Pilih tagihan dan isi nominal pembayaran.");
    const sisa = Math.max(0, bill.nominal - bill.totalBayar);
    if (amount > sisa) return alert(`Pembayaran melebihi sisa tagihan. Sisa: ${formatRupiah(sisa)}.`);
    setSppSaving(true);
    const { error } = await supabase.from("student_payments").insert({
      bill_id: bill.id, nominal: amount, metode: sppPaymentMethod, diterima_oleh: currentUserId,
      nomor_bukti: `SPP-${Date.now()}`,
    });
    if (error) { alert(`Pembayaran gagal disimpan: ${error.message}`); setSppSaving(false); return; }
    const newTotal = bill.totalBayar + amount;
    const newStatus = newTotal >= bill.nominal ? "Lunas" : "Sebagian";
    const { error: updateError } = await supabase.from("student_bills").update({ status: newStatus }).eq("id", bill.id);
    if (updateError) alert(`Pembayaran tersimpan, tetapi status gagal diperbarui: ${updateError.message}`);
    else alert("Pembayaran berhasil dicatat.");
    setSppPaymentBillId(""); setSppPaymentNominal(""); await loadSppData();
    setSppSaving(false);
  };

  const loadSchoolSettings = async () => {
    setSchoolSettingsLoading(true);
    const { data, error } = await supabase
      .from("school_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Gagal memuat pengaturan sekolah:", error);
      alert(`Pengaturan sekolah gagal dimuat: ${error.message}`);
      setSchoolSettingsLoading(false);
      return;
    }

    if (data) {
      setSchoolSettings({
        namaSekolah: data.nama_sekolah ?? "", npsn: data.npsn ?? "", nss: data.nss ?? "",
        alamat: data.alamat ?? "", desaKelurahan: data.desa_kelurahan ?? "",
        kecamatan: data.kecamatan ?? "", kabupatenKota: data.kabupaten_kota ?? "",
        provinsi: data.provinsi ?? "", kodePos: data.kode_pos ?? "", telepon: data.telepon ?? "",
        email: data.email ?? "", website: data.website ?? "",
        namaKepalaSekolah: data.nama_kepala_sekolah ?? "", nipKepalaSekolah: data.nip_kepala_sekolah ?? "",
        tahunAjaran: data.tahun_ajaran ?? "2026/2027",
        semester: data.semester === "2" ? "2" : "1",
        logoUrl: SCHOOL_LOGO_URL,
      });
    }
    setSchoolSettingsLoading(false);
  };

  const handleSchoolLogoUpload = async (file: File | undefined) => {
    if (!file || role !== "Admin") return;
    alert("Logo Portal sudah dipasang langsung dari file lokal public/logo-sd.png. Bucket Supabase tidak diperlukan untuk logo ini.");
  };

  const saveSchoolSettings = async () => {
    if (role !== "Admin") {
      alert("Hanya Admin yang dapat mengubah pengaturan sekolah.");
      return;
    }
    setSchoolSettingsSaving(true);
    setSchoolSettingsSaved(false);
    const { error } = await supabase.from("school_settings").upsert({
      id: 1,
      nama_sekolah: schoolSettings.namaSekolah.trim() || "SD Islam Al-Barkah",
      npsn: schoolSettings.npsn.trim() || null,
      nss: schoolSettings.nss.trim() || null,
      alamat: schoolSettings.alamat.trim() || null,
      desa_kelurahan: schoolSettings.desaKelurahan.trim() || null,
      kecamatan: schoolSettings.kecamatan.trim() || null,
      kabupaten_kota: schoolSettings.kabupatenKota.trim() || null,
      provinsi: schoolSettings.provinsi.trim() || null,
      kode_pos: schoolSettings.kodePos.trim() || null,
      telepon: schoolSettings.telepon.trim() || null,
      email: schoolSettings.email.trim() || null,
      website: schoolSettings.website.trim() || null,
      nama_kepala_sekolah: schoolSettings.namaKepalaSekolah.trim() || null,
      nip_kepala_sekolah: schoolSettings.nipKepalaSekolah.trim() || null,
      tahun_ajaran: schoolSettings.tahunAjaran.trim() || "2026/2027",
      semester: schoolSettings.semester,
      logo_url: SCHOOL_LOGO_URL,
      updated_by: currentUserId,
      updated_at: new Date().toISOString(),
    });
    setSchoolSettingsSaving(false);
    if (error) {
      alert(`Pengaturan sekolah gagal disimpan: ${error.message}`);
      return;
    }
    setSchoolSettingsSaved(true);
    alert("Pengaturan sekolah berhasil disimpan.");
  };

  const loadScheduleData = async () => {
    setScheduleLoading(true);
    setScheduleError("");

    const [scheduleResult, classResult, subjectResult, teacherResult] = await Promise.all([
      supabase
        .from("schedules")
        .select(`
          id,
          hari,
          jam_mulai,
          jam_selesai,
          ruang,
          class_id,
          subject_id,
          teacher_id,
          teacher_id_2,
          classes(id, nama),
          subjects(id, nama, kode),
          teacher1:school_teachers!schedules_teacher_id_fkey(id, nama),
          teacher2:school_teachers!schedules_teacher_id_2_fkey(id, nama)
        `)
        .order("hari")
        .order("jam_mulai"),
      supabase.from("classes").select("id, nama").order("tingkat"),
      supabase.from("subjects").select("id, nama, kode").order("nama"),
      supabase
        .from("school_teachers")
        .select("id, nama")
        .order("nama"),
    ]);

    if (scheduleResult.error) {
      console.error("Gagal memuat jadwal:", scheduleResult.error);
      setScheduleError(`Gagal memuat jadwal: ${scheduleResult.error.message}`);
      setScheduleRows([]);
    } else {
      const rows = (scheduleResult.data ?? []).map((item: any) => ({
        id: item.id,
        className: item.classes?.nama ?? "",
        subjectName: item.subjects?.nama ?? "",
        subjectCode: item.subjects?.kode ?? "",
        teacherName: [item.teacher1?.nama, item.teacher2?.nama]
          .filter((name: string | null | undefined) => Boolean(name))
          .join(" & "),
        hari: item.hari,
        jamMulai: String(item.jam_mulai ?? "").slice(0, 5),
        jamSelesai: String(item.jam_selesai ?? "").slice(0, 5),
        ruang: item.ruang ?? "",
      }));
      setScheduleRows(rows);
    }

    if (classResult.error) console.error("Gagal memuat kelas jadwal:", classResult.error);
    if (subjectResult.error) console.error("Gagal memuat mapel jadwal:", subjectResult.error);
    if (teacherResult.error) console.error("Gagal memuat guru jadwal:", teacherResult.error);

    setScheduleClasses((classResult.data ?? []).map((item) => ({ id: item.id, nama: item.nama })));
    setScheduleSubjects((subjectResult.data ?? []).map((item) => ({ id: item.id, nama: item.nama, kode: item.kode })));
    setScheduleTeachers((teacherResult.data ?? []).map((item) => ({ id: item.id, nama: item.nama })));
    setScheduleLoading(false);
  };

  const resetScheduleForm = () => {
    setScheduleEditingId(null);
    setScheduleForm({
      classId: "",
      subjectId: "",
      teacherId: "",
      hari: "Senin",
      jamMulai: "07:00",
      jamSelesai: "08:00",
      ruang: "",
    });
  };

  const openScheduleCreate = () => {
    resetScheduleForm();
    setScheduleFormOpen(true);
  };

  const openScheduleEdit = async (id: string) => {
    const { data, error } = await supabase
      .from("schedules")
      .select("id, class_id, subject_id, teacher_id, hari, jam_mulai, jam_selesai, ruang")
      .eq("id", id)
      .single();

    if (error || !data) {
      alert(`Gagal memuat jadwal: ${error?.message ?? "Data tidak ditemukan."}`);
      return;
    }

    setScheduleEditingId(data.id);
    setScheduleForm({
      classId: data.class_id,
      subjectId: data.subject_id,
      teacherId: data.teacher_id,
      hari: data.hari,
      jamMulai: String(data.jam_mulai).slice(0, 5),
      jamSelesai: String(data.jam_selesai).slice(0, 5),
      ruang: data.ruang ?? "",
    });
    setScheduleFormOpen(true);
  };

  const saveSchedule = async () => {
    if (role !== "Admin") {
      alert("Hanya Admin yang dapat mengelola jadwal.");
      return;
    }

    const { classId, subjectId, teacherId, hari, jamMulai, jamSelesai, ruang } = scheduleForm;
    if (!classId || !subjectId || !teacherId || !hari || !jamMulai || !jamSelesai) {
      alert("Kelas, mapel, guru, hari, jam mulai, dan jam selesai wajib diisi.");
      return;
    }
    if (jamSelesai <= jamMulai) {
      alert("Jam selesai harus lebih besar dari jam mulai.");
      return;
    }

    setScheduleSaving(true);

    let collisionQuery = supabase
      .from("schedules")
      .select("id, class_id, subject_id, teacher_id, jam_mulai, jam_selesai")
      .eq("hari", hari)
      .lt("jam_mulai", jamSelesai)
      .gt("jam_selesai", jamMulai);

    if (scheduleEditingId) collisionQuery = collisionQuery.neq("id", scheduleEditingId);

    const { data: collisions, error: collisionError } = await collisionQuery;
    if (collisionError) {
      setScheduleSaving(false);
      alert(`Gagal memeriksa bentrok jadwal: ${collisionError.message}`);
      return;
    }

    const classCollision = (collisions ?? []).find((row: any) => row.class_id === classId);
    if (classCollision) {
      setScheduleSaving(false);
      alert("Bentrok jadwal: kelas tersebut sudah memiliki pelajaran pada jam yang sama.");
      return;
    }

    // Kelas IV Ali dan IV Umar mengikuti jadwal gabungan yang sama.
    // Guru boleh tercatat pada kedua kelas hanya jika mapel dan rentang waktunya identik.
    const gradeFourAliId = "250d20e4-308a-48ba-a6e7-b5097c3d9911";
    const gradeFourUmarId = "7c0b2979-877a-4226-8d00-23ad2c2a424f";
    const isGradeFourPair = (firstClassId: string, secondClassId: string) =>
      (firstClassId === gradeFourAliId && secondClassId === gradeFourUmarId) ||
      (firstClassId === gradeFourUmarId && secondClassId === gradeFourAliId);

    const teacherCollision = (collisions ?? []).find((row: any) => {
      if (row.teacher_id !== teacherId) return false;
      const sameGradeFourSharedLesson =
        isGradeFourPair(row.class_id, classId) &&
        row.subject_id === subjectId &&
        String(row.jam_mulai).slice(0, 5) === jamMulai &&
        String(row.jam_selesai).slice(0, 5) === jamSelesai;
      return !sameGradeFourSharedLesson;
    });
    if (teacherCollision) {
      setScheduleSaving(false);
      alert("Bentrok jadwal: guru tersebut sudah mengajar pada jam yang sama di hari tersebut. Pengecualian hanya berlaku untuk jadwal gabungan kelas IV Ali dan IV Umar yang mapel serta jamnya sama persis.");
      return;
    }

    const payload = {
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId,
      hari,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      ruang: ruang.trim() || null,
    };

    const result = scheduleEditingId
      ? await supabase.from("schedules").update(payload).eq("id", scheduleEditingId)
      : await supabase.from("schedules").insert(payload);

    setScheduleSaving(false);

    if (result.error) {
      alert(`Jadwal gagal disimpan: ${result.error.message}`);
      return;
    }

    setScheduleFormOpen(false);
    resetScheduleForm();
    await loadScheduleData();
    alert(scheduleEditingId ? "Jadwal berhasil diperbarui." : "Jadwal berhasil ditambahkan.");
  };

  const deleteSchedule = async (id: string) => {
    if (role !== "Admin") return;
    if (!window.confirm("Hapus jadwal ini?")) return;

    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) {
      alert(`Jadwal gagal dihapus: ${error.message}`);
      return;
    }

    if (scheduleEditingId === id) {
      setScheduleFormOpen(false);
      resetScheduleForm();
    }
    await loadScheduleData();
  };

  const loadStudentData = async () => {
    if (role !== "Admin" && role !== "Kepala Sekolah" && role !== "Guru") return;
    setStudentLoading(true);
    setStudentError("");

    const { data, error } = await supabase
      .from("students")
      .select("id, nama, nis, nisn, kelas, status, class_id, classes(id, nama)")
      .order("nama");

    if (error) {
      console.error("Gagal memuat data siswa:", error);
      setStudentRows([]);
      setStudentError(`Data siswa gagal dimuat: ${error.message}`);
    } else {
      setStudentRows((data ?? []).map((item: any) => ({
        id: item.id,
        name: item.nama ?? "",
        nis: item.nis ?? "",
        nisn: item.nisn ?? "",
        class: item.classes?.nama ?? item.kelas ?? "-",
        status: item.status ?? "Aktif",
      })));
    }

    setStudentLoading(false);
  };

  const resetStudentForm = () => {
    setStudentEditingId(null);
    setStudentForm({ name: "", nis: "", nisn: "", className: selectedClass ?? "", status: "Aktif" });
  };

  const openStudentCreate = () => {
    if (role !== "Admin") return;
    resetStudentForm();
    setStudentFormOpen(true);
  };

  const openStudentEdit = (student: StudentRecord) => {
    if (role !== "Admin") return;
    setStudentEditingId(student.id);
    setStudentForm({
      name: student.name,
      nis: student.nis,
      nisn: student.nisn,
      className: student.class,
      status: student.status || "Aktif",
    });
    setStudentFormOpen(true);
  };

  const saveStudent = async () => {
    if (role !== "Admin") return;
    if (!studentForm.name.trim()) { alert("Nama siswa wajib diisi."); return; }
    if (!studentForm.nis.trim()) { alert("NIS siswa wajib diisi."); return; }

    setStudentLoading(true);
    setStudentError("");

    let classId: string | null = null;
    if (studentForm.className.trim()) {
      const { data: classRow } = await supabase
        .from("classes")
        .select("id")
        .eq("nama", studentForm.className.trim())
        .order("tingkat")
        .limit(1)
        .maybeSingle();
      classId = classRow?.id ?? null;
    }

    const payload = {
      nama: studentForm.name.trim(),
      nis: studentForm.nis.trim(),
      nisn: studentForm.nisn.trim() || null,
      kelas: studentForm.className.trim() || null,
      class_id: classId,
      status: studentForm.status || "Aktif",
    };

    const result = studentEditingId
      ? await supabase.from("students").update(payload).eq("id", studentEditingId)
      : await supabase.from("students").insert(payload);

    setStudentLoading(false);

    if (result.error) {
      setStudentError(`Siswa gagal disimpan: ${result.error.message}`);
      return;
    }

    setStudentFormOpen(false);
    resetStudentForm();
    await loadStudentData();
    alert(studentEditingId ? "Data siswa berhasil diperbarui." : "Data siswa berhasil ditambahkan.");
  };

  const deleteStudent = async (id: string) => {
    if (role !== "Admin") return;
    if (!window.confirm("Hapus data siswa ini? Data nilai, absensi, dan tagihan terkait bisa ikut terpengaruh jika database memiliki aturan cascade.")) return;

    setStudentLoading(true);
    const { error } = await supabase.from("students").delete().eq("id", id);
    setStudentLoading(false);
    if (error) { alert(`Data siswa gagal dihapus: ${error.message}`); return; }
    await loadStudentData();
  };

  const loadTeacherData = async () => {
    if (role !== "Admin" && role !== "Kepala Sekolah") return;
    setTeacherLoading(true);
    setTeacherError("");

    const { data, error } = await supabase
      .from("school_teachers")
      .select("id, nama, nip, jabatan, mata_pelajaran, kelas_diajar, wali_kelas, status")
      .order("nama");

    if (error) {
      // Tetap tampilkan data dummy lama supaya halaman tidak blank ketika tabel belum dibuat.
      console.error("Gagal memuat data guru:", error);
      setTeacherRows(demoTeachers);
      setTeacherError(`Data guru database belum siap: ${error.message}`);
    } else {
      setTeacherRows((data ?? []).map((item: any) => ({
        id: item.id,
        name: item.nama ?? "",
        nip: item.nip ?? "",
        position: item.jabatan ?? "Guru Mata Pelajaran",
        subject: item.mata_pelajaran ?? "-",
        classes: String(item.kelas_diajar ?? "").split(",").map((value) => value.trim()).filter(Boolean),
        waliKelas: item.wali_kelas ?? "-",
        status: item.status ?? "Aktif",
      })));
    }

    setTeacherLoading(false);
  };

  const resetTeacherForm = () => {
    setTeacherEditingId(null);
    setTeacherForm({ name: "", nip: "", position: "Guru Mata Pelajaran", subject: "", classes: "", waliKelas: "", status: "Aktif" });
  };

  const openTeacherCreate = () => {
    if (role !== "Admin") return;
    resetTeacherForm();
    setTeacherError("");
    setTeacherFormOpen(true);
  };

  const openTeacherEdit = (teacher: TeacherRecord) => {
    if (role !== "Admin") return;
    setTeacherEditingId(teacher.id);
    setTeacherForm({
      name: teacher.name,
      nip: teacher.nip,
      position: teacher.position,
      subject: teacher.subject === "-" ? "" : teacher.subject,
      classes: teacher.classes.join(", "),
      waliKelas: teacher.waliKelas === "-" ? "" : teacher.waliKelas,
      status: teacher.status || "Aktif",
    });
    setTeacherError("");
    setTeacherFormOpen(true);
    setSelectedTeacher(null);
  };

  const saveTeacher = async () => {
    if (role !== "Admin") return;
    if (!teacherForm.name.trim()) { alert("Nama guru wajib diisi."); return; }

    setTeacherSaving(true);
    setTeacherError("");

    const payload = {
      nama: teacherForm.name.trim(),
      nip: teacherForm.nip.trim() || null,
      jabatan: teacherForm.position.trim() || "Guru Mata Pelajaran",
      mata_pelajaran: teacherForm.subject.trim() || null,
      kelas_diajar: teacherForm.classes.trim() || null,
      wali_kelas: teacherForm.waliKelas.trim() || null,
      status: teacherForm.status,
      updated_at: new Date().toISOString(),
    };

    const result = teacherEditingId
      ? await supabase.from("school_teachers").update(payload).eq("id", teacherEditingId)
      : await supabase.from("school_teachers").insert(payload);

    setTeacherSaving(false);

    if (result.error) {
      setTeacherError(`Guru gagal disimpan: ${result.error.message}`);
      return;
    }

    setTeacherFormOpen(false);
    resetTeacherForm();
    await loadTeacherData();
    alert(teacherEditingId ? "Data guru berhasil diperbarui." : "Data guru berhasil ditambahkan.");
  };

  const deleteTeacher = async (id: string) => {
    if (role !== "Admin") return;
    if (!window.confirm("Hapus data guru ini? Data akun/login tidak ikut dihapus.")) return;

    const { error } = await supabase.from("school_teachers").delete().eq("id", id);
    if (error) { alert(`Data guru gagal dihapus: ${error.message}`); return; }
    setSelectedTeacher(null);
    await loadTeacherData();
  };

  const journalClassOptions = role === "Admin" || role === "Kepala Sekolah"
    ? gradeClasses.map((item) => ({ id: item.id, nama: item.nama }))
    : Array.from(
        new Map(
          teacherAssignments
            .filter((item) => item.classId && item.className)
            .map((item) => [item.classId, { id: item.classId, nama: item.className }])
        ).values()
      );

  const selectedJournalClassName =
    journalClassOptions.find((item) => item.id === journalClassId)?.nama ?? "";
  const isJournalWaliKelas4Ali =
    normalizeSubjectName(selectedJournalClassName) === normalizeSubjectName("4 Ali") &&
    teacherAssignments.some(
      (item) => item.isWaliKelas && item.classId === journalClassId
    );

  const journalSubjectOptions = role === "Admin" || role === "Kepala Sekolah"
    ? attendanceSubjects
    : isJournalWaliKelas4Ali
      ? Array.from(
          new Map(
            [
              // Khusus jurnal wali kelas 4 Ali: tampilkan mapel wali kelas
              // dari master subjects, lalu gabungkan mapel tugas mengajar
              // (misalnya PJOK) agar pilihan yang sudah ada tidak hilang.
              ...attendanceSubjects
                .filter((subject) => isWaliKelasSubject(subject.name, selectedJournalClassName))
                .map((subject) => [subject.id, subject] as [string, typeof subject]),
              ...teacherAssignments
                .filter((item) => item.classId === journalClassId && item.subjectId && item.subjectName)
                .map((item) => [item.subjectId, {
                  id: item.subjectId,
                  name: item.subjectName,
                  code: item.subjectCode,
                }] as [string, { id: string; name: string; code: string }]),
            ]
          ).values()
        )
      : Array.from(
          new Map(
            teacherAssignments
              .filter((item) => item.subjectId && item.subjectName && (!journalClassId || item.classId === journalClassId))
              .map((item) => [item.subjectId, { id: item.subjectId, name: item.subjectName, code: item.subjectCode }])
          ).values()
        );

  const loadJournalData = async (filters?: { classId?: string; subjectId?: string; month?: string; year?: string }) => {
    setJournalLoading(true);
    setJournalError("");

    const monthNumber = Number(filters?.month ?? journalMonth);
    const yearNumber = Number(filters?.year ?? journalYear);
    if (!monthNumber || monthNumber < 1 || monthNumber > 12 || !yearNumber) {
      setJournalError("Bulan dan tahun jurnal belum valid.");
      setJournalRows([]);
      setJournalLoading(false);
      return;
    }
    const periodStart = new Date(yearNumber, monthNumber - 1, 1);
    const nextPeriod = new Date(yearNumber, monthNumber, 1);
    const formatDateOnly = (value: Date) => {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    let query = supabase
      .from("journals")
      .select(`
        id, guru_id, class_id, subject_id, tahun_ajaran, tanggal, jam, kegiatan,
        tujuan_pembelajaran, materi_pembelajaran, catatan,
        classes(nama), subjects(nama, kode),
        journal_absences(student_id, keterangan, students(nama))
      `)
      .gte("tanggal", formatDateOnly(periodStart))
      .lt("tanggal", formatDateOnly(nextPeriod))
      .order("tanggal", { ascending: true })
      .order("jam", { ascending: true });

    const classFilter = filters?.classId ?? journalClassId;
    const subjectFilter = filters?.subjectId ?? journalSubjectId;
    if (classFilter) query = query.eq("class_id", classFilter);
    if (subjectFilter) query = query.eq("subject_id", subjectFilter);

    const { data, error } = await query;
    if (error) {
      setJournalError(`Gagal memuat jurnal: ${error.message}`);
      setJournalRows([]);
      setJournalLoading(false);
      return;
    }

    setJournalRows((data ?? []).map((row: any) => ({
      id: row.id,
      guru_id: row.guru_id,
      class_id: row.class_id,
      subject_id: row.subject_id,
      tahun_ajaran: row.tahun_ajaran,
      tanggal: row.tanggal,
      jam: row.jam,
      kegiatan: row.kegiatan,
      tujuan_pembelajaran: row.tujuan_pembelajaran,
      materi_pembelajaran: row.materi_pembelajaran,
      catatan: row.catatan,
      className: row.classes?.nama ?? "-",
      subjectName: row.subjects?.nama ?? "-",
      absenceRows: (row.journal_absences ?? []).map((absence: any) => ({
        studentId: absence.student_id,
        studentName: absence.students?.nama ?? "Siswa",
        keterangan: absence.keterangan,
      })),
    })));
    setJournalLoading(false);
  };

  // Ambil status siswa dari menu Absensi berdasarkan kelas dan tanggal jurnal.
  useEffect(() => {
    let cancelled = false;
    const loadJournalStudentAttendance = async () => {
      if (!journalFormOpen || !journalClassId || !journalForm.tanggal) {
        setJournalStudentAttendance({});
        return;
      }
      setJournalAttendanceLoading(true);
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("class_id", journalClassId)
        .eq("tanggal", journalForm.tanggal);
      if (!cancelled) {
        if (error) {
          console.error("Gagal mengambil absensi siswa untuk jurnal:", error);
          setJournalStudentAttendance({});
        } else {
          const statusMap: Record<string, string> = {};
          (data ?? []).forEach((row: any) => {
            statusMap[row.student_id] = row.status;
          });
          setJournalStudentAttendance(statusMap);
        }
        setJournalAttendanceLoading(false);
      }
    };
    void loadJournalStudentAttendance();
    return () => { cancelled = true; };
  }, [journalFormOpen, journalClassId, journalForm.tanggal]);

  const openNewJournal = () => {
    setJournalEditingId(null);
    setJournalForm({
      tanggal: `${journalYear}-${journalMonth.padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
      jam: "",
      kegiatan: "",
      tujuan_pembelajaran: "",
      materi_pembelajaran: "",
      catatan: "",
    });
    setJournalAbsences({});
    setJournalFormOpen(true);
  };

  const openEditJournal = (row: JournalRow) => {
    setJournalEditingId(row.id);
    setJournalClassId(row.class_id);
    setJournalSubjectId(row.subject_id ?? "");
    setJournalForm({
      tanggal: row.tanggal,
      jam: row.jam,
      kegiatan: row.kegiatan,
      tujuan_pembelajaran: row.tujuan_pembelajaran ?? "",
      materi_pembelajaran: row.materi_pembelajaran ?? "",
      catatan: row.catatan ?? "",
    });
    const absences: Record<string, string> = {};
    row.absenceRows.forEach((item) => { absences[item.studentId] = item.keterangan; });
    setJournalAbsences(absences);
    setJournalFormOpen(true);
  };

  const saveJournal = async () => {
    if (!currentUserId) return;
    if (!journalClassId) { alert("Pilih kelas terlebih dahulu."); return; }
    if (!journalForm.tanggal || !journalForm.jam || !journalForm.kegiatan.trim()) {
      alert("Tanggal, jam, dan mata pelajaran/kegiatan wajib diisi.");
      return;
    }

    setJournalSaving(true);
    const payload = {
      guru_id: currentUserId,
      class_id: journalClassId,
      subject_id: journalSubjectId || null,
      tahun_ajaran: schoolSettings.tahunAjaran || "2026/2027",
      tanggal: journalForm.tanggal,
      jam: journalForm.jam.trim(),
      kegiatan: journalForm.kegiatan.trim(),
      tujuan_pembelajaran: journalForm.tujuan_pembelajaran.trim() || null,
      materi_pembelajaran: journalForm.materi_pembelajaran.trim() || null,
      catatan: journalForm.catatan.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let journalId = journalEditingId;
    const result = journalEditingId
      ? await supabase.from("journals").update(payload).eq("id", journalEditingId)
      : await supabase.from("journals").insert(payload).select("id").single();

    if (result.error) {
      alert(`Jurnal gagal disimpan: ${result.error.message}`);
      setJournalSaving(false);
      return;
    }
    if (!journalEditingId) journalId = result.data?.id ?? null;

    if (journalId) {
      const { error: deleteAbsenceError } = await supabase.from("journal_absences").delete().eq("journal_id", journalId);
      if (deleteAbsenceError) {
        alert(`Jurnal tersimpan, tetapi daftar ketidakhadiran gagal diperbarui: ${deleteAbsenceError.message}`);
        setJournalSaving(false);
        await loadJournalData();
        return;
      }

      const absencePayload = Object.entries(journalAbsences)
        .filter(([, keterangan]) => keterangan)
        .map(([studentId, keterangan]) => ({ journal_id: journalId, student_id: studentId, keterangan }));

      if (absencePayload.length > 0) {
        const { error: absenceError } = await supabase.from("journal_absences").insert(absencePayload);
        if (absenceError) {
          alert(`Jurnal tersimpan, tetapi siswa tidak hadir gagal disimpan: ${absenceError.message}`);
        }
      }
    }

    setJournalFormOpen(false);
    setJournalEditingId(null);
    setJournalSaving(false);
    await loadJournalData();
  };

  const deleteJournal = async (id: string) => {
    if (!window.confirm("Hapus jurnal ini?")) return;
    const { error } = await supabase.from("journals").delete().eq("id", id);
    if (error) { alert(`Jurnal gagal dihapus: ${error.message}`); return; }
    await loadJournalData();
  };

  const loadProgramOptions = async (context: "remedial" | "bk" = "remedial") => {
    if (!currentUserId) return;
    const classMap = new Map<string, { id: string; nama: string }>();
    const subjectMap = new Map<string, { id: string; nama: string; kode: string }>();

    if (role === "Admin" || role === "Kepala Sekolah") {
      const [{ data: classes }, { data: subjects }] = await Promise.all([
        supabase.from("classes").select("id, nama").order("tingkat", { ascending: true }).order("nama"),
        supabase.from("subjects").select("id, nama, kode").order("nama"),
      ]);
      for (const item of classes ?? []) classMap.set(item.id, { id: item.id, nama: item.nama });
      for (const item of subjects ?? []) subjectMap.set(item.id, { id: item.id, nama: item.nama, kode: item.kode ?? "" });
    } else if (role === "Guru") {
      for (const item of teacherAssignments) {
        if (item.classId && item.className) classMap.set(item.classId, { id: item.classId, nama: item.className });
        if (item.subjectId && item.subjectName) subjectMap.set(item.subjectId, { id: item.subjectId, nama: item.subjectName, kode: item.subjectCode ?? "" });
      }
    }

    const classesArray = Array.from(classMap.values());
    const subjectsArray = Array.from(subjectMap.values());
    setProgramClasses(classesArray);
    setProgramSubjects(subjectsArray);

    // Ambil siswa tanpa filter status agar siswa yang statusnya kosong atau
    // memakai variasi kapitalisasi tetap muncul di pilihan BK/Remedial.
    // Filter kelas dilakukan di dropdown berdasarkan kelas pada form masing-masing.
    let studentQuery = supabase.from("students").select("id, nama, nis, class_id").order("nama");
    if (role === "Guru" && classesArray.length > 0) {
      studentQuery = studentQuery.in("class_id", classesArray.map((item) => item.id));
    }
    const { data: students, error } = await studentQuery;
    if (error) {
      console.error(`Gagal memuat daftar siswa untuk ${context}:`, error);
      setProgramStudents([]);
    } else {
      setProgramStudents((students ?? []).map((item: any) => ({ id: item.id, nama: item.nama, nis: item.nis ?? "", class_id: item.class_id })));
    }
  };

  const getCurrentStudentId = async () => {
    if (!currentUserId) return null;
    const { data, error } = await supabase.from("students").select("id").eq("user_id", currentUserId).maybeSingle();
    if (error) {
      console.error("Gagal mencari data siswa login:", error);
      return null;
    }
    return data?.id ?? null;
  };

  const loadRemedialData = async () => {
    setRemedialLoading(true);
    setRemedialError("");
    await loadProgramOptions("remedial");
    let query = supabase.from("remedial_pengayaan").select(`
      id, student_id, teacher_id, class_id, subject_id, jenis, tanggal, nilai_awal, nilai_hasil, materi, catatan, status,
      students(nama), classes(nama), subjects(nama, kode), profiles!remedial_pengayaan_teacher_id_fkey(nama)
    `).order("tanggal", { ascending: false });
    if (role === "Siswa") {
      const studentId = await getCurrentStudentId();
      if (!studentId) { setRemedialRows([]); setRemedialLoading(false); return; }
      query = query.eq("student_id", studentId);
    } else {
      if (remedialClassId) query = query.eq("class_id", remedialClassId);
      if (remedialSubjectId) query = query.eq("subject_id", remedialSubjectId);
    }
    if (remedialTypeFilter !== "all") query = query.eq("jenis", remedialTypeFilter);
    const { data, error } = await query;
    if (error) {
      setRemedialError(`Gagal memuat remedial/pengayaan: ${error.message}`);
      setRemedialRows([]);
    } else {
      setRemedialRows((data ?? []).map((row: any) => ({
        ...row,
        studentName: row.students?.nama ?? "Siswa",
        className: row.classes?.nama ?? "-",
        subjectName: row.subjects?.nama ?? "-",
        teacherName: row.profiles?.nama ?? "-",
      })));
    }
    setRemedialLoading(false);
  };

  const openNewRemedial = () => {
    setRemedialEditingId(null);
    setRemedialForm({ studentId: "", classId: remedialClassId || "", subjectId: remedialSubjectId || "", jenis: "remedial", tanggal: new Date().toISOString().slice(0, 10), nilaiAwal: "", nilaiHasil: "", materi: "", catatan: "", status: "direncanakan" });
    setRemedialFormOpen(true);
  };

  const openEditRemedial = (row: RemedialRow) => {
    setRemedialEditingId(row.id);
    setRemedialForm({ studentId: row.student_id, classId: row.class_id, subjectId: row.subject_id, jenis: row.jenis, tanggal: row.tanggal, nilaiAwal: row.nilai_awal == null ? "" : String(row.nilai_awal), nilaiHasil: row.nilai_hasil == null ? "" : String(row.nilai_hasil), materi: row.materi ?? "", catatan: row.catatan ?? "", status: row.status });
    setRemedialFormOpen(true);
  };

  const saveRemedial = async () => {
    if (!currentUserId || role === "Siswa") return;
    if (!remedialForm.studentId || !remedialForm.classId || !remedialForm.subjectId || !remedialForm.tanggal) { alert("Kelas, siswa, mata pelajaran, dan tanggal wajib diisi."); return; }
    setRemedialSaving(true);
    const payload = {
      student_id: remedialForm.studentId, teacher_id: currentUserId, class_id: remedialForm.classId, subject_id: remedialForm.subjectId,
      jenis: remedialForm.jenis, tanggal: remedialForm.tanggal,
      nilai_awal: remedialForm.nilaiAwal === "" ? null : Number(remedialForm.nilaiAwal),
      nilai_hasil: remedialForm.nilaiHasil === "" ? null : Number(remedialForm.nilaiHasil),
      materi: remedialForm.materi.trim() || null, catatan: remedialForm.catatan.trim() || null, status: remedialForm.status,
    };
    const result = remedialEditingId ? await supabase.from("remedial_pengayaan").update(payload).eq("id", remedialEditingId) : await supabase.from("remedial_pengayaan").insert(payload);
    if (result.error) { alert(`Data remedial/pengayaan gagal disimpan: ${result.error.message}`); setRemedialSaving(false); return; }
    setRemedialFormOpen(false); setRemedialEditingId(null); setRemedialSaving(false); await loadRemedialData();
  };

  const deleteRemedial = async (id: string) => {
    if (!window.confirm("Hapus data remedial/pengayaan ini?")) return;
    const { error } = await supabase.from("remedial_pengayaan").delete().eq("id", id);
    if (error) { alert(`Data gagal dihapus: ${error.message}`); return; }
    await loadRemedialData();
  };

  const loadBkData = async () => {
    setBkLoading(true);
    setBkError("");
    await loadProgramOptions("bk");
    let query = supabase.from("program_bk").select(`
      id, student_id, guru_id, class_id, tanggal, jenis_program, ringkasan, tindak_lanjut, status,
      students(nama), classes(nama), profiles!program_bk_guru_id_fkey(nama)
    `).order("tanggal", { ascending: false });
    if (role === "Siswa") {
      const studentId = await getCurrentStudentId();
      if (!studentId) { setBkRows([]); setBkLoading(false); return; }
      query = query.eq("student_id", studentId);
    } else if (bkClassId) {
      query = query.eq("class_id", bkClassId);
    }
    if (bkStatusFilter !== "all") query = query.eq("status", bkStatusFilter);
    const { data, error } = await query;
    if (error) {
      setBkError(`Gagal memuat Program BK: ${error.message}`);
      setBkRows([]);
    } else {
      setBkRows((data ?? []).map((row: any) => ({ ...row, studentName: row.students?.nama ?? "Siswa", className: row.classes?.nama ?? "-", guruName: row.profiles?.nama ?? "-" })));
    }
    setBkLoading(false);
  };

  const openNewBk = () => {
    setBkEditingId(null);
    setBkForm({ studentId: "", classId: bkClassId || "", tanggal: new Date().toISOString().slice(0, 10), jenisProgram: "Pendampingan belajar", ringkasan: "", tindakLanjut: "", status: "dipantau" });
    setBkFormOpen(true);
  };

  const openEditBk = (row: BkRow) => {
    setBkEditingId(row.id);
    setBkForm({ studentId: row.student_id, classId: row.class_id, tanggal: row.tanggal, jenisProgram: row.jenis_program, ringkasan: row.ringkasan, tindakLanjut: row.tindak_lanjut ?? "", status: row.status });
    setBkFormOpen(true);
  };

  const saveBk = async () => {
    if (!currentUserId || role === "Siswa") return;
    if (!bkForm.studentId || !bkForm.classId || !bkForm.tanggal || !bkForm.ringkasan.trim()) { alert("Kelas, siswa, tanggal, dan ringkasan wajib diisi."); return; }
    setBkSaving(true);
    const payload = { student_id: bkForm.studentId, guru_id: currentUserId, class_id: bkForm.classId, tanggal: bkForm.tanggal, jenis_program: bkForm.jenisProgram.trim(), ringkasan: bkForm.ringkasan.trim(), tindak_lanjut: bkForm.tindakLanjut.trim() || null, status: bkForm.status };
    const result = bkEditingId ? await supabase.from("program_bk").update(payload).eq("id", bkEditingId) : await supabase.from("program_bk").insert(payload);
    if (result.error) { alert(`Program BK gagal disimpan: ${result.error.message}`); setBkSaving(false); return; }
    setBkFormOpen(false); setBkEditingId(null); setBkSaving(false); await loadBkData();
  };

  const deleteBk = async (id: string) => {
    if (!window.confirm("Hapus program BK ini?")) return;
    const { error } = await supabase.from("program_bk").delete().eq("id", id);
    if (error) { alert(`Program BK gagal dihapus: ${error.message}`); return; }
    await loadBkData();
  };

  const openMenu = async (menuName: string) => {
    setMobileMenuOpen(false);
    setNavigationLoading(true);
    setActiveMenu(menuName);
    if (menuName === "Nilai") setGradeTab("input");
    if (menuName === "Rapor") {
      setGradeTab("raport");
      setReportDraft(null);
      setSelectedReportStudentId("");
      const waliClassId = role === "Guru"
        ? teacherAssignments.find((item) => item.isWaliKelas)?.classId
        : undefined;
      const reportClassId = isWaliKelas && waliClassId ? waliClassId : selectedGradeClassId;
      const reportClass = gradeClasses.find((item) => item.id === reportClassId);
      if (reportClassId) {
        setSelectedGradeClassId(reportClassId);
        setSelectedReportClass(reportClass?.nama ?? "");
        void loadReportStudents(reportClassId);
      }
    }

    if (menuName !== "Nilai" && menuName !== "Rapor") {
      setSelectedSubject(null);
    }

    if (menuName !== "Jadwal") {
      setSelectedClass(null);
      setSelectedDay(null);
    }

    if (menuName !== "Absensi") {
  
    }

    try {
      if (menuName === "Dashboard") {
        await loadSchoolDashboard(role, teacherAssignments, name);
      }

      if (menuName === "Kalender Akademik" && (role === "Admin" || role === "Kepala Sekolah" || role === "Guru")) {
        await loadAcademicCalendar();
      }

      if (menuName === "Data Siswa") {
        await loadStudentData();
      }

      if (menuName === "Data Guru") {
        await loadTeacherData();
      }

      if (menuName === "Jadwal") {
        await loadScheduleData();
      }

      if (menuName === "SPP & Administrasi") {
        await loadSppData();
      }

      if (menuName === "Pengaturan Sekolah") {
        await loadSchoolSettings();
      }

      if (menuName === "Absensi") {
        await loadTeacherAttendanceToday();
      }

      if (menuName === "Journal") {
        await loadJournalData();
      }

      if (menuName === "Remedial & Pengayaan") {
        await loadRemedialData();
      }

      if (menuName === "Program BK") {
        await loadBkData();
      }

      // Beri sedikit waktu agar transisi motion tetap terasa halus
      // meskipun data dari Supabase selesai sangat cepat.
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    } finally {
      setNavigationLoading(false);
    }
  };

  const openTeacherLessonAction = async (lesson: TeacherLesson, action: TeacherLessonAction) => {
    if (role !== "Guru") return;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const slotLabel = lesson.sessions.map((session) => `${session.start}–${session.end}`).join(", ");

    if (action === "attendance") {
      await openMenu("Absensi");
      setAttendancePanel("siswa");
      setAttendanceClass(lesson.className);
      setAttendanceClassChosen(true);
      setAttendanceDate(today);
      setAttendanceSubjectId(lesson.subjectId);
      setAttendanceSaved(false);
      const { data, error } = await supabase.from("attendance").select("student_id, status").eq("class_id", lesson.classId).eq("subject_id", lesson.subjectId).eq("tanggal", today);
      if (error) console.error("Gagal memuat status absensi jadwal terpilih:", error);
      const next: Record<string, AttendanceStatus> = {};
      for (const row of data ?? []) if (attendanceStatuses.includes(row.status as AttendanceStatus)) next[row.student_id] = row.status as AttendanceStatus;
      setStudentAttendance(next);
      return;
    }

    if (action === "journal") {
      await openMenu("Journal");
      setJournalMonth(today.slice(5, 7));
      setJournalYear(today.slice(0, 4));
      setJournalClassId(lesson.classId);
      setJournalSubjectId(lesson.subjectId);
      setJournalEditingId(null);
      setJournalForm({ tanggal: today, jam: slotLabel, kegiatan: lesson.subjectName, tujuan_pembelajaran: "", materi_pembelajaran: "", catatan: "" });
      setJournalAbsences({});
      setJournalFormOpen(true);
      await loadJournalData({ classId: lesson.classId, subjectId: lesson.subjectId, month: today.slice(5, 7), year: today.slice(0, 4) });
      return;
    }

    if (action === "bk") {
      await openMenu("Program BK");
      setBkClassId(lesson.classId);
      setBkEditingId(null);
      setBkForm({ studentId: "", classId: lesson.classId, tanggal: today, jenisProgram: "Pendampingan belajar", ringkasan: "", tindakLanjut: "", status: "dipantau" });
      setBkFormOpen(true);
    }
  };

  const reportSchoolGrades = reportGrades.filter((item) => isSchoolReportSubject(item.subjectName));
  const reportMadinGrades = reportGrades.filter((item) => isMadinReportSubject(item.subjectName));
  const reportActiveGrades = reportType === "school" ? reportSchoolGrades : reportMadinGrades;
  const reportTitle = reportType === "school" ? "RAPOR SEKOLAH" : "RAPOR MADIN";
  const showReportDescription = reportType === "madin"
    ? reportMadinGrades.some((item) => normalizeReportSubjectName(item.subjectName) === "btq")
    : true;

  const showPageLoader = loginLoading || navigationLoading;

 
if (!loggedIn) {
  return (
    <PortalLogin
      loginName={loginName}
      setLoginName={setLoginName}
      loginPassword={loginPassword}
      setLoginPassword={setLoginPassword}
      login={login}
      loginLoading={loginLoading}
    />
  );
}

  return (
    <>
      {showPageLoader && (
        <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/25 p-6 backdrop-blur-[3px]">
          <div className="flex min-w-[220px] flex-col items-center rounded-3xl border border-white/70 bg-white/95 px-8 py-7 shadow-2xl shadow-slate-900/15">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-4 border-emerald-100" />
              <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-emerald-600 border-r-emerald-400" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-800">Mohon tunggu...</p>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes logoFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-5px) scale(1.025); } }
        @keyframes logoRing { 0% { transform: scale(.72); opacity: .8; } 75%, 100% { transform: scale(1.35); opacity: 0; } }
        @keyframes dotPulse { 0%, 70%, 100% { transform: translateY(0) scale(.75); opacity: .45; } 35% { transform: translateY(-3px) scale(1); opacity: 1; } }
        @keyframes welcomeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes welcomeLogo { 0% { opacity: 0; transform: translateY(18px) scale(.7) rotate(-8deg); } 65% { transform: translateY(-4px) scale(1.04) rotate(1deg); } 100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); } }
        @keyframes welcomeText { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes welcomeOrbit { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes welcomeOrbitReverse { from { transform: translate(-50%, -50%) rotate(360deg); } to { transform: translate(-50%, -50%) rotate(0deg); } }
        .printable-report { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #fff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .printable-report, .printable-report * { visibility: visible !important; }
          .printable-report {
            display: block !important;
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm 12mm !important;
            background: #fff !important;
            color: #111 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 10.5pt !important;
          }
          .report-page {
            width: 100%;
            min-height: 0;
            box-sizing: border-box;
            page-break-after: always;
            break-after: page;
          }
          .report-page:last-child { page-break-after: auto; break-after: auto; }
          .report-madin-identity { width: 100%; border-collapse: collapse; margin: 8mm 0 7mm; font-family: Georgia, "Times New Roman", serif; font-size: 9pt; }
          .report-madin-identity td { padding: 2px 3px; vertical-align: top; }
          .report-madin-identity td:nth-child(1) { width: 24%; font-weight: 700; }
          .report-madin-identity td:nth-child(2) { width: 3%; text-align: center; }
          .report-madin-identity td:nth-child(3) { width: 34%; font-weight: 700; }
          .report-madin-identity td:nth-child(4) { width: 18%; }
          .report-madin-identity td:nth-child(5) { width: 3%; text-align: center; }
          .report-madin-identity td:nth-child(6) { width: 18%; font-weight: 700; }
          .report-madin-table { font-family: Georgia, "Times New Roman", serif; font-size: 8.5pt; border: 2px solid #111; }
          .report-madin-table th, .report-madin-table td { padding: 4px 3px; border: 1px solid #111; }
          .report-madin-table th { background: #dce8c4 !important; }
          .report-madin-table tbody tr { height: 7mm; }
          .report-madin-table .report-madin-summary td { border-top: 2px solid #111; }
          .report-madin-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin: 8mm 6mm 0; font-family: Georgia, "Times New Roman", serif; font-size: 9pt; }
          .report-madin-sign-left, .report-madin-sign-right { line-height: 1.8; }
          .report-madin-sign-right { text-align: left; }
          .report-madin-sign-space { height: 16mm; }
          .report-madin-head { grid-column: 1 / -1; text-align: center; margin-top: 2mm; line-height: 1.8; }

          .report-header { display: flex; align-items: center; gap: 14px; padding-bottom: 9px; }
          .report-logo {
            width: 66px; height: 66px; flex: 0 0 66px;
            display: flex; align-items: center; justify-content: center;
            border: 1.5px solid #111; border-radius: 10px; overflow: hidden; background: #fff; font-weight: 800; font-size: 16pt;
          }
          .report-logo img { width: 100%; height: 100%; object-fit: contain; }
          .report-header-text { flex: 1; text-align: center; }
          .report-school-name { font-size: 17pt; font-weight: 900; letter-spacing: .6px; text-transform: uppercase; }
          .report-school-address { margin-top: 2px; font-size: 8.5pt; line-height: 1.35; }
          .report-school-contact { margin-top: 1px; font-size: 8pt; line-height: 1.3; }
          .report-document-title { margin-top: 6px; font-size: 12pt; font-weight: 800; }
          .report-subtitle { margin-top: 2px; font-size: 8.5pt; }
          .report-title-line { border-top: 3px solid #111; border-bottom: 1px solid #111; height: 5px; margin-bottom: 12px; }
          .report-identity { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 10pt; }
          .report-identity td { padding: 2px 4px; vertical-align: top; }
          .report-identity td:nth-child(1), .report-identity td:nth-child(3) { width: 16%; font-weight: 400; }
          .report-identity td:nth-child(2) { width: 34%; }
          .report-identity td:nth-child(4) { width: 34%; }
          .report-title-line { border-top: 1px solid #111; height: 0; margin: 8px 0 14px; }
          .report-document-title-ak.hyar { text-align: center; font-size: 12pt; font-weight: 800; margin: 0 0 16px; }
          .report-section-title { margin: 12px 0 6px; font-size: 10.5pt; font-weight: 800; }
          .report-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
          .report-table th, .report-table td { border: 1px solid #111; padding: 5px 6px; vertical-align: middle; }
          .report-table th { background: #f2f2f2 !important; font-weight: 800; text-align: center; }
          .report-table td.text-center { text-align: center; }
          .report-table td.font-bold { font-weight: 800; }
          .report-attendance { width: 55%; border-collapse: collapse; font-size: 9.5pt; }
          .report-attendance td { border: 1px solid #111; padding: 5px 7px; }
          .report-attendance td:first-child { width: 60%; font-weight: 700; }
          .report-box { border: 1px solid #111; margin-bottom: 9px; min-height: 50mm; }
          .report-box-small { min-height: 25mm; }
          .report-box-label { padding: 5px 7px; background: #f2f2f2 !important; border-bottom: 1px solid #111; font-weight: 800; }
          .report-box-content { padding: 8px; white-space: pre-wrap; line-height: 1.45; }
          .report-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 35mm; margin-top: 18mm; }
          .report-signature, .report-head-signature { text-align: center; line-height: 1.45; }
          .report-signature-space { height: 22mm; }
          .report-signature-name { font-weight: 800; text-decoration: underline; }
          .report-head-signature { width: 45%; margin: 12mm auto 0; }
          .report-footer { margin-top: 18mm; text-align: center; font-size: 8pt; color: #555; }
          .report-page-second { padding-top: 3mm; }
          .report-identity-ak.hyar { margin: 0 0 7mm; font-size: 9pt; }
          .report-identity-ak.hyar td:nth-child(1), .report-identity-ak.hyar td:nth-child(3) { width: 16%; }
          .report-identity-ak.hyar td:nth-child(2) { width: 34%; }
          .report-identity-ak.hyar td:nth-child(4) { width: 34%; }
          .report-kokurikuler { min-height: 17mm; border: 1px solid #111; padding: 5px 7px; font-size: 9pt; }
          .report-extra-table { margin-bottom: 5mm; }
          .report-summary-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 6mm; align-items: stretch; margin-top: 2mm; }
          .report-attendance-full { width: 100%; }
          .report-teacher-note { min-height: 0; margin: 0; }
          .report-teacher-note .report-box-content { min-height: 19mm; }
          .report-status-row { display: flex; gap: 8px; align-items: baseline; margin-top: 5mm; padding: 5px 7px; border: 1px solid #111; font-size: 9pt; }
          .report-status-row strong { white-space: nowrap; }
          .report-parent-response { border: 1px solid #111; margin-top: 4mm; min-height: 22mm; }
          .report-parent-response .report-box-label { border-bottom: 1px solid #111; }
          .report-parent-response-space { min-height: 14mm; }
          .report-signature-grid { margin-top: 7mm; gap: 25mm; }
          .report-signature-space { height: 14mm; }
          .report-head-signature { margin-top: 5mm; }
          .report-footer { margin-top: 7mm; font-size: 8pt; }
          @page { size: A4 portrait; margin: 0; }
          .report-table tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    <DashboardShell
      role={role}
      name={name}
      displayName={userProfile.nama || name}
      photoUrl={userProfile.fotoUrl}
      activeMenu={activeMenu}
      onOpenMenu={openMenu}
      onLogout={logout}
      darkMode={darkMode}
      onToggleDarkMode={toggleDarkMode}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      notifications={portalNotifications}
      unreadNotificationCount={portalNotifications.filter((item) => !item.read_at && !item.resolved_at).length}
      notificationToast={notificationToast}
      onNotificationsViewed={() => { void markPortalNotificationsRead(); }}
      onDismissNotificationToast={() => {
        if (notificationToastTimerRef.current) window.clearTimeout(notificationToastTimerRef.current);
        notificationToastTimerRef.current = null;
        setNotificationToast(null);
      }}
    >
          {activeMenu === "Profil Saya" && (
            <div className="mx-auto max-w-5xl space-y-6">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Akun Saya</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight">Profil Saya</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Kelola foto dan biodata pribadi Anda. Data akademik seperti kelas, NIS/NISN, NIP/NUPTK, mapel, dan tugas mengajar tetap dikelola oleh sekolah.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {userProfile.fotoUrl ? (
                      <img src={userProfile.fotoUrl} alt="Foto profil" className="h-20 w-20 rounded-2xl border border-white/20 object-cover shadow-lg" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-3xl font-bold text-white ring-1 ring-white/20">
                        {(userProfile.nama || name).charAt(0).toUpperCase() || "A"}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{userProfile.nama || name || "Pengguna"}</p>
                      <p className="text-sm text-slate-300">{role}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-center">
                    {userProfile.fotoUrl ? (
                      <img src={userProfile.fotoUrl} alt="Foto profil" className="mx-auto h-36 w-36 rounded-3xl object-cover shadow-md ring-8 ring-slate-50" />
                    ) : (
                      <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-5xl font-bold text-white shadow-md ring-8 ring-slate-50">
                        {(userProfile.nama || name).charAt(0).toUpperCase() || "A"}
                      </div>
                    )}
                    <h2 className="mt-5 text-lg font-bold text-slate-900">{userProfile.nama || name || "Nama Pengguna"}</h2>
                    <p className="mt-1 text-sm text-slate-500">{role}</p>
                    <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                      📷 Ganti Foto
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleProfilePhoto(e.target.files?.[0])} />
                    </label>
                    <p className="mt-3 text-xs leading-5 text-slate-400">JPG, PNG, atau WEBP · maksimal 2 MB</p>
                  </div>

                  <div className="mt-7 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Akses Akun</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-slate-600">Peran</span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{role}</span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-400">Peran akun tidak dapat diubah dari halaman profil.</p>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Biodata Pribadi</h2>
                    <p className="mt-1 text-sm text-slate-500">Informasi di bawah ini dapat Anda perbarui sendiri.</p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Nama Lengkap</span><input value={userProfile.nama} onChange={(e) => setUserProfile((current) => ({ ...current, nama: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="Nama lengkap" /></label>
                    <label><span className="mb-2 block text-sm font-semibold text-slate-700">Email</span><input type="email" value={userProfile.email} onChange={(e) => setUserProfile((current) => ({ ...current, email: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="email@contoh.com" /></label>
                    <label><span className="mb-2 block text-sm font-semibold text-slate-700">No. HP / WhatsApp</span><input value={userProfile.noHp} onChange={(e) => setUserProfile((current) => ({ ...current, noHp: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="08xxxxxxxxxx" /></label>
                    <label><span className="mb-2 block text-sm font-semibold text-slate-700">Tempat Lahir</span><input value={userProfile.tempatLahir} onChange={(e) => setUserProfile((current) => ({ ...current, tempatLahir: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="Kota/Kabupaten" /></label>
                    <label><span className="mb-2 block text-sm font-semibold text-slate-700">Tanggal Lahir</span><input type="date" value={userProfile.tanggalLahir} onChange={(e) => setUserProfile((current) => ({ ...current, tanggalLahir: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" /></label>
                    <label><span className="mb-2 block text-sm font-semibold text-slate-700">Jenis Kelamin</span><select value={userProfile.jenisKelamin} onChange={(e) => setUserProfile((current) => ({ ...current, jenisKelamin: e.target.value as UserProfile["jenisKelamin"] }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"><option value="">Pilih</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></label>
                    <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Alamat</span><textarea rows={3} value={userProfile.alamat} onChange={(e) => setUserProfile((current) => ({ ...current, alamat: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="Alamat tempat tinggal" /></label>
                    <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Tentang Saya</span><textarea rows={4} maxLength={300} value={userProfile.bio} onChange={(e) => setUserProfile((current) => ({ ...current, bio: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="Tuliskan bio singkat..." /><span className="mt-1 block text-right text-xs text-slate-400">{userProfile.bio.length}/300</span></label>
                  </div>

                  <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">{profileSaved ? <span className="font-semibold text-emerald-600">✓ Profil tersimpan di perangkat ini.</span> : <span className="text-slate-400">Perubahan belum disimpan.</span>}</div>
                    <button onClick={saveUserProfile} disabled={profileSaving} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{profileSaving ? "Menyimpan..." : "Simpan Perubahan"}</button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {photoCropSrc && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Atur foto profil">
              <div className="my-auto w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div><h2 className="text-xl font-bold text-slate-900">Atur Foto Profil</h2><p className="mt-1 text-sm text-slate-500">Geser foto agar pas, lalu atur ukuran dengan zoom.</p></div>
                  <button type="button" onClick={() => setPhotoCropSrc("")} className="rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup editor">✕</button>
                </div>
                <div className="relative mx-auto mb-5 flex h-[280px] w-[280px] max-w-full touch-none items-center justify-center overflow-hidden rounded-2xl bg-slate-100" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); photoCropDragStart.current = { x: event.clientX, y: event.clientY, offsetX: photoCropOffset.x, offsetY: photoCropOffset.y }; setPhotoCropDragging(true); }} onPointerMove={(event) => { if (!photoCropDragStart.current) return; setPhotoCropOffset({ x: photoCropDragStart.current.offsetX + event.clientX - photoCropDragStart.current.x, y: photoCropDragStart.current.offsetY + event.clientY - photoCropDragStart.current.y }); }} onPointerUp={() => { photoCropDragStart.current = null; setPhotoCropDragging(false); }} onPointerCancel={() => { photoCropDragStart.current = null; setPhotoCropDragging(false); }}>
                  <img src={photoCropSrc} alt="Pratinjau potongan foto" draggable={false} className={`h-full w-full select-none object-cover ${photoCropDragging ? "cursor-grabbing" : "cursor-grab"}`} style={{ transform: `translate(${photoCropOffset.x}px, ${photoCropOffset.y}px) scale(${photoCropZoom})` }} />
                  <div className="pointer-events-none absolute h-[280px] w-[280px] max-w-full rounded-full border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.12)]" />
                </div>
                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600"><label htmlFor="profile-photo-zoom">Perbesar / perkecil</label><span>{Math.round(photoCropZoom * 100)}%</span></div>
                  <input id="profile-photo-zoom" type="range" min="1" max="3" step="0.05" value={photoCropZoom} onChange={(event) => setPhotoCropZoom(Number(event.target.value))} className="w-full accent-emerald-600" />
                  <p className="mt-2 text-xs text-slate-400">Tip: sentuh atau klik foto lalu geser untuk mengatur posisi wajah.</p>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setPhotoCropSrc(""); setPhotoCropZoom(1); setPhotoCropOffset({ x: 0, y: 0 }); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button><button type="button" onClick={saveCroppedProfilePhoto} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Simpan Foto</button></div>
              </div>
            </div>
          )}

          {activeMenu === "Dashboard" && (
            (role === "Siswa" || role === "Orang Tua") ? (
              <StudentDashboard
                role={role}
                name={name}
                selectedSemester={selectedSemester}
                dashboardChild={dashboardChild}
                dashboardError={dashboardError}
                dashboardLoading={dashboardLoading}
                dashboardAverage={dashboardAverage}
                dashboardLearning={dashboardLearning}
                dashboardAttendance={dashboardAttendance}
                dashboardOutstanding={dashboardOutstanding}
                onOpenMenu={openMenu}
              />
            ) : (
              <StaffDashboard
                name={name}
                role={role}
                currentUserId={currentUserId}
                dashboardLoading={dashboardLoading}
                dashboardSchoolStats={dashboardSchoolStats}
                activityRows={activityRows}
                onCreateAnnouncement={createSchoolAnnouncement}
                onOpenMenu={openMenu}
                onOpenTeacherLesson={openTeacherLessonAction}
              />
            )
          )}

          {activeMenu === "Kalender Akademik" && (role === "Admin" || role === "Kepala Sekolah" || role === "Guru") && (
            <Section title="Kalender Akademik SD" subtitle="Kalender Pendidikan Provinsi Jawa Barat · Tahun Ajaran 2026/2027 · Juli 2026–Juli 2027.">
              <AcademicCalendarView
                events={dashboardSchoolStats.schoolEvents ?? []}
                onRefresh={loadAcademicCalendar}
                role={role}
                onUpdateEvent={updateAcademicCalendarEvent}
              />
            </Section>
          )}

          {activeMenu === "Data Siswa" && (
            <Section
              title="Data Siswa"
              subtitle="Data siswa sekarang diambil langsung dari Supabase. Tambah, edit, dan hapus hanya dapat dilakukan Admin."
            >
              {studentError && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <b>Catatan:</b> {studentError}
                </div>
              )}

              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Total siswa: <span className="font-bold">{studentRows.length}</span>
                </div>
                {role === "Admin" && (
                  <button type="button" onClick={openStudentCreate} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
                    + Tambah Siswa
                  </button>
                )}
              </div>

              {studentLoading && !studentFormOpen && (
                <div className="mb-5 rounded-2xl border bg-gray-50 p-4 text-center text-sm text-gray-500">Memuat data siswa dari database...</div>
              )}
              {!selectedClass ? (
                <>
                  <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="font-semibold text-emerald-800">📁 Data siswa per kelas</p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Klik folder kelas untuk membuka daftar siswa. Kelas terdiri dari 1, 2, 3, 4 Umar, 4 Ali, 5, dan 6. Pencarian siswa tersedia berdasarkan nama, NIS, atau NISN.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...new Set([...classNames, ...studentRows.map((student) => student.class).filter(Boolean)])].map((className) => {
                      const classStudents = studentRows.filter((student) => student.class === className);

                      return (
                        <button
                          key={className}
                          type="button"
                          onClick={() => {
                            setSelectedClass(className);
                            setStudentSearch("");
                          }}
                          className="group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
                                📁
                              </div>
                              <div>
                                <p className="text-lg font-bold text-gray-900">Kelas {className}</p>
                                <p className="mt-1 text-sm text-gray-500">{classStudents.length} siswa</p>
                              </div>
                            </div>
                            <span className="text-xl text-gray-400 transition group-hover:translate-x-1 group-hover:text-emerald-600">→</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-5 flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClass(null);
                          setStudentSearch("");
                        }}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        ← Kembali
                      </button>
                      <div>
                        <p className="text-xs text-gray-500">Folder kelas</p>
                        <h3 className="text-xl font-bold">📁 Kelas {selectedClass}</h3>
                      </div>
                    </div>

                    <div className="w-full sm:max-w-md">
                      <label className="sr-only" htmlFor="student-search">
                        Cari siswa berdasarkan nama, NIS, atau NISN
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
                        <input
                          id="student-search"
                          value={studentSearch}
                          onChange={(event) => setStudentSearch(event.target.value)}
                          placeholder="Cari nama, NIS, atau NISN..."
                          className="w-full rounded-xl border bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const keyword = studentSearch.trim().toLowerCase();
                    const classStudents = studentRows.filter((student) => {
                      if (student.class !== selectedClass) return false;
                      if (!keyword) return true;

                      return (
                        student.name.toLowerCase().includes(keyword) ||
                        student.nis.toLowerCase().includes(keyword) ||
                        student.nisn.toLowerCase().includes(keyword)
                      );
                    });

                    return classStudents.length > 0 ? (
                      <div className="overflow-hidden rounded-2xl border bg-white">
                        <div className="border-b bg-gray-50 px-5 py-4">
                          <p className="text-sm font-semibold text-gray-700">
                            {classStudents.length} siswa ditemukan
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                              <tr className="border-b text-gray-500">
                                <th className="px-5 py-3">No</th>
                                <th className="px-5 py-3">Nama Siswa</th>
                                <th className="px-5 py-3">NIS</th>
                                <th className="px-5 py-3">NISN</th>
                                <th className="px-5 py-3">Kelas</th>
                                <th className="px-5 py-3">Status</th>
                                {role === "Admin" && <th className="px-5 py-3">Aksi</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {classStudents.map((student, index) => (
                                <tr key={student.id} className="border-b last:border-0 hover:bg-gray-50">
                                  <td className="px-5 py-4">{index + 1}</td>
                                  <td className="px-5 py-4 font-semibold text-gray-900">{student.name}</td>
                                  <td className="px-5 py-4 text-gray-600">{student.nis}</td>
                                  <td className="px-5 py-4 text-gray-600">{student.nisn || "-"}</td>
                                  <td className="px-5 py-4">
                                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                      {student.class}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4"><Badge text={student.status} /></td>
                                  {role === "Admin" && (
                                    <td className="px-5 py-4">
                                      <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => openStudentEdit(student)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">Edit</button>
                                        <button type="button" onClick={() => deleteStudent(student.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100">Hapus</button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
                        <div className="text-4xl">🔎</div>
                        <p className="mt-3 font-semibold text-gray-800">Siswa tidak ditemukan</p>
                        <p className="mt-1 text-sm text-gray-500">Coba gunakan nama, NIS, atau NISN yang berbeda.</p>
                      </div>
                    );
                  })()}
                </>
              )}
            </Section>
          )}

          {studentFormOpen && role === "Admin" && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
              <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-600">Master Data Siswa</p>
                    <h3 className="mt-1 text-xl font-bold text-gray-900">{studentEditingId ? "Edit Siswa" : "Tambah Siswa"}</h3>
                  </div>
                  <button type="button" onClick={() => setStudentFormOpen(false)} className="rounded-xl border px-3 py-2 text-gray-500 hover:bg-gray-50">✕</button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">Nama Siswa *</span>
                    <input value={studentForm.name} onChange={(e) => setStudentForm((v) => ({ ...v, name: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder="Nama lengkap siswa" />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-700">NIS *</span>
                    <input value={studentForm.nis} onChange={(e) => setStudentForm((v) => ({ ...v, nis: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder="Nomor induk siswa" />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-700">NISN</span>
                    <input value={studentForm.nisn} onChange={(e) => setStudentForm((v) => ({ ...v, nisn: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder="NISN" />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-700">Kelas</span>
                    <input value={studentForm.className} onChange={(e) => setStudentForm((v) => ({ ...v, className: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder="Contoh: 1, 2, 3, 4, 5, 6" />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-700">Status</span>
                    <select value={studentForm.status} onChange={(e) => setStudentForm((v) => ({ ...v, status: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500">
                      <option value="Aktif">Aktif</option>
                      <option value="Lulus">Lulus</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setStudentFormOpen(false)} className="rounded-xl border px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Batal</button>
                  <button type="button" disabled={studentLoading} onClick={saveStudent} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{studentLoading ? "Menyimpan..." : "Simpan Siswa"}</button>
                </div>
              </div>
            </div>
          )}

          {activeMenu === "Data Guru" && (
            <Section
              title="Data Guru"
              subtitle="Kelola data guru dan tenaga pendidik. Tambah, edit, dan hapus hanya dapat dilakukan Admin."
            >
              {teacherError && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <b>Catatan:</b> {teacherError}
                  <p className="mt-1 text-xs">Jika tabel <code>school_teachers</code> belum dibuat, jalankan SQL yang saya berikan bersama file ini.</p>
                </div>
              )}

              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
                  <input
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Cari nama guru, NIP, atau mata pelajaran..."
                    className="w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Total guru: <span className="font-bold">{teacherRows.length}</span>
                  </div>
                  {role === "Admin" && (
                    <button type="button" onClick={openTeacherCreate} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
                      + Tambah Guru
                    </button>
                  )}
                </div>
              </div>

              {teacherLoading ? (
                <div className="rounded-2xl border bg-gray-50 p-10 text-center text-sm text-gray-500">Memuat data guru...</div>
              ) : (() => {
                const keyword = teacherSearch.trim().toLowerCase();
                const filteredTeachers = teacherRows.filter((teacher) =>
                  [teacher.name, teacher.nip, teacher.subject, teacher.position, teacher.waliKelas, teacher.classes.join(" ")]
                    .join(" ")
                    .toLowerCase()
                    .includes(keyword)
                );

                if (filteredTeachers.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed bg-gray-50 p-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><MenuIcon name="teachers" size={22} /></div>
                      <p className="mt-3 font-semibold text-gray-700">Belum ada data guru</p>
                      <p className="mt-1 text-sm text-gray-500">{teacherSearch ? "Guru yang dicari tidak ditemukan." : "Klik + Tambah Guru untuk memasukkan data guru."}</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-2xl border bg-white">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-gray-500">
                          <th className="px-4 py-3">No</th>
                          <th className="px-4 py-3">Nama Guru</th>
                          <th className="px-4 py-3">NIP</th>
                          <th className="px-4 py-3">Mata Pelajaran</th>
                          <th className="px-4 py-3">Wali Kelas</th>
                          <th className="px-4 py-3">Status</th>
                          {role === "Admin" && <th className="px-4 py-3 text-right">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeachers.map((teacher, index) => (
                          <tr key={teacher.id} className="border-b last:border-0 hover:bg-emerald-50/50">
                            <td className="px-4 py-4">{index + 1}</td>
                            <td className="px-4 py-4">
                              <button type="button" onClick={() => setSelectedTeacher(teacher)} className="text-left font-semibold text-emerald-700 hover:underline">{teacher.name}</button>
                              <div className="mt-1 text-xs text-gray-500">{teacher.position}</div>
                            </td>
                            <td className="px-4 py-4 text-gray-600">{teacher.nip || "-"}</td>
                            <td className="px-4 py-4">{teacher.subject || "-"}</td>
                            <td className="px-4 py-4">{teacher.waliKelas || "-"}</td>
                            <td className="px-4 py-4"><Badge text={teacher.status || "Aktif"} /></td>
                            {role === "Admin" && (
                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => openTeacherEdit(teacher)} className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Edit</button>
                                  <button type="button" onClick={() => deleteTeacher(teacher.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Hapus</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {teacherFormOpen && role === "Admin" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTeacherFormOpen(false)}>
                  <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Manajemen Guru</p>
                        <h3 className="mt-1 text-xl font-bold text-gray-900">{teacherEditingId ? "Edit Data Guru" : "Tambah Guru Baru"}</h3>
                        <p className="mt-1 text-sm text-gray-500">Data ini disimpan ke database sekolah. Akun login guru dibuat/diatur terpisah.</p>
                      </div>
                      <button type="button" onClick={() => setTeacherFormOpen(false)} className="rounded-xl px-3 py-2 text-gray-500 hover:bg-gray-100">✕</button>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Nama Lengkap *</span><input value={teacherForm.name} onChange={(e) => setTeacherForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder="Contoh: Ahmad Fauzi, S.Pd." /></label>
                      <label><span className="mb-1.5 block text-sm font-semibold">NIP</span><input value={teacherForm.nip} onChange={(e) => setTeacherForm((current) => ({ ...current, nip: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder="Kosongkan jika belum ada" /></label>
                      <label><span className="mb-1.5 block text-sm font-semibold">Jabatan</span><select value={teacherForm.position} onChange={(e) => setTeacherForm((current) => ({ ...current, position: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500"><option>Guru Mata Pelajaran</option><option>Guru Kelas</option><option>Kepala Sekolah</option><option>Tenaga Kependidikan</option><option>Guru Honorer</option></select></label>
                      <label><span className="mb-1.5 block text-sm font-semibold">Mata Pelajaran</span><input value={teacherForm.subject} onChange={(e) => setTeacherForm((current) => ({ ...current, subject: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder="Contoh: Matematika" /></label>
                      <label><span className="mb-1.5 block text-sm font-semibold">Kelas yang Diajar</span><input value={teacherForm.classes} onChange={(e) => setTeacherForm((current) => ({ ...current, classes: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder="Contoh: 4 Umar, 5, 6" /></label>
                      <label><span className="mb-1.5 block text-sm font-semibold">Wali Kelas</span><input value={teacherForm.waliKelas} onChange={(e) => setTeacherForm((current) => ({ ...current, waliKelas: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder="Contoh: Kelas 6 / kosong jika bukan wali" /></label>
                      <label><span className="mb-1.5 block text-sm font-semibold">Status</span><select value={teacherForm.status} onChange={(e) => setTeacherForm((current) => ({ ...current, status: e.target.value }))} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500"><option>Aktif</option><option>Nonaktif</option></select></label>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                      <button type="button" onClick={() => setTeacherFormOpen(false)} className="rounded-xl border px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50">Batal</button>
                      <button type="button" onClick={saveTeacher} disabled={teacherSaving} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{teacherSaving ? "Menyimpan..." : "Simpan Data Guru"}</button>
                    </div>
                  </div>
                </div>
              )}

              {selectedTeacher && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedTeacher(null)}>
                  <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Detail Guru</p><h3 className="mt-1 text-xl font-bold text-gray-900">{selectedTeacher.name}</h3><p className="mt-1 text-sm text-gray-500">{selectedTeacher.position}</p></div>
                      <button type="button" onClick={() => setSelectedTeacher(null)} className="rounded-xl px-3 py-2 text-gray-500 hover:bg-gray-100">✕</button>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs text-gray-500">NIP</p><p className="mt-1 font-semibold">{selectedTeacher.nip || "-"}</p></div>
                      <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Mata Pelajaran</p><p className="mt-1 font-semibold">{selectedTeacher.subject || "-"}</p></div>
                      <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Kelas yang Diajar</p><p className="mt-1 font-semibold">{selectedTeacher.classes.length ? selectedTeacher.classes.join(", ") : "-"}</p></div>
                      <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Wali Kelas</p><p className="mt-1 font-semibold">{selectedTeacher.waliKelas || "-"}</p></div>
                    </div>
                    <div className="mt-5 flex items-center justify-between rounded-2xl border p-4"><div><p className="text-xs text-gray-500">Status</p><div className="mt-2"><Badge text={selectedTeacher.status || "Aktif"} /></div></div><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><MenuIcon name="teachers" size={21} /></span></div>
                    {role === "Admin" && selectedTeacher.id.startsWith("demo-") && <p className="mt-4 text-xs text-amber-700">Data contoh masih tampil karena tabel database guru belum tersedia.</p>}
                  </div>
                </div>
              )}
            </Section>
          )}

          {activeMenu === "Jadwal" && (
            <Section
              title="Jadwal Pelajaran"
              subtitle="Jadwal terhubung langsung ke database sekolah"
            >
              {scheduleError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {scheduleError}
                </div>
              )}

              {role === "Admin" && (
                <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">Kelola Jadwal</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Tambah, edit, atau hapus jadwal. Sistem akan mengecek bentrok kelas dan guru.
                      </p>
                    </div>
                    <button
                      onClick={openScheduleCreate}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      + Tambah Jadwal
                    </button>
                  </div>

                  {scheduleFormOpen && (
                    <div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            {scheduleEditingId ? "Edit Jadwal" : "Tambah Jadwal"}
                          </h4>
                          <p className="mt-1 text-xs text-gray-500">
                            Pastikan guru dan kelas tidak memiliki jadwal yang bertabrakan.
                          </p>
                        </div>
                        <button
                          onClick={() => { setScheduleFormOpen(false); resetScheduleForm(); }}
                          className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
                        >
                          Tutup
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Kelas</label>
                          <select
                            value={scheduleForm.classId}
                            onChange={(e) => setScheduleForm((prev) => ({ ...prev, classId: e.target.value }))}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                          >
                            <option value="">Pilih kelas</option>
                            {scheduleClasses.map((item) => (
                              <option key={item.id} value={item.id}>{item.nama}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Mata Pelajaran</label>
                          <select
                            value={scheduleForm.subjectId}
                            onChange={(e) => setScheduleForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                          >
                            <option value="">Pilih mapel</option>
                            {scheduleSubjects.map((item) => (
                              <option key={item.id} value={item.id}>{item.nama} ({item.kode})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Guru</label>
                          <select
                            value={scheduleForm.teacherId}
                            onChange={(e) => setScheduleForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                          >
                            <option value="">Pilih guru</option>
                            {scheduleTeachers.map((item) => (
                              <option key={item.id} value={item.id}>{item.nama}</option>
                            ))}
                          </select>
                          <p className="mt-1.5 text-xs text-gray-500">Nama guru diambil otomatis dari Data Guru.</p>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Hari</label>
                          <select
                            value={scheduleForm.hari}
                            onChange={(e) => setScheduleForm((prev) => ({ ...prev, hari: e.target.value }))}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                          >
                            {schoolDays.map((day) => <option key={day} value={day}>{day}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Jam Mulai</label>
                          <input
                            type="time"
                            value={scheduleForm.jamMulai}
                            onChange={(e) => setScheduleForm((prev) => ({ ...prev, jamMulai: e.target.value }))}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Jam Selesai</label>
                          <input
                            type="time"
                            value={scheduleForm.jamSelesai}
                            onChange={(e) => setScheduleForm((prev) => ({ ...prev, jamSelesai: e.target.value }))}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Ruang (opsional)</label>
                          <input
                            value={scheduleForm.ruang}
                            onChange={(e) => setScheduleForm((prev) => ({ ...prev, ruang: e.target.value }))}
                            placeholder="Contoh: Ruang 6A"
                            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => { setScheduleFormOpen(false); resetScheduleForm(); }}
                          className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Batal
                        </button>
                        <button
                          onClick={saveSchedule}
                          disabled={scheduleSaving}
                          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {scheduleSaving ? "Menyimpan..." : scheduleEditingId ? "Simpan Perubahan" : "Simpan Jadwal"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {scheduleLoading ? (
                <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">
                  Memuat jadwal...
                </div>
              ) : !selectedClass ? (
                <div>
                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-gray-900">
                      Pilih Kelas
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Pilih kelas untuk melihat jadwal pelajaran.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {scheduleClassOptions.map((className) => {
                      const classCount = scheduleRows.filter(
                        (row) => row.className === className
                      ).length;

                      return (
                        <button
                          key={className}
                          onClick={() => {
                            setSelectedClass(className);
                            setSelectedDay(null);
                          }}
                          className="group rounded-2xl border bg-white p-6 text-left transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Kelas
                              </p>
                              <h3 className="mt-1 text-2xl font-bold text-gray-900">
                                {className}
                              </h3>
                            </div>

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                              📚
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between">
                            <span className="text-sm text-emerald-600">
                              {classCount} jadwal
                            </span>
                            <span className="text-lg transition group-hover:translate-x-1">
                              →
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : !selectedDay ? (
                <div>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <button
                        onClick={() => setSelectedClass(null)}
                        className="mb-3 text-sm font-medium text-emerald-600 hover:underline"
                      >
                        ← Kembali ke Pilih Kelas
                      </button>

                      <h3 className="text-xl font-bold text-gray-900">
                        Jadwal Kelas {selectedClass}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Pilih hari untuk melihat pelajaran.
                      </p>
                    </div>

                    <div className="w-fit rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                      Kelas {selectedClass}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {schoolDays.map((day) => {
                      const lessonCount = scheduleRows.filter(
                        (row) =>
                          row.className === selectedClass && row.hari === day
                      ).length;

                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          className="group rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">
                              {day === "Jumat" ? "🕌" : "📅"}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                              {lessonCount} pelajaran
                            </span>
                          </div>

                          <h4 className="mt-5 text-lg font-bold text-gray-900">
                            {day}
                          </h4>

                          <p className="mt-1 text-sm text-emerald-600">
                            Lihat jadwal →
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <button
                      onClick={() => setSelectedDay(null)}
                      className="mb-3 text-sm font-medium text-emerald-600 hover:underline"
                    >
                      ← Kembali ke Pilih Hari
                    </button>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          Jadwal Kelas {selectedClass}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Daftar pelajaran hari {selectedDay}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                          {selectedClass}
                        </span>
                        <span className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                          {selectedDay}
                        </span>
                      </div>
                    </div>
                  </div>

                  {scheduleRows.filter(
                    (row) =>
                      row.className === selectedClass && row.hari === selectedDay
                  ).length === 0 ? (
                    <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
                      <div className="text-4xl">📭</div>
                      <p className="mt-3 font-semibold text-gray-700">
                        Belum ada jadwal
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Jadwal untuk hari ini belum dimasukkan.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scheduleRows
                        .filter(
                          (row) =>
                            row.className === selectedClass &&
                            row.hari === selectedDay
                        )
                        .map((item, index) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border bg-white p-5 transition hover:shadow-md"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                                📖
                              </div>

                              <div className="flex-1">
                                <p className="text-sm font-semibold text-emerald-600">
                                  {item.jamMulai} - {item.jamSelesai}
                                </p>

                                <h4 className="mt-1 text-lg font-bold text-gray-900">
                                  {item.subjectName}
                                </h4>

                                <p className="mt-1 text-sm text-gray-500">
                                  Pengajar: {item.teacherName}
                                </p>

                                {item.ruang && (
                                  <p className="mt-1 text-sm text-gray-500">
                                    Ruang: {item.ruang}
                                  </p>
                                )}
                              </div>

                              {role === "Admin" ? (
                                <div className="flex shrink-0 gap-2">
                                  <button
                                    onClick={() => openScheduleEdit(item.id)}
                                    className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteSchedule(item.id)}
                                    className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ) : (
                                <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                                  <p className="text-xs text-gray-400">Pelajaran</p>
                                  <p className="mt-1 font-bold text-gray-700">#{index + 1}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

          {activeMenu === "Journal" && (
            <Section
              title="Journal Kelas"
              subtitle="Catatan pembelajaran sesuai format jurnal sekolah"
            >
              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">Bulan</label>
                    <select value={journalMonth} onChange={(e) => setJournalMonth(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                      {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{new Date(2000, i, 1).toLocaleString("id-ID", { month: "long" })}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">Tahun</label>
                    <input value={journalYear} onChange={(e) => setJournalYear(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">Kelas</label>
                    <select value={journalClassId} onChange={(e) => setJournalClassId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                      <option value="">Semua kelas</option>
                      {journalClassOptions.map((item, index) => <option key={`${item.id || item.nama}-${index}`} value={item.id}>{item.nama}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">Mata Pelajaran</label>
                    <select value={journalSubjectId} onChange={(e) => setJournalSubjectId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                      <option value="">Semua mapel</option>
                      {journalSubjectOptions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.code ? ` (${item.code})` : ""}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => loadJournalData()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">🔎 Tampilkan</button>
                  <button type="button" onClick={openNewJournal} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">＋ Tambah Jurnal</button>
                  <button type="button" onClick={() => printSchoolLearningDocument("Jurnal Mengajar", ["No", "Tanggal", "Hari", "Kelas", "Jam", "Tujuan Pembelajaran", "Materi", "Kegiatan", "Catatan"], journalRows.map((row, i) => [i + 1, row.tanggal, new Date(`${row.tanggal}T12:00:00`).toLocaleDateString("id-ID", { weekday: "long" }), row.className, row.jam, row.tujuan_pembelajaran || "-", row.materi_pembelajaran || "-", row.kegiatan, row.catatan || "-"]))} className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700">🖨️ Cetak / Simpan PDF</button>
                </div>
              </div>

              {journalError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{journalError}</div>}

              {journalFormOpen && (
                <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div><h3 className="font-bold text-slate-900">{journalEditingId ? "Edit Jurnal" : "Tambah Jurnal"}</h3><p className="text-xs text-slate-500">Format mengikuti jurnal kelas sekolah.</p></div>
                    <button type="button" onClick={() => setJournalFormOpen(false)} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-white">Tutup</button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Kelas</label><select value={journalClassId} onChange={(e) => { setJournalClassId(e.target.value); setJournalSubjectId(""); }} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Pilih kelas</option>{journalClassOptions.map((item, index) => <option key={`${item.id || item.nama}-form-${index}`} value={item.id}>{item.nama}</option>)}</select></div>
                    <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Mata Pelajaran / Kegiatan</label><select value={journalSubjectId} onChange={(e) => setJournalSubjectId(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Kegiatan / tanpa mapel</option>{journalSubjectOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                    <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Hari / Tanggal</label><input type="date" value={journalForm.tanggal} onChange={(e) => setJournalForm((v) => ({ ...v, tanggal: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                    <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Jam</label><input value={journalForm.jam} onChange={(e) => setJournalForm((v) => ({ ...v, jam: e.target.value }))} placeholder="Contoh: 2 atau 3-4" className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-bold text-slate-600">Kegiatan / Mata Pelajaran</label><input value={journalForm.kegiatan} onChange={(e) => setJournalForm((v) => ({ ...v, kegiatan: e.target.value }))} placeholder="Contoh: Fikih, Matematika, atau kegiatan kelas" className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                    <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Tujuan Pembelajaran</label><textarea value={journalForm.tujuan_pembelajaran} onChange={(e) => setJournalForm((v) => ({ ...v, tujuan_pembelajaran: e.target.value }))} rows={4} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                    <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Materi Pembelajaran</label><textarea value={journalForm.materi_pembelajaran} onChange={(e) => setJournalForm((v) => ({ ...v, materi_pembelajaran: e.target.value }))} rows={4} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-bold text-slate-600">Catatan</label><textarea value={journalForm.catatan} onChange={(e) => setJournalForm((v) => ({ ...v, catatan: e.target.value }))} rows={3} placeholder="Catatan jurnal" className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                  </div>

                  {journalClassId && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3"><p className="text-sm font-bold">Kehadiran Siswa</p><p className="text-xs text-slate-500">Status otomatis mengikuti Absensi Siswa untuk kelas dan tanggal jurnal ini.</p>{journalAttendanceLoading && <p className="mt-1 text-xs text-blue-600">Mengambil data absensi siswa...</p>}</div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {attendanceStudents.filter((student) => student.classId === journalClassId).map((student) => {
                          const attendanceStatus = journalStudentAttendance[student.id];
                          const savedJournalStatus = journalAbsences[student.id];
                          const displayStatus = attendanceStatus || savedJournalStatus || "Belum diabsen";
                          return (
                            <div key={student.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                              <span className="min-w-0 flex-1 truncate text-sm">{student.name}</span>
                              <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${displayStatus === "Hadir" ? "bg-emerald-100 text-emerald-700" : displayStatus === "Izin" || displayStatus === "Sakit" ? "bg-amber-100 text-amber-700" : displayStatus === "Alpa" || displayStatus === "Alpa" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"}`}>{displayStatus}</span>
                            </div>
                          );
                        })}
                        {!attendanceStudents.some((student) => student.classId === journalClassId) && <p className="text-xs text-slate-500">Data siswa untuk kelas ini belum tersedia.</p>}
                        {!journalAttendanceLoading && Object.keys(journalStudentAttendance).length === 0 && <p className="text-xs text-amber-700">Absensi siswa untuk tanggal ini belum tersedia.</p>}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setJournalFormOpen(false)} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-600">Batal</button><button type="button" disabled={journalSaving} onClick={saveJournal} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{journalSaving ? "Menyimpan..." : "Simpan Jurnal"}</button></div>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-bold">Jurnal Kelas SD Islam Al-Barkah</h3><p className="text-xs text-slate-500">Rekap {new Date(Number(journalYear), Number(journalMonth) - 1, 1).toLocaleString("id-ID", { month: "long", year: "numeric" })}</p></div>
                {journalLoading ? <div className="p-8 text-center text-sm text-slate-500">Memuat jurnal...</div> : journalRows.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Belum ada jurnal pada filter ini.</div> : (
                  <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-50"><tr><th className="border-b px-3 py-3 text-left">Hari / Tanggal</th><th className="border-b px-3 py-3 text-left">Jam</th><th className="border-b px-3 py-3 text-left">Mata Pelajaran / Kegiatan</th><th className="border-b px-3 py-3 text-left">Tujuan Pembelajaran</th><th className="border-b px-3 py-3 text-left">Materi Pembelajaran</th><th className="border-b px-3 py-3 text-left">Siswa yang Tidak Hadir</th><th className="border-b px-3 py-3 text-left">Catatan</th><th className="border-b px-3 py-3 text-center">Aksi</th></tr></thead><tbody>
                    {journalRows.map((row) => <tr key={row.id} className="align-top hover:bg-slate-50"><td className="border-b px-3 py-3 whitespace-nowrap">{new Date(`${row.tanggal}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</td><td className="border-b px-3 py-3 whitespace-nowrap font-semibold">{row.jam}</td><td className="border-b px-3 py-3"><div className="font-bold">{row.subjectName !== "-" ? row.subjectName : row.kegiatan}</div>{row.subjectName !== "-" && <div className="text-xs text-slate-500">{row.kegiatan}</div>}<div className="mt-1 text-xs text-slate-500">Kelas {row.className}</div></td><td className="border-b px-3 py-3 whitespace-pre-wrap">{row.tujuan_pembelajaran || "-"}</td><td className="border-b px-3 py-3 whitespace-pre-wrap">{row.materi_pembelajaran || "-"}</td><td className="border-b px-3 py-3">{row.absenceRows.length ? row.absenceRows.map((a) => <div key={a.studentId}>{a.studentName} ({a.keterangan})</div>) : "-"}</td><td className="border-b px-3 py-3 whitespace-pre-wrap">{row.catatan || "-"}</td><td className="border-b px-3 py-3"><div className="flex justify-center gap-2"><button type="button" onClick={() => openEditJournal(row)} className="rounded-lg border px-2.5 py-1.5 text-xs font-bold hover:bg-slate-100">Edit</button><button type="button" onClick={() => deleteJournal(row.id)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Hapus</button></div></td></tr>)}
                  </tbody></table></div>
                )}
              </div>
            </Section>
          )}

          {activeMenu === "Remedial & Pengayaan" && (
            <Section
              title="Remedial & Pengayaan"
              subtitle={role === "Siswa" ? "Riwayat tindak lanjut hasil belajar Anda" : "Catat dan pantau tindak lanjut hasil belajar siswa"}
            >
              <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  {role !== "Siswa" && <>
                    <div className="min-w-[180px] flex-1"><label className="mb-1 block text-xs font-bold text-slate-600">Kelas</label><select value={remedialClassId} onChange={(e) => { setRemedialClassId(e.target.value); setRemedialForm((v) => ({ ...v, classId: e.target.value, studentId: "" })); void loadRemedialData(); }} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Semua kelas</option>{programClasses.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></div>
                    <div className="min-w-[180px] flex-1"><label className="mb-1 block text-xs font-bold text-slate-600">Mata Pelajaran</label><select value={remedialSubjectId} onChange={(e) => { setRemedialSubjectId(e.target.value); void loadRemedialData(); }} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Semua mapel</option>{programSubjects.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></div>
                    <div className="min-w-[160px]"><label className="mb-1 block text-xs font-bold text-slate-600">Jenis</label><select value={remedialTypeFilter} onChange={(e) => { setRemedialTypeFilter(e.target.value); void loadRemedialData(); }} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="all">Semua</option><option value="remedial">Remedial</option><option value="pengayaan">Pengayaan</option></select></div>
                    <button type="button" onClick={openNewRemedial} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">＋ Tambah</button>
                    <button type="button" onClick={() => printSchoolLearningDocument("Program Remedial & Pengayaan", ["No", "Nama Siswa", "Mata Pelajaran", "Tanggal", "Tujuan Pembelajaran", "Rencana Program", "Hasil Sebelum", "Hasil Sesudah"], remedialRows.map((row, i) => [i + 1, row.studentName, row.subjectName, row.tanggal, row.materi || "-", `${row.jenis === "remedial" ? "Remedial" : "Pengayaan"} - ${row.catatan || row.status}`, row.nilai_awal ?? "-", row.nilai_hasil ?? "-"]))} className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-800">🖨️ Cetak / Simpan PDF</button>
                  </>}
                  {role === "Siswa" && <div><p className="text-sm font-bold text-amber-900">Tindak lanjut hasil belajar</p><p className="text-xs text-amber-800">Data diambil langsung dari guru dan tersinkron dengan akun siswa.</p></div>}
                </div>
              </div>
              {remedialError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{remedialError}</div>}
              {remedialFormOpen && role !== "Siswa" && (
                <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
                  <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">{remedialEditingId ? "Edit Remedial/Pengayaan" : "Tambah Remedial/Pengayaan"}</h3><button type="button" onClick={() => setRemedialFormOpen(false)} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-white">Tutup</button></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className="mb-1 block text-xs font-bold">Kelas</label><select value={remedialForm.classId} onChange={(e) => { setRemedialForm((v) => ({ ...v, classId: e.target.value, studentId: "" })); }} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Pilih kelas</option>{programClasses.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></div>
                    <div><label className="mb-1 block text-xs font-bold">Siswa</label><select value={remedialForm.studentId} onChange={(e) => setRemedialForm((v) => ({ ...v, studentId: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Pilih siswa</option>{programStudents.filter((item) => !remedialForm.classId || item.class_id === remedialForm.classId).map((item) => <option key={item.id} value={item.id}>{item.nama} {item.nis ? `(${item.nis})` : ""}</option>)}</select></div>
                    <div><label className="mb-1 block text-xs font-bold">Mata Pelajaran</label><select value={remedialForm.subjectId} onChange={(e) => setRemedialForm((v) => ({ ...v, subjectId: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Pilih mapel</option>{programSubjects.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></div>
                    <div><label className="mb-1 block text-xs font-bold">Jenis</label><select value={remedialForm.jenis} onChange={(e) => setRemedialForm((v) => ({ ...v, jenis: e.target.value as "remedial" | "pengayaan" }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="remedial">Remedial</option><option value="pengayaan">Pengayaan</option></select></div>
                    <div><label className="mb-1 block text-xs font-bold">Tanggal</label><input type="date" value={remedialForm.tanggal} onChange={(e) => setRemedialForm((v) => ({ ...v, tanggal: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                    <div><label className="mb-1 block text-xs font-bold">Status</label><select value={remedialForm.status} onChange={(e) => setRemedialForm((v) => ({ ...v, status: e.target.value as "direncanakan" | "selesai" }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="direncanakan">Direncanakan</option><option value="selesai">Selesai</option></select></div>
                    <div><label className="mb-1 block text-xs font-bold">Nilai Awal</label><input type="number" min="0" max="100" value={remedialForm.nilaiAwal} onChange={(e) => setRemedialForm((v) => ({ ...v, nilaiAwal: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                    <div><label className="mb-1 block text-xs font-bold">Nilai Hasil</label><input type="number" min="0" max="100" value={remedialForm.nilaiHasil} onChange={(e) => setRemedialForm((v) => ({ ...v, nilaiHasil: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                    <div className="md:col-span-2"><label className="mb-1 block text-xs font-bold">Materi</label><input value={remedialForm.materi} onChange={(e) => setRemedialForm((v) => ({ ...v, materi: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                    <div className="md:col-span-2"><label className="mb-1 block text-xs font-bold">Catatan</label><textarea rows={3} value={remedialForm.catatan} onChange={(e) => setRemedialForm((v) => ({ ...v, catatan: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setRemedialFormOpen(false)} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Batal</button><button type="button" onClick={saveRemedial} disabled={remedialSaving} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{remedialSaving ? "Menyimpan..." : "Simpan"}</button></div>
                </div>
              )}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                {remedialLoading ? <div className="p-8 text-center text-sm text-slate-500">Memuat data...</div> : remedialRows.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Belum ada data remedial/pengayaan.</div> : <table className="w-full min-w-[1000px] text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-3 text-left">Tanggal</th><th className="px-3 py-3 text-left">Siswa</th><th className="px-3 py-3 text-left">Kelas</th><th className="px-3 py-3 text-left">Mapel</th><th className="px-3 py-3 text-left">Jenis</th><th className="px-3 py-3 text-center">Nilai</th><th className="px-3 py-3 text-left">Materi</th><th className="px-3 py-3 text-left">Status</th>{role !== "Siswa" && <th className="px-3 py-3 text-center">Aksi</th>}</tr></thead><tbody>{remedialRows.map((row) => <tr key={row.id} className="border-t align-top"><td className="px-3 py-3 whitespace-nowrap">{row.tanggal}</td><td className="px-3 py-3 font-semibold">{row.studentName}</td><td className="px-3 py-3">{row.className}</td><td className="px-3 py-3">{row.subjectName}</td><td className="px-3 py-3"><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold">{row.jenis === "remedial" ? "Remedial" : "Pengayaan"}</span></td><td className="px-3 py-3 text-center">{row.nilai_awal ?? "-"} → {row.nilai_hasil ?? "-"}</td><td className="px-3 py-3">{row.materi || "-"}</td><td className="px-3 py-3">{row.status === "selesai" ? "Selesai" : "Direncanakan"}</td>{role !== "Siswa" && <td className="px-3 py-3"><div className="flex justify-center gap-2"><button type="button" onClick={() => openEditRemedial(row)} className="rounded-lg border px-2.5 py-1.5 text-xs font-bold">Edit</button><button type="button" onClick={() => deleteRemedial(row.id)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600">Hapus</button></div></td>}</tr>)}</tbody></table>}
              </div>
            </Section>
          )}

          {activeMenu === "Program BK" && (
            <Section title="Program BK" subtitle={role === "Siswa" ? "Program pendampingan yang tercatat untuk Anda" : "Catatan program pendampingan siswa"}>
              <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/60 p-4"><div className="flex flex-wrap items-end gap-3">{role !== "Siswa" && <><div className="min-w-[200px] flex-1"><label className="mb-1 block text-xs font-bold text-slate-600">Kelas</label><select value={bkClassId} onChange={(e) => { setBkClassId(e.target.value); setBkForm((v) => ({ ...v, classId: e.target.value, studentId: "" })); void loadBkData(); }} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Semua kelas</option>{programClasses.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></div><button type="button" onClick={openNewBk} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700">＋ Tambah Program</button>
                  <button type="button" onClick={() => printSchoolLearningDocument("Laporan Bimbingan Konseling", ["No", "Siswa", "Tanggal", "Bentuk", "Jenis", "Masalah", "Tindak Lanjut"], bkRows.map((row, i) => [i + 1, row.studentName, row.tanggal, "Individu", row.jenis_program, row.ringkasan, row.tindak_lanjut || "-"]))} className="rounded-xl border border-sky-300 bg-white px-4 py-2.5 text-sm font-bold text-sky-700">🖨️ Cetak / Simpan PDF</button></>}{role === "Siswa" && <div><p className="text-sm font-bold text-sky-900">Program pendampingan</p><p className="text-xs text-sky-800">Data yang ditampilkan hanya milik akun siswa ini.</p></div>}</div></div>
              {bkError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{bkError}</div>}
              {bkFormOpen && role !== "Siswa" && <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50/40 p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">{bkEditingId ? "Edit Program BK" : "Tambah Program BK"}</h3><button type="button" onClick={() => setBkFormOpen(false)} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-white">Tutup</button></div><div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-xs font-bold">Kelas</label><select value={bkForm.classId} onChange={(e) => setBkForm((v) => ({ ...v, classId: e.target.value, studentId: "" }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Pilih kelas</option>{programClasses.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></div><div><label className="mb-1 block text-xs font-bold">Siswa</label><select value={bkForm.studentId} onChange={(e) => setBkForm((v) => ({ ...v, studentId: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Pilih siswa</option>{programStudents.filter((item) => !bkForm.classId || item.class_id === bkForm.classId).map((item) => <option key={item.id} value={item.id}>{item.nama} {item.nis ? `(${item.nis})` : ""}</option>)}</select></div><div><label className="mb-1 block text-xs font-bold">Tanggal</label><input type="date" value={bkForm.tanggal} onChange={(e) => setBkForm((v) => ({ ...v, tanggal: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div><div><label className="mb-1 block text-xs font-bold">Jenis Program</label><select value={bkForm.jenisProgram} onChange={(e) => setBkForm((v) => ({ ...v, jenisProgram: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option>Pendampingan belajar</option><option>Pendampingan perilaku</option><option>Motivasi belajar</option><option>Sosial dan pertemanan</option><option>Lainnya</option></select></div><div className="md:col-span-2"><label className="mb-1 block text-xs font-bold">Ringkasan</label><textarea rows={4} value={bkForm.ringkasan} onChange={(e) => setBkForm((v) => ({ ...v, ringkasan: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" placeholder="Ringkasan pendampingan yang aman ditampilkan pada akun siswa." /></div><div><label className="mb-1 block text-xs font-bold">Tindak Lanjut</label><textarea rows={3} value={bkForm.tindakLanjut} onChange={(e) => setBkForm((v) => ({ ...v, tindakLanjut: e.target.value }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></div><div><label className="mb-1 block text-xs font-bold">Status</label><select value={bkForm.status} onChange={(e) => setBkForm((v) => ({ ...v, status: e.target.value as "dipantau" | "selesai" }))} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="dipantau">Dipantau</option><option value="selesai">Selesai</option></select></div></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setBkFormOpen(false)} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Batal</button><button type="button" onClick={saveBk} disabled={bkSaving} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{bkSaving ? "Menyimpan..." : "Simpan"}</button></div></div>}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">{bkLoading ? <div className="p-8 text-center text-sm text-slate-500">Memuat data...</div> : bkRows.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Belum ada program BK.</div> : <table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-3 text-left">Tanggal</th><th className="px-3 py-3 text-left">Siswa</th><th className="px-3 py-3 text-left">Kelas</th><th className="px-3 py-3 text-left">Program</th><th className="px-3 py-3 text-left">Ringkasan</th><th className="px-3 py-3 text-left">Tindak Lanjut</th><th className="px-3 py-3 text-left">Status</th>{role !== "Siswa" && <th className="px-3 py-3 text-center">Aksi</th>}</tr></thead><tbody>{bkRows.map((row) => <tr key={row.id} className="border-t align-top"><td className="px-3 py-3 whitespace-nowrap">{row.tanggal}</td><td className="px-3 py-3 font-semibold">{row.studentName}</td><td className="px-3 py-3">{row.className}</td><td className="px-3 py-3">{row.jenis_program}</td><td className="px-3 py-3 whitespace-pre-wrap">{row.ringkasan}</td><td className="px-3 py-3 whitespace-pre-wrap">{row.tindak_lanjut || "-"}</td><td className="px-3 py-3">{row.status === "selesai" ? "Selesai" : "Dipantau"}</td>{role !== "Siswa" && <td className="px-3 py-3"><div className="flex justify-center gap-2"><button type="button" onClick={() => openEditBk(row)} className="rounded-lg border px-2.5 py-1.5 text-xs font-bold">Edit</button><button type="button" onClick={() => deleteBk(row.id)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600">Hapus</button></div></td>}</tr>)}</tbody></table>}</div>
            </Section>
          )}

          {(activeMenu === "Nilai" || activeMenu === "Rapor") && (
            <Section
              title={activeMenu}
              subtitle={activeMenu === "Rapor" ? "Pengelolaan dan penerbitan rapor siswa" : (role === "Siswa" || role === "Orang Tua" ? "Lihat nilai — data bersifat read-only" : "Input nilai per TP, Non-Tes, STS, dan SAS")}
            >
              <div className="mb-6 hidden flex-wrap gap-2 border-b border-gray-200 pb-3">
                <button
                  onClick={() => setGradeTab("input")}
                  className={`rounded-xl px-4 py-2 text-sm font-bold ${gradeTab === "input" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}
                >
                  {role === "Siswa" || role === "Orang Tua" ? "📊 Lihat Nilai" : "📝 Input Nilai"}
                </button>
                {canViewReport && (
                  <button
                    onClick={async () => {
                      setGradeTab("raport");
                      setReportDraft(null);
                      setSelectedReportStudentId("");

                      // Saat wali membuka Raport, selalu fokus ke kelas yang
                      // memang diwalikan (contoh: Kelas 1), walaupun sebelumnya
                      // dropdown Input Nilai dipakai untuk memilih kelas lain.
                      const waliClassId = role === "Guru"
                        ? teacherAssignments.find((item) => item.isWaliKelas)?.classId
                        : undefined;
                      const reportClassId = isWaliKelas && waliClassId
                        ? waliClassId
                        : selectedGradeClassId;
                      const reportClass = gradeClasses.find((item) => item.id === reportClassId);

                      if (reportClassId) {
                        setSelectedGradeClassId(reportClassId);
                        setSelectedReportClass(reportClass?.nama ?? "");
                        await loadReportStudents(reportClassId);
                      }
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${gradeTab === "raport" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}
                  >
                    📄 Raport
                  </button>
                )}
              </div>

              {activeMenu === "Nilai" ? (
                <>
                  <div className="mb-6 grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Pilih Kelas</label>
                      <select
                        value={selectedGradeClassId}
                        onChange={(e) => {
                          const id = e.target.value;
                          const row = gradeClasses.find((item) => item.id === id);
                          setSelectedGradeClassId(id);
                          setSelectedReportClass(row?.nama ?? "");
                          setSelectedGradeSubjectId("");
                          setGradeStudents([]);
                          setGradeDrafts({});
                          setSelectedTahfidzStudentId("");
                          setTahfidzSetoranRows([]);
                          setGradeSaved(false);
                        }}
                        disabled={role === "Siswa" || role === "Orang Tua"}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:text-gray-600"
                      >
                        <option value="">Pilih kelas</option>
                        {gradeClasses.map((item) => (
                          <option key={item.id} value={item.id}>{item.nama}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Pilih Semester</label>
                      <select
                        value={selectedSemester}
                        onChange={async (e) => {
                          const semester = e.target.value;
                          setSelectedSemester(semester);
                          setGradeSaved(false);
                          if (selectedGradeClassId && selectedGradeSubjectId) {
                            await loadGradesForSelection(selectedGradeClassId, selectedGradeSubjectId, currentUserId, semester, role);
                            const subjectName = gradeSubjects.find((item) => item.id === selectedGradeSubjectId)?.name ?? "";
                            if (normalizeReportSubjectName(subjectName).includes("tahfidz") && selectedTahfidzStudentId) await loadTahfidzSetoran(selectedTahfidzStudentId, semester);
                          }
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Tahun Ajaran</label>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-700">
                        {gradeClasses.find((item) => item.id === selectedGradeClassId)?.tahunAjaran ?? "-"}
                      </div>
                    </div>
                  </div>

                  {role === "Siswa" && (
                    <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                      <p className="font-bold">🔒 Mode Siswa — Read Only</p>
                      <p className="mt-1">Anda hanya dapat melihat nilai yang terhubung dengan akun Anda sendiri. Anda tidak dapat mengubah nilai atau melihat nilai siswa lain.</p>
                    </div>
                  )}

                  {role === "Orang Tua" && (
                    <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">
                      <p className="font-bold">🔒 Mode Orang Tua — Read Only</p>
                      <p className="mt-1">Anda hanya dapat melihat nilai dan raport anak yang terhubung dengan akun ini. Tidak ada akses untuk menginput atau mengubah nilai.</p>
                    </div>
                  )}

                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Mata Pelajaran</label>
                    <select
                      value={selectedGradeSubjectId}
                      onChange={async (e) => {
                        const id = e.target.value;
                        setSelectedGradeSubjectId(id);
                        setSelectedTahfidzStudentId("");
                        setTahfidzSetoranRows([]);
                        setGradeSaved(false);
                        if (id) {
                          await loadGradesForSelection(selectedGradeClassId, id, currentUserId, selectedSemester, role);
                        }
                      }}
                      disabled={role === "Orang Tua"}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:text-gray-600"
                    >
                      <option value="">Pilih mata pelajaran</option>
                      {gradeSubjects
                        .filter((subject) => {
                          if (role !== "Guru") return true;
                          const selectedClassName = gradeClasses.find((item) => item.id === selectedGradeClassId)?.nama ?? "";
                          const waliKelasAllowed =
                            isWaliKelas &&
                            teacherAssignments.some((item) => item.isWaliKelas && item.classId === selectedGradeClassId) &&
                            isWaliKelasSubject(subject.name, selectedClassName);
                          return waliKelasAllowed || teacherAssignments.some(
                            (item) =>
                              item.subjectId === subject.id &&
                              item.classId === selectedGradeClassId
                          );
                        })
                        .map((subject) => (
                          <option key={subject.id} value={subject.id}>{subject.code} - {subject.name}</option>
                        ))}
                    </select>
                    {role === "Siswa" && (
                      <p className="mt-2 text-xs text-gray-500">Pilih mata pelajaran untuk melihat nilai Anda. Data bersifat read-only.</p>
                    )}
                    {role === "Guru" && !isWaliKelas && (
                      <p className="mt-2 text-xs text-gray-500">Guru hanya dapat menginput nilai pada kelas dan mata pelajaran yang diampu.</p>
                    )}
                    {role === "Guru" && isWaliKelas && (
                      <p className="mt-2 text-xs text-emerald-700">Sebagai wali kelas, Anda dapat mengelola raport kelas yang diwalikan. Input nilai tetap hanya untuk mata pelajaran dan kelas yang benar-benar diampu.</p>
                    )}
                  </div>

                  {gradeError && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{gradeError}</div>
                  )}

                  {gradeLoading && (
                    <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">Memuat data nilai...</div>
                  )}

                  {!gradeLoading && selectedGradeClassId && selectedGradeSubjectId && gradeStudents.length === 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">Belum ada siswa aktif pada kelas ini.</div>
                  )}

                  {!gradeLoading && gradeStudents.length > 0 && normalizeReportSubjectName(gradeSubjects.find((item) => item.id === selectedGradeSubjectId)?.name ?? "").includes("tahfidz") ? (
                    <div className="space-y-5">
                      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900">Riwayat Setoran Hafalan</h3>
                        <p className="mt-1 text-sm text-gray-500">Pilih satu siswa untuk melihat dan mencatat riwayat hafalannya. Data siswa lain tidak dicampur dalam tabel ini.</p>
                        <div className="mt-4 max-w-xl">
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Cari / Pilih Siswa</label>
                          <input
                            type="text"
                            list="tahfidz-student-options"
                            value={tahfidzStudentSearch || (gradeStudents.find((student) => student.id === selectedTahfidzStudentId)?.name ?? "")}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => {
                              const value = e.target.value;
                              setTahfidzStudentSearch(value);
                              const matched = gradeStudents.find((student) => `${student.name}${student.nis ? ` (${student.nis})` : ""}`.toLowerCase() === value.trim().toLowerCase() || student.name.toLowerCase() === value.trim().toLowerCase());
                              if (matched) {
                                setTahfidzStudentSearch(matched.name);
                                void loadTahfidzSetoran(matched.id);
                              } else if (selectedTahfidzStudentId) {
                                setSelectedTahfidzStudentId("");
                                setTahfidzSetoranRows([]);
                              }
                            }}
                            placeholder="Ketik nama siswa atau NIS..."
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3"
                          />
                          <datalist id="tahfidz-student-options">
                            {gradeStudents.map((student) => <option key={student.id} value={`${student.name}${student.nis ? ` (${student.nis})` : ""}`} />)}
                          </datalist>
                          {selectedTahfidzStudentId && <p className="mt-2 text-xs font-semibold text-emerald-700">Siswa terpilih: {gradeStudents.find((student) => student.id === selectedTahfidzStudentId)?.name}</p>}
                        </div>
                        {selectedTahfidzStudentId && <>
                          <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                            <h4 className="font-semibold text-gray-900">Tambah Setoran Hafalan</h4>
                            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <label className="text-xs font-semibold text-gray-600">Tanggal<input type="date" value={tahfidzSetoranForm.tanggal} disabled={!canEditGrades} onChange={(e) => setTahfidzSetoranForm((v) => ({ ...v, tanggal: e.target.value }))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm" /></label>
                              <label className="text-xs font-semibold text-gray-600">Nama Surat<input list="tahfidz-surat-options" value={tahfidzSetoranForm.namaSurat} disabled={!canEditGrades} onChange={(e) => setTahfidzSetoranForm((v) => ({ ...v, namaSurat: e.target.value }))} placeholder="Cari/pilih surat (An-Naba–An-Nas)" className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm" /><datalist id="tahfidz-surat-options">{["An-Naba", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Insyiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghasyiyah", "Al-Fajr", "Al-Balad", "Asy-Syams", "Al-Lail", "Ad-Duha", "Asy-Syarh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takasur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraisy", "Al-Ma'un", "Al-Kausar", "Al-Kafirun", "An-Nasr", "Al-Lahab", "Al-Ikhlas", "Al-Falaq", "An-Nas"].map((surat) => <option key={surat} value={surat} />)}</datalist></label>
                              <label className="text-xs font-semibold text-gray-600">Status<select value={tahfidzSetoranForm.status} disabled={!canEditGrades} onChange={(e) => setTahfidzSetoranForm((v) => ({ ...v, status: e.target.value as "Tuntas" | "Ulang" }))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"><option value="Tuntas">Tuntas</option><option value="Ulang">Ulang</option></select></label>
                              <label className="text-xs font-semibold text-gray-600">Nilai Angka<input type="number" min="0" max="100" value={tahfidzSetoranForm.nilai} disabled={!canEditGrades} onChange={(e) => setTahfidzSetoranForm((v) => ({ ...v, nilai: e.target.value }))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm" placeholder="0–100" /></label>
                              <label className="text-xs font-semibold text-gray-600">Predikat<input value={tahfidzSetoranForm.predikat} disabled={!canEditGrades} onChange={(e) => setTahfidzSetoranForm((v) => ({ ...v, predikat: e.target.value }))} placeholder="Contoh: A" className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm" /></label>
                              <label className="text-xs font-semibold text-gray-600 md:col-span-2 xl:col-span-1">Catatan Kelancaran Hafalan & Tajwid<textarea rows={2} value={tahfidzSetoranForm.catatan} disabled={!canEditGrades} onChange={(e) => setTahfidzSetoranForm((v) => ({ ...v, catatan: e.target.value }))} placeholder="Tuliskan kelancaran hafalan dan tajwid..." className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm" /></label>
                            </div>
                            {canEditGrades && <button type="button" onClick={saveTahfidzSetoran} disabled={tahfidzSetoranSaving} className="mt-3 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{tahfidzSetoranSaving ? "Menyimpan..." : "Simpan Setoran"}</button>}
                          </div>
                          {tahfidzSetoranError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{tahfidzSetoranError}</p>}
                          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-emerald-700 text-white"><tr><th className="px-3 py-3">Tanggal</th><th className="px-3 py-3">Nama Surat</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Nilai</th><th className="px-3 py-3">Predikat</th><th className="px-3 py-3">Catatan</th>{canEditGrades && <th className="px-3 py-3">Aksi</th>}</tr></thead><tbody>{tahfidzSetoranRows.length ? tahfidzSetoranRows.map((row) => <tr key={row.id} className="border-t align-top"><td className="whitespace-nowrap px-3 py-3">{row.tanggal}</td><td className="px-3 py-3 font-semibold">{row.nama_surat}</td><td className="px-3 py-3">{row.status}</td><td className="px-3 py-3">{row.nilai ?? "-"}</td><td className="px-3 py-3">{row.predikat ?? "-"}</td><td className="max-w-sm whitespace-pre-wrap px-3 py-3">{row.catatan || "-"}</td>{canEditGrades && <td className="px-3 py-3"><button type="button" onClick={() => deleteTahfidzSetoran(row.id)} className="font-semibold text-red-600">Hapus</button></td>}</tr>) : <tr><td colSpan={canEditGrades ? 7 : 6} className="px-3 py-6 text-center text-gray-500">Belum ada riwayat setoran untuk siswa ini.</td></tr>}</tbody></table>
                          </div>
                        </>}
                      </section>
                      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                        <div className="mb-3"><h3 className="font-bold text-gray-900">Penilaian Tahfidz</h3><p className="mt-1 text-sm text-gray-500">Nilai Non-Tes, STS, dan SAS disimpan terpisah dari riwayat setoran hafalan.</p></div>
                        {selectedTahfidzStudentId ? gradeStudents.filter((item) => item.id === selectedTahfidzStudentId).map((student) => { const draft = gradeDrafts[student.id] ?? emptyGradeDraft(student.id); return <div key={student.id} className="max-w-3xl"><p className="mb-3 text-sm font-semibold text-gray-700">{student.name} · NIS {student.nis || "-"}</p><div className="grid gap-3 md:grid-cols-3">{([["nilaiNonTes","Non-Tes"],["nilaiUtsPts","STS"],["nilaiSas","SAS"]] as const).map(([key,label]) => <label key={key} className="text-xs font-semibold text-gray-600">{label}<input type="number" min="0" max="100" value={draft[key]} disabled={!canEditGrades} onChange={(e) => updateGradeDraft(student.id,{ [key]: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder="0–100" /></label>)}</div><p className="mt-3 text-sm text-gray-600">Nilai Akhir: <strong className="text-emerald-700">{draft.nilaiAkhir || "-"}</strong> · Predikat: <strong>{getPredikatNilai(draft.nilaiAkhir === "" ? null : Number(draft.nilaiAkhir))}</strong></p></div>; }) : <p className="text-sm text-gray-500">Pilih siswa di bagian Riwayat Setoran Hafalan untuk mengisi penilaian.</p>}
                      </section>
                      <div className="flex justify-end">{canEditGrades && <button type="button" onClick={saveGrades} disabled={gradeSaving || !selectedTahfidzStudentId} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{gradeSaving ? "Menyimpan..." : "Simpan Penilaian Tahfidz"}</button>}</div>
                      {gradeSaved && <p className="text-sm font-semibold text-emerald-700">✓ Penilaian Tahfidz berhasil disimpan.</p>}
                    </div>
                  ) : !gradeLoading && gradeStudents.length > 0 ? (
                    <div className="space-y-4">
                      <details className="overflow-hidden rounded-2xl border border-emerald-200 bg-white">
                        <summary className="cursor-pointer list-none px-5 py-4 font-bold text-gray-900 hover:bg-emerald-50">Penilaian (TP1–TP10, Non-Tes, STS, SAS)<span className="float-right text-sm font-normal text-gray-500">Klik untuk buka/tutup</span></summary>
                        <div className="space-y-4 border-t border-emerald-100 p-4">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">

                        <h3 className="font-bold text-gray-900">Petunjuk Pengisian Nilai</h3>
                        <p className="mt-1 text-sm text-gray-600">Isi nilai pada kolom TP1 sampai TP10 sesuai hasil pembelajaran. Gunakan kolom Non-Tes untuk penilaian praktik, proyek, atau kinerja. Lengkapi nilai STS dan SAS sesuai hasil penilaian.</p>
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <table className="w-full min-w-[1500px] border-collapse text-xs">
                          <thead className="bg-emerald-700 text-white"><tr>
                            <th className="sticky left-0 z-20 bg-emerald-700 px-3 py-3 text-left">No</th>
                            <th className="sticky left-10 z-20 min-w-[210px] bg-emerald-700 px-3 py-3 text-left">Nama Siswa</th>
                            {Array.from({length:10},(_,i)=><th key={i} className="min-w-[76px] px-2 py-3">TP{i+1}</th>)}
                            <th className="min-w-[90px] px-2 py-3">Non-Tes</th><th className="min-w-[80px] px-2 py-3">STS</th><th className="min-w-[80px] px-2 py-3">SAS</th>
                            <th className="min-w-[85px] px-2 py-3">Jumlah</th><th className="min-w-[85px] px-2 py-3">Rata-rata</th><th className="min-w-[75px] px-2 py-3">Peringkat</th>
                          </tr></thead>
                          <tbody>{gradeStudents.map((student,index)=>{
                            const draft=gradeDrafts[student.id]??emptyGradeDraft(student.id);
                            const tpValues=Array.from({length:10},(_,i)=>draft.sumatif[i]?.nilai??"");
                            const values=[...tpValues,draft.nilaiNonTes,draft.nilaiUtsPts,draft.nilaiSas].map(v=>v===""?null:Number(v)).filter((v):v is number=>v!==null&&Number.isFinite(v));
                            const total=values.reduce((a,b)=>a+b,0); const average=values.length?total/values.length:null;
                            const rank=gradeStudents.map(st=>{const d=gradeDrafts[st.id]??emptyGradeDraft(st.id);const vals=[...Array.from({length:10},(_,i)=>d.sumatif[i]?.nilai??""),d.nilaiNonTes,d.nilaiUtsPts,d.nilaiSas].map(v=>v===""?null:Number(v)).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:-1;}).filter(v=>v>=0).filter(v=>average!==null&&v>average).length+1;
                            return <tr key={student.id} className="border-t hover:bg-emerald-50/40">
                              <td className="sticky left-0 z-10 bg-white px-3 py-2">{index+1}</td><td className="sticky left-10 z-10 bg-white px-3 py-2"><div className="font-semibold text-gray-800">{student.name}</div><div className="text-[10px] text-gray-400">NIS {student.nis}</div></td>
                              {Array.from({length:10},(_,i)=>{const item=draft.sumatif[i]??{materi:`TP ${i+1}`,tujuanPembelajaran:`TP ${i+1}`,nilai:""};return <td key={i} className="px-1.5 py-2"><input aria-label={`TP ${i+1} ${student.name}`} type="number" min="0" max="100" value={item.nilai} disabled={!canEditGrades} onChange={e=>{const next=[...draft.sumatif];while(next.length<=i)next.push({materi:`TP ${next.length+1}`,tujuanPembelajaran:`TP ${next.length+1}`,nilai:""});next[i]={...next[i],materi:next[i].materi||`TP ${i+1}`,tujuanPembelajaran:next[i].tujuanPembelajaran||`TP ${i+1}`,nilai:e.target.value};updateGradeDraft(student.id,{sumatif:next});}} className="w-[68px] rounded-lg border px-2 py-2 text-center outline-none focus:border-emerald-500 disabled:bg-gray-50" placeholder="-" /></td>})}
                              {[['nilaiNonTes','nilaiNonTes'],['nilaiUtsPts','nilaiUtsPts'],['nilaiSas','nilaiSas']].map(([key])=><td key={key} className="px-1.5 py-2"><input aria-label={`${key} ${student.name}`} type="number" min="0" max="100" value={draft[key as 'nilaiNonTes'|'nilaiUtsPts'|'nilaiSas']} disabled={!canEditGrades} onChange={e=>updateGradeDraft(student.id,{[key]:e.target.value})} className="w-[72px] rounded-lg border px-2 py-2 text-center outline-none focus:border-emerald-500 disabled:bg-gray-50" placeholder="-" /></td>)}
                              <td className="px-2 py-2 text-center font-semibold">{values.length?total:"-"}</td><td className="px-2 py-2 text-center font-semibold text-emerald-700">{average===null?"-":average.toFixed(1)}</td><td className="px-2 py-2 text-center">{average===null?"-":rank}</td>
                            </tr>;
                          })}</tbody>
                        </table>
                      </div>
                        </div>
                      </details>
                      <details className="overflow-hidden rounded-2xl border border-blue-200 bg-white">
                        <summary className="cursor-pointer list-none px-5 py-4 font-bold text-gray-900 hover:bg-blue-50">Catatan Capaian Kompetensi per Siswa<span className="float-right text-sm font-normal text-gray-500">Klik untuk buka/tutup</span></summary>
                        <section className="border-t border-blue-100 p-4">
                        <div className="mb-4">
                          <p className="text-sm text-gray-500">Diisi oleh guru pengampu untuk mata pelajaran yang sedang dipilih. Catatan ini akan otomatis tampil pada bagian B. Capaian Kompetensi di Rapor Formal.</p>
                        </div>
                        <div className="space-y-3">
                          {gradeStudents.map((student) => {
                            const draft = gradeDrafts[student.id] ?? emptyGradeDraft(student.id);
                            return <label key={`capaian-${student.id}`} className="block rounded-xl border border-gray-100 p-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="block text-sm font-semibold text-gray-800">{student.name} <span className="font-normal text-gray-400">· NIS {student.nis || "-"}</span></span>
                              </div>
                              <textarea rows={3} value={draft.deskripsiCapaian} disabled={!canEditGrades} onChange={(e) => updateGradeDraft(student.id, { deskripsiCapaian: e.target.value })} placeholder={`Tuliskan catatan awal, misalnya: Anak sangat bagus dalam membaca.`} className="w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-gray-50" />
                              <p className="mt-1 text-xs text-gray-400">Tuliskan capaian berdasarkan hasil pengamatan guru pada mata pelajaran ini.</p>
                            </label>;
                          })}
                        </div>
                        </section>
                      </details>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button type="button" onClick={()=>printSchoolLearningDocument("Rekap Nilai",["No","Nama Siswa",...Array.from({length:10},(_,i)=>`TP${i+1}`),"Non-Tes","STS","SAS","Jumlah","Rata-rata","Peringkat"],gradeStudents.map((student,index)=>{const d=gradeDrafts[student.id]??emptyGradeDraft(student.id);const tps=Array.from({length:10},(_,i)=>d.sumatif[i]?.nilai||"-");const vals=[...tps,d.nilaiNonTes||"-",d.nilaiUtsPts||"-",d.nilaiSas||"-"].map(v=>v==="-"?null:Number(v)).filter((v):v is number=>v!==null);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;return [index+1,student.name,...tps,d.nilaiNonTes||"-",d.nilaiUtsPts||"-",d.nilaiSas||"-",vals.reduce((a,b)=>a+b,0),avg===null?"-":avg.toFixed(1),"-"];}),name || "Guru Mata Pelajaran",gradeSubjects.find((item)=>item.id===selectedGradeSubjectId)?.name || "-")} className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700">🖨️ Cetak Tabel Nilai</button>
                        {canEditGrades ? <button onClick={saveGrades} disabled={gradeSaving} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{gradeSaving?"Menyimpan...":"Simpan Semua Nilai"}</button> : <p className="text-sm text-gray-500">Data hanya dapat dilihat.</p>}
                      </div>
                      {gradeSaved&&<p className="text-sm font-semibold text-emerald-700">✓ Nilai berhasil disimpan.</p>}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="mb-6 grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Kelas</label>
                      <select
                        value={selectedGradeClassId}
                        disabled={isParentReadOnly}
                        onChange={(e) => {
                          const id = e.target.value;
                          const row = gradeClasses.find((item) => item.id === id);
                          setSelectedGradeClassId(id);
                          setSelectedReportClass(row?.nama ?? "");
                          setSelectedReportStudentId("");
                        }}
                        className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500"
                      >
                        <option value="">Pilih kelas</option>
                        {gradeClasses
                          .filter((item) =>
                            !isWaliKelas ||
                            role !== "Guru" ||
                            teacherAssignments.some((assignment) => assignment.isWaliKelas && assignment.classId === item.id)
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>{item.nama}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Semester</label>
                      <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500"
                      >
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Siswa</label>
                      <select
                        value={selectedReportStudentId}
                        disabled={isParentReadOnly}
                        onChange={(e) => setSelectedReportStudentId(e.target.value)}
                        className="w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500"
                      >
                        <option value="">Pilih siswa</option>
                        {reportStudents.map((student) => <option key={student.id} value={student.id}>{student.name} — {student.nis}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-2">
                    <button onClick={() => loadReportStudents()} className="rounded-xl border px-4 py-2">Muat Siswa Raport</button>
                    <button
                      onClick={() => loadReportDraft(selectedReportStudentId)}
                      disabled={!selectedReportStudentId}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Buka Raport
                    </button>
                  </div>

                  <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-bold text-emerald-900">Jenis Raport</p>
                      <p className="mt-1 text-xs text-emerald-700">Nilai otomatis dipisahkan berdasarkan mata pelajaran. Guru tidak perlu memilih tujuan raport saat input nilai.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setReportType("school")} className={`rounded-xl px-4 py-2 text-sm font-bold ${reportType === "school" ? "bg-emerald-600 text-white" : "bg-white text-gray-700 border"}`}>📘 Rapor Sekolah</button>
                      <button type="button" onClick={() => setReportType("madin")} className={`rounded-xl px-4 py-2 text-sm font-bold ${reportType === "madin" ? "bg-emerald-600 text-white" : "bg-white text-gray-700 border"}`}>📕 Rapor Madin</button>
                    </div>
                  </div>

                  {reportError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{reportError}</div>}
                  {reportLoading && <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">Memuat raport...</div>}

                  {!reportLoading && reportDraft && (
                    <div className="space-y-5">
                      <div className="rounded-2xl bg-emerald-50 p-5">
                        <p className="text-xs font-semibold text-emerald-700">{reportTitle} • {selectedReportClass} • SEMESTER {selectedSemester}</p>
                        <h3 className="mt-1 text-xl font-bold text-gray-900">
                          {reportStudents.find((item) => item.id === reportDraft.studentId)?.name ?? "Siswa"}
                        </h3>
                        <p className="text-sm text-gray-600">Tahun ajaran {gradeClasses.find((item) => item.id === selectedGradeClassId)?.tahunAjaran ?? "-"}</p>
                        {isParentReadOnly && <p className="mt-2 text-sm font-semibold text-purple-700">🔒 Mode Orang Tua — raport hanya dapat dilihat dan dicetak.</p>}
                      </div>

                      <div className="rounded-2xl border p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold">{reportType === "school" ? "A. Nilai Mata Pelajaran" : "A. Nilai Mata Pelajaran Madin"}</h4>
                            <p className="mt-1 text-sm text-gray-500">{reportType === "school" ? `Nilai akhir: Non-Tes ${NILAI_NON_TES_WEIGHT}% + UTS/PTS ${NILAI_UTS_WEIGHT}% + SAS ${NILAI_SAS_WEIGHT}%.` : "Fikih, Akhlak, Bahasa Arab, dan Tahfidz menggunakan nilai angka. BTQ menggunakan predikat A–D dan keterangan."}</p>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[680px] text-left text-sm">
                            <thead>
                              <tr className="border-b text-gray-500">
                                <th className="px-3 py-3">No</th>
                                <th className="px-3 py-3">Mata Pelajaran</th>
                                <th className="px-3 py-3">Non-Tes</th>
                                <th className="px-3 py-3">UTS/PTS</th>
                                <th className="px-3 py-3">SAS</th>
                                <th className="px-3 py-3">Nilai Akhir</th>
                                <th className="px-3 py-3">Predikat</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportActiveGrades.length > 0 ? reportActiveGrades.map((item, index) => (
                                <tr key={item.subjectId} className="border-b last:border-0">
                                  <td className="px-3 py-3">{index + 1}</td>
                                  <td className="px-3 py-3 font-semibold">{item.subjectName}</td>
                                  <td className="px-3 py-3">{item.nilaiNonTes ?? "-"}</td>
                                  <td className="px-3 py-3">{item.nilaiUtsPts ?? "-"}</td>
                                  <td className="px-3 py-3">{item.nilaiSas ?? "-"}</td>
                                  <td className="px-3 py-3 font-bold text-emerald-700">{item.nilaiAkhir ?? "-"}</td>
                                  <td className="px-3 py-3 font-bold">{item.predikat}</td>
                                </tr>
                              )) : (
                                <tr><td colSpan={7} className="px-3 py-5 text-center text-gray-500">Belum ada nilai untuk semester ini.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="rounded-2xl border p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold">{reportType === "school" ? "B. Capaian Kompetensi" : "B. Keterangan / Deskripsi Madin"}</h4>
                            <p className="mt-1 text-sm text-gray-500">{reportType === "school" ? "Capaian kompetensi diambil dari catatan guru pengampu pada menu Nilai." : "Untuk Madin, bagian keterangan terutama digunakan untuk BTQ."}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {reportActiveGrades.length > 0 ? reportActiveGrades.map((item) => (
                            <div key={`desc-${item.gradeId}`} className="rounded-xl bg-gray-50 p-4">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div className="font-bold text-gray-900">{item.subjectName}</div>
                                <div className="text-xs font-semibold text-gray-500">Nilai {item.nilaiAkhir ?? "-"} • Predikat {item.predikat}</div>
                              </div>
                              <div className="rounded-xl border bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">{item.deskripsiCapaian || "Belum diisi. Guru pengampu mengisi melalui menu Nilai."}</div>
                            </div>
                          )) : <p className="text-sm text-gray-500">Belum ada nilai untuk dibuatkan deskripsi.</p>}
                        </div>
                      </div>

                      {reportType === "school" && (
                        <div className="rounded-2xl border p-5">
                          <div className="mb-3">
                            <h4 className="font-bold">C. Kokurikuler</h4>
                            <p className="mt-1 text-sm text-gray-500">Tuliskan ringkasan kegiatan kokurikuler dan perkembangan peserta didik berdasarkan pengamatan guru/pendamping.</p>
                          </div>
                          <textarea rows={4} value={reportDraft.kokurikuler} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ kokurikuler: e.target.value })} placeholder="Isi deskripsi kegiatan dan perkembangan kokurikuler siswa" className="w-full rounded-xl border px-4 py-3" />
                        </div>
                      )}

                      {reportType === "school" && (
                        <div className="rounded-2xl border p-5">
                          <div className="mb-4">
                            <h4 className="font-bold">D. Ekstrakurikuler</h4>
                            <p className="mt-1 text-sm text-gray-500">Isi catatan keterangan untuk kegiatan Pramuka dan Silat. Tidak menggunakan nilai angka maupun predikat.</p>
                          </div>
                          {reportExtracurricular.map((item, index) => (
                            <div key={item.nama} className="mb-3 grid gap-3 rounded-xl bg-gray-50 p-3 md:grid-cols-[1fr_2fr]">
                              <div className="rounded-xl border bg-white px-3 py-2.5 font-semibold text-gray-800">{item.nama}</div>
                              <textarea rows={2} value={item.keterangan} disabled={isParentReadOnly} onChange={(e) => updateReportExtracurricular(index, { keterangan: e.target.value })} placeholder={`Catatan keterangan ${item.nama}`} className="w-full rounded-xl border bg-white px-3 py-2.5" />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="rounded-2xl border p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold">{reportType === "school" ? "E. Ketidakhadiran" : "C. Ketidakhadiran"}</h4>
                            <p className="mt-1 text-sm text-gray-500">Data dapat diambil otomatis dari modul Absensi.</p>
                          </div>
                          <button type="button" onClick={loadReportAttendance} disabled={isParentReadOnly || reportAttendanceLoading} className="rounded-xl border px-4 py-2 text-sm font-bold hover:bg-gray-50 disabled:opacity-50">{reportAttendanceLoading ? "Mengambil..." : "↻ Ambil dari Absensi"}</button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <input type="number" min="0" value={reportDraft.sakit} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ sakit: e.target.value })} placeholder="Sakit" className="rounded-xl border px-4 py-3" />
                          <input type="number" min="0" value={reportDraft.izin} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ izin: e.target.value })} placeholder="Izin" className="rounded-xl border px-4 py-3" />
                          <input type="number" min="0" value={reportDraft.tanpaKeterangan} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ tanpaKeterangan: e.target.value })} placeholder="Tanpa Keterangan" className="rounded-xl border px-4 py-3" />
                        </div>
                      </div>

                      <div className="rounded-2xl border p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold">{reportType === "school" ? "F. Catatan Wali Kelas" : "D. Catatan Wali Kelas"}</h4>
                            <p className="mt-1 text-sm text-gray-500">Draft dibuat dari rekap nilai, ketidakhadiran, dan ekstrakurikuler yang tercatat. Wali kelas tetap dapat mengedit sebelum menyimpan.</p>
                          </div>
                          <button type="button" onClick={generateWaliKelasDraft} disabled={isParentReadOnly || reportActiveGrades.length === 0} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                            ✨ Generate Draft
                          </button>
                        </div>
                        <div className="space-y-4">
                          <textarea rows={6} value={reportDraft.catatanWaliKelas} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ catatanWaliKelas: e.target.value })} placeholder="Catatan perkembangan, motivasi, atau pesan untuk siswa" className="w-full rounded-xl border px-4 py-3" />
                          {reportType === "school" && (
                            <>
                              <textarea rows={2} value={reportDraft.keteranganNaikKelas} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ keteranganNaikKelas: e.target.value })} placeholder="Keterangan naik kelas / tinggal di kelas" className="w-full rounded-xl border px-4 py-3" />
                              <textarea rows={2} value={reportDraft.keteranganLulus} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ keteranganLulus: e.target.value })} placeholder="Keterangan lulus (khusus kelas 6)" className="w-full rounded-xl border px-4 py-3" />
                            </>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border p-5">
                        <h4 className="mb-4 font-bold">{reportType === "school" ? "G. Tanda Tangan & Penerbitan" : "E. Tanda Tangan & Penerbitan"}</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          <input type="date" value={reportDraft.tanggalRaport} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ tanggalRaport: e.target.value })} className="rounded-xl border px-4 py-3" />
                          <select value={reportDraft.status} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ status: e.target.value as "draft" | "final" })} className="rounded-xl border px-4 py-3"><option value="draft">Draft</option><option value="final">Final</option></select>
                          <input value={reportDraft.namaWaliKelas} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ namaWaliKelas: e.target.value })} placeholder="Nama Wali Kelas" className="rounded-xl border px-4 py-3" />
                          <input value={reportDraft.nipWaliKelas} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ nipWaliKelas: e.target.value })} placeholder="NIP Wali Kelas" className="rounded-xl border px-4 py-3" />
                          <input value={reportDraft.namaOrangTua} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ namaOrangTua: e.target.value })} placeholder="Nama Orang Tua/Wali" className="rounded-xl border px-4 py-3" />
                          <input value={reportDraft.namaKepalaSekolah} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ namaKepalaSekolah: e.target.value })} placeholder="Nama Kepala Sekolah" className="rounded-xl border px-4 py-3" />
                          <input value={reportDraft.nipKepalaSekolah} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ nipKepalaSekolah: e.target.value })} placeholder="NIP Kepala Sekolah" className="rounded-xl border px-4 py-3" />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white p-4">
                        <div>
                          {reportSaved ? <p className="text-sm font-semibold text-emerald-700">✓ Raport berhasil disimpan.</p> : <p className="text-xs text-gray-500">Raport hanya dapat dikelola Admin dan Wali Kelas.</p>}
                          <p className="mt-1 text-xs text-gray-400">Cetak menggunakan format A4 portrait dan otomatis menyembunyikan dashboard.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => printReport(false)} className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50">🖨️ Cetak A4</button>
                          <button type="button" onClick={() => printReport(true)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">📄 Download PDF</button>
                          {canEditReport && (
                            <button onClick={saveReport} disabled={reportSaving} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{reportSaving ? "Menyimpan..." : "Simpan Raport"}</button>
                          )}
                        </div>
                      </div>

                      <div className="printable-report">
                        <div className="report-page">
                          {reportType === "school" ? (
                            <>
                              <table className="report-identity report-identity-ak hyar">
                                <tbody>
                                  <tr><td>Nama Murid</td><td>: {reportStudents.find((item) => item.id === reportDraft.studentId)?.name ?? "-"}</td><td>Kelas</td><td>: {selectedReportClass || "-"}</td></tr>
                                  <tr><td>NIS/NISN</td><td>: {reportStudents.find((item) => item.id === reportDraft.studentId)?.nis ?? "-"}</td><td>Fase</td><td>: {(() => { const n = Number(String(selectedReportClass || "").match(/\d+/)?.[0] || 0); return n >= 1 && n <= 2 ? "A" : n >= 3 && n <= 4 ? "B" : n >= 5 && n <= 6 ? "C" : "-"; })()}</td></tr>
                                  <tr><td>Sekolah</td><td>: {schoolSettings.namaSekolah || "SD Islam Al-Barkah"}</td><td>Semester</td><td>: {selectedSemester}</td></tr>
                                  <tr><td>Alamat</td><td>: {schoolSettings.alamat || "-"}</td><td>Tahun Ajaran</td><td>: {gradeClasses.find((item) => item.id === selectedGradeClassId)?.tahunAjaran ?? "-"}</td></tr>
                                </tbody>
                              </table>
                              <div className="report-title-line" />
                              <div className="report-document-title report-document-title-ak hyar">LAPORAN HASIL BELAJAR</div>
                            </>
                          ) : (
                            <table className="report-madin-identity">
                              <tbody>
                                <tr><td>Nama Madrasah</td><td>:</td><td>{schoolSettings.namaSekolah || "SD Islam Al-Barkah"}</td><td>Semester</td><td>:</td><td>{selectedSemester === "1" ? "Ganjil" : "Genap"}</td></tr>
                                <tr><td>Alamat</td><td>:</td><td>{schoolSettings.alamat || "-"}</td><td>Tahun Pelajaran</td><td>:</td><td>{gradeClasses.find((item) => item.id === selectedGradeClassId)?.tahunAjaran ?? "-"}</td></tr>
                                <tr><td>Nama Peserta Didik</td><td>:</td><td>{reportStudents.find((item) => item.id === reportDraft.studentId)?.name ?? "-"}</td><td>Nomor Induk</td><td>:</td><td>{reportStudents.find((item) => item.id === reportDraft.studentId)?.nis ?? "-"}</td></tr>
                                <tr><td>Kelas</td><td>:</td><td>{selectedReportClass || "-"}</td><td>NISN</td><td>:</td><td>-</td></tr>
                              </tbody>
                            </table>
                          )}

                          <h3 className="report-section-title">A. {reportType === "school" ? "NILAI MATA PELAJARAN" : "NILAI MATA PELAJARAN MADIN"}</h3>
                          {reportType === "school" ? (
                            <table className="report-table">
                              <thead><tr><th style={{ width: "7%" }}>No</th><th style={{ width: "29%" }}>Mata Pelajaran</th><th style={{ width: "17%" }}>Nilai Akhir</th><th>Capaian Kompetensi</th></tr></thead>
                              <tbody>{reportActiveGrades.length > 0 ? reportActiveGrades.map((item, index) => (
                                <tr key={`print-${item.subjectId}`}><td className="text-center">{index + 1}</td><td>{item.subjectName === "PP" ? "Pendidikan Pancasila dan Kewarganegaraan" : item.subjectName}</td><td className="text-center font-bold">{item.nilaiAkhir ?? "-"}</td><td>{item.deskripsiCapaian || "-"}</td></tr>
                              )) : <tr><td colSpan={4} className="text-center">Belum ada nilai.</td></tr>}</tbody>
                            </table>
                          ) : (
                            <table className="report-table report-madin-table">
                              <thead>
                                <tr><th rowSpan={2}>No</th><th rowSpan={2}>Mata Pelajaran</th><th colSpan={2}>Pengetahuan</th><th colSpan={2}>Keterampilan</th><th rowSpan={2}>Sikap</th><th rowSpan={2}>Ket</th></tr>
                                <tr><th>KKM</th><th>Nilai</th><th>KKM</th><th>Nilai</th></tr>
                              </thead>
                              <tbody>
                                {reportActiveGrades.map((item, index) => (
                                  <tr key={`print-${item.subjectId}`}><td className="text-center">{index + 1}</td><td className="font-bold">{item.subjectName}</td><td className="text-center">-</td><td className="text-center">{item.nilaiUtsPts ?? item.nilaiAkhir ?? "-"}</td><td className="text-center">-</td><td className="text-center">{item.nilaiNonTes ?? "-"}</td><td className="text-center">{item.predikat || "-"}</td><td className="text-center">{item.deskripsiCapaian ? "Tuntas" : "-"}</td></tr>
                                ))}
                                {Array.from({ length: Math.max(0, 10 - reportActiveGrades.length) }).map((_, index) => <tr key={`madin-empty-${index}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>)}
                                <tr className="report-madin-summary"><td colSpan={2}>Nilai Rata-Rata</td><td colSpan={2} className="text-center font-bold">{reportActiveGrades.length ? Math.round(reportActiveGrades.reduce((sum, item) => sum + Number(item.nilaiAkhir ?? item.nilaiUtsPts ?? 0), 0) / reportActiveGrades.filter((item) => item.nilaiAkhir != null || item.nilaiUtsPts != null).length) || "-" : "-"}</td><td colSpan={3}></td><td></td></tr>
                                <tr className="report-madin-summary"><td colSpan={2}>Ranking</td><td colSpan={2} className="text-center font-bold">-</td><td colSpan={3}></td><td></td></tr>
                              </tbody>
                            </table>
                          )}
                          {reportType === "madin" && (
                            <>
                              <h3 className="report-section-title">C. KETIDAKHADIRAN</h3>
                              <table className="report-attendance">
                                <tbody>
                                  <tr><td>Sakit</td><td>{reportDraft.sakit || "0"} hari</td></tr>
                                  <tr><td>Izin</td><td>{reportDraft.izin || "0"} hari</td></tr>
                                  <tr><td>Tanpa Keterangan</td><td>{reportDraft.tanpaKeterangan || "0"} hari</td></tr>
                                </tbody>
                              </table>
                              <div className="report-madin-signatures">
                                <div className="report-madin-sign-left">
                                  <div>Mengetahui :</div>
                                  <div>Orang Tua / Wali,</div>
                                  <div className="report-madin-sign-space" />
                                  <div>{reportDraft.namaOrangTua || ""}</div>
                                </div>
                                <div className="report-madin-sign-right">
                                  <div>{reportDraft.tanggalRaport ? `SD Islam Al-Barkah, ${formatReportDate(reportDraft.tanggalRaport)}` : "SD Islam Al-Barkah"}</div>
                                  <div>Wali Kelas</div>
                                  <div className="report-madin-sign-space" />
                                  <strong><u>{reportDraft.namaWaliKelas || ""}</u></strong>
                                </div>
                                <div className="report-madin-head">
                                  <div>Mengetahui,</div><div>Kepala SD Islam Al-Barkah</div>
                                  <div className="report-madin-sign-space" />
                                  <strong><u>{reportDraft.namaKepalaSekolah || ""}</u></strong>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {reportType === "school" && <div className="report-page report-page-second">
                          <table className="report-identity report-identity-ak hyar">
                            <tbody>
                              <tr><td>Nama Murid</td><td>: {reportStudents.find((item) => item.id === reportDraft.studentId)?.name ?? "-"}</td><td>Kelas</td><td>: {selectedReportClass || "-"}</td></tr>
                              <tr><td>NIS/NISN</td><td>: {reportStudents.find((item) => item.id === reportDraft.studentId)?.nis ?? "-"}</td><td>Fase</td><td>: {(() => { const n = Number(String(selectedReportClass || "").match(/\d+/)?.[0] || 0); return n >= 1 && n <= 2 ? "A" : n >= 3 && n <= 4 ? "B" : n >= 5 && n <= 6 ? "C" : "-"; })()}</td></tr>
                              <tr><td>Sekolah</td><td>: {schoolSettings.namaSekolah || "SD Islam Al-Barkah"}</td><td>Semester</td><td>: {selectedSemester}</td></tr>
                              <tr><td>Alamat</td><td>: {schoolSettings.alamat || "-"}</td><td>Tahun Ajaran</td><td>: {gradeClasses.find((item) => item.id === selectedGradeClassId)?.tahunAjaran ?? "-"}</td></tr>
                            </tbody>
                          </table>

                          <h3 className="report-section-title">C. KOKURIKULER</h3>
                          <div className="report-kokurikuler">{reportDraft.kokurikuler || "-"}</div>

                          <h3 className="report-section-title">D. EKSTRAKURIKULER</h3>
                          <table className="report-table report-extra-table">
                            <thead><tr><th style={{ width: "7%" }}>No</th><th>Ekstrakurikuler</th><th>Keterangan</th></tr></thead>
                            <tbody>
                              {reportExtracurricular.filter((item) => item.nama.trim()).length > 0
                                ? reportExtracurricular.filter((item) => item.nama.trim()).map((item, index) => (
                                  <tr key={`print-extra-${item.id ?? index}`}><td className="text-center">{index + 1}</td><td>{item.nama}</td><td>{item.keterangan || "-"}</td></tr>
                                ))
                                : <tr><td colSpan={3} className="text-center">Tidak ada data ekstrakurikuler.</td></tr>}
                            </tbody>
                          </table>

                          <div className="report-summary-grid">
                            <div>
                              <h3 className="report-section-title">E. KETIDAKHADIRAN</h3>
                              <table className="report-attendance report-attendance-full"><tbody>
                                <tr><td>Sakit</td><td>{reportDraft.sakit || "0"} hari</td></tr>
                                <tr><td>Izin</td><td>{reportDraft.izin || "0"} hari</td></tr>
                                <tr><td>Tanpa Keterangan</td><td>{reportDraft.tanpaKeterangan || "0"} hari</td></tr>
                              </tbody></table>
                            </div>
                            <div className="report-box report-teacher-note">
                              <div className="report-box-label">F. Catatan Wali Kelas</div>
                              <div className="report-box-content">{reportDraft.catatanWaliKelas || "-"}</div>
                            </div>
                          </div>

                          <div className="report-status-row">
                            <strong>{Number(String(selectedReportClass || "").match(/\d+/)?.[0] || 0) === 6 ? "Keterangan Kelulusan" : "Keterangan Kenaikan Kelas"}</strong>
                            <span>{Number(String(selectedReportClass || "").match(/\d+/)?.[0] || 0) === 6 ? (reportDraft.keteranganLulus || "-") : (reportDraft.keteranganNaikKelas || "-")}</span>
                          </div>

                          <div className="report-parent-response">
                            <div className="report-box-label">Tanggapan Orang Tua/Wali Murid</div>
                            <div className="report-parent-response-space" />
                          </div>

                          <div className="report-signature-grid">
                            <div className="report-signature">
                              <div>Orang Tua Murid</div>
                              <div className="report-signature-space" />
                              <div className="report-signature-name">{reportDraft.namaOrangTua || "........................................"}</div>
                            </div>
                            <div className="report-signature">
                              <div>{reportDraft.tanggalRaport ? formatReportDate(reportDraft.tanggalRaport) : "................................"}</div>
                              <div>Wali Kelas</div>
                              <div className="report-signature-space" />
                              <div className="report-signature-name">{reportDraft.namaWaliKelas || "........................................"}</div>
                              <div>{reportDraft.nipWaliKelas ? `NIP. ${reportDraft.nipWaliKelas}` : ""}</div>
                            </div>
                          </div>
                          <div className="report-head-signature">
                            <div>Mengetahui,</div><div>Kepala Sekolah</div>
                            <div className="report-signature-space" />
                            <div className="report-signature-name">{reportDraft.namaKepalaSekolah || "........................................"}</div>
                            <div>{reportDraft.nipKepalaSekolah ? `NIP. ${reportDraft.nipKepalaSekolah}` : ""}</div>
                          </div>
                          <div className="report-footer">
                            {selectedReportClass} · {reportStudents.find((item) => item.id === reportDraft.studentId)?.name ?? "-"} · NISN {reportStudents.find((item) => item.id === reportDraft.studentId)?.nis ?? "-"}
                          </div>
                        </div>}
                      </div>
                    </div>
                  )}
                </>
              )}
            </Section>
          )}

          {activeMenu === "Absensi" && (
            <Section
              title="Absensi"
              subtitle={
                role === "Admin" || role === "Guru"
                  ? "Kelola kehadiran siswa berdasarkan tanggal, kelas, dan mata pelajaran"
                  : "Lihat rekap dan persentase kehadiran"
              }
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                <div><p className="text-sm font-bold text-blue-900">Export absensi</p><p className="text-xs text-blue-700">Rekap seluruh absensi yang boleh dilihat akun ini.</p></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => exportAttendance("excel")} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">📊 Excel</button>
                  <button type="button" onClick={() => exportAttendance("pdf")} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">📄 PDF Rekap Harian</button>
                  {(role === "Admin" || isWaliKelas) && <button type="button" onClick={() => void exportStudentAttendanceBySubjectMonthlyPdf()} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">📄 PDF Rekap Bulanan per Mapel</button>}
                </div>
              </div>
              {(role === "Admin" || role === "Guru" || role === "Kepala Sekolah") && (
                <div className="mb-6 grid gap-4 md:grid-cols-3">
                  <button type="button" onClick={() => {
                    if (role === "Kepala Sekolah") { setAttendancePanel("rekap-siswa"); }
                    else { setAttendancePanel("siswa"); setAttendanceClassChosen(false); setAttendanceDate(""); }
                  }} className={`rounded-2xl border p-5 text-left transition ${attendancePanel === "siswa" || attendancePanel === "rekap-siswa" ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"}`}>
                    <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl text-white">👨‍🎓</div><div><p className="font-bold text-gray-900">{role === "Kepala Sekolah" ? "Cek Absensi Siswa" : "Absen Siswa"}</p><p className="text-xs text-gray-500">{role === "Kepala Sekolah" ? "Lihat rekap kehadiran siswa" : "Pilih kelas → tanggal → isi absensi"}</p></div></div>
                  </button>
                  {(role === "Admin" || role === "Kepala Sekolah") && (
                    <button type="button" onClick={() => { setAttendancePanel("rekap-guru"); void loadTeacherAttendanceReport(); }} className={`rounded-2xl border p-5 text-left transition ${attendancePanel === "rekap-guru" ? "border-violet-600 bg-violet-50 shadow-sm" : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50"}`}>
                      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-xl text-white">👥</div><div><p className="font-bold text-gray-900">Cek Absensi Guru</p><p className="text-xs text-gray-500">Lihat jam masuk, pulang, dan keterlambatan</p></div></div>
                    </button>
                  )}
                  {(role === "Guru" || role === "Admin" || role === "Kepala Sekolah") && (
                    <button type="button" onClick={() => { setAttendancePanel("guru"); setAttendanceDate(todayDateString); }} className={`rounded-2xl border p-5 text-left transition ${attendancePanel === "guru" ? "border-emerald-600 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50"}`}>
                      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">📍</div><div><p className="font-bold text-gray-900">Absensi Kehadiran Guru</p><p className="text-xs text-gray-500">Absen masuk/pulang dengan GPS sekolah</p></div></div>
                    </button>
                  )}
                  {role === "Admin" && (
                    <>
                      <button type="button" onClick={() => { setAttendancePanel("qr-pegawai"); void loadEmployeeQrRows(); }} className={`rounded-2xl border p-5 text-left transition ${attendancePanel === "qr-pegawai" ? "border-amber-600 bg-amber-50 shadow-sm" : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50"}`}>
                        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-xl text-white">▦</div><div><p className="font-bold text-gray-900">Kelola QR Pegawai</p><p className="text-xs text-gray-500">Buat dan tampilkan QR unik setiap pegawai</p></div></div>
                      </button>
                    </>
                  )}
                </div>
              )}
              {role === "Admin" && attendancePanel === "qr-pegawai" && (
                <div className="mb-6 rounded-2xl border border-amber-100 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4"><div><h3 className="font-bold text-gray-900">QR Unik Pegawai</h3><p className="text-sm text-gray-600">QR dibuat dari token acak; hanya admin yang dapat mengelolanya.</p></div><button type="button" onClick={() => setAttendancePanel("menu")} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">← Kembali</button></div>
                  <div className="p-5">
                    {employeeQrLoading ? <p className="py-6 text-center text-sm text-gray-500">Memuat QR pegawai…</p> : employeeQrError ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{employeeQrError}</p> : null}
                    <button type="button" onClick={() => void loadEmployeeQrRows()} className="mb-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white">Muat / Perbarui Daftar QR</button>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{employeeQrRows.map((row) => <div key={row.profile_id} className="rounded-2xl border border-slate-200 p-4 text-center">
                      {row.foto_url ? <img src={row.foto_url} alt={`Foto ${row.nama}`} className="mx-auto mb-3 h-16 w-16 rounded-full object-cover" /> : <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600">{row.nama.charAt(0).toUpperCase()}</div>}
                      <p className="font-bold text-gray-900">{row.nama}</p><p className="mb-3 text-xs capitalize text-gray-500">{row.role.replace("_", " ")}</p>
                      <div className="inline-block rounded-xl bg-white p-2"><QRCodeSVG id={`employee-qr-${row.profile_id}`} value={row.qr_token} size={220} level="M" /></div>
                      <p className="mt-2 break-all text-[10px] text-gray-400">Token QR unik</p>
                      <div className="mt-3 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => downloadEmployeeQr(row.profile_id, row.nama)} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Unduh QR (SVG)</button><button type="button" onClick={() => window.print()} className="rounded-lg border px-3 py-2 text-xs font-bold text-gray-700">Cetak kartu / QR</button></div>
                    </div>)}</div>
                    {!employeeQrLoading && employeeQrRows.length === 0 && !employeeQrError && <p className="py-5 text-center text-sm text-gray-500">Tekan “Muat / Perbarui Daftar QR” untuk membuat QR otomatis.</p>}
                  </div>
                </div>
              )}
              {role === "Admin" && attendancePanel === "scan-qr" && (
                <div className="mb-6 rounded-2xl border border-cyan-100 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-100 bg-cyan-50 px-5 py-4"><div><h3 className="font-bold text-gray-900">Pemindai QR Absensi Pegawai</h3><p className="text-sm text-gray-600">Pindai QR, verifikasi nama dan foto, lalu pilih jenis absensi.</p></div><button type="button" onClick={() => { setAttendancePanel("menu"); setScannedEmployee(null); }} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">← Kembali</button></div>
                  <div className="grid gap-5 p-5 md:grid-cols-2">
                    <div><EmployeeQrScanner onScan={handleEmployeeQrScan} /><p className="mt-2 text-xs text-gray-500">Izinkan akses kamera. Jika kamera tidak berjalan, pastikan situs dibuka melalui HTTPS atau localhost.</p></div>
                    <div>
                      {qrAttendanceResult && <AttendanceIdCard result={qrAttendanceResult} schoolName={schoolSettings.namaSekolah || "SD Islam Al-Barkah"} onClose={() => setQrAttendanceResult(null)} />}
                      {scannedEmployee ? <div className="rounded-2xl border border-cyan-200 p-4 text-center">
                        {scannedEmployee.foto_url ? <img src={scannedEmployee.foto_url} alt={`Foto ${scannedEmployee.nama}`} className="mx-auto mb-3 h-20 w-20 rounded-full object-cover" /> : <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-100 text-3xl font-bold text-cyan-800">{scannedEmployee.nama.charAt(0).toUpperCase()}</div>}
                        <h4 className="text-lg font-bold text-gray-900">{scannedEmployee.nama}</h4><p className="mb-4 text-sm capitalize text-gray-500">{scannedEmployee.role.replace("_", " ")}</p>
                        <div className="mb-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setQrAttendanceMode("masuk")} className={`rounded-xl border p-3 text-sm font-bold ${qrAttendanceMode === "masuk" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200"}`}>Absen Masuk</button><button type="button" onClick={() => setQrAttendanceMode("pulang")} className={`rounded-xl border p-3 text-sm font-bold ${qrAttendanceMode === "pulang" ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200"}`}>Absen Pulang</button></div>
                        <button type="button" disabled={qrAttendanceBusy} onClick={() => void recordScannedEmployeeAttendance()} className="w-full rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{qrAttendanceBusy ? "Menyimpan…" : "Konfirmasi Absensi"}</button>
                      </div> : <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-gray-500">Hasil scan dan identitas pegawai akan muncul di sini.</div>}
                      {employeeQrError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{employeeQrError}</p>}
                    </div>
                  </div>
                </div>
              )}
              {(role === "Admin" || role === "Kepala Sekolah" || role === "Guru") && (
                <>
                  {["Guru", "Admin", "Kepala Sekolah"].includes(role) && attendancePanel === "guru" && (
                    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                      <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4">
                        <p className="text-sm font-semibold text-emerald-700">Absensi Guru</p>
                        <h3 className="mt-1 text-lg font-bold text-gray-900">Kehadiran di Sekolah</h3>
                        <p className="mt-1 text-sm text-gray-600">Absensi datang dan pulang menggunakan QR pribadi. GPS/radius sedang dinonaktifkan sementara untuk uji coba; aktifkan kembali setelah pengujian.</p>
                      </div>
                      <div className="p-5">
                        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          {userProfile.fotoUrl ? (
                            <img src={userProfile.fotoUrl} alt={`Foto profil ${userProfile.nama || name}`} className="h-16 w-16 shrink-0 rounded-full border-2 border-white object-cover shadow-sm" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                          ) : (
                            <div aria-label="Foto profil belum tersedia" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
                              {(userProfile.nama || name || "P").trim().charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-900">{userProfile.nama || name || "Nama belum tersedia"}</p>
                            <p className="mt-1 text-sm text-gray-600">{role}</p>
                            <p className="mt-1 text-xs text-gray-500">Foto mengikuti profil akun. Tidak ada pengambilan atau unggah selfie saat absensi.</p>
                          </div>
                        </div>
                        <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-center sm:flex-row sm:text-left">
                          <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm">
                            {ownEmployeeQr?.is_active && ownEmployeeQr.qr_token ? <QRCodeSVG value={ownEmployeeQr.qr_token} size={112} level="M" /> : <div className="flex h-28 w-28 items-center justify-center text-xs text-slate-400">QR belum tersedia</div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-violet-900">QR Pribadi Pegawai</p>
                            <p className="mt-1 text-sm text-violet-800">{userProfile.nama || name} · {role}</p>
                            <p className="mt-1 text-xs text-slate-600">Gunakan kartu QR yang diberikan admin. Saat absen masuk atau pulang, kamera akan memindai kartu dan memastikan QR sesuai dengan akun yang sedang login.</p>
                            {ownEmployeeQrLoading && <p className="mt-2 text-xs text-slate-500">Memuat QR pribadi…</p>}
                            {ownEmployeeQrError && <p className="mt-2 text-xs font-medium text-amber-800">{ownEmployeeQrError}</p>}
                            <button type="button" onClick={() => void loadOwnEmployeeQr()} className="mt-2 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-800">Muat ulang QR</button>
                          </div>
                        </div>
                        {ownQrScannerOpen && (
                          <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div><p className="font-bold text-violet-900">Pindai kartu QR Anda</p><p className="text-sm text-violet-800">Arahkan kamera ke QR pada kartu yang dicetak admin.</p></div>
                              <button type="button" onClick={() => setOwnQrScannerOpen(false)} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-semibold">Batal</button>
                            </div>
                            <EmployeeQrScanner onScan={(token) => { void handleOwnAttendanceQrScan(token); }} />
                          </div>
                        )}
                        {ownQrScannerMessage && <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{ownQrScannerMessage}</div>}
                        {qrAttendanceResult && qrAttendanceResult.profile_id === currentUserId && <AttendanceIdCard result={qrAttendanceResult} schoolName={schoolSettings.namaSekolah || "SD Islam Al-Barkah"} onClose={() => setQrAttendanceResult(null)} />}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Absen Masuk</p>
                            <p className="mt-1 font-bold text-gray-900">{teacherAttendanceToday?.jam_masuk ? "Sudah absen" : "Belum absen"}</p>
                            {teacherAttendanceToday?.status && teacherAttendanceToday.status !== "hadir" && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Status hari ini: {teacherAttendanceToday.status.toUpperCase()}</p>}
                            {teacherAttendanceToday?.jam_masuk ? <div className="mt-4 rounded-xl bg-white p-4"><p className="text-xs text-gray-500">Jam masuk</p><p className="mt-1 text-2xl font-black text-emerald-700">{new Date(teacherAttendanceToday.jam_masuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p><p className="mt-2 text-xs text-gray-600">{teacherAttendanceToday.alamat_masuk || "Alamat belum tersedia"}</p></div> : <button type="button" onClick={() => { setTeacherAttendanceMode("masuk"); setOwnQrScannerMessage(""); if (!ownEmployeeQr?.is_active || !ownEmployeeQr.qr_token) { setOwnQrScannerMessage("QR pribadi belum tersedia. Minta admin membuat QR pegawai terlebih dahulu."); return; } setOwnQrScannerOpen(true); }} disabled={attendanceSaving || ownEmployeeQrLoading} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{locationChecking && teacherAttendanceMode === "masuk" ? "Menyimpan absensi..." : "📷 Scan QR & Absen Masuk"}</button>}
                          </div>
                          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Absen Pulang</p>
                            <p className="mt-1 font-bold text-gray-900">{teacherAttendanceToday?.jam_pulang ? "Sudah absen" : teacherAttendanceToday?.jam_masuk ? "Siap absen pulang" : "Belum tersedia"}</p>
                            {teacherAttendanceToday?.jam_pulang ? <div className="mt-4 rounded-xl bg-white p-4"><p className="text-xs text-gray-500">Jam pulang</p><p className="mt-1 text-2xl font-black text-blue-700">{new Date(teacherAttendanceToday.jam_pulang).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p><p className="mt-2 text-xs text-gray-600">{teacherAttendanceToday.alamat_pulang || "Alamat belum tersedia"}</p></div> : teacherAttendanceToday?.jam_masuk ? <button type="button" onClick={() => { setTeacherAttendanceMode("pulang"); setOwnQrScannerMessage(""); if (!ownEmployeeQr?.is_active || !ownEmployeeQr.qr_token) { setOwnQrScannerMessage("QR pribadi belum tersedia. Minta admin membuat QR pegawai terlebih dahulu."); return; } setOwnQrScannerOpen(true); }} disabled={attendanceSaving || ownEmployeeQrLoading} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{locationChecking && teacherAttendanceMode === "pulang" ? "Menyimpan absensi..." : "📷 Scan QR & Absen Pulang"}</button> : <div className="mt-4 rounded-xl bg-gray-100 p-4 text-center"><p className="text-sm font-semibold text-gray-500">Absen masuk terlebih dahulu</p></div>}
                          </div>
                        </div>
                      </div>
                      {teacherLocationStatus && <div className="mx-5 mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-gray-700">{teacherLocationStatus}</div>}
                      {teacherAttendanceToday?.jam_masuk && teacherAttendanceToday?.jam_pulang && <div className="mx-5 mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center"><p className="text-sm font-bold text-emerald-700">✓ Absensi hari ini sudah lengkap</p><p className="mt-1 text-xs text-emerald-600">Masuk {new Date(teacherAttendanceToday.jam_masuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB · Pulang {new Date(teacherAttendanceToday.jam_pulang).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p></div>}
                    </div>
                  )}

                  {attendancePanel === "rekap-guru" && (role === "Admin" || role === "Kepala Sekolah") && (
                    <div className="mb-6 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-violet-50 px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-violet-700">Rekap Absensi Guru</p>
                          <h3 className="mt-1 text-lg font-bold text-gray-900">Kehadiran Seluruh Guru</h3>
                          <p className="mt-1 text-sm text-gray-600">Hari kerja Senin–Jumat. Batas masuk tepat waktu pukul 06.30 WIB. PDF harian untuk detail tanggal tertentu dan PDF bulanan untuk ringkasan otomatis seluruh pegawai.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                           {(role === "Admin" || role === "Kepala Sekolah") && <div className="flex flex-wrap items-end gap-3">
                             <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Bulan laporan<input type="month" value={selectedPdfAttendanceMonth} max={todayDateString.slice(0, 7)} onChange={(e) => setSelectedPdfAttendanceMonth(e.target.value)} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-800" /></label>
                             <button type="button" onClick={() => void exportTeacherAttendanceMonthlySummaryPdf()} className="rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">📄 Cetak/Save PDF Absensi Guru</button>
                           </div>}
                           <button type="button" onClick={() => setAttendancePanel("menu")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 hover:bg-slate-50">← Kembali</button>
                         </div>
                      </div>
                      <div className="p-5">
                        {teacherAttendanceReportLoading ? (
                          <p className="py-8 text-center text-sm text-gray-500">Memuat rekap absensi pegawai...</p>
                        ) : teacherAttendanceReportError ? (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{teacherAttendanceReportError}</div>
                        ) : teacherAttendanceRows.length === 0 ? (
                          <p className="py-8 text-center text-sm text-gray-500">Belum ada akun guru, kepala sekolah, atau admin pada data profil.</p>
                        ) : (
                          <>
                          <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50 p-4">
                            <p className="font-bold text-violet-900">Persentase Kehadiran Pegawai — Bulan Berjalan</p>
                            <p className="mt-1 text-sm text-violet-800">Daftar mencakup semua akun guru, kepala sekolah, dan admin. Jumlah hari kerja menampilkan total hari wajib selama satu bulan penuh sesuai jadwal masing-masing guru (pegawai Admin/Kepala Sekolah mengikuti Senin–Jumat). Persentase dihitung dari total hari wajib satu bulan; tanggal mendatang belum dihitung sebagai Alfa.</p>
                          </div>
                          {role === "Admin" && (
                            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                              <h4 className="font-bold text-amber-900">Catat Status Absensi Pegawai</h4>
                              <p className="mt-1 text-xs text-amber-800">Gunakan bagian ini untuk mencatat Izin, Sakit, atau Alfa berdasarkan laporan yang diterima Admin. Status Hadir tetap tercatat melalui absensi QR.</p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">Nama pegawai
                                  <select value={selectedTeacherStatusProfile} onChange={(e) => setSelectedTeacherStatusProfile(e.target.value)} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm">
                                    <option value="">Pilih pegawai</option>
                                    {teacherAttendanceRows.map((row) => <option key={row.guru_id} value={row.guru_id}>{row.nama_guru} — {row.role_label}</option>)}
                                  </select>
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">Tanggal
                                  <input type="date" value={selectedTeacherStatusDate} max={todayDateString} onChange={(e) => setSelectedTeacherStatusDate(e.target.value)} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" />
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">Status
                                  <select value={selectedTeacherStatus} onChange={(e) => setSelectedTeacherStatus(e.target.value as "izin" | "sakit" | "alfa")} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm">
                                    <option value="izin">Izin</option><option value="sakit">Sakit</option><option value="alfa">Alfa</option>
                                  </select>
                                </label>
                                <div className="flex items-end"><button type="button" disabled={teacherStatusSaving || !selectedTeacherStatusProfile} onClick={() => void saveTeacherAttendanceStatus()} className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">{teacherStatusSaving ? "Menyimpan..." : "Simpan Status"}</button></div>
                              </div>
                            </div>
                          )}
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                              <thead><tr className="border-b bg-slate-50 text-xs uppercase text-slate-500"><th className="p-3">No.</th><th className="p-3">Nama Pegawai</th><th className="p-3">Jabatan</th><th className="p-3">Hadir</th><th className="p-3">Izin</th><th className="p-3">Sakit</th><th className="p-3">Alfa</th><th className="p-3">Persentase Kehadiran</th></tr></thead>
                              <tbody>
                                {teacherAttendanceRows.map((row, index) => (
                                  <tr key={row.guru_id} className="border-b border-slate-100">
                                    <td className="p-3 text-gray-500">{index + 1}</td>
                                    <td className="p-3 font-semibold text-gray-900">{row.nama_guru}</td>
                                    <td className="p-3">{row.role_label}</td>
                                    <td className="p-3">{row.attendedWorkdays}/{row.workdaysElapsed} hari kerja</td>
                                    <td className="p-3">{row.izinDays}</td><td className="p-3">{row.sakitDays}</td><td className="p-3">{row.alfaDays}</td>
                                    <td className="p-3"><span className="font-bold text-violet-700">{row.attendancePercentage}%</span><div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${row.attendancePercentage}%` }} /></div></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {attendancePanel === "siswa" && (
                  <>
                  <div className="mb-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div><h3 className="text-lg font-bold text-gray-900">Absen Siswa</h3><p className="text-sm text-gray-500">Ikuti urutan: pilih kelas → pilih tanggal → pilih mata pelajaran → isi absensi.</p></div>
                      <button type="button" onClick={() => setAttendancePanel("menu")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-slate-50">← Kembali</button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-700">1. Pilih Kelas</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(role === "Admin" || isGuruPiket ? attendanceClassOptions : Array.from(new Set([...teacherAssignments.map((a) => a.className)]))).map((className) => (
                            <button key={className} type="button" onClick={() => { setAttendanceClass(className); setAttendanceClassChosen(true); setAttendanceDate(""); setAttendanceSubjectId(""); setAttendanceSaved(false); setStudentAttendance({}); }} className={`rounded-xl border px-3 py-2 text-sm font-bold ${attendanceClassChosen && attendanceClass === className ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-gray-700 hover:border-blue-300"}`}>{className}</button>
                          ))}
                        </div>
                      </div>
                      <div className={`rounded-2xl border p-4 ${attendanceClassChosen ? "border-blue-100 bg-blue-50/60" : "border-slate-200 bg-slate-50"}`}>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-700">2. Pilih Tanggal</p>
                        <input type="date" value={attendanceDate} onChange={(e) => { setAttendanceDate(e.target.value); setAttendanceSaved(false); setStudentAttendance({}); }} disabled={!attendanceClassChosen} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-gray-100" />
                        {!attendanceClassChosen && <p className="mt-2 text-xs text-gray-500">Pilih kelas terlebih dahulu.</p>}
                      </div>
                      <div className={`rounded-2xl border p-4 ${attendanceDate ? "border-blue-100 bg-blue-50/60" : "border-slate-200 bg-slate-50"}`}>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-700">3. Mata Pelajaran</p>
                        <select value={attendanceSubjectId} onChange={(e) => { setAttendanceSubjectId(e.target.value); setAttendanceSaved(false); }} disabled={!attendanceDate} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-gray-100">
                          <option value="">Pilih mata pelajaran</option>
                          {(role === "Admin" || isGuruPiket
                            ? attendanceSubjects
                            : Array.from(
                                new Map<string, { id: string; name: string; code: string }>(
                                  [
                                    ...(isWaliKelas && teacherAssignments.some((a) => a.isWaliKelas && a.className === attendanceClass)
                                      ? attendanceSubjects.filter((subject) => waliKelasSubjectNamesForClass(attendanceClass).has(subject.name))
                                      : []),
                                    ...teacherAssignments
                                      .filter((a) => a.className === attendanceClass && a.subjectId)
                                      .map((a) => ({ id: a.subjectId, name: a.subjectName, code: a.subjectCode })),
                                  ].map((subject) => [subject.id, subject] as [string, { id: string; name: string; code: string }])
                                ).values()
                              )
                          ).map((subject) => <option key={subject.id} value={subject.id}>{subject.code} - {subject.name}</option>)}
                        </select>
                        {!attendanceDate && <p className="mt-2 text-xs text-gray-500">Pilih tanggal terlebih dahulu.</p>}
                      </div>
                    </div>
                  </div>
                  {attendanceClassChosen && attendanceDate && attendanceSubjectId && (
                  <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Siap mengisi</p><h3 className="text-lg font-bold text-gray-900">Kelas {attendanceClass} · {attendanceSubjects.find((s) => s.id === attendanceSubjectId)?.name ?? "Mata Pelajaran"}</h3><p className="text-sm text-gray-500">Tanggal {new Date(`${attendanceDate}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></div>
                      <button type="button" onClick={saveStudentAttendance} disabled={attendanceSaving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{attendanceSaving ? "Menyimpan..." : "Simpan Absensi Siswa"}</button>
                    </div>
                  </div>
                  )}
                  {attendanceClassChosen && attendanceDate && attendanceSubjectId && (
                    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Daftar Siswa</p>
                          <h3 className="text-lg font-bold text-gray-900">Absensi Siswa Kelas {attendanceClass}</h3>
                          <p className="text-sm text-gray-500">Pilih status setiap siswa: Hadir, Izin, Sakit, atau Alpa.</p>
                        </div>
                        <button
                          type="button"
                          onClick={saveStudentAttendance}
                          disabled={attendanceSaving}
                          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {attendanceSaving ? "Menyimpan..." : "Simpan Absensi Siswa"}
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {attendanceStudents.filter((student) => student.class === attendanceClass).map((student) => (
                          <div key={student.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{student.name}</p>
                              <p className="text-xs text-gray-500">Kelas {student.class}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {attendanceStatuses.map((status) => {
                                const active = studentAttendance[student.id] === status;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateStudentAttendance(student.id, status)}
                                    className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                                      active
                                        ? status === "Hadir"
                                          ? "border-emerald-600 bg-emerald-600 text-white"
                                          : status === "Izin"
                                          ? "border-blue-600 bg-blue-600 text-white"
                                          : status === "Sakit"
                                          ? "border-amber-500 bg-amber-500 text-white"
                                          : "border-rose-600 bg-rose-600 text-white"
                                        : "border-slate-200 bg-white text-gray-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="hidden">
                  <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Mata Pelajaran</label>
                        <select
                          value={attendanceSubjectId}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAttendanceSubjectId(value);
                            setAttendanceSaved(false);
                            const nextAttendance: Record<string, AttendanceStatus> = {};
                            attendanceStudents
                              .filter((student) => student.class === attendanceClass)
                              .forEach((student) => {
                                const saved = attendanceRecords[`${attendanceDate}:${student.id}:${value}`];
                                if (saved) nextAttendance[student.id] = saved;
                              });
                            setStudentAttendance(nextAttendance);
                          }}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">Pilih mata pelajaran</option>
                          {(
  role === "Admin" || isGuruPiket
    ? attendanceSubjects.map((subject) => ({
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
      }))
    : Array.from(
        new Map<
          string,
          {
            subjectId: string;
            subjectName: string;
            subjectCode: string;
          }
        >(
          [
            ...(isWaliKelas && waliAttendanceClassNames.includes(attendanceClass)
              ? attendanceSubjects.map((subject) => [
                  subject.id,
                  {
                    subjectId: subject.id,
                    subjectName: subject.name,
                    subjectCode: subject.code,
                  },
                ] as [
                  string,
                  { subjectId: string; subjectName: string; subjectCode: string }
                ])
              : []),
            ...teacherAssignments
              .filter(
                (a) =>
                  a.className === attendanceClass &&
                  a.subjectId
              )
              .map(
                (a): [
                  string,
                  {
                    subjectId: string;
                    subjectName: string;
                    subjectCode: string;
                  }
                ] => [
                  a.subjectId,
                  {
                    subjectId: a.subjectId,
                    subjectName: a.subjectName,
                    subjectCode: a.subjectCode,
                  },
                ]
              ),

          ]
        ).values()
      )
).map((subject) => (
                            <option key={subject.subjectId} value={subject.subjectId}>
                              {subject.subjectCode} - {subject.subjectName}
                            </option>
                          ))}
                        </select>
                        {role === "Guru" && isWaliKelas && (
                          <p className="mt-2 text-xs text-emerald-700">Wali kelas dapat mengisi absensi kelas yang diwalikan sesuai penugasan yang berlaku.</p>
                        )}
{role === "Guru" && !isWaliKelas && (
  <p className="mt-2 text-xs text-gray-500">
    Guru hanya dapat memilih mata pelajaran yang diampu pada kelas tersebut.
  </p>
)}
                      </div>

                      <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        <p className="font-bold">Aturan Absensi</p>
                        <p className="mt-1">Absensi siswa dicatat berdasarkan <strong>tanggal + kelas + mata pelajaran</strong>.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Kalender Absensi 2026</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Pilih tanggal, kelas, dan mata pelajaran untuk mengisi kehadiran siswa.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (attendanceMonth > 0) {
                              setAttendanceMonth(attendanceMonth - 1);
                              setAttendanceDate("");
                              setAttendanceSaved(false);
                            }
                          }}
                          disabled={attendanceMonth === 0}
                          className="rounded-xl border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-40"
                        >
                          ←
                        </button>
                        <div className="min-w-[150px] text-center font-bold text-gray-800">
                          {new Date(attendanceYear, attendanceMonth, 1).toLocaleDateString("id-ID", {
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                        <button
                          onClick={() => {
                            if (attendanceMonth < 11) {
                              setAttendanceMonth(attendanceMonth + 1);
                              setAttendanceDate("");
                              setAttendanceSaved(false);
                            }
                          }}
                          disabled={attendanceMonth === 11}
                          className="rounded-xl border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-40"
                        >
                          →
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const firstDay = new Date(attendanceYear, attendanceMonth, 1);
                      const daysInMonth = new Date(attendanceYear, attendanceMonth + 1, 0).getDate();
                      const mondayOffset = (firstDay.getDay() + 6) % 7;
                      const cells = Array.from(
                        { length: Math.ceil((mondayOffset + daysInMonth) / 7) * 7 },
                        (_, index) => {
                          const day = index - mondayOffset + 1;
                          return day >= 1 && day <= daysInMonth ? day : null;
                        }
                      );

                      return (
                        <div className="mt-5">
                          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-500">
                            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
                              <div key={day}>{day}</div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-2">
                            {cells.map((day, index) => {
                              if (!day) return <div key={`empty-${index}`} className="min-h-11" />;

                              const dateValue = `${attendanceYear}-${String(attendanceMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                              const dateObject = new Date(`${dateValue}T00:00:00`);
                              const weekend = dateObject.getDay() === 0 || dateObject.getDay() === 6;
                              const selected = attendanceDate === dateValue;

                              return (
                                <button
                                  key={dateValue}
                                  onClick={() => {
                                    setAttendanceDate(dateValue);
                                    setAttendanceSaved(false);

                                    const allowedCalendarClasses =
                                      role === "Admin" || isGuruPiket
                                        ? attendanceClassOptions
                                        : Array.from(
                                            new Set([
                                              ...teacherAssignments
                                                .filter((a) => a.subjectId)
                                                .map((a) => a.className),
                                            ])
                                          );
                                    const nextClass = allowedCalendarClasses.includes(attendanceClass)
                                      ? attendanceClass
                                      : allowedCalendarClasses[0] ?? "";
                                    setAttendanceClass(nextClass);

                                    const nextAttendance: Record<string, AttendanceStatus> = {};
                                    attendanceStudents
                                      .filter((student) => student.class === nextClass)
                                      .forEach((student) => {
                                        const saved = attendanceSubjectId
                                          ? attendanceRecords[`${dateValue}:${student.id}:${attendanceSubjectId}`]
                                          : undefined;
                                        if (saved) nextAttendance[student.id] = saved;
                                      });
                                    setStudentAttendance(nextAttendance);
                                  }}
                                  className={`min-h-11 rounded-xl border text-sm font-bold transition ${
                                    selected
                                      ? "border-blue-600 bg-blue-600 text-white"
                                      : weekend
                                      ? "border-slate-100 bg-slate-50 text-slate-400"
                                      : "border-slate-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  </div>
                  </>
                  )}

                  {attendanceDate && (
                    <>
                      {attendancePanel === "siswa" && (
                      <>
                      <div className="hidden">
                      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4">
                          <h3 className="text-lg font-bold text-gray-900">Pilih Kelas</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Tanggal:{" "}
                            <span className="font-semibold text-blue-600">
                              {new Date(`${attendanceDate}T00:00:00`).toLocaleDateString("id-ID", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                          {(role === "Admin" || isGuruPiket ? attendanceClassOptions : Array.from(new Set([...teacherAssignments.map((a) => a.className)]))).map((className) => {
                            const count = attendanceStudents.filter(
                              (student) => student.class === className
                            ).length;

                            return (
                              <button
                                key={className}
                                onClick={() => {
                                  setAttendanceClass(className);
                                  setAttendanceSaved(false);

                                  const nextAttendance: Record<string, AttendanceStatus> = {};
                                  attendanceStudents
                                    .filter((student) => student.class === className)
                                    .forEach((student) => {
                                      const saved = attendanceRecords[`${attendanceDate}:${student.id}:${attendanceSubjectId}`];
                                      if (saved) nextAttendance[student.id] = saved;
                                    });
                                  setStudentAttendance(nextAttendance);
                                }}
                                className={`rounded-2xl border p-4 text-left transition ${
                                  attendanceClass === className
                                    ? "border-blue-600 bg-blue-50"
                                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                }`}
                              >
                                <p className="text-2xl font-bold text-gray-900">{className}</p>
                                <p className="mt-1 text-xs text-gray-500">{count} siswa</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              Absensi Siswa Kelas {attendanceClass}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Admin atau guru memilih status kehadiran setiap siswa sesuai kelas dan mata pelajaran yang diampu.
                            </p>
                          </div>

                          <button
                            onClick={saveStudentAttendance}
                            disabled={attendanceSaving}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {attendanceSaving ? "Menyimpan..." : "Simpan Absensi"}
                          </button>
                        </div>

                        {attendanceSaved && (
                          <div className="mx-5 mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                            ✓ Absensi tanggal{" "}
                            {new Date(`${attendanceDate}T00:00:00`).toLocaleDateString("id-ID")} berhasil disimpan.
                          </div>
                        )}

                        <div className="divide-y divide-slate-100">
                          {attendanceStudents
                            .filter((student) => student.class === attendanceClass)
                            .map((student) => (
                              <div
                                key={student.id}
                                className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
                              >
                                <div>
                                  <p className="font-semibold text-gray-900">{student.name}</p>
                                  <p className="text-xs text-gray-500">Kelas {student.class}</p>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                  {attendanceStatuses.map((status) => {
                                    const active = studentAttendance[student.id] === status;

                                    return (
                                      <button
                                        key={status}
                                        onClick={() => updateStudentAttendance(student.id, status)}
                                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                          active
                                            ? status === "Hadir"
                                              ? "border-emerald-600 bg-emerald-600 text-white"
                                              : status === "Izin"
                                              ? "border-blue-600 bg-blue-600 text-white"
                                              : status === "Sakit"
                                              ? "border-amber-500 bg-amber-500 text-white"
                                              : "border-rose-600 bg-rose-600 text-white"
                                            : "border-slate-200 text-gray-600 hover:bg-slate-50"
                                        }`}
                                      >
                                        {status}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                      </div>
                      </>
                      )}
                    </>
                  )}
                  </>
                  )}

              {role !== "Admin" && role !== "Guru" && attendancePanel === "rekap-siswa" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-gray-900">Rekap Kehadiran Siswa</h3>
                      {attendancePanel === "rekap-siswa" && <button type="button" onClick={() => setAttendancePanel("menu")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 hover:bg-slate-50">← Kembali</button>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      Akun ini hanya dapat melihat persentase kehadiran. Pengisian status siswa dilakukan oleh Admin atau Guru sesuai kelas dan mata pelajaran yang diampu.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {attendanceStudents.map((student) => {
                      const records = Object.entries(attendanceRecords)
                        .filter(([key]) => key.endsWith(`:${student.id}`))
                        .map(([, status]) => status);

                      const hadir = records.filter((status) => status === "Hadir").length;
                      const total = records.length;
                      const percentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

                      return (
                        <div key={student.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">{student.name}</p>
                              <p className="text-xs text-gray-500">Kelas {student.class}</p>
                            </div>
                            <p className="text-2xl font-black text-blue-600">{percentage}%</p>
                          </div>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <p className="mt-2 text-xs text-gray-500">
                            {total > 0
                              ? `${hadir} hari hadir dari ${total} hari tercatat`
                              : "Belum ada data absensi tersimpan"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>
          )}

          {activeMenu === "SPP & Administrasi" && (
            <Section
              title="SPP & Administrasi"
              subtitle="Tagihan, pembayaran, dan riwayat administrasi siswa"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-3">
                <div><p className="text-sm font-bold text-orange-900">Export administrasi</p><p className="text-xs text-orange-700">Rekap tagihan dan pembayaran SPP.</p></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => exportSpp("excel")} className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100">📊 Excel</button>
                  <button type="button" onClick={() => exportSpp("pdf")} className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700">📄 PDF</button>
                </div>
              </div>
              {sppLoading ? (
                <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">Memuat data SPP...</div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <InfoCard title="Total Tagihan" value={formatRupiah(sppBills.reduce((sum, x) => sum + x.nominal, 0))} />
                    <InfoCard title="Sudah Dibayar" value={formatRupiah(sppBills.reduce((sum, x) => sum + x.totalBayar, 0))} />
                    <InfoCard title="Sisa Tagihan" value={formatRupiah(sppBills.reduce((sum, x) => sum + Math.max(0, x.nominal - x.totalBayar), 0))} />
                    <InfoCard title="Belum Lunas" value={String(sppBills.filter((x) => x.status !== "Lunas" && x.status !== "Dibatalkan").length)} />
                  </div>

                  {(role === "Siswa" || role === "Orang Tua") && (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <h3 className="font-bold text-emerald-900">💳 Pembayaran Online</h3>
                      <p className="mt-1 text-sm text-emerald-800">Pilih <b>Bayar Online / QRIS</b> untuk mencoba alur pembayaran dummy. Belum ada uang sungguhan; setelah simulasi berhasil, status tagihan otomatis menjadi Lunas.</p>
                    </div>
                  )}

                  {role === "Admin" && (
                    <div className="mt-6 grid gap-6 xl:grid-cols-2">
                      <div className="rounded-2xl border bg-white p-5">
                        <h3 className="font-bold">Buat Tagihan</h3>
                        <p className="mt-1 text-sm text-gray-500">Buat tagihan per siswa untuk data dummy terlebih dahulu.</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <select value={sppStudentId} onChange={(e) => setSppStudentId(e.target.value)} className="rounded-xl border px-4 py-3">
                            <option value="">Pilih siswa</option>
                            {sppStudents.map((x) => <option key={x.id} value={x.id}>{x.nama} — {x.nis}</option>)}
                          </select>
                          <select value={sppFeeTypeId} onChange={(e) => { setSppFeeTypeId(e.target.value); const f = sppFeeTypes.find((x) => x.id === e.target.value); if (f) setSppNominal(String(f.nominalDefault)); }} className="rounded-xl border px-4 py-3">
                            <option value="">Pilih jenis tagihan</option>
                            {sppFeeTypes.map((x) => <option key={x.id} value={x.id}>{x.nama} — {formatRupiah(x.nominalDefault)}</option>)}
                          </select>
                          <input type="month" value={sppPeriode} onChange={(e) => setSppPeriode(e.target.value)} className="rounded-xl border px-4 py-3" />
                          <input type="date" value={sppJatuhTempo} onChange={(e) => setSppJatuhTempo(e.target.value)} className="rounded-xl border px-4 py-3" />
                          <input type="number" min="0" value={sppNominal} onChange={(e) => setSppNominal(e.target.value)} placeholder="Nominal" className="rounded-xl border px-4 py-3" />
                          <button onClick={createSppBill} disabled={sppSaving} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-50">{sppSaving ? "Menyimpan..." : "+ Buat Tagihan"}</button>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-white p-5">
                        <h3 className="font-bold">Catat Pembayaran</h3>
                        <p className="mt-1 text-sm text-gray-500">Catat pembayaran setelah menerima dana dari siswa/orang tua.</p>
                        <div className="mt-4 grid gap-3">
                          <select value={sppPaymentBillId} onChange={(e) => { setSppPaymentBillId(e.target.value); const b = sppBills.find((x) => x.id === e.target.value); if (b) setSppPaymentNominal(String(Math.max(0, b.nominal - b.totalBayar))); }} className="rounded-xl border px-4 py-3">
                            <option value="">Pilih tagihan</option>
                            {sppBills.filter((x) => x.status !== "Lunas" && x.status !== "Dibatalkan").map((x) => <option key={x.id} value={x.id}>{x.studentName} — {x.feeName} — {x.periode} — Sisa {formatRupiah(Math.max(0, x.nominal - x.totalBayar))}</option>)}
                          </select>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input type="number" min="1" value={sppPaymentNominal} onChange={(e) => setSppPaymentNominal(e.target.value)} placeholder="Nominal pembayaran" className="rounded-xl border px-4 py-3" />
                            <select value={sppPaymentMethod} onChange={(e) => setSppPaymentMethod(e.target.value)} className="rounded-xl border px-4 py-3"><option>Tunai</option><option>Transfer</option><option>QRIS</option></select>
                          </div>
                          <button onClick={saveSppPayment} disabled={sppSaving} className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50">{sppSaving ? "Menyimpan..." : "Simpan Pembayaran"}</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 rounded-2xl border bg-white p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div><h3 className="font-bold">Daftar Tagihan</h3><p className="text-sm text-gray-500">Data mengikuti hak akses akun.</p></div>
                      <input value={sppSearch} onChange={(e) => setSppSearch(e.target.value)} placeholder="Cari siswa / tagihan..." className="rounded-xl border px-4 py-2 text-sm" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[850px] text-left text-sm">
                        <thead><tr className="border-b text-gray-500"><th className="px-3 py-3">Siswa</th><th className="px-3 py-3">Tagihan</th><th className="px-3 py-3">Periode</th><th className="px-3 py-3">Nominal</th><th className="px-3 py-3">Dibayar</th><th className="px-3 py-3">Sisa</th><th className="px-3 py-3">Status</th></tr></thead>
                        <tbody>{sppBills.filter((x) => `${x.studentName} ${x.nis} ${x.feeName} ${x.periode}`.toLowerCase().includes(sppSearch.toLowerCase())).map((x) => (
                          <tr key={x.id} className="border-b last:border-0"><td className="px-3 py-3"><div className="font-semibold">{x.studentName}</div><div className="text-xs text-gray-500">NIS {x.nis}</div></td><td className="px-3 py-3">{x.feeName}</td><td className="px-3 py-3">{x.periode}</td><td className="px-3 py-3 font-semibold">{formatRupiah(x.nominal)}</td><td className="px-3 py-3">{formatRupiah(x.totalBayar)}</td><td className="px-3 py-3 font-semibold">{formatRupiah(Math.max(0, x.nominal - x.totalBayar))}</td><td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${x.status === "Lunas" ? "bg-emerald-100 text-emerald-700" : x.status === "Sebagian" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{x.status}</span>
                              {(role === "Siswa" || role === "Orang Tua") && x.status !== "Lunas" && x.status !== "Dibatalkan" && (
                                <button
                                  type="button"
                                  onClick={() => startSppOnlinePayment(x.id)}
                                  disabled={sppOnlineLoading}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {sppOnlineLoading ? "Memproses..." : "💳 Bayar Online / QRIS"}
                                </button>
                              )}
                            </div>
                          </td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </Section>
          )}

          {sppDummyBill && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => !sppOnlineLoading && setSppDummyBill(null)}>
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Simulasi Pembayaran</p>
                    <h3 className="mt-1 text-xl font-bold">QRIS Dummy</h3>
                    <p className="mt-1 text-sm text-gray-500">Ini hanya simulasi. Belum terhubung ke QRIS atau payment gateway asli.</p>
                  </div>
                  <button type="button" onClick={() => setSppDummyBill(null)} disabled={sppOnlineLoading} className="rounded-full bg-gray-100 px-3 py-1 text-lg text-gray-500">×</button>
                </div>

                <div className="mt-5 rounded-2xl border bg-gray-50 p-4 text-center">
                  <p className="text-sm font-semibold text-gray-600">{sppDummyBill.feeName} · {sppDummyBill.periode}</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{formatRupiah(Math.max(0, sppDummyBill.nominal - sppDummyBill.totalBayar))}</p>
                </div>

                <div className="mx-auto mt-5 grid h-56 w-56 grid-cols-11 gap-1 rounded-xl bg-white p-3 shadow-inner ring-1 ring-gray-200">
                  {Array.from({ length: 121 }, (_, i) => {
                    const x = i % 11;
                    const y = Math.floor(i / 11);
                    const finder = (fx: number, fy: number) => x >= fx && x < fx + 5 && y >= fy && y < fy + 5 && (x === fx || x === fx + 4 || y === fy || y === fy + 4 || (x >= fx + 2 && x <= fx + 2 && y >= fy + 2 && y <= fy + 2));
                    const dark = finder(0, 0) || finder(6, 0) || finder(0, 6) || ((i * 17 + x * 7 + y * 13) % 5 < 2);
                    return <span key={i} className={`rounded-[2px] ${dark ? "bg-gray-900" : "bg-white"}`} />;
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-800">
                  <b>MODE DUMMY</b> · QR ini bukan QR pembayaran asli dan tidak dapat dipindai untuk mengirim uang.
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setSppDummyBill(null)} disabled={sppOnlineLoading} className="rounded-xl border px-4 py-3 font-bold text-gray-700 disabled:opacity-50">Batal</button>
                  <button type="button" onClick={simulateDummyQrisPayment} disabled={sppOnlineLoading} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {sppOnlineLoading ? "Memproses..." : "✓ Simulasikan Pembayaran"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeMenu === "Pengaturan Sekolah" && (
            <Section
              title="Pengaturan Sekolah"
              subtitle="Kelola identitas resmi sekolah yang akan tampil di portal, raport, dan dokumen cetak."
            >
              {schoolSettingsLoading ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
                  Memuat pengaturan sekolah...
                </div>
              ) : (
                <div className="space-y-6">
                  {role === "Kepala Sekolah" && (
                    <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                      <span className="text-lg">🔒</span>
                      <div><b>Mode lihat saja</b><p className="mt-0.5 text-blue-700">Perubahan data identitas dilakukan oleh Admin.</p></div>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b bg-gradient-to-r from-emerald-50 to-white px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><MenuIcon name="dashboard" size={20} /></div>
                        <div><h3 className="font-bold text-gray-900">Identitas Sekolah</h3><p className="text-sm text-gray-500">Informasi utama yang menjadi identitas portal.</p></div>
                      </div>
                    </div>
                    <div className="grid gap-5 p-6 md:grid-cols-2">
                      {[
                        ["namaSekolah", "Nama Sekolah", "SD Islam Al-Barkah"],
                        ["npsn", "NPSN", "Nomor Pokok Sekolah Nasional"],
                        ["nss", "NSS", "Nomor Statistik Sekolah"],
                        ["telepon", "Telepon", "Nomor telepon sekolah"],
                        ["email", "Email Sekolah", "Email resmi sekolah"],
                        ["website", "Website", "Alamat website sekolah"],
                      ].map(([key, label, placeholder]) => (
                        <label key={key} className="block">
                          <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
                          <input value={schoolSettings[key as keyof SchoolSettings] as string} onChange={(e) => setSchoolSettings((current) => ({ ...current, [key]: e.target.value }))} placeholder={placeholder} disabled={role !== "Admin"} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-gray-100" />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b bg-gradient-to-r from-sky-50 to-white px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-xl text-white">📍</div>
                        <div><h3 className="font-bold text-gray-900">Alamat Sekolah</h3><p className="text-sm text-gray-500">Alamat ini akan digunakan pada kop raport.</p></div>
                      </div>
                    </div>
                    <div className="grid gap-5 p-6 md:grid-cols-2">
                      <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold text-gray-700">Alamat Lengkap</span><textarea value={schoolSettings.alamat} onChange={(e) => setSchoolSettings((current) => ({ ...current, alamat: e.target.value }))} disabled={role !== "Admin"} rows={3} placeholder="Nama jalan, nomor, RT/RW, dan keterangan lainnya" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-100" /></label>
                      {[
                        ["desaKelurahan", "Desa / Kelurahan"], ["kecamatan", "Kecamatan"], ["kabupatenKota", "Kabupaten / Kota"], ["provinsi", "Provinsi"], ["kodePos", "Kode Pos"],
                      ].map(([key, label]) => (
                        <label key={key} className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span><input value={schoolSettings[key as keyof SchoolSettings] as string} onChange={(e) => setSchoolSettings((current) => ({ ...current, [key]: e.target.value }))} disabled={role !== "Admin"} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-100" /></label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                      <div className="border-b bg-gradient-to-r from-violet-50 to-white px-6 py-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-xl text-white">👨‍💼</div><div><h3 className="font-bold">Kepala Sekolah</h3><p className="text-sm text-gray-500">Data penanggung jawab sekolah.</p></div></div></div>
                      <div className="grid gap-5 p-6">
                        <label><span className="mb-2 block text-sm font-semibold text-gray-700">Nama Kepala Sekolah</span><input value={schoolSettings.namaKepalaSekolah} onChange={(e) => setSchoolSettings((current) => ({ ...current, namaKepalaSekolah: e.target.value }))} disabled={role !== "Admin"} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-100" /></label>
                        <label><span className="mb-2 block text-sm font-semibold text-gray-700">NIP Kepala Sekolah</span><input value={schoolSettings.nipKepalaSekolah} onChange={(e) => setSchoolSettings((current) => ({ ...current, nipKepalaSekolah: e.target.value }))} disabled={role !== "Admin"} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-100" /></label>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                      <div className="border-b bg-gradient-to-r from-amber-50 to-white px-6 py-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-xl text-white">📚</div><div><h3 className="font-bold">Akademik Aktif</h3><p className="text-sm text-gray-500">Periode yang sedang digunakan portal.</p></div></div></div>
                      <div className="grid gap-5 p-6">
                        <label><span className="mb-2 block text-sm font-semibold text-gray-700">Tahun Ajaran</span><input value={schoolSettings.tahunAjaran} onChange={(e) => setSchoolSettings((current) => ({ ...current, tahunAjaran: e.target.value }))} disabled={role !== "Admin"} placeholder="2026/2027" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-100" /></label>
                        <label><span className="mb-2 block text-sm font-semibold text-gray-700">Semester Aktif</span><select value={schoolSettings.semester} onChange={(e) => setSchoolSettings((current) => ({ ...current, semester: e.target.value === "2" ? "2" : "1" }))} disabled={role !== "Admin"} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-100"><option value="1">Semester 1</option><option value="2">Semester 2</option></select></label>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b bg-gradient-to-r from-rose-50 to-white px-6 py-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-xl text-white">🖼️</div><div><h3 className="font-bold">Logo Sekolah</h3><p className="text-sm text-gray-500">Logo ini akan otomatis digunakan pada kop raport.</p></div></div></div>
                    <div className="p-6">
                      <div className="flex flex-col gap-5 md:flex-row md:items-center">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white">
                          <img src={SCHOOL_LOGO_URL} alt="Logo SD Islam Al-Barkah" className="h-full w-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-700">Logo Portal Sekolah</p>
                          <p className="mt-1 text-sm leading-6 text-gray-500">Logo SD Islam Al-Barkah sudah dipasang langsung dari <span className="font-semibold">public/logo-sd.png</span>, sehingga tidak membutuhkan bucket Supabase Storage.</p>
                          <p className="mt-2 text-xs text-gray-400">Jika nanti ingin mengganti logo, cukup ganti file <span className="font-semibold">public/logo-sd.png</span> dengan file logo baru menggunakan nama yang sama.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {role === "Admin" && (
                    <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-3xl border border-emerald-100 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                      <div>{schoolSettingsSaved ? <p className="text-sm font-bold text-emerald-700">✓ Pengaturan berhasil disimpan.</p> : <p className="text-sm text-gray-500">Simpan setelah data resmi sekolah sudah lengkap.</p>}<p className="mt-1 text-xs text-gray-400">Nama, alamat, dan logo akan dipakai pada kop raport.</p></div>
                      <button onClick={saveSchoolSettings} disabled={schoolSettingsSaving} className="rounded-2xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">{schoolSettingsSaving ? "Menyimpan..." : "💾 Simpan Pengaturan"}</button>
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

          {activeMenu === "Pusat Bantuan" && (
            <Section
              title="Pusat Bantuan"
              subtitle="Panduan singkat untuk menggunakan Portal Sekolah SD Islam Al-Barkah"
            >
              <div className="space-y-6">
                <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
                  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                          <MenuIcon name="help" size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Layanan Bantuan</p>
                          <h3 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Butuh bantuan menggunakan portal?</h3>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-300">
                        Temukan panduan penggunaan fitur portal berdasarkan kebutuhan Anda. Jika masih mengalami kendala, silakan hubungi pihak sekolah.
                      </p>
                    </div>
                    <div className="hidden shrink-0 md:block">
                      <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <MenuIcon name="help" size={48} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { title: "Siswa", text: "Panduan nilai, raport, jadwal, absensi, remedial, BK, dan administrasi.", icon: "students" as MenuIconName },
                    { title: "Orang Tua", text: "Pantau perkembangan nilai, kehadiran, jadwal, dan administrasi anak.", icon: "user" as MenuIconName },
                    { title: "Guru", text: "Panduan journal, absensi, nilai, remedial, BK, dan data pembelajaran.", icon: "teachers" as MenuIconName },
                    { title: "Admin", text: "Panduan pengelolaan data sekolah, pengguna, akademik, dan pengaturan.", icon: "settings" as MenuIconName },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <MenuIcon name={item.icon} size={21} />
                      </div>
                      <h4 className="mt-4 font-bold text-gray-900">Panduan {item.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-gray-500">{item.text}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <MenuIcon name="help" size={20} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Pertanyaan yang sering ditanyakan</h4>
                        <p className="mt-1 text-sm text-gray-500">Beberapa hal umum saat menggunakan portal sekolah.</p>
                      </div>
                    </div>

                    <div className="mt-5 divide-y divide-gray-100">
                      {[
                        ["Bagaimana melihat nilai siswa?", "Buka menu Nilai untuk melihat data nilai sesuai semester."],
                        ["Bagaimana melihat kehadiran?", "Buka menu Absensi. Data kehadiran mengikuti absensi yang dicatat oleh guru."],
                        ["Mengapa ada mata pelajaran yang perlu ditingkatkan?", "Dashboard siswa otomatis menampilkan mata pelajaran dengan nilai di bawah target yang ditetapkan pada sistem."],
                        ["Bagaimana melihat tagihan sekolah?", "Buka menu SPP & Administrasi untuk melihat informasi tagihan dan riwayat administrasi yang tersedia."],
                        ["Siapa yang harus dihubungi jika data tidak sesuai?", "Hubungi wali kelas, guru terkait, atau admin sekolah agar data dapat diperiksa dan diperbaiki sesuai kewenangan."],
                      ].map(([question, answer]) => (
                        <details key={question} className="group py-4 first:pt-1 last:pb-1">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-gray-800 [&::-webkit-details-marker]:hidden">
                            <span>{question}</span>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition group-open:rotate-45">+</span>
                          </summary>
                          <p className="mt-3 pr-10 text-sm leading-6 text-gray-500">{answer}</p>
                        </details>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <MenuIcon name="search" size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">Panduan berdasarkan menu</h4>
                          <p className="mt-1 text-xs text-gray-500">Gunakan menu di sidebar sesuai kebutuhan.</p>
                        </div>
                      </div>
                      <div className="mt-5 space-y-3 text-sm">
                        {[
                          ["Nilai", "Input dan rekap nilai TP, Non-Tes, STS, dan SAS."],
                          ["Rapor", "Pratinjau, pengelolaan, dan cetak rapor siswa."],
                          ["Absensi", "Riwayat kehadiran siswa."],
                          ["Journal", "Catatan kegiatan pembelajaran guru."],
                          ["Remedial & Pengayaan", "Tindak lanjut pembelajaran siswa."],
                          ["Program BK", "Catatan dan layanan bimbingan konseling."],
                          ["SPP & Administrasi", "Informasi administrasi sekolah."],
                        ].map(([title, text]) => (
                          <div key={title} className="rounded-xl bg-gray-50 px-4 py-3">
                            <p className="font-semibold text-gray-800">{title}</p>
                            <p className="mt-0.5 text-xs leading-5 text-gray-500">{text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                          <MenuIcon name="bell" size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-950">Masih mengalami kendala?</h4>
                          <p className="mt-2 text-sm leading-6 text-emerald-900/70">
                            Siapkan nama akun, menu yang bermasalah, dan penjelasan singkat kendalanya. Sampaikan kepada admin sekolah atau pihak yang ditunjuk sekolah agar dapat ditindaklanjuti.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          )}
    </DashboardShell>
    </>
  );
}

function formatReportDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold">
          {title}
        </h2>

        <p className="text-sm text-gray-500">
          {subtitle}
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-emerald-600">
        {value}
      </p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  const green =
    text === "Aktif" || text === "Hadir";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        green
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {text}
    </span>
  );
}