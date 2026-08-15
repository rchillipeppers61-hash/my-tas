import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { C, FONT_IMPORT } from "../../lib/theme";
import { capitalize } from "../../lib/format";
import { Card } from "../../components/ui";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================================
// IpkPage — landing + detail semester + CRUD nilai, digabung
// jadi satu file (pola sama kayak modul lain yang cuma butuh
// 1 halaman, gak perlu dipecah per sub-modul kayak Catatan).
//
// IP semester & IPK kumulatif SENGAJA gak disimpen ke DB --
// dihitung on-the-fly dari nilai_matkul + grade_scale, biar
// gak ada resiko data ke-out-of-sync kalau nilai diedit/dihapus.
// ============================================================

function hitungIp(matkulList) {
  const dinilai = matkulList.filter((m) => m.nilai_huruf);
  const totalSks = dinilai.reduce((s, m) => s + m.sks, 0);
  if (totalSks === 0) return 0;
  const totalBobot = dinilai.reduce((s, m) => s + m.sks * (m.bobot || 0), 0);
  return totalBobot / totalSks;
}

function predikat(ipk) {
  if (ipk >= 3.51) return { label: "Cumlaude", color: C.mintDeep };
  if (ipk >= 3.01) return { label: "Sangat Memuaskan", color: C.skyDeep };
  if (ipk >= 2.76) return { label: "Memuaskan", color: C.lavender };
  return { label: "-", color: C.inkFaint };
}

