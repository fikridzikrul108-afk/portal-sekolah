"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type Role = "Admin" | "Kepala Sekolah" | "Guru" | "Siswa" | "Orang Tua";

const menuItems: { name: string; icon: string; roles: Role[] }[] = [
  {
    name: "Profil Saya",
    icon: "👤",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "Dashboard",
    icon: "▦",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "Data Siswa",
    icon: "👨‍🎓",
    roles: ["Admin", "Kepala Sekolah", "Guru"],
  },
  {
    name: "Data Guru",
    icon: "👨‍🏫",
    roles: ["Admin", "Kepala Sekolah"],
  },
  {
    name: "Jadwal",
    icon: "📅",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "Nilai & Raport",
    icon: "📝",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "Absensi",
    icon: "✓",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
  {
    name: "SPP & Administrasi",
    icon: "💳",
    roles: ["Admin", "Kepala Sekolah", "Siswa", "Orang Tua"],
  },
  {
    name: "Pengaturan Sekolah",
    icon: "⚙",
    roles: ["Admin", "Kepala Sekolah"],
  },
  {
    name: "AI Assistant",
    icon: "✦",
    roles: ["Admin", "Kepala Sekolah", "Guru", "Siswa", "Orang Tua"],
  },
];

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
    code: "BIG",
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
    name: "Pendidikan Pancasila",
    code: "PPKN",
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

type DashboardLearningItem = {
  subject: string;
  code: string;
  nilai: number;
};

type DashboardChild = {
  id: string;
  nama: string;
  nis: string;
  kelas: string;
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
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [welcomeRole, setWelcomeRole] = useState<Role>("Siswa");

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
  const [attendanceClass, setAttendanceClass] = useState("1");
  const [studentAttendance, setStudentAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [teacherAttendanceConfirmed, setTeacherAttendanceConfirmed] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState("2026-01-02");
  const [attendanceMonth, setAttendanceMonth] = useState(0);
  const [attendanceYear] = useState(2026);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceStudents, setAttendanceStudents] = useState<AttendanceStudent[]>([]);
  const [attendanceSubjects, setAttendanceSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<{ subjectId: string; subjectName: string; subjectCode: string; classId: string; className: string; isWaliKelas: boolean }[]>([]);
  const [attendanceSubjectId, setAttendanceSubjectId] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const canEditGrades = role === "Admin" || role === "Guru";
  const canViewReport = role === "Admin" || role === "Orang Tua" || isWaliKelas;
  const canEditReport = role === "Admin" || isWaliKelas;
  const isParentReadOnly = role === "Orang Tua";
  const [gradeTab, setGradeTab] = useState<"input" | "raport">("input");
  const [gradeClasses, setGradeClasses] = useState<GradeClass[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<GradeSubject[]>([]);
  const [gradeStudents, setGradeStudents] = useState<GradeStudent[]>([]);
  const [selectedGradeClassId, setSelectedGradeClassId] = useState("");
  const [selectedGradeSubjectId, setSelectedGradeSubjectId] = useState("");
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>({});
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
    { nama: "", predikat: "", keterangan: "" },
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
    attendancePercent: null as number | null,
    attendancePresent: 0,
    attendanceTotal: 0,
  });
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

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
      setUserProfile((current) => ({ ...current, fotoUrl: String(reader.result ?? "") }));
    };
    reader.readAsDataURL(file);
  };

  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(role)
  );


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

  const printTablePdf = (title: string, headers: string[], rows: (string | number)[][]) => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
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

  // Dropdown kelas di portal Guru/Operator mengikuti data Admin.
  // Kelas awal tetap fokus ke kelas wali, tetapi semua kelas tetap bisa dipilih.
  const attendanceClassOptions = syncedClassNames;
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
      // Guru biasa hanya melihat kelas yang memang ada di teaching_assignments.
      // Jika guru juga wali kelas, dropdown kelas dibuat lengkap agar guru
      // bisa memilih kelas lain saat diperlukan. Hak SIMPAN nilai tetap
      // diperiksa lagi di saveGrades(), jadi dropdown lengkap tidak berarti
      // guru otomatis boleh menginput semua kelas/mapel.
      const ownAssignments = assignmentSource.filter((item) => item.classId);
      const isWali = ownAssignments.some((assignment) => assignment.isWaliKelas);
      const waliClassIds = new Set(
        ownAssignments
          .filter((assignment) => assignment.isWaliKelas)
          .map((assignment) => assignment.classId)
      );

      if (isWali) {
        // Wali kelas boleh memilih seluruh kelas dari dropdown.
        nextClasses = normalizedClasses;
        // Wali kelas juga perlu melihat seluruh mapel di dropdown karena
        // wali kelas dapat mengajar lebih dari satu mapel dan tetap perlu
        // mengelola raport kelas yang diwalikan.
        nextSubjects = allSubjects;
      } else {
        const allowedClassIds = Array.from(new Set(ownAssignments.map((assignment) => assignment.classId)));
        nextClasses = normalizedClasses.filter((item) => allowedClassIds.includes(item.id));
        nextSubjects = allSubjects.filter((item) =>
          ownAssignments.some((assignment) => assignment.subjectId === item.id)
        );
      }

      // Saat login, fokus awal wali kelas adalah kelas yang dia walikan
      // (contoh: Kelas 1), bukan otomatis kelas pertama dari database.
      const waliClass = normalizedClasses.find((item) =>
        waliClassIds.has(item.id) || (userId && item.waliGuruId === userId)
      );
      if (waliClass) {
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
      .select("id, student_id, nilai_sas, nilai_uts_pts, nilai_non_tes, nilai_akhir, catatan_tp_tertinggi, catatan_tp_terendah, keterangan")
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
      const allowed = teacherAssignments.some(
        (assignment) =>
          assignment.classId === selectedGradeClassId &&
          assignment.subjectId === selectedGradeSubjectId &&
          !assignment.isWaliKelas
      );

      if (!allowed) {
        alert("Anda hanya dapat menginput nilai untuk mata pelajaran yang memang diampu. Status wali kelas tidak otomatis memberi hak input semua mata pelajaran.");
        return;
      }
    }

    const selectedClassRow = gradeClasses.find((item) => item.id === selectedGradeClassId);
    const tahunAjaran = selectedClassRow?.tahunAjaran ?? "2026/2027";

    setGradeSaving(true);
    setGradeError("");

    for (const student of gradeStudents) {
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
      setReportExtracurricular([{ nama: "", predikat: "", keterangan: "" }]);
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
    setReportExtracurricular(
      (extraRows ?? []).length > 0
        ? (extraRows ?? []).map((row: any) => ({
            id: row.id,
            nama: row.nama ?? "",
            predikat: row.predikat ?? "",
            keterangan: row.keterangan ?? "",
          }))
        : [{ nama: "", predikat: "", keterangan: "" }]
    );

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

  const addReportExtracurricular = () => {
    setReportExtracurricular((current) => [...current, { nama: "", predikat: "", keterangan: "" }]);
    setReportSaved(false);
  };

  const removeReportExtracurricular = (index: number) => {
    setReportExtracurricular((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length > 0 ? next : [{ nama: "", predikat: "", keterangan: "" }];
    });
    setReportSaved(false);
  };

  const updateReportDraft = (patch: Partial<ReportCardDraft>) => {
    setReportDraft((current) => current ? { ...current, ...patch } : current);
    setReportSaved(false);
  };

  const generateWaliKelasDraft = () => {
    if (!reportDraft) return;

    const student = reportStudents.find((item) => item.id === reportDraft.studentId);
    const validGrades = reportGrades.filter((item) => item.nilaiAkhir != null);
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

  const generateReportDescriptions = () => {
    if (reportGrades.length === 0) return;
    setReportDescriptionLoading(true);
    setReportGrades((current) => current.map((item) => {
      const validDetails = item.sumatif.filter((detail) => detail.nilai != null);
      const nilaiAkhir = item.nilaiAkhir;
      const level = item.predikat === "A" ? "sangat baik" : item.predikat === "B" ? "baik" : item.predikat === "C" ? "cukup" : "yang masih perlu dikembangkan";
      if (validDetails.length === 0) {
        return { ...item, deskripsiCapaian: nilaiAkhir == null ? "Belum terdapat data capaian yang cukup untuk dideskripsikan." : `Menunjukkan capaian ${level} pada mata pelajaran ini dengan nilai akhir ${nilaiAkhir}.` };
      }
      const sorted = [...validDetails].sort((a, b) => (b.nilai ?? 0) - (a.nilai ?? 0));
      const highest = sorted[0];
      const lowest = sorted[sorted.length - 1];
      const highestText = highest?.tujuanPembelajaran?.trim() || highest?.materi?.trim() || "materi yang dipelajari";
      const lowestText = lowest?.tujuanPembelajaran?.trim() || lowest?.materi?.trim();
      let description = `Menunjukkan capaian ${level}, terutama pada ${highestText} dengan nilai ${highest?.nilai ?? "-"}.`;
      if (lowest && highest && lowest !== highest && lowest.nilai != null && lowest.nilai < 80 && lowestText) {
        description += ` Capaian pada ${lowestText} dengan nilai ${lowest.nilai} masih perlu dikembangkan melalui latihan dan pendampingan yang konsisten.`;
      } else {
        description += " Mampu mengikuti pembelajaran dan menerapkan kompetensi yang dipelajari dengan baik.";
      }
      return { ...item, deskripsiCapaian: description };
    }));
    setReportDescriptionLoading(false);
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

    const validExtra = reportExtracurricular.filter((item) => item.nama.trim());
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
          predikat: item.predikat || null,
          keterangan: item.keterangan || null,
        })));

      if (insertExtraError) {
        setReportSaving(false);
        setReportError(`Gagal menyimpan ekstrakurikuler: ${insertExtraError.message}`);
        return;
      }
    }

    for (const grade of reportGrades) {
      const { error: descriptionError } = await supabase
        .from("grades")
        .update({ deskripsi_capaian: grade.deskripsiCapaian || null })
        .eq("id", grade.gradeId);
      if (descriptionError) {
        setReportSaving(false);
        setReportError(`Gagal menyimpan deskripsi ${grade.subjectName}: ${descriptionError.message}`);
        return;
      }
    }

    setReportSaving(false);
    setReportSaved(true);
  };

  const loadSchoolDashboard = async (userRole: Role, assignments: { classId: string; className: string; subjectId: string; subjectName: string; subjectCode: string; isWaliKelas: boolean }[] = []) => {
    if (userRole !== "Admin" && userRole !== "Kepala Sekolah" && userRole !== "Guru") return;

    setDashboardLoading(true);
    setDashboardError("");

    try {
      const classIds = Array.from(new Set(assignments.map((item) => item.classId).filter(Boolean)));

      const studentQuery = userRole === "Guru" && classIds.length > 0
        ? supabase.from("students").select("id", { count: "exact", head: true }).in("class_id", classIds)
        : supabase.from("students").select("id", { count: "exact", head: true });

      const [studentResult, teacherResult, classResult] = await Promise.all([
        studentQuery,
        supabase.from("school_teachers").select("id", { count: "exact", head: true }),
        userRole === "Guru" && classIds.length > 0
          ? supabase.from("classes").select("id", { count: "exact", head: true }).in("id", classIds)
          : supabase.from("classes").select("id", { count: "exact", head: true }),
      ]);

      const errors = [studentResult.error, teacherResult.error, classResult.error].filter(Boolean);
      if (errors.length > 0) {
        setDashboardError(errors.map((error: any) => error.message).join(" | "));
      }

      const studentCount = studentResult.count ?? 0;
      const teacherCount = teacherResult.count ?? 0;
      const classCount = classResult.count ?? 0;

      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const attendanceQuery = userRole === "Guru" && classIds.length > 0
        ? supabase.from("attendance").select("status").eq("tanggal", today).in("class_id", classIds)
        : supabase.from("attendance").select("status").eq("tanggal", today);

      const { data: attendanceRows, error: attendanceError } = await attendanceQuery;
      if (attendanceError) {
        setDashboardError((current) => current ? `${current} | ${attendanceError.message}` : attendanceError.message);
      }

      const attendanceTotal = attendanceRows?.length ?? 0;
      const attendancePresent = (attendanceRows ?? []).filter((row: any) => row.status === "Hadir").length;
      const attendancePercent = attendanceTotal > 0
        ? Math.round((attendancePresent / attendanceTotal) * 100)
        : null;

      setDashboardSchoolStats({
        totalSiswa: studentCount,
        totalGuru: teacherCount,
        totalRombel: classCount,
        attendancePercent,
        attendancePresent,
        attendanceTotal,
      });
    } finally {
      setDashboardLoading(false);
    }
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

  const login = async () => {
    const email = loginName.trim();
    const password = loginPassword;

    if (!email || !password) {
      alert("Masukkan email dan password.");
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
        .select("nama, role")
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
      setRole(resolvedRole);

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
      await loadSchoolDashboard(resolvedRole, loginAssignments);
      await loadGradeSetup(resolvedRole, loginAssignments, data.user.id);
      await loadAttendanceData();
      await loadStudentParentDashboard(resolvedRole, data.user.id);

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
    setCurrentUserId(null);
    setAttendanceStudents([]);
    setAttendanceSubjects([]);
    setTeacherAssignments([]);
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

  const openTeacherCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Kamera tidak tersedia di perangkat ini.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      setCameraStream(stream);
      setCameraOpen(true);
    } catch (error) {
      console.error(error);
      alert("Kamera tidak bisa dibuka. Pastikan izin kamera sudah diberikan.");
    }
  };

  const closeTeacherCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraOpen(false);
  };

  const captureTeacherSelfie = () => {
    const video = document.getElementById("teacher-selfie-video") as HTMLVideoElement | null;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      alert("Kamera belum siap. Tunggu sebentar lalu coba lagi.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      alert("Gagal mengambil selfie.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSelfiePreview(canvas.toDataURL("image/jpeg", 0.85));
    setTeacherAttendanceConfirmed(false);
    closeTeacherCamera();
  };

  const confirmTeacherAttendance = async () => {
    if (!selfiePreview) {
      alert("Ambil selfie terlebih dahulu untuk konfirmasi hadir.");
      return;
    }

    setAttendanceSaving(true);

    // Sementara disimpan di state UI. Nanti selfie dan data kehadiran
    // kita sambungkan ke Supabase Storage + tabel attendance.
    await new Promise((resolve) => setTimeout(resolve, 500));

    setTeacherAttendanceConfirmed(true);
    setAttendanceSaving(false);
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

    if (role === "Guru") {
      const allowed = teacherAssignments.some(
        (assignment) =>
          assignment.className === attendanceClass &&
          assignment.subjectId === attendanceSubjectId
      );

      if (!allowed) {
        alert("Guru hanya dapat mengisi absensi untuk kelas dan mata pelajaran yang diampu.");
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
          classes(id, nama),
          subjects(id, nama, kode),
          school_teachers(id, nama)
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
        teacherName: item.school_teachers?.nama ?? "",
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
      .select("id, class_id, teacher_id, jam_mulai, jam_selesai")
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

    const teacherCollision = (collisions ?? []).find((row: any) => row.teacher_id === teacherId);
    if (teacherCollision) {
      setScheduleSaving(false);
      alert("Bentrok jadwal: guru tersebut sudah mengajar pada jam yang sama di hari tersebut.");
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

  const openMenu = async (menuName: string) => {
    setMobileMenuOpen(false);
    setNavigationLoading(true);
    setActiveMenu(menuName);

    if (menuName !== "Nilai & Raport") {
      setSelectedSubject(null);
    }

    if (menuName !== "Jadwal") {
      setSelectedClass(null);
      setSelectedDay(null);
    }

    if (menuName !== "Absensi") {
      closeTeacherCamera();
    }

    try {
      if (menuName === "Dashboard") {
        await loadSchoolDashboard(role, teacherAssignments);
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

      // Beri sedikit waktu agar transisi motion tetap terasa halus
      // meskipun data dari Supabase selesai sangat cepat.
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    } finally {
      setNavigationLoading(false);
    }
  };

  if (!loggedIn) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.24),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(20,184,166,0.18),transparent_30%)]" />
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">
          <section className="hidden flex-col justify-between p-10 text-white lg:flex xl:p-14">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/95 ring-1 ring-white/20 backdrop-blur">
                  <img src={SCHOOL_LOGO_URL} alt="Logo SD Islam Al-Barkah" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-lg font-bold tracking-wide">SD Islam Al-Barkah</p>
                  <p className="text-sm text-slate-400">Portal Akademik Sekolah</p>
                </div>
              </div>
            </div>

            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Sistem Akademik Terintegrasi
              </div>
              <h1 className="text-5xl font-black leading-tight tracking-tight xl:text-6xl">
                Kelola sekolah dengan lebih <span className="text-emerald-400">mudah.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
                Satu portal untuk akademik, guru, siswa, orang tua, nilai, raport, absensi, jadwal, dan administrasi sekolah.
              </p>

              <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg">
                {[
                  ["01", "Akademik"],
                  ["02", "Kolaborasi"],
                  ["03", "Administrasi"],
                ].map(([number, label]) => (
                  <div key={number} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <p className="text-xs font-bold text-emerald-300">{number}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500">© {new Date().getFullYear()} SD Islam Al-Barkah</p>
          </section>

          <section className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
            <div className="w-full max-w-md animate-[fadeIn_.45s_ease-out]">
              <div className="mb-6 text-center lg:hidden">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
                  <img src={SCHOOL_LOGO_URL} alt="Logo SD Islam Al-Barkah" className="h-full w-full object-contain" />
                </div>
                <h1 className="text-xl font-bold text-white">SD Islam Al-Barkah</h1>
                <p className="mt-1 text-sm text-slate-400">Portal Akademik Sekolah</p>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white p-7 shadow-2xl shadow-black/30 sm:p-9">
                <div className="mb-8">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">🔐</div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Selamat datang kembali</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Masuk untuk melanjutkan ke Portal Akademik SD Islam Al-Barkah.</p>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">✉️</span>
                      <input type="email" value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="nama@email.com" autoComplete="email" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Password</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                      <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Masukkan password" autoComplete="current-password" onKeyDown={(e) => { if (e.key === "Enter") login(); }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" />
                    </div>
                  </label>

                  <button onClick={login} disabled={loginLoading} className="group relative w-full overflow-hidden rounded-2xl bg-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-emerald-600/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loginLoading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Mohon tunggu...</> : <>Masuk ke Portal <span className="transition-transform group-hover:translate-x-1">→</span></>}
                    </span>
                  </button>
                </div>

                <div className="mt-7 flex items-center gap-3 text-xs text-slate-400">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span>Akses aman</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <p className="mt-5 text-center text-xs leading-5 text-slate-400">Gunakan akun yang diberikan sekolah. Jangan bagikan password kepada orang lain.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const askAI = async () => {
    const question = aiQuestion.trim();

    if (!question) {
      setAiError("Tulis pertanyaan terlebih dahulu.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiAnswer("");

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, role }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "AI gagal memberikan jawaban.");
      }

      setAiAnswer(result.answer || "AI tidak memberikan jawaban.");
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghubungi AI."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const showPageLoader = loginLoading || navigationLoading;

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
          @page { size: A4 portrait; margin: 10mm; }
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
            padding: 0 !important;
            background: #fff !important;
            color: #111 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 10.5pt !important;
          }
          .report-page {
            width: 100%;
            min-height: 277mm;
            box-sizing: border-box;
            page-break-after: always;
            break-after: page;
          }
          .report-page:last-child { page-break-after: auto; break-after: auto; }
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
          .report-identity { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10pt; }
          .report-identity td { padding: 3px 4px; vertical-align: top; }
          .report-identity td:nth-child(1), .report-identity td:nth-child(3) { width: 18%; font-weight: 700; }
          .report-identity td:nth-child(2) { width: 32%; }
          .report-identity td:nth-child(4) { width: 32%; }
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
        }
      `}</style>
      <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-slate-200 bg-white shadow-[4px_0_24px_rgba(15,23,42,0.04)] lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <img src={SCHOOL_LOGO_URL} alt="Logo SD Islam Al-Barkah" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-slate-900">SD Islam Al-Barkah</h1>
            <p className="text-xs text-slate-500">Academic Management System</p>
          </div>
        </div>

        <div className="px-4 pt-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Menu Utama</p>
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => openMenu(item.name)}
                className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all touch-manipulation ${
                  activeMenu === item.name
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="w-6 text-center">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full border-t border-slate-100 p-4">
          <div className="mb-3 rounded-xl bg-slate-50 p-3">
            <p className="truncate text-xs font-semibold text-slate-700">{name}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{role}</p>
          </div>
          <button type="button" onClick={logout} className="min-h-11 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 touch-manipulation">
            ⇥ Keluar dari Portal
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              <img src={SCHOOL_LOGO_URL} alt="Logo SD Islam Al-Barkah" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-900">SD Islam Al-Barkah</h1>
              <p className="text-[11px] text-slate-500">{role}</p>
            </div>
          </div>
          <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Tutup menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl text-slate-500 hover:bg-slate-100 touch-manipulation">×</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Menu Utama</p>
          <nav className="space-y-1.5">
            {visibleMenuItems.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => openMenu(item.name)}
                className={`group flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-all touch-manipulation active:scale-[0.99] ${
                  activeMenu === item.name
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="flex w-7 shrink-0 items-center justify-center text-base">{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 rounded-xl bg-slate-50 p-3">
            <p className="truncate text-xs font-semibold text-slate-700">{name}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{role}</p>
          </div>
          <button type="button" onClick={logout} className="min-h-12 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 touch-manipulation">
            ⇥ Keluar dari Portal
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 shadow-[0_1px_12px_rgba(15,23,42,0.03)] backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Buka menu" aria-expanded={mobileMenuOpen} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm hover:bg-slate-50 touch-manipulation lg:hidden">☰</button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>Portal Sekolah</span>
              <span>/</span>
              <span className="text-slate-600">{activeMenu}</span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
              {activeMenu}
            </h2>
          </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{name}</p>
              <p className="text-xs text-slate-500">{role}</p>
            </div>
            {userProfile.fotoUrl ? (
              <img
                src={userProfile.fotoUrl}
                alt="Foto profil"
                className="h-10 w-10 rounded-full object-cover ring-4 ring-slate-100"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white ring-4 ring-slate-100">
                {(userProfile.nama || name).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <div className="p-5 sm:p-8">
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

          {activeMenu === "Dashboard" && (
            <>
              {(role === "Siswa" || role === "Orang Tua") ? (
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
              ) : (
                <>
                  <div className="relative mb-7 overflow-hidden rounded-2xl bg-slate-900 p-7 text-white shadow-xl shadow-slate-200">
                    <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-2xl" />
                    <div className="absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
                    <div className="relative">
                      <p className="text-sm font-medium text-slate-300">Selamat datang kembali,</p>
                      <h1 className="mt-1 text-2xl font-bold tracking-tight">{name} 👋</h1>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                        Anda masuk sebagai {role}. Berikut ringkasan aktivitas akademik sekolah hari ini.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      title={role === "Guru" ? "Siswa Kelas Saya" : "Total Siswa"}
                      value={dashboardLoading ? "…" : String(dashboardSchoolStats.totalSiswa)}
                      detail={role === "Guru" ? "Siswa dari kelas yang diampu" : "Data siswa dari Supabase"}
                      icon="👨‍🎓"
                    />
                    <StatCard
                      title="Total Guru"
                      value={dashboardLoading ? "…" : String(dashboardSchoolStats.totalGuru)}
                      detail="Data guru dari master sekolah"
                      icon="👨‍🏫"
                    />
                    <StatCard
                      title={role === "Guru" ? "Kelas Saya" : "Rombel"}
                      value={dashboardLoading ? "…" : String(dashboardSchoolStats.totalRombel)}
                      detail={role === "Guru" ? "Kelas yang ditugaskan" : "Kelas dari database"}
                      icon="🏫"
                    />
                    <StatCard
                      title="Kehadiran Hari Ini"
                      value={dashboardLoading ? "…" : dashboardSchoolStats.attendancePercent == null ? "—" : `${dashboardSchoolStats.attendancePercent}%`}
                      detail={dashboardSchoolStats.attendanceTotal > 0 ? `${dashboardSchoolStats.attendancePresent} dari ${dashboardSchoolStats.attendanceTotal} catatan absensi` : "Belum ada absensi hari ini"}
                      icon="✓"
                    />
                  </div>

                  <div className="mt-7 grid gap-6 xl:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                      <div>
                        <h3 className="font-bold">Ringkasan Kehadiran</h3>
                        <p className="text-sm text-gray-500">Data kehadiran hari ini</p>
                      </div>
                      <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <Attendance title="Siswa Hadir" value={dashboardSchoolStats.attendancePercent == null ? "—" : `${dashboardSchoolStats.attendancePercent}%`} />
                        <Attendance title="Catatan Absensi" value={String(dashboardSchoolStats.attendanceTotal)} />
                        <Attendance title="Hadir" value={String(dashboardSchoolStats.attendancePresent)} />
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-white p-6">
                      <h3 className="font-bold">Aktivitas Terbaru</h3>
                      <div className="mt-4 space-y-4">
                        <Activity title="Absensi guru diperbarui" time="08:15" />
                        <Activity title="Data siswa diperbarui" time="09:02" />
                        <Activity title="Jadwal pelajaran diperbarui" time="10:30" />
                        <Activity title="Nilai kelas 6A diperbarui" time="11:20" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
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
                    {[...new Set([...classNames, "4", ...studentRows.map((student) => student.class).filter(Boolean)])].map((className) => {
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
                      <div className="text-4xl">👨‍🏫</div>
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
                    <div className="mt-5 flex items-center justify-between rounded-2xl border p-4"><div><p className="text-xs text-gray-500">Status</p><div className="mt-2"><Badge text={selectedTeacher.status || "Aktif"} /></div></div><span className="rounded-2xl bg-emerald-50 px-4 py-3 text-2xl">👨‍🏫</span></div>
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

          {activeMenu === "Nilai & Raport" && (
            <Section
              title="Nilai & Raport"
              subtitle={role === "Siswa" || role === "Orang Tua" ? "Lihat nilai — data bersifat read-only" : "Input nilai oleh guru dan pengelolaan raport oleh Admin/Wali Kelas"}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div><p className="text-sm font-bold text-emerald-900">Export laporan</p><p className="text-xs text-emerald-700">Ambil data sesuai hak akses akun.</p></div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => exportGrades("excel")} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">📊 Excel</button>
                  <button type="button" onClick={() => exportGrades("pdf")} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">📄 PDF</button>
                </div>
              </div>
              <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
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

              {gradeTab === "input" ? (
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
                        .filter((subject) =>
                          role !== "Guru" ||
                          isWaliKelas ||
                          teacherAssignments.some(
                            (item) =>
                              item.subjectId === subject.id &&
                              item.classId === selectedGradeClassId &&
                              !item.isWaliKelas
                          )
                        )
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
                      <p className="mt-2 text-xs text-emerald-700">Wali kelas dapat memilih semua kelas dan semua mata pelajaran. Hak simpan nilai tetap mengikuti mata pelajaran/kelas yang benar-benar diampu.</p>
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

                  {!gradeLoading && gradeStudents.length > 0 && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                        <h3 className="font-bold text-gray-900">Komponen Nilai</h3>
                        <p className="mt-1 text-sm text-gray-600">Isi Sumatif Materi, Non-Tes, SAS, dan catatan TP. Nilai Akhir disiapkan untuk dihitung dengan rumus sekolah setelah bobot final ditetapkan.</p>
                      </div>

                      {gradeStudents.map((student) => {
                        const draft = gradeDrafts[student.id] ?? emptyGradeDraft(student.id);
                        const expanded = expandedGradeStudent === student.id;
                        return (
                          <div key={student.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="text-xs font-semibold text-emerald-600">NIS {student.nis}</p>
                                <h4 className="mt-1 text-lg font-bold text-gray-900">{student.name}</h4>
                              </div>
                              <button
                                onClick={() => setExpandedGradeStudent(expanded ? null : student.id)}
                                className="rounded-xl border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                              >
                                {expanded ? "Tutup Detail" : "Detail Sumatif Materi"}
                              </button>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-4">
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-600">Nilai Non-Tes</label>
                                <input
                                  type="number" min="0" max="100"
                                  value={draft.nilaiNonTes}
                                  disabled={!canEditGrades}
                                  onChange={(e) => updateGradeDraft(student.id, { nilaiNonTes: e.target.value })}
                                  className="w-full rounded-xl border px-3 py-2.5 outline-none focus:border-emerald-500"
                                  placeholder="0-100"
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-600">Nilai UTS / PTS</label>
                                <input
                                  type="number" min="0" max="100"
                                  value={draft.nilaiUtsPts}
                                  disabled={!canEditGrades}
                                  onChange={(e) => updateGradeDraft(student.id, { nilaiUtsPts: e.target.value })}
                                  className="w-full rounded-xl border px-3 py-2.5 outline-none focus:border-emerald-500"
                                  placeholder="0-100"
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-600">Nilai SAS</label>
                                <input
                                  type="number" min="0" max="100"
                                  value={draft.nilaiSas}
                                  disabled={!canEditGrades}
                                  onChange={(e) => updateGradeDraft(student.id, { nilaiSas: e.target.value })}
                                  className="w-full rounded-xl border px-3 py-2.5 outline-none focus:border-emerald-500"
                                  placeholder="0-100"
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-600">Nilai Akhir (Otomatis)</label>
                                <input
                                  type="number" min="0" max="100"
                                  value={draft.nilaiAkhir}
                                  readOnly
                                  className="w-full rounded-xl border px-3 py-2.5 bg-emerald-50 font-bold text-emerald-700 outline-none"
                                  placeholder="Menunggu Non-Tes + SAS"
                                />
                                <p className="mt-1 text-[11px] text-gray-400">Rumus: Non-Tes {NILAI_NON_TES_WEIGHT}% + UTS/PTS {NILAI_UTS_WEIGHT}% + SAS {NILAI_SAS_WEIGHT}%.</p>
                              </div>
                            </div>

                            {expanded && (
                              <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div>
                                    <h5 className="font-bold text-gray-900">Sumatif Materi</h5>
                                    <p className="text-xs text-gray-500">Bisa ditambah beberapa materi/TP.</p>
                                  </div>
                                  {canEditGrades && (
                                    <button
                                      onClick={() => addSumatifRow(student.id)}
                                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                    >
                                      + Tambah Materi
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-3">
                                  {draft.sumatif.map((item, index) => (
                                    <div key={`${student.id}-sumatif-${index}`} className="grid gap-2 md:grid-cols-[1.2fr_1.5fr_110px_40px]">
                                      <input
                                        value={item.materi}
                                        disabled={!canEditGrades}
                                        onChange={(e) => updateSumatifDraft(student.id, index, { materi: e.target.value })}
                                        placeholder="Materi / Bab"
                                        className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                      />
                                      <input
                                        value={item.tujuanPembelajaran}
                                        disabled={!canEditGrades}
                                        onChange={(e) => updateSumatifDraft(student.id, index, { tujuanPembelajaran: e.target.value })}
                                        placeholder="Tujuan Pembelajaran / TP"
                                        className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                      />
                                      <input
                                        type="number" min="0" max="100"
                                        value={item.nilai}
                                        disabled={!canEditGrades}
                                        onChange={(e) => updateSumatifDraft(student.id, index, { nilai: e.target.value })}
                                        placeholder="Nilai"
                                        className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                      />
                                      {canEditGrades && (
                                        <button
                                          onClick={() => removeSumatifRow(student.id, index)}
                                          className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                          title="Hapus materi"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-600">Catatan TP Tertinggi</label>
                                <textarea
                                  value={draft.catatanTpTertinggi}
                                  disabled={!canEditGrades}
                                  onChange={(e) => updateGradeDraft(student.id, { catatanTpTertinggi: e.target.value })}
                                  rows={2}
                                  placeholder="Materi/TP yang paling dikuasai siswa"
                                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-600">Catatan TP Terendah</label>
                                <textarea
                                  value={draft.catatanTpTerendah}
                                  disabled={!canEditGrades}
                                  onChange={(e) => updateGradeDraft(student.id, { catatanTpTerendah: e.target.value })}
                                  rows={2}
                                  placeholder="Materi/TP yang masih perlu bimbingan"
                                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {!canEditGrades ? (
                        <div className={`rounded-2xl border p-4 text-sm ${role === "Orang Tua" ? "border-purple-200 bg-purple-50 text-purple-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
                          Nilai ini hanya dapat dilihat. Perubahan nilai dilakukan oleh Guru/Admin sesuai hak akses.
                        </div>
                      ) : (
                        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg">
                          <div>
                            {gradeSaved && <p className="text-sm font-semibold text-emerald-700">✓ Nilai berhasil disimpan.</p>}
                            <p className="text-xs text-gray-500">Data disimpan berdasarkan siswa, kelas, mapel, semester, dan tahun ajaran.</p>
                          </div>
                          <button
                            onClick={saveGrades}
                            disabled={gradeSaving}
                            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {gradeSaving ? "Menyimpan..." : "Simpan Semua Nilai"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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

                  {reportError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{reportError}</div>}
                  {reportLoading && <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">Memuat raport...</div>}

                  {!reportLoading && reportDraft && (
                    <div className="space-y-5">
                      <div className="rounded-2xl bg-emerald-50 p-5">
                        <p className="text-xs font-semibold text-emerald-700">RAPORT {selectedReportClass} • SEMESTER {selectedSemester}</p>
                        <h3 className="mt-1 text-xl font-bold text-gray-900">
                          {reportStudents.find((item) => item.id === reportDraft.studentId)?.name ?? "Siswa"}
                        </h3>
                        <p className="text-sm text-gray-600">Tahun ajaran {gradeClasses.find((item) => item.id === selectedGradeClassId)?.tahunAjaran ?? "-"}</p>
                        {isParentReadOnly && <p className="mt-2 text-sm font-semibold text-purple-700">🔒 Mode Orang Tua — raport hanya dapat dilihat dan dicetak.</p>}
                      </div>

                      <div className="rounded-2xl border p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold">A. Rekap Nilai Mata Pelajaran</h4>
                            <p className="mt-1 text-sm text-gray-500">Nilai akhir otomatis: Non-Tes {NILAI_NON_TES_WEIGHT}% + UTS/PTS {NILAI_UTS_WEIGHT}% + SAS {NILAI_SAS_WEIGHT}%. Predikat mengikuti rentang A ≥ 90, B ≥ 80, C ≥ 70, D &lt; 70.</p>
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
                              {reportGrades.length > 0 ? reportGrades.map((item, index) => (
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
                            <h4 className="font-bold">B. Deskripsi Capaian Mata Pelajaran</h4>
                            <p className="mt-1 text-sm text-gray-500">Deskripsi dibuat dari Sumatif Materi dan Tujuan Pembelajaran. Wali kelas dapat mengeditnya sebelum menyimpan raport.</p>
                          </div>
                          <button type="button" onClick={generateReportDescriptions} disabled={isParentReadOnly || reportDescriptionLoading || reportGrades.length === 0} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                            {reportDescriptionLoading ? "Membuat..." : "✨ Generate Deskripsi"}
                          </button>
                        </div>
                        <div className="space-y-4">
                          {reportGrades.length > 0 ? reportGrades.map((item) => (
                            <div key={`desc-${item.gradeId}`} className="rounded-xl bg-gray-50 p-4">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div className="font-bold text-gray-900">{item.subjectName}</div>
                                <div className="text-xs font-semibold text-gray-500">Nilai {item.nilaiAkhir ?? "-"} • Predikat {item.predikat}</div>
                              </div>
                              <textarea rows={3} value={item.deskripsiCapaian} disabled={isParentReadOnly} onChange={(e) => updateReportGradeDescription(item.gradeId, e.target.value)} className="w-full rounded-xl border bg-white px-4 py-3 text-sm" placeholder="Deskripsi capaian pembelajaran" />
                            </div>
                          )) : <p className="text-sm text-gray-500">Belum ada nilai untuk dibuatkan deskripsi.</p>}
                        </div>
                      </div>

                      <div className="rounded-2xl border p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold">C. Ekstrakurikuler</h4>
                            <p className="mt-1 text-sm text-gray-500">Tambahkan kegiatan ekstrakurikuler siswa.</p>
                          </div>
                          <button type="button" onClick={addReportExtracurricular} disabled={isParentReadOnly} className="rounded-xl border px-3 py-2 text-sm font-bold hover:bg-gray-50">+ Tambah</button>
                        </div>
                        <div className="space-y-3">
                          {reportExtracurricular.map((item, index) => (
                            <div key={index} className="grid gap-3 rounded-xl bg-gray-50 p-3 md:grid-cols-[1.2fr_.7fr_1.5fr_auto]">
                              <input value={item.nama} disabled={isParentReadOnly} onChange={(e) => updateReportExtracurricular(index, { nama: e.target.value })} placeholder="Nama ekstrakurikuler" className="rounded-xl border px-3 py-2.5" />
                              <input value={item.predikat} disabled={isParentReadOnly} onChange={(e) => updateReportExtracurricular(index, { predikat: e.target.value })} placeholder="Predikat" className="rounded-xl border px-3 py-2.5" />
                              <input value={item.keterangan} disabled={isParentReadOnly} onChange={(e) => updateReportExtracurricular(index, { keterangan: e.target.value })} placeholder="Keterangan" className="rounded-xl border px-3 py-2.5" />
                              <button type="button" onClick={() => removeReportExtracurricular(index)} disabled={isParentReadOnly} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">Hapus</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold">D. Ketidakhadiran</h4>
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
                            <h4 className="font-bold">E. Catatan Wali Kelas & Kelulusan</h4>
                            <p className="mt-1 text-sm text-gray-500">Draft dibuat dari rekap nilai, ketidakhadiran, dan ekstrakurikuler yang tercatat. Wali kelas tetap dapat mengedit sebelum menyimpan.</p>
                          </div>
                          <button type="button" onClick={generateWaliKelasDraft} disabled={isParentReadOnly || reportGrades.length === 0} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                            ✨ Generate Draft
                          </button>
                        </div>
                        <div className="space-y-4">
                          <textarea rows={6} value={reportDraft.catatanWaliKelas} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ catatanWaliKelas: e.target.value })} placeholder="Catatan perkembangan, motivasi, atau pesan untuk siswa" className="w-full rounded-xl border px-4 py-3" />
                          <textarea rows={2} value={reportDraft.keteranganNaikKelas} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ keteranganNaikKelas: e.target.value })} placeholder="Keterangan naik kelas / tinggal di kelas" className="w-full rounded-xl border px-4 py-3" />
                          <textarea rows={2} value={reportDraft.keteranganLulus} disabled={isParentReadOnly} onChange={(e) => updateReportDraft({ keteranganLulus: e.target.value })} placeholder="Keterangan lulus (khusus kelas 6)" className="w-full rounded-xl border px-4 py-3" />
                        </div>
                      </div>

                      <div className="rounded-2xl border p-5">
                        <h4 className="mb-4 font-bold">F. Tanda Tangan & Penerbitan</h4>
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
                          <div className="report-header">
                            <div className="report-logo">
                              {schoolSettings.logoUrl ? (
                                <img src={schoolSettings.logoUrl} alt="Logo sekolah" />
                              ) : (
                                <span>AB</span>
                              )}
                            </div>
                            <div className="report-header-text">
                              <div className="report-school-name">{schoolSettings.namaSekolah || "SD Islam Al-Barkah"}</div>
                              <div className="report-school-address">
                                {[schoolSettings.alamat, schoolSettings.desaKelurahan && `Desa/Kel. ${schoolSettings.desaKelurahan}`, schoolSettings.kecamatan && `Kec. ${schoolSettings.kecamatan}`, schoolSettings.kabupatenKota, schoolSettings.provinsi, schoolSettings.kodePos].filter(Boolean).join(" · ")}
                              </div>
                              <div className="report-school-contact">
                                {[schoolSettings.telepon && `Telp. ${schoolSettings.telepon}`, schoolSettings.email && `Email: ${schoolSettings.email}`, schoolSettings.website].filter(Boolean).join(" · ")}
                              </div>
                              <div className="report-document-title">LAPORAN HASIL BELAJAR PESERTA DIDIK</div>
                              <div className="report-subtitle">Kurikulum Satuan Pendidikan · Tahun Ajaran {schoolSettings.tahunAjaran || "-"}</div>
                            </div>
                          </div>

                          <div className="report-title-line" />

                          <table className="report-identity">
                            <tbody>
                              <tr>
                                <td>Nama Peserta Didik</td>
                                <td>: {reportStudents.find((item) => item.id === reportDraft.studentId)?.name ?? "-"}</td>
                                <td>Kelas</td>
                                <td>: {selectedReportClass || "-"}</td>
                              </tr>
                              <tr>
                                <td>NIS</td>
                                <td>: {reportStudents.find((item) => item.id === reportDraft.studentId)?.nis ?? "-"}</td>
                                <td>Semester</td>
                                <td>: {selectedSemester}</td>
                              </tr>
                              <tr>
                                <td>Tahun Ajaran</td>
                                <td>: {gradeClasses.find((item) => item.id === selectedGradeClassId)?.tahunAjaran ?? "-"}</td>
                                <td>Status</td>
                                <td>: {reportDraft.status === "final" ? "Final" : "Draft"}</td>
                              </tr>
                            </tbody>
                          </table>

                          <h3 className="report-section-title">A. NILAI HASIL BELAJAR</h3>
                          <table className="report-table">
                            <thead>
                              <tr>
                                <th style={{ width: "7%" }}>No</th>
                                <th>Mata Pelajaran</th>
                                <th style={{ width: "16%" }}>Non-Tes</th>
                                <th style={{ width: "16%" }}>UTS/PTS</th>
                                <th style={{ width: "16%" }}>SAS</th>
                                <th style={{ width: "14%" }}>Nilai Akhir</th>
                                <th style={{ width: "12%" }}>Predikat</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportGrades.length > 0 ? reportGrades.map((item, index) => (
                                <tr key={`print-${item.subjectId}`}>
                                  <td className="text-center">{index + 1}</td>
                                  <td>{item.subjectName}</td>
                                  <td className="text-center">{item.nilaiNonTes ?? "-"}</td>
                                  <td className="text-center">{item.nilaiUtsPts ?? "-"}</td>
                                  <td className="text-center">{item.nilaiSas ?? "-"}</td>
                                  <td className="text-center font-bold">{item.nilaiAkhir ?? "-"}</td>
                                  <td className="text-center font-bold">{item.predikat}</td>
                                </tr>
                              )) : (
                                <tr><td colSpan={7} className="text-center">Belum ada nilai.</td></tr>
                              )}
                            </tbody>
                          </table>

                          <h3 className="report-section-title">B. DESKRIPSI CAPAIAN PEMBELAJARAN</h3>
                          <table className="report-table">
                            <thead>
                              <tr>
                                <th style={{ width: "7%" }}>No</th>
                                <th style={{ width: "25%" }}>Mata Pelajaran</th>
                                <th>Deskripsi Capaian</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportGrades.length > 0 ? reportGrades.map((item, index) => (
                                <tr key={`print-desc-${item.gradeId}`}>
                                  <td className="text-center">{index + 1}</td>
                                  <td className="font-bold">{item.subjectName}</td>
                                  <td>{item.deskripsiCapaian || "-"}</td>
                                </tr>
                              )) : (
                                <tr><td colSpan={3} className="text-center">Belum ada deskripsi capaian.</td></tr>
                              )}
                            </tbody>
                          </table>

                          <h3 className="report-section-title">C. EKSTRAKURIKULER</h3>
                          <table className="report-table">
                            <thead>
                              <tr>
                                <th style={{ width: "7%" }}>No</th>
                                <th>Kegiatan</th>
                                <th style={{ width: "20%" }}>Predikat</th>
                                <th>Keterangan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportExtracurricular.filter((item) => item.nama.trim()).length > 0 ? reportExtracurricular.filter((item) => item.nama.trim()).map((item, index) => (
                                <tr key={`print-extra-${item.id ?? index}`}>
                                  <td className="text-center">{index + 1}</td>
                                  <td>{item.nama}</td>
                                  <td className="text-center">{item.predikat || "-"}</td>
                                  <td>{item.keterangan || "-"}</td>
                                </tr>
                              )) : (
                                <tr><td colSpan={4} className="text-center">Tidak ada data ekstrakurikuler.</td></tr>
                              )}
                            </tbody>
                          </table>

                          <h3 className="report-section-title">D. KETIDAKHADIRAN</h3>
                          <table className="report-attendance">
                            <tbody>
                              <tr><td>Sakit</td><td>{reportDraft.sakit || "0"} hari</td></tr>
                              <tr><td>Izin</td><td>{reportDraft.izin || "0"} hari</td></tr>
                              <tr><td>Tanpa Keterangan</td><td>{reportDraft.tanpaKeterangan || "0"} hari</td></tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="report-page report-page-second">
                          <h3 className="report-section-title">E. CATATAN DAN KETERANGAN</h3>
                          <div className="report-box">
                            <div className="report-box-label">Catatan Wali Kelas</div>
                            <div className="report-box-content">{reportDraft.catatanWaliKelas || "-"}</div>
                          </div>
                          <div className="report-box report-box-small">
                            <div className="report-box-label">Keterangan Naik Kelas / Tinggal di Kelas</div>
                            <div className="report-box-content">{reportDraft.keteranganNaikKelas || "-"}</div>
                          </div>
                          <div className="report-box report-box-small">
                            <div className="report-box-label">Keterangan Kelulusan</div>
                            <div className="report-box-content">{reportDraft.keteranganLulus || "-"}</div>
                          </div>

                          <div className="report-signature-grid">
                            <div className="report-signature">
                              <div>Mengetahui,</div>
                              <div>Orang Tua/Wali</div>
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
                            <div>Mengetahui,</div>
                            <div>Kepala Sekolah</div>
                            <div className="report-signature-space" />
                            <div className="report-signature-name">{reportDraft.namaKepalaSekolah || "........................................"}</div>
                            <div>{reportDraft.nipKepalaSekolah ? `NIP. ${reportDraft.nipKepalaSekolah}` : ""}</div>
                          </div>

                          <div className="report-footer">
                            Dokumen ini diterbitkan melalui Portal Akademik SD Islam Al-Barkah.
                          </div>
                        </div>
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
                  <button type="button" onClick={() => exportAttendance("pdf")} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">📄 PDF</button>
                </div>
              </div>
              {(role === "Admin" || role === "Guru") && (
                <>
                  {role === "Guru" && (
                    <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">Absensi Guru</p>
                          <h3 className="mt-1 text-lg font-bold text-gray-900">
                            Konfirmasi hadir di sekolah
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            Ambil selfie dari kamera perangkat untuk mengonfirmasi kehadiran.
                          </p>
                        </div>
                        {teacherAttendanceConfirmed ? (
                          <span className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
                            ✓ Hadir terkonfirmasi
                          </span>
                        ) : (
                          <button
                            onClick={openTeacherCamera}
                            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                          >
                            📸 Ambil Selfie
                          </button>
                        )}
                      </div>

                      {selfiePreview && (
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                          <img
                            src={selfiePreview}
                            alt="Preview selfie guru"
                            className="h-32 w-32 rounded-2xl border border-emerald-200 object-cover"
                          />
                          {!teacherAttendanceConfirmed && (
                            <button
                              onClick={confirmTeacherAttendance}
                              disabled={attendanceSaving}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {attendanceSaving ? "Menyimpan..." : "Konfirmasi Hadir"}
                            </button>
                          )}
                        </div>
                      )}

                      {cameraOpen && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-950 p-4">
                          <video
                            id="teacher-selfie-video"
                            autoPlay
                            playsInline
                            muted
                            ref={(element) => {
                              if (element && cameraStream) element.srcObject = cameraStream;
                            }}
                            className="mx-auto max-h-[360px] w-full max-w-xl rounded-xl object-cover"
                          />
                          <div className="mt-3 flex flex-wrap justify-center gap-2">
                            <button
                              onClick={captureTeacherSelfie}
                              className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900"
                            >
                              Ambil Foto
                            </button>
                            <button
                              onClick={closeTeacherCamera}
                              className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-bold text-white"
                            >
                              Tutup Kamera
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                          {(isWaliKelas ? attendanceSubjects.map((subject) => ({ subjectId: subject.id, subjectName: subject.name, subjectCode: subject.code })) : role === "Guru" ? teacherAssignments.filter((a) => a.className === attendanceClass && a.subjectId) : attendanceSubjects.map((subject) => ({ subjectId: subject.id, subjectName: subject.name, subjectCode: subject.code }))).map((subject) => (
                            <option key={subject.subjectId} value={subject.subjectId}>
                              {subject.subjectCode} - {subject.subjectName}
                            </option>
                          ))}
                        </select>
                        {role === "Guru" && isWaliKelas && (
                          <p className="mt-2 text-xs text-emerald-700">Wali kelas dapat memilih semua mata pelajaran. Hak simpan tetap diperiksa berdasarkan teaching_assignments.</p>
                        )}
                        {role === "Guru" && !isWaliKelas && (
                          <p className="mt-2 text-xs text-gray-500">Guru hanya dapat memilih mata pelajaran yang diampu pada kelas tersebut.</p>
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

                                    const nextClass = attendanceClassOptions.includes(attendanceClass)
                                      ? attendanceClass
                                      : attendanceClassOptions[0] ?? "";
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

                  {attendanceDate && (
                    <>
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
                          {attendanceClassOptions.map((className) => {
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
                    </>
                  )}
                </>
              )}

              {role === "Guru" && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900">Kehadiran Saya</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Persentase kehadiran guru berdasarkan konfirmasi kehadiran.
                  </p>
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-5">
                    <div>
                      <p className="text-sm text-gray-500">Kehadiran guru tahun 2026</p>
                      <p className="mt-1 text-3xl font-black text-blue-600">95%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">Hadir 19 hari</p>
                      <p className="text-xs text-gray-500">dari 20 hari tercatat</p>
                    </div>
                  </div>
                </div>
              )}

              {role !== "Admin" && role !== "Guru" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <h3 className="text-lg font-bold text-gray-900">
                      Rekap Kehadiran
                    </h3>
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
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white">🏫</div>
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

          {activeMenu === "AI Assistant" && (
            <Section
              title="AI Assistant"
              subtitle="Asisten pintar untuk kebutuhan sekolah"
            >
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-6 sm:p-8">
                <div className="mx-auto max-w-3xl">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
                      ✦
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-gray-900">AI Assistant SD Islam Al-Barkah</h3>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
                      Tanya AI untuk membantu kebutuhan sekolah seperti materi pembelajaran, administrasi, ringkasan, ide kegiatan, atau penjelasan sederhana.
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <textarea
                      value={aiQuestion}
                      onChange={(e) => { setAiQuestion(e.target.value); setAiError(""); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAI(); }
                      }}
                      placeholder="Contoh: Buatkan materi singkat tentang pecahan untuk siswa kelas 6..."
                      rows={4}
                      disabled={aiLoading}
                      className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
                    />

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-gray-400">Enter untuk mengirim · Shift + Enter untuk baris baru</p>
                      <button
                        type="button"
                        onClick={askAI}
                        disabled={aiLoading || !aiQuestion.trim()}
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {aiLoading ? "AI sedang berpikir..." : "✦ Tanya AI"}
                      </button>
                    </div>
                  </div>

                  {aiError && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <p className="font-bold">AI tidak dapat menjawab</p>
                      <p className="mt-1">{aiError}</p>
                    </div>
                  )}

                  {aiAnswer && (
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">✦</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900">Jawaban AI</p>
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{aiAnswer}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}
        </div>
      </main>
    </div>
    </>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg transition group-hover:bg-slate-900 group-hover:text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Attendance({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-emerald-600">
        {value}
      </p>
    </div>
  );
}

function Activity({
  title,
  time,
}: {
  title: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

      <div className="flex-1">
        <p className="text-sm font-medium">
          {title}
        </p>

        <p className="text-xs text-gray-400">
          {time}
        </p>
      </div>
    </div>
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