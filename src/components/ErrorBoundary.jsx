import { Component } from "react";

// Tanpa ini, error JS yang gak ke-handle (mis. storage diblok browser,
// fitur gak didukung WebKit, dll) bikin React unmount total -> layar
// putih kosong tanpa petunjuk sama sekali. Dengan ini, minimal user
// (atau kita pas debug dari jarak jauh) tau ada error dan apa isinya.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}>
          <h2 style={{ marginBottom: 8 }}>Aduh, ada yang error 😔</h2>
          <p style={{ color: "#666", marginBottom: 16 }}>
            Coba refresh halaman ini. Kalau masih error, screenshot pesan di
            bawah ini dan kirim ke admin.
          </p>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "12px",
              borderRadius: "8px",
              maxWidth: "100%",
              overflow: "auto",
              fontSize: "12px",
              textAlign: "left",
            }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#111",
              color: "#fff",
            }}>
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
