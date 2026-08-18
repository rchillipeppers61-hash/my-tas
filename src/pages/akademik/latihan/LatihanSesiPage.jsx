import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { C, FONT_IMPORT } from "../../../lib/theme";
import { Card } from "../../../components/ui";
import { modeMeta } from "./constants";

// ============================================================
// LatihanSesiPage — jalanin kuis 1 soal per layar. Semua state
// (soal, jawaban user) cuma hidup di memory selama sesi ini --
// TIDAK ada write ke database di halaman ini. Baru pas selesai
// & lanjut ke LatihanHasilPage, hasil ringkasannya disimpan.
// ============================================================
export default function LatihanSesiPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const payload = location.state;

  const [current, setCurrent] = useState(0);
  const [jawaban, setJawaban] = useState({}); // { [soalId]: string }
  const [isianInput, setIsianInput] = useState("");
  const [mulaiAt] = useState(() => Date.now());

  const mode = payload?.mode;
  const mm = modeMeta(mode);
  const soalList = payload?.soal || [];
  const totalSoal = soalList.length;
  const soalAktif = soalList[current];

  // Timer cuma aktif buat mode exam. Total durasi = detikPerSoal * jumlah
  // soal, dihitung dari constants.js biar konsisten sama estimasi di
  // layar setup.
  const totalDetikTimer = mm.adaTimer ? mm.detikPerSoal * totalSoal : null;
  const [sisaDetik, setSisaDetik] = useState(totalDetikTimer);

  useEffect(() => {
    if (!payload || totalSoal === 0) {
      navigate("/akademik/latihan", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mm.adaTimer) return;
    if (sisaDetik <= 0) {
      handleSelesai();
      return;
    }
    const t = setTimeout(() => setSisaDetik((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sisaDetik, mm.adaTimer]);

  if (!payload || totalSoal === 0) return null;

  function pilihJawaban(value) {
    setJawaban((prev) => ({ ...prev, [soalAktif.id]: value }));
  }

  function submitIsian() {
    if (!isianInput.trim()) return;
    setJawaban((prev) => ({ ...prev, [soalAktif.id]: isianInput.trim() }));
    lanjut();
  }

  function lanjut() {
    if (current < totalSoal - 1) {
      setCurrent((c) => c + 1);
      setIsianInput("");
    } else {
      handleSelesai();
    }
  }

  function handleSelesai() {
    const durasiDetik = Math.round((Date.now() - mulaiAt) / 1000);

    let jumlahBenar = 0;
    const salahTopik = [];

    soalList.forEach((s) => {
      const userAns = (jawaban[s.id] || "").trim().toLowerCase();
      const correctAns = (s.jawaban_benar || "").trim().toLowerCase();
      // Isian singkat dicek longgar (substring match) karena AI/user bisa
      // beda kata tapi maksud sama -- lebih baik agak permisif daripada
      // salah nyalahin jawaban yang sebenernya benar.
      const cocok =
        s.tipe === "isian_singkat"
          ? userAns.length > 0 &&
            (userAns.includes(correctAns) || correctAns.includes(userAns))
          : userAns === correctAns;

      if (cocok) {
        jumlahBenar += 1;
      } else if (s.topik) {
        salahTopik.push(s.topik);
      }
    });

    navigate("/akademik/latihan/hasil", {
      state: {
        ...payload,
        jawaban,
        jumlahBenar,
        salahTopik,
        durasiDetik,
      },
      replace: true,
    });
  }

  const sudahDijawab = jawaban[soalAktif.id] !== undefined;
  const progress = ((current + 1) / totalSoal) * 100;

  return (
    <div
      className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-semibold" style={{ color: C.inkFaint }}>
          Soal {current + 1} dari {totalSoal}
        </p>
        {mm.adaTimer && (
          <p
            className="text-[12.5px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: sisaDetik <= 30 ? "#F4A6B71F" : "#463F5C0d",
              color: sisaDetik <= 30 ? C.roseDeep : C.ink,
            }}>
            ⏱ {String(Math.floor(sisaDetik / 60)).padStart(2, "0")}:
            {String(sisaDetik % 60).padStart(2, "0")}
          </p>
        )}
      </div>

      <div
        className="h-1.5 rounded-full overflow-hidden mb-6"
        style={{ background: "#463F5C14" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: mm.color }}
        />
      </div>

      <Card border className="mb-5">
        <span
          className="inline-block text-[10.5px] font-bold px-2.5 py-1 rounded-full mb-3"
          style={{ background: mm.bg, color: mm.color }}>
          {soalAktif.topik || "Umum"}
        </span>
        <p
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-[16px] font-semibold leading-snug">
          {soalAktif.pertanyaan}
        </p>
      </Card>

      {soalAktif.tipe === "isian_singkat" ? (
        <>
          <input
            type="text"
            value={isianInput}
            onChange={(e) => setIsianInput(e.target.value)}
            placeholder="Tulis jawaban kamu..."
            className="w-full mb-3.5 px-3.5 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] focus:ring-4 focus:ring-[#8B72C42A]"
            style={{
              background: "#463F5C08",
              color: C.ink,
              borderColor: "#463F5C1F",
            }}
          />
          <button
            onClick={submitIsian}
            disabled={!isianInput.trim()}
            className="w-full py-3.5 rounded-2xl font-bold text-[14px] disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${mm.color}, ${C.lavender})`,
              color: "#FFFFFF",
            }}>
            {current < totalSoal - 1 ? "Lanjut →" : "Selesai"}
          </button>
        </>
      ) : (
        <>
          <div className="space-y-2.5 mb-3.5">
            {(soalAktif.opsi || []).map((opsi, i) => {
              const aktif = jawaban[soalAktif.id] === opsi;
              return (
                <button
                  key={i}
                  onClick={() => pilihJawaban(opsi)}
                  className="w-full text-left px-4 py-3.5 rounded-2xl border-[1.5px] text-[14px] font-medium transition-colors"
                  style={{
                    background: aktif ? mm.bg : "#463F5C08",
                    borderColor: aktif ? mm.color : "#463F5C1F",
                    color: C.ink,
                  }}>
                  {opsi}
                </button>
              );
            })}
          </div>
          <button
            onClick={lanjut}
            disabled={!sudahDijawab}
            className="w-full py-3.5 rounded-2xl font-bold text-[14px] disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${mm.color}, ${C.lavender})`,
              color: "#FFFFFF",
            }}>
            {current < totalSoal - 1 ? "Lanjut →" : "Selesai"}
          </button>
        </>
      )}
    </div>
  );
}
