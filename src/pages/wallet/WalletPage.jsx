import ChildDashboard from "./ChildDashboard";
import ParentDashboard from "./ParentDashboard";

// Pintu masuk modul Wallet. Logic "anak vs orang tua liat apa"
// yang dulu nangkring di App.jsx, sekarang lokal di modul ini aja.
export default function WalletPage({ user }) {
  if (user.role === "orang_tua") {
    return <ParentDashboard user={user} />;
  }
  return <ChildDashboard user={user} />;
}