export default function IpkPage({ user }) {
  const isParent = user?.role === "orang_tua";
  const targetId = isParent ? user.linked_child_id : user.id;
  const targetLinked = isParent ? Boolean(user.linked_child_id) : true;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [childName, setChildName] = useState("");

  const [gradeScale, setGradeScale] = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [matkulList, setMatkulList] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [showAddSemester, setShowAddSemester] = useState(false);
  const [namaSemester, setNamaSemester] = useState("");
  const [tahunAjaran, setTahunAjaran] = useState("");
  const [savingSemester, setSavingSemester] = useState(false);

  const [addingMatkulFor, setAddingMatkulFor] = useState(null);
  const [editingMatkulId, setEditingMatkulId] = useState(null);
  const [namaMatkul, setNamaMatkul] = useState("");
  const [sksMatkul, setSksMatkul] = useState("");
  const [nilaiMatkul, setNilaiMatkul] = useState("");
  const [savingMatkul, setSavingMatkul] = useState(false);

  useEffect(() => {
    if (targetLinked) loadAll();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadChildName(),
        loadGradeScale(),
        loadSemester(),
        loadNilai(),
      ]);
    } catch (err) {
      setError("Gagal memuat data IPK. Cek koneksi kamu, terus coba lagi.");
    }
    setLoading(false);
  }

  async function loadChildName() {
    if (!isParent) return;
    const { data } = await supabase
      .from("users")
      .select("nama_lengkap, username")
      .eq("id", targetId)
      .single();
    if (data) setChildName(data.nama_lengkap || data.username);
  }

  async function loadGradeScale() {
    const { data, error } = await supabase
      .from("grade_scale")
      .select("*")
      .order("urutan", { ascending: true });
    if (error) throw error;
    setGradeScale(data || []);
  }

  async function loadSemester() {
    const { data, error } = await supabase
      .from("semester")
      .select("*")
      .eq("user_id", targetId)
      .order("urutan", { ascending: true });
    if (error) throw error;
    setSemesterList(data || []);
  }

  async function loadNilai() {
    const { data, error } = await supabase
      .from("nilai_matkul")
      .select("*")
      .eq("user_id", targetId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    setMatkulList(data || []);
  }

  // Gabungin bobot dari grade_scale ke tiap matkul, biar hitungIp()
  // gak perlu join berulang.
  const bobotMap = useMemo(() => {
    const map = {};
    gradeScale.forEach((g) => (map[g.nilai_huruf] = g.bobot));
    return map;
  }, [gradeScale]);

  const matkulWithBobot = useMemo(
    () => matkulList.map((m) => ({ ...m, bobot: bobotMap[m.nilai_huruf] })),
    [matkulList, bobotMap],
  );

  const ipkKumulatif = useMemo(
    () => hitungIp(matkulWithBobot),
    [matkulWithBobot],
  );
  const totalSksLulus = useMemo(
    () =>
      matkulWithBobot
        .filter((m) => m.nilai_huruf)
        .reduce((s, m) => s + m.sks, 0),
    [matkulWithBobot],
  );
  const pred = predikat(ipkKumulatif);

  function matkulForSemester(semId) {
    return matkulWithBobot.filter((m) => m.semester_id === semId);
  }

  async function handleAddSemester(e) {
    e.preventDefault();
    if (!namaSemester.trim()) return;
    setSavingSemester(true);

    const urutan = (semesterList[semesterList.length - 1]?.urutan || 0) + 1;
    const { data, error: insertError } = await supabase
      .from("semester")
      .insert({
        user_id: targetId,
        nama: namaSemester.trim(),
        tahun_ajaran: tahunAjaran.trim() || null,
        urutan,
      })
      .select()
      .single();

    setSavingSemester(false);
    if (insertError || !data) return;

    setSemesterList((prev) => [...prev, data]);
    setNamaSemester("");
    setTahunAjaran("");
    setShowAddSemester(false);
    setExpandedId(data.id);
  }

  async function handleDeleteSemester(semId) {
    if (!window.confirm("Hapus semester ini beserta semua nilai di dalamnya?"))
      return;
    const { error: deleteError } = await supabase
      .from("semester")
      .delete()
      .eq("id", semId);
    if (deleteError) return;
    setSemesterList((prev) => prev.filter((s) => s.id !== semId));
    setMatkulList((prev) => prev.filter((m) => m.semester_id !== semId));
  }

  function openAddMatkul(semId) {
    setAddingMatkulFor(semId);
    setEditingMatkulId(null);
    setNamaMatkul("");
    setSksMatkul("");
    setNilaiMatkul("");
  }

  function openEditMatkul(m) {
    setAddingMatkulFor(m.semester_id);
    setEditingMatkulId(m.id);
    setNamaMatkul(m.nama_matkul);
    setSksMatkul(String(m.sks));
    setNilaiMatkul(m.nilai_huruf || "");
  }

  function closeMatkulForm() {
    setAddingMatkulFor(null);
    setEditingMatkulId(null);
  }

  async function handleSaveMatkul(e) {
    e.preventDefault();
    const sksNum = parseInt(sksMatkul, 10);
    if (!namaMatkul.trim() || !sksNum || sksNum <= 0) return;
    setSavingMatkul(true);

    const payload = {
      nama_matkul: namaMatkul.trim(),
      sks: sksNum,
      nilai_huruf: nilaiMatkul || null,
    };

    if (editingMatkulId) {
      const { data, error: updateError } = await supabase
        .from("nilai_matkul")
        .update(payload)
        .eq("id", editingMatkulId)
        .select()
        .single();
      setSavingMatkul(false);
      if (updateError || !data) return;
      setMatkulList((prev) =>
        prev.map((m) => (m.id === editingMatkulId ? data : m)),
      );
      closeMatkulForm();
      return;
    }

    const { data, error: insertError } = await supabase
      .from("nilai_matkul")
      .insert({ semester_id: addingMatkulFor, user_id: targetId, ...payload })
      .select()
      .single();
    setSavingMatkul(false);
    if (insertError || !data) return;
    setMatkulList((prev) => [...prev, data]);
    closeMatkulForm();
  }

  async function handleDeleteMatkul(id) {
    if (!window.confirm("Hapus mata kuliah ini?")) return;
    const { error: deleteError } = await supabase
      .from("nilai_matkul")
      .delete()
      .eq("id", id);
    if (deleteError) return;
    setMatkulList((prev) => prev.filter((m) => m.id !== id));
  }

  // IPK kumulatif "saat itu" -- dihitung dari semua semester yang urutan-nya
  // <= urutan semester yang lagi di-download, bukan IPK kumulatif terakhir.
  function ipkSampaiSemester(sem) {
    const semIdsSampaiSini = semesterList
      .filter((s) => s.urutan <= sem.urutan)
      .map((s) => s.id);
    const matkulSampaiSini = matkulWithBobot.filter((m) =>
      semIdsSampaiSini.includes(m.semester_id),
    );
    const sks = matkulSampaiSini
      .filter((m) => m.nilai_huruf)
      .reduce((s, m) => s + m.sks, 0);
    return { ipk: hitungIp(matkulSampaiSini), sks };
  }

  function handleDownloadTranskrip(sem) {
    const matkul = matkulForSemester(sem.id);
    const sksSemester = matkul
      .filter((m) => m.nilai_huruf)
      .reduce((s, m) => s + m.sks, 0);
    const ipSem = hitungIp(matkul);
    const { ipk: ipkSaatItu, sks: sksSaatItu } = ipkSampaiSemester(sem);

    const namaMahasiswa = isParent
      ? capitalize(childName) || "Mahasiswa"
      : user?.nama_lengkap || user?.username || "Mahasiswa";

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("TRANSKRIP NILAI", pageWidth / 2, 20, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text("Teman Aktivitas Sehari-hari (TAS)", pageWidth / 2, 26, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nama Mahasiswa`, 20, 38);
    doc.text(`: ${namaMahasiswa}`, 55, 38);
    doc.text(`Semester`, 20, 44);
    doc.text(
      `: ${sem.nama}${sem.tahun_ajaran ? " - " + sem.tahun_ajaran : ""}`,
      55,
      44,
    );
    doc.text(`Dicetak`, 20, 50);
    doc.text(
      `: ${new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`,
      55,
      50,
    );

    autoTable(doc, {
      startY: 58,
      head: [["No", "Mata Kuliah", "SKS", "Nilai"]],
      body:
        matkul.length > 0
          ? matkul.map((m, i) => [
              i + 1,
              m.nama_matkul,
              m.sks,
              m.nilai_huruf || "-",
            ])
          : [["-", "Belum ada mata kuliah", "-", "-"]],
      styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
      headStyles: {
        fillColor: [70, 63, 92],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
      },
      margin: { left: 20, right: 20 },
    });

    const y = doc.lastAutoTable.finalY + 12;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(
      `IP Semester      :  ${ipSem ? ipSem.toFixed(2) : "-"}   (${sksSemester} SKS)`,
      20,
      y,
    );
    doc.text(
      `IPK Kumulatif    :  ${ipkSaatItu ? ipkSaatItu.toFixed(2) : "-"}   (${sksSaatItu} SKS s.d. semester ini)`,
      20,
      y + 7,
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Dokumen ini dibuat otomatis oleh aplikasi TAS, bukan transkrip resmi kampus.",
      pageWidth / 2,
      287,
      { align: "center" },
    );

    const namaFile = `Transkrip_${sem.nama}${
      sem.tahun_ajaran ? "_" + sem.tahun_ajaran : ""
    }`
      .replace(/[\/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, "_");
    doc.save(`${namaFile}.pdf`);
  }

  if (!targetLinked) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <style>{FONT_IMPORT}</style>
        <p className="text-[13.5px]" style={{ color: C.inkFaint }}>
          Akun kamu belum tersambung ke anak. Sambungkan dulu dari halaman
          Beranda buat lihat data IPK.
        </p>
      </div>
    );
  }

  return (
    <div
      className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <p
        className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
        style={{ color: C.amberDeep }}>
        IPK Tracker
      </p>
      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[24px] font-semibold mb-2">
        {isParent
          ? `IPK ${capitalize(childName) || "Anak"} 📊`
          : "Perkembangan IPK Kamu 📊"}
      </h1>
      <p
        className="text-[13.5px] leading-relaxed mb-6"
        style={{ color: C.inkFaint }}>
        Pantau IPK kumulatif & nilai tiap semester di sini.
      </p>

      {error && (
        <div
          className="flex items-center gap-2 text-[12.5px] mb-5 px-3.5 py-2.5 rounded-xl font-medium"
          style={{ background: "#D9607A14", color: C.roseDeep }}>
          <span className="flex-shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="text-[13px]" style={{ color: C.inkFaint }}>
          Memuat...
        </p>
      ) : (
        <>
          {/* Ringkasan IPK kumulatif */}
          <Card title="IPK Kumulatif" accent={C.amberDeep}>
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <p
                  style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
                  className="text-[40px] font-semibold leading-none">
                  {ipkKumulatif ? ipkKumulatif.toFixed(2) : "-"}
                </p>
                <span
                  className="inline-block mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "#F6C4531F", color: pred.color }}>
                  {pred.label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[12px]" style={{ color: C.inkFaint }}>
                  Total SKS Lulus
                </p>
                <p
                  style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
                  className="text-[20px] font-semibold">
                  {totalSksLulus}
                </p>
              </div>
            </div>
          </Card>

          {/* List semester */}
          <div className="mt-5 space-y-3">
            {semesterList.length === 0 ? (
              <Card title="Belum Ada Semester" accent={C.lavender}>
                <p className="text-[12.5px]" style={{ color: C.inkFaint }}>
                  {isParent
                    ? "Anak kamu belum nambahin semester."
                    : "Tambah semester pertama buat mulai catat nilai."}
                </p>
              </Card>
            ) : (
              semesterList.map((sem) => {
                const matkul = matkulForSemester(sem.id);
                const ipSem = hitungIp(matkul);
                const isExpanded = expandedId === sem.id;
                return (
                  <Card key={sem.id} accent={C.lavender}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : sem.id)}
                      className="w-full flex items-center justify-between text-left">
                      <div className="min-w-0">
                        <p
                          style={{
                            fontFamily: "'Fraunces', serif",
                            color: C.ink,
                          }}
                          className="text-[15px] font-semibold truncate">
                          {sem.nama}
                        </p>
                        {sem.tahun_ajaran && (
                          <p
                            className="text-[11.5px]"
                            style={{ color: C.inkFaint }}>
                            {sem.tahun_ajaran}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p
                            className="text-[10.5px]"
                            style={{ color: C.inkFaint }}>
                            IP Semester
                          </p>
                          <p
                            style={{
                              fontFamily: "'Fraunces', serif",
                              color: C.lavender,
                            }}
                            className="text-[16px] font-semibold">
                            {ipSem ? ipSem.toFixed(2) : "-"}
                          </p>
                        </div>
                        <span style={{ color: C.inkFaint }}>
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        className="mt-4 pt-4"
                        style={{ borderTop: "1px solid #463F5C14" }}>
                        {matkul.length === 0 ? (
                          <p
                            className="text-[12px] mb-3"
                            style={{ color: C.inkFaint }}>
                            Belum ada mata kuliah.
                          </p>
                        ) : (
                          <div className="space-y-2 mb-3">
                            {matkul.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                                style={{ background: "#463F5C08" }}>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="text-[13px] font-semibold truncate"
                                    style={{ color: C.ink }}>
                                    {m.nama_matkul}
                                  </p>
                                  <p
                                    className="text-[11px]"
                                    style={{ color: C.inkFaint }}>
                                    {m.sks} SKS
                                    {m.nilai_huruf
                                      ? ` · Nilai ${m.nilai_huruf}`
                                      : " · Belum ada nilai"}
                                  </p>
                                </div>
                                {!isParent && (
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                      onClick={() => openEditMatkul(m)}
                                      className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                                      style={{ color: C.lavender }}>
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMatkul(m.id)}
                                      className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                                      style={{ color: C.roseDeep }}>
                                      Hapus
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => handleDownloadTranskrip(sem)}
                          className="w-full mb-3 py-2.5 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5"
                          style={{
                            background: "#463F5C0d",
                            color: C.lavender,
                          }}>
                          ⬇ Download Transkrip
                        </button>

                        {!isParent && addingMatkulFor === sem.id && (
                          <form
                            onSubmit={handleSaveMatkul}
                            className="p-3 rounded-xl mb-3 space-y-2"
                            style={{ background: "#463F5C08" }}>
                            <input
                              type="text"
                              value={namaMatkul}
                              onChange={(e) => setNamaMatkul(e.target.value)}
                              placeholder="Nama mata kuliah"
                              required
                              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none border-[1.5px]"
                              style={{
                                background: "#FFFFFF",
                                color: C.ink,
                                borderColor: "#463F5C1F",
                              }}
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                value={sksMatkul}
                                onChange={(e) => setSksMatkul(e.target.value)}
                                placeholder="SKS"
                                required
                                className="w-1/2 px-3 py-2 rounded-lg text-[13px] outline-none border-[1.5px]"
                                style={{
                                  background: "#FFFFFF",
                                  color: C.ink,
                                  borderColor: "#463F5C1F",
                                }}
                              />
                              <select
                                value={nilaiMatkul}
                                onChange={(e) => setNilaiMatkul(e.target.value)}
                                className="w-1/2 px-3 py-2 rounded-lg text-[13px] outline-none border-[1.5px]"
                                style={{
                                  background: "#FFFFFF",
                                  color: C.ink,
                                  borderColor: "#463F5C1F",
                                }}>
                                <option value="">Belum ada nilai</option>
                                {gradeScale.map((g) => (
                                  <option
                                    key={g.nilai_huruf}
                                    value={g.nilai_huruf}>
                                    {g.nilai_huruf}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="submit"
                                disabled={savingMatkul}
                                className="flex-1 py-2 rounded-lg text-[12.5px] font-semibold disabled:opacity-50"
                                style={{
                                  background: C.lavender,
                                  color: "#FFFFFF",
                                }}>
                                {savingMatkul
                                  ? "Menyimpan..."
                                  : editingMatkulId
                                    ? "Simpan Perubahan"
                                    : "Tambah"}
                              </button>
                              <button
                                type="button"
                                onClick={closeMatkulForm}
                                className="flex-1 py-2 rounded-lg text-[12.5px] font-semibold"
                                style={{
                                  background: "#463F5C0f",
                                  color: C.ink,
                                }}>
                                Batal
                              </button>
                            </div>
                          </form>
                        )}

                        {!isParent && addingMatkulFor !== sem.id && (
                          <button
                            onClick={() => openAddMatkul(sem.id)}
                            className="text-[12.5px] font-semibold"
                            style={{ color: C.lavender }}>
                            + Tambah Mata Kuliah
                          </button>
                        )}

                        {!isParent && (
                          <button
                            onClick={() => handleDeleteSemester(sem.id)}
                            className="block mt-3 text-[11.5px] font-medium"
                            style={{ color: C.roseDeep }}>
                            Hapus semester ini
                          </button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {!isParent && (
            <button
              onClick={() => setShowAddSemester(true)}
              className="w-full mt-4 py-3 rounded-2xl text-[13.5px] font-semibold"
              style={{ background: "#463F5C0d", color: C.ink }}>
              + Tambah Semester
            </button>
          )}
        </>
      )}

      {/* Modal tambah semester */}
      {showAddSemester && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: "rgba(70,63,92,0.4)" }}
          onClick={() => setShowAddSemester(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-[28px] p-6 sm:p-7"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
            }}>
            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[18px] font-semibold mb-4">
              Tambah Semester
            </h3>
            <form onSubmit={handleAddSemester}>
              <label
                className="text-[11px] uppercase tracking-wide font-medium"
                style={{ color: C.inkFaint }}>
                Nama Semester
              </label>
              <input
                type="text"
                value={namaSemester}
                onChange={(e) => setNamaSemester(e.target.value)}
                placeholder="Semester 1"
                required
                className="w-full mt-1.5 mb-3 px-3.5 py-3 rounded-2xl text-[14px] outline-none border-[1.5px]"
                style={{
                  background: "#463F5C08",
                  color: C.ink,
                  borderColor: "#463F5C1F",
                }}
              />
              <label
                className="text-[11px] uppercase tracking-wide font-medium"
                style={{ color: C.inkFaint }}>
                Tahun Ajaran (opsional)
              </label>
              <input
                type="text"
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                placeholder="2026/2027"
                className="w-full mt-1.5 mb-5 px-3.5 py-3 rounded-2xl text-[14px] outline-none border-[1.5px]"
                style={{
                  background: "#463F5C08",
                  color: C.ink,
                  borderColor: "#463F5C1F",
                }}
              />
              <button
                type="submit"
                disabled={savingSemester}
                className="w-full py-3 rounded-2xl text-sm font-semibold disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                  color: "#fff",
                }}>
                {savingSemester ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddSemester(false)}
                className="w-full mt-2.5 py-3 rounded-2xl text-[13px] font-semibold"
                style={{ background: "#463F5C0f", color: C.ink }}>
                Batal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
