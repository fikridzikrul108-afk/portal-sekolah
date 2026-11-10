"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

type RoleOption = "siswa" | "guru" | "admin";

interface PortalLoginProps {
  loginName: string;
  setLoginName: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  login: (role?: any) => void | Promise<void>;
  loginLoading?: boolean;
  schoolLogoUrl?: string;
}

export default function PortalLogin({
  loginName,
  setLoginName,
  loginPassword,
  setLoginPassword,
  login,
  loginLoading = false,
  schoolLogoUrl = "/logo-sd.png",
}: PortalLoginProps) {
  const [selectedRole, setSelectedRole] = useState<RoleOption>("siswa");
  const [showPassword, setShowPassword] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // State Modal Animasi Feedback
  const [modalType, setModalType] = useState<"denied" | "success" | null>(null);
  const [modalData, setModalData] = useState<{
    title: string;
    message: string;
    currentRole?: string;
    expectedRole?: string;
    userName?: string;
  } | null>(null);

  // Link WhatsApp Admin resmi
  const waAdminUrl =
    "https://wa.me/6281213736544?text=Halo%20Admin%20SD%20Islam%20Al-Barkah,%20saya%20butuh%20bantuan%20terkait%20akun%20Portal%20Akademik";

  const getFieldInfo = () => {
    switch (selectedRole) {
      case "siswa":
        return {
          title: "Mode Akses: Siswa / Wali",
          desc: "Hak akses terisolasi untuk pantauan akademik, raport, dan info SPP siswa.",
          label: "NIS Siswa / Email Orang Tua",
          placeholder: "Contoh: 20261042 atau email@wali.id",
          helper: "Gunakan NIS siswa atau surel orang tua yang terdaftar di TU",
          buttonText: "Masuk Sebagai Siswa / Orang Tua",
          roleLabel: "Siswa / Wali",
          allowedRoles: ["siswa", "orang_tua"],
        };
      case "guru":
        return {
          title: "Mode Akses: Guru / Kepala Sekolah",
          desc: "Hak akses terisolasi untuk absensi kelas, jurnal mengajar, dan input nilai.",
          label: "Email Guru / NIP Tenaga Pendidik",
          placeholder: "Contoh: guru@albarkah.sch.id",
          helper: "Gunakan akun resmi tenaga pendidik SD Islam Al-Barkah",
          buttonText: "Masuk Sebagai Guru / KS",
          roleLabel: "Guru / Kepala Sekolah",
          allowedRoles: ["guru", "kepala_sekolah"],
        };
      case "admin":
        return {
          title: "Mode Akses: Administrator Sekolah",
          desc: "Akses khusus tata usaha, database kesiswaan, absensi pegawai, dan sistem.",
          label: "Email Administrator Sekolah",
          placeholder: "Contoh: admin@albarkah.sch.id",
          helper: "Akses khusus pengelola data dan operasional sekolah",
          buttonText: "Masuk Sebagai Admin",
          roleLabel: "Administrator",
          allowedRoles: ["admin", "kepala_sekolah"],
        };
    }
  };

  const fieldInfo = getFieldInfo();

  // Handler Submit Utama dengan Verifikasi Peran & Modal Animasi
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalType(null);
    setModalData(null);

    const loginInput = loginName.trim();
    if (!loginInput || !loginPassword) {
      setModalType("denied");
      setModalData({
        title: "Kredensial Belum Lengkap",
        message: "Silakan masukkan username/email/NIS dan password Anda terlebih dahulu.",
      });
      return;
    }

    const email = loginInput.includes("@")
      ? loginInput
      : `${loginInput.replace(/\./g, "")}@albarkah.sch.id`;

    setIsVerifying(true);

    try {
      // 1. Verifikasi akun ke Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (authErr || !authData.user) {
        setIsVerifying(false);
        setModalType("denied");
        setModalData({
          title: "Akses Masuk Gagal",
          message:
            authErr?.message === "Invalid login credentials"
              ? "Kombinasi email/NIS dan password salah. Pastikan data akun Anda sudah sesuai."
              : authErr?.message || "Kredensial login tidak valid.",
        });
        return;
      }

      // 2. Ambil peran profil asli dari database profiles
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("role, nama")
        .eq("id", authData.user.id)
        .single();

      if (profErr || !profile) {
        setIsVerifying(false);
        await supabase.auth.signOut();
        setModalType("denied");
        setModalData({
          title: "Profil Tidak Ditemukan",
          message: "Akun Anda terdaftar namun data profil sekolah belum dikonfigurasi di database TU.",
        });
        return;
      }

      const actualRole = String(profile.role).toLowerCase();
      const isAllowed = fieldInfo.allowedRoles.includes(actualRole);

      const formatRoleName = (r: string) => {
        if (r === "guru") return "Guru";
        if (r === "kepala_sekolah") return "Kepala Sekolah";
        if (r === "admin") return "Admin";
        if (r === "siswa") return "Siswa";
        if (r === "orang_tua") return "Orang Tua";
        return r;
      };

      if (!isAllowed) {
        // Logout langsung agar akun tidak masuk ke peran yang salah
        await supabase.auth.signOut();
        setIsVerifying(false);
        setModalType("denied");
        setModalData({
          title: "Peran Akun Tidak Sesuai",
          message: `Akun ini terdaftar resmi sebagai ${formatRoleName(actualRole)}. Silakan beralih ke tab peran yang tepat untuk masuk ke portal.`,
          currentRole: formatRoleName(actualRole),
          expectedRole: fieldInfo.roleLabel,
          userName: profile.nama,
        });
        return;
      }

      // 3. JIKA SUKSES: Tampilkan Animasi Centang Hijau Berhasil
      setIsVerifying(false);
      setModalType("success");
      setModalData({
        title: "Login Berhasil Terverifikasi!",
        message: "Identitas terkonfirmasi. Membuka dashboard utama SD Islam Al-Barkah...",
        userName: profile.nama,
        currentRole: formatRoleName(actualRole),
      });

      // Berikan jeda transisi 1.2 detik agar animasi sukses terlihat elegan sebelum berpindah
      setTimeout(async () => {
        setModalType(null);
        await Promise.resolve(login(selectedRole));
      }, 1200);
    } catch (err: any) {
      setIsVerifying(false);
      setModalType("denied");
      setModalData({
        title: "Terjadi Kendala Teknis",
        message: err?.message || "Tidak dapat memproses otentikasi peran saat ini.",
      });
    }
  };

  return (
    <div className="portal-wrapper">
      <style jsx global>{`
        .portal-wrapper {
          position: relative;
          width: calc(100% - 24px);
          min-height: calc(100vh - 24px);
          min-height: calc(100dvh - 24px);
          margin: max(12px, env(safe-area-inset-top)) auto max(12px, env(safe-area-inset-bottom));
          box-sizing: border-box;
          z-index: 1;
          overflow-y: auto;
          overflow-x: hidden;
          border-radius: 24px;
          background: radial-gradient(135% 100% at 85% 15%, #0080ff 0%, #0056d6 38%, #003da8 75%, #00226b 100%);
          color: #ffffff;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 12px 36px rgba(0, 25, 80, 0.18);
        }

        @keyframes entranceFadeUp {
          0% { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes entranceScaleCard {
          0% { opacity: 0; transform: scale(0.94) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes softFloatWave {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-14px) scaleY(1.03); }
        }
        @keyframes modalBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalBouncePop {
          0% { opacity: 0; transform: scale(0.85) translateY(24px); }
          65% { opacity: 1; transform: scale(1.03) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulseGlowRing {
          0% { transform: scale(0.88); opacity: 0.8; }
          50% { transform: scale(1.28); opacity: 0.15; }
          100% { transform: scale(1.42); opacity: 0; }
        }
        @keyframes checkmarkStroke {
          0% { stroke-dashoffset: 48; }
          100% { stroke-dashoffset: 0; }
        }

        .anim-stagger-1 {
          animation: entranceFadeUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.1s;
          opacity: 0;
        }
        .anim-stagger-2 {
          animation: entranceFadeUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.22s;
          opacity: 0;
        }
        .anim-stagger-3 {
          animation: entranceFadeUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.35s;
          opacity: 0;
        }
        .anim-card-pop {
          animation: entranceScaleCard 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s;
          opacity: 0;
        }
        .anim-ambient-wave {
          animation: softFloatWave 14s ease-in-out infinite alternate;
        }

        .portal-container {
          position: relative;
          z-index: 10;
          flex: 1;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 22px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          box-sizing: border-box;
        }

        .hero-section {
          width: 100%;
          max-width: 580px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: center;
          align-items: center;
        }

        .hero-title {
          font-size: 32px;
          font-weight: 900;
          line-height: 1.15;
          margin: 0;
          letter-spacing: -0.8px;
          text-shadow: 0 3px 10px rgba(0, 20, 60, 0.25);
        }

        .login-card-wrapper {
          width: 100%;
          max-width: 450px;
        }

        .login-card {
          background-color: #ffffff;
          border-radius: 26px;
          padding: 28px 24px;
          box-shadow: 0 24px 50px rgba(0, 20, 70, 0.45);
          color: #1e293b;
          text-align: left;
        }

        .role-switcher {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          background-color: #f1f5f9;
          padding: 4px;
          border-radius: 16px;
          margin-bottom: 14px;
          border: 1px solid #e2e8f0;
        }

        .role-btn {
          border: none;
          outline: none;
          background: transparent;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          padding: 9px 4px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          transition: all 0.2s ease;
          user-select: none;
        }

        .role-btn:hover {
          color: #0f172a;
          background-color: rgba(255, 255, 255, 0.6);
        }

        .role-btn.active {
          background-color: #0062d2;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 98, 210, 0.35);
        }

        @media (min-width: 1024px) {
          .portal-wrapper {
            width: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            margin: 0;
            border-radius: 0;
            box-shadow: none;
            overflow: hidden;
          }
          .portal-container {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding: 30px 48px;
            gap: 40px;
          }
          .hero-section {
            text-align: left;
            align-items: flex-start;
            gap: 28px;
          }
          .hero-title {
            font-size: 52px;
          }
          .login-card {
            padding: 34px 32px;
            border-radius: 30px;
          }
        }
      `}</style>

      {/* Latar Belakang Orbs & Ambient Wave */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "-120px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "rgba(56, 189, 248, 0.16)",
            filter: "blur(110px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: "-100px",
            width: "550px",
            height: "550px",
            borderRadius: "50%",
            background: "rgba(96, 165, 250, 0.2)",
            filter: "blur(120px)",
          }}
        />

        <svg
          className="anim-ambient-wave"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.15 }}
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M-50,280 C320,140 620,480 1060,220 C1280,90 1420,240 1560,200 L1560,900 L-50,900 Z"
            fill="white"
          />
        </svg>

        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.2 }}
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M-50,340 C340,180 700,560 1140,280 C1360,140 1460,320 1560,280"
            stroke="white"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M-50,680 C380,520 740,840 1200,600 C1380,510 1480,620 1560,580"
            stroke="white"
            strokeWidth="22"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Konten Utama */}
      <div className="portal-container">
        
        {/* Kolom Kiri: Branding & Slogan */}
        <div className="hero-section">
          <div className="anim-stagger-1" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                backgroundColor: "#ffffff",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 26px rgba(0, 20, 70, 0.35)",
                flexShrink: 0,
              }}
            >
              {!logoError ? (
                <img
                  src={schoolLogoUrl}
                  alt="Logo SD Islam Al-Barkah"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span style={{ fontSize: "22px", fontWeight: 900, color: "#0062d2" }}>AB</span>
              )}
            </div>

            <div style={{ textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, letterSpacing: "-0.5px", textShadow: "0 2px 4px rgba(0,0,0,0.15)" }}>
                  SD Islam Al-Barkah
                </h1>
                <span
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    padding: "2px 10px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  ID2026
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "rgba(219, 234, 254, 0.95)", fontWeight: 500 }}>
                Portal Akademik Sekolah
              </p>
            </div>
          </div>

          <div className="anim-stagger-2">
            <h2 className="hero-title">
              Satu Layanan<br />
              <span style={{ color: "#cbe3ff" }}>Semua Kemudahan</span>
            </h2>
          </div>

          <div className="anim-stagger-3" style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "inherit" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "inherit" }}>
              {[
                { label: "Kalender", svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                { label: "Keamanan", svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
                { label: "Siswa", svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg> },
                { label: "Media", svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> },
                { label: "SPP", svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
                { label: "Prestasi", svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
                { label: "Nilai", svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
                { label: "Buku", svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
                { label: "Administrasi", svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
              ].map((item, idx) => (
                <div
                  key={idx}
                  title={item.label}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "11px",
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {item.svg}
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(219, 234, 254, 0.9)", fontWeight: 400 }}>
              Hanya satu akun untuk seluruh layanan lengkap
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Form Card Login Putih */}
        <div className="login-card-wrapper">
          <div className="anim-card-pop login-card">
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#0062d2", margin: 0, letterSpacing: "-0.5px" }}>
                Masuk ke Akun Sekolah
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                Pilih peran akun Anda dan masukkan kredensial terdaftar
              </p>
            </div>

            {/* 3 Tab Peran */}
            <div className="role-switcher">
              <button
                type="button"
                className={`role-btn ${selectedRole === "siswa" ? "active" : ""}`}
                onClick={() => {
                  setSelectedRole("siswa");
                  setModalType(null);
                }}
              >
                <span>🎓</span>
                <span>Siswa / Wali</span>
              </button>
              <button
                type="button"
                className={`role-btn ${selectedRole === "guru" ? "active" : ""}`}
                onClick={() => {
                  setSelectedRole("guru");
                  setModalType(null);
                }}
              >
                <span>👨‍🏫</span>
                <span>Guru / KS</span>
              </button>
              <button
                type="button"
                className={`role-btn ${selectedRole === "admin" ? "active" : ""}`}
                onClick={() => {
                  setSelectedRole("admin");
                  setModalType(null);
                }}
              >
                <span>🛡️</span>
                <span>Admin</span>
              </button>
            </div>

            {/* Banner Mode Peran Aktif */}
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 12px",
                borderRadius: "12px",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                fontSize: "11px",
              }}
            >
              <span style={{ fontSize: "14px", lineHeight: "1" }}>🔒</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 800, color: "#1e40af", display: "block" }}>
                  {fieldInfo.title}
                </span>
                <span style={{ color: "#3b82f6", display: "block", marginTop: "2px", lineHeight: "1.3" }}>
                  {fieldInfo.desc}
                </span>
              </div>
              <span
                style={{
                  backgroundColor: "#dbeafe",
                  color: "#1d4ed8",
                  padding: "2px 6px",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "10px",
                  whiteSpace: "nowrap",
                }}
              >
                Peran Terisolasi
              </span>
            </div>

            {/* Form Otentikasi: onSubmit={handleAuthSubmit} memicu Modal Animasi */}
            <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Field 1: Email / NIS */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  {fieldInfo.label} <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: "14px", color: "#94a3b8", display: "flex" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder={fieldInfo.placeholder}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 42px",
                      borderRadius: "12px",
                      border: "1.5px solid #cbd5e1",
                      backgroundColor: "#f8fafc",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s, background-color 0.2s",
                    }}
                  />
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>
                  {fieldInfo.helper}
                </p>
              </div>

              {/* Field 2: Password */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Password <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: "14px", color: "#94a3b8", display: "flex" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 44px 12px 42px",
                      borderRadius: "12px",
                      border: "1.5px solid #cbd5e1",
                      backgroundColor: "#f8fafc",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s, background-color 0.2s",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      padding: "6px",
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p style={{ margin: "5px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                  Jika lupa sandi, silakan{" "}
                  <a
                    href={waAdminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0062d2", fontWeight: 700, textDecoration: "none" }}
                  >
                    hubungi admin
                  </a>.
                </p>
              </div>

              {/* Tombol Submit */}
              <div style={{ marginTop: "4px" }}>
                <button
                  type="submit"
                  disabled={loginLoading || isVerifying}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: "14px",
                    border: "none",
                    background: "linear-gradient(135deg, #0066e6 0%, #004ebd 100%)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 700,
                    boxShadow: "0 8px 20px rgba(0, 98, 210, 0.4)",
                    cursor: loginLoading || isVerifying ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                >
                  {loginLoading || isVerifying ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          border: "2px solid rgba(255,255,255,0.4)",
                          borderTopColor: "#ffffff",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <span>Memverifikasi Hak Akses...</span>
                    </span>
                  ) : (
                    <>
                      <span>{fieldInfo.buttonText}</span>
                      <span style={{ fontSize: "16px" }}>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Status Keamanan & WhatsApp IT */}
            <div
              style={{
                marginTop: "16px",
                paddingTop: "14px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#64748b",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#16a34a", fontWeight: 700 }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
                Koneksi Aman SSL
              </span>
              <a
                href={waAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0062d2", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span>💬 Hubungi IT & TU</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bawah */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          padding: "14px 16px",
          textAlign: "center",
          fontSize: "11px",
          color: "rgba(219, 234, 254, 0.75)",
          borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", fontWeight: 500, flexWrap: "wrap" }}>
          <span style={{ cursor: "pointer" }}>Kebijakan Privasi</span>
          <span>|</span>
          <span style={{ cursor: "pointer" }}>Ketentuan Penggunaan</span>
          <span>|</span>
          <a
            href={waAdminUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline", cursor: "pointer" }}
          >
            Hubungi Kami (WhatsApp)
          </a>
        </div>
        <p style={{ margin: 0, fontSize: "11px" }}>© 2026 SD Islam Al-Barkah • ID2026</p>
      </footer>

      {/* =========================================================================
          MODAL POP-UP ANIMASI RESMI (MUNCUL OTOMATIS SAAT GAGAL / SUKSES LOGIN)
          ========================================================================= */}
      {modalType && modalData && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backgroundColor: "rgba(10, 25, 60, 0.65)",
            backdropFilter: "blur(8px)",
            animation: "modalBackdropIn 0.25s ease-out forwards",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "#ffffff",
              borderRadius: "28px",
              padding: "32px 28px",
              textAlign: "center",
              boxShadow: "0 25px 60px -10px rgba(0, 20, 70, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.8) inset",
              animation: "modalBouncePop 0.38s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards",
              color: "#1e293b",
            }}
          >
            {/* 1. KONDISI GAGAL LOGIN / PERAN TIDAK SESUAI */}
            {modalType === "denied" && (
              <>
                <div
                  style={{
                    position: "relative",
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 20px auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      backgroundColor: "rgba(239, 68, 68, 0.22)",
                      animation: "pulseGlowRing 2s infinite ease-out",
                    }}
                  />
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "50%",
                      backgroundColor: "#fef2f2",
                      border: "2px solid #fecaca",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 20px rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                    </svg>
                  </div>
                </div>

                <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#991b1b", margin: "0 0 8px 0", letterSpacing: "-0.4px" }}>
                  {modalData.title}
                </h3>

                <p style={{ fontSize: "13px", lineHeight: "1.55", color: "#475569", margin: "0 0 18px 0" }}>
                  {modalData.message}
                </p>

                {modalData.currentRole && modalData.expectedRole && (
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "12px 14px",
                      marginBottom: "20px",
                      textAlign: "left",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#64748b" }}>Tab yang dibuka:</span>
                      <span style={{ fontWeight: 700, color: "#dc2626" }}>{modalData.expectedRole}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Peran akun resmi:</span>
                      <span style={{ fontWeight: 800, color: "#0062d2" }}>{modalData.currentRole}</span>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setModalType(null);
                      if (modalData.currentRole === "Guru" || modalData.currentRole === "Kepala Sekolah") {
                        setSelectedRole("guru");
                      } else if (modalData.currentRole === "Admin") {
                        setSelectedRole("admin");
                      } else if (modalData.currentRole === "Siswa" || modalData.currentRole === "Orang Tua") {
                        setSelectedRole("siswa");
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "13px",
                      borderRadius: "14px",
                      backgroundColor: "#0062d2",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 6px 16px rgba(0, 98, 210, 0.35)",
                    }}
                  >
                    {modalData.currentRole ? "Beralih ke Tab Peran yang Benar" : "Tutup & Coba Lagi"}
                  </button>

                  <a
                    href={waAdminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      padding: "11px",
                      borderRadius: "14px",
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    💬 Hubungi Admin Sekolah
                  </a>
                </div>
              </>
            )}

            {/* 2. KONDISI SUKSES LOGIN TERVERIFIKASI */}
            {modalType === "success" && (
              <>
                <div
                  style={{
                    position: "relative",
                    width: "84px",
                    height: "84px",
                    margin: "0 auto 20px auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      backgroundColor: "rgba(16, 185, 129, 0.25)",
                      animation: "pulseGlowRing 1.8s infinite ease-out",
                    }}
                  />
                  <div
                    style={{
                      width: "74px",
                      height: "74px",
                      borderRadius: "50%",
                      backgroundColor: "#ecfdf5",
                      border: "2px solid #a7f3d0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 24px rgba(16, 185, 129, 0.28)",
                    }}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 48, animation: "checkmarkStroke 0.6s ease-in-out forwards" }} />
                    </svg>
                  </div>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 12px",
                    borderRadius: "9999px",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#047857",
                    marginBottom: "10px",
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }} />
                  Verifikasi Berhasil • {modalData.currentRole}
                </div>

                <h3 style={{ fontSize: "21px", fontWeight: 900, color: "#065f46", margin: "0 0 6px 0", letterSpacing: "-0.4px" }}>
                  Ahlan wa Sahlan,
                </h3>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
                  {modalData.userName || "Pengguna Al-Barkah"}! 👋
                </p>

                <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px 0", lineHeight: "1.5" }}>
                  {modalData.message}
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    setModalType(null);
                    await Promise.resolve(login(selectedRole));
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "14px",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 6px 16px rgba(5, 150, 105, 0.35)",
                    marginBottom: "12px",
                  }}
                >
                  Langsung Masuk Dashboard →
                </button>

                <div style={{ width: "100%", height: "5px", backgroundColor: "#e2e8f0", borderRadius: "9999px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "#059669",
                      borderRadius: "9999px",
                      width: "100%",
                      animation: "entranceFadeUp 1s ease-in-out forwards",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
