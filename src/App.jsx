import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { C } from "./lib/theme";
import { Login, SignUp } from "./components/auth";
import AppShell from "./components/Layout";
import HomePage from "./pages/HomePage";
import WalletPage from "./pages/wallet/WalletPage";
import AkademikPage from "./pages/akademik/AkademikPage";
import JadwalPage from "./pages/akademik/JadwalPage";
import JadwalFormPage from "./pages/akademik/JadwalFormPage";
import PersiapanPage from "./pages/akademik/PersiapanPage";
import PersiapanFormPage from "./pages/akademik/PersiapanFormPage";
import StudyPackDetailPage from "./pages/akademik/StudyPackDetailPage";
import TugasPage from "./pages/akademik/TugasPage";
import TugasFormPage from "./pages/akademik/TugasFormPage";
import IpkPage from "./pages/akademik/IpkPage";
import CatatanPage from "./pages/akademik/catatan/CatatanPage";
import CatatanDetailPage from "./pages/akademik/catatan/CatatanDetailPage";
import LatihanPage from "./pages/akademik/latihan/LatihanPage";
import LatihanSesiPage from "./pages/akademik/latihan/LatihanSesiPage";
import LatihanHasilPage from "./pages/akademik/latihan/LatihanHasilPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // "login" | "signup" -- cuma relevan pas belum ada user. Reset balik
  // ke "login" tiap kali logout, biar gak nyangkut di form daftar.
  const [authView, setAuthView] = useState("login");

  useEffect(() => {
    const saved =
      localStorage.getItem("mywallet_user") ||
      sessionStorage.getItem("mywallet_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem("mywallet_user");
        sessionStorage.removeItem("mywallet_user");
      }
    }
    setLoading(false);
  }, []);

  function handleLogout() {
    localStorage.removeItem("mywallet_user");
    sessionStorage.removeItem("mywallet_user");
    setUser(null);
    setAuthView("login");
  }

  // SignUp gak punya checkbox "Ingat saya" kayak Login -- akun baru
  // default di-persist ke localStorage biar gak ke-logout pas refresh.
  function handleSignUpSuccess(newUser) {
    const loggedInUser = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      linked_child_id: newUser.linked_child_id,
      nama_lengkap: newUser.nama_lengkap,
    };
    sessionStorage.removeItem("mywallet_user");
    localStorage.setItem("mywallet_user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: C.bg, color: C.inkFaint }}>
        Memuat...
      </div>
    );
  }

  if (!user) {
    if (authView === "signup") {
      return (
        <SignUp
          onSignUpSuccess={handleSignUpSuccess}
          onBackToLogin={() => setAuthView("login")}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={setUser}
        onSwitchToSignUp={() => setAuthView("signup")}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell user={user} onLogout={handleLogout} />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<HomePage user={user} />} />
          <Route path="wallet" element={<WalletPage user={user} />} />

          {/* Modul Akademik -- landing card menu + Jadwal, Persiapan & Tugas.
              Form pakai route yang sama buat tambah & edit (edit
              ngirim data lewat navigate state dari halaman list). */}
          <Route path="akademik" element={<AkademikPage user={user} />} />
          <Route path="akademik/jadwal" element={<JadwalPage user={user} />} />
          <Route
            path="akademik/jadwal/tambah"
            element={<JadwalFormPage user={user} />}
          />
          <Route
            path="akademik/persiapan"
            element={<PersiapanPage user={user} />}
          />
          <Route
            path="akademik/persiapan/tambah"
            element={<PersiapanFormPage user={user} />}
          />
          <Route
            path="akademik/persiapan/detail"
            element={<StudyPackDetailPage user={user} />}
          />
          <Route path="akademik/tugas" element={<TugasPage user={user} />} />
          <Route
            path="akademik/tugas/tambah"
            element={<TugasFormPage user={user} />}
          />
          <Route path="akademik/ipk" element={<IpkPage user={user} />} />

          {/* Modul Latihan & Kuis AI -- landing (setup buat anak /
              monitoring buat ortu), sesi kuis berjalan, lalu hasil.
              Soal digenerate on-the-fly lewat edge function, gak
              disimpan ke DB -- cuma ringkasan hasil di halaman
              terakhir. */}
          <Route
            path="akademik/latihan"
            element={<LatihanPage user={user} />}
          />
          <Route
            path="akademik/latihan/sesi"
            element={<LatihanSesiPage user={user} />}
          />
          <Route
            path="akademik/latihan/hasil"
            element={<LatihanHasilPage user={user} />}
          />

          {/* Modul Catatan Kuliah -- landing (list mata kuliah) + detail
              per mata kuliah (list catatan, rekam/ketik, auto-save).
              Path pakai "journal" biar nyambung sama NAV_ITEMS di
              Sidebar.jsx & Layout.jsx (folder kode tetap "catatan"). */}
          <Route path="journal" element={<CatatanPage user={user} />} />
          <Route
            path="journal/:mataKuliahId"
            element={<CatatanDetailPage user={user} />}
          />

          {/* Modul baru nanti nambah <Route> di sini, contoh:
          <Route path="ipk" element={<IpkPage user={user} />} /> */}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
