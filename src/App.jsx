import { useEffect, useState } from "react";
import { C } from "./component/theme";
import Login from "./component/Login";
import Dashboard from "./component/Dashboard";
import ParentDashboard from "./component/ParentDashboard";

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

  if (user.role === "orang_tua") {
    return <ParentDashboard user={user} onLogout={handleLogout} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
