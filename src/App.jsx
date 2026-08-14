import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { C } from "./shared/theme";
import Login from "./shared/auth/Login";
import AppShell from "./layout/AppShell";
import HomePage from "./layout/HomePage";
import WalletPage from "./modules/wallet/WalletPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell user={user} onLogout={handleLogout} />}>
          <Route index element={<Navigate to="/wallet" replace />} />
          <Route path="home" element={<HomePage user={user} />} />
          <Route
            path="wallet"
            element={<WalletPage user={user} onLogout={handleLogout} />}
          />
          {/* Modul baru nanti nambah <Route> di sini, contoh:
          <Route path="akademik" element={<AkademikPage user={user} />} /> */}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
