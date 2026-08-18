import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { C, FONT_IMPORT } from "../../lib/theme";
import { Card } from "../../components/ui";
import { kedalamanMeta } from "./constants";

// ============================================================
// StudyPackDetailPage — nampilin hasil Study Pack sebagai "modul
// belajar", bukan chat panjang. Data diterima lewat navigate state
// (belum ada persistensi/ID di Fase 1 -- makanya kalau halaman ini
// di-refresh langsung, state-nya hilang & balik ke list).
// ============================================================
export default function StudyPackDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const studyPack = location.state?.studyPack;

  if (!studyPack) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 text-center">
        <style>{FONT_IMPORT}</style>
        <p className="text-[13.5px] mb-4" style={{ color: C.inkFaint }}>
          Study Pack gak ditemukan (mungkin halaman ke-refresh).
        </p>
        <button
          onClick={() => navigate("/akademik/persiapan")}
          className="px-4 py-2.5 rounded-2xl font-semibold text-[13px]"
          style={{ background: C.mintDeep, color: "#FFFFFF" }}>
          Kembali ke Persiapan
        </button>
      </div>
    );
  }

  const k = kedalamanMeta(studyPack.kedalaman);

  return (
    <div
      className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-16"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <button
        onClick={() => navigate("/akademik/persiapan")}
        className="text-[12.5px] font-semibold mb-4"
        style={{ color: C.inkFaint }}>
        ← Persiapan Kuliah
      </button>

      {/* Header */}
      <div className="mb-5">
        <p
          className="text-[11.5px] font-bold mb-1"
          style={{ color: C.mintDeep }}>
          {studyPack.mataKuliah}
        </p>
        <h1
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-[21px] sm:text-[25px] font-semibold leading-tight mb-2">
          {studyPack.topik}
        </h1>
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "#8FD8BE22", color: C.mintDeep }}>
          {k.icon} {k.label}
        </span>
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-2.5 rounded-2xl px-4 py-3 mb-6"
        style={{ background: "#F6C4531F", border: "1.5px solid #F6C45355" }}>
        <span className="text-[15px] flex-shrink-0">ℹ️</span>
        <p
          className="text-[11.5px] font-medium leading-relaxed"
          style={{ color: C.amberDeep }}>
          {studyPack.disclaimer}
        </p>
      </div>

      <div className="space-y-4">
        <Section icon="🎯" title="Learning Objectives" accent={C.lavender}>
          <ul className="space-y-2">
            {studyPack.objectives.map((o, i) => (
              <li
                key={i}
                className="flex gap-2 text-[13.5px] leading-relaxed"
                style={{ color: C.inkSoft }}>
                <span style={{ color: C.lavender }}>•</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon="📖" title="Materi Lengkap" accent={C.skyDeep}>
          <div className="space-y-4">
            {studyPack.materi.map((m, i) => (
              <div key={i}>
                <h4
                  className="text-[14px] font-bold mb-1.5"
                  style={{ color: C.ink, fontFamily: "'Fraunces', serif" }}>
                  {m.heading}
                </h4>
                <p
                  className="text-[13.5px] leading-relaxed"
                  style={{ color: C.inkSoft }}>
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon="📌" title="Key Concepts" accent={C.roseDeep}>
          <div className="space-y-2.5">
            {studyPack.keyConcepts.map((kc, i) => (
              <div
                key={i}
                className="rounded-xl px-3.5 py-2.5"
                style={{ background: "#463F5C08" }}>
                <p
                  className="text-[13px] font-bold mb-0.5"
                  style={{ color: C.ink }}>
                  {kc.term}
                </p>
                <p
                  className="text-[12.5px] leading-relaxed"
                  style={{ color: C.inkSoft }}>
                  {kc.def}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon="💡" title="Contoh & Studi Kasus" accent={C.amberDeep}>
          <div className="space-y-3">
            {studyPack.contohKasus.map((c, i) => (
              <div key={i}>
                <p
                  className="text-[13.5px] font-bold mb-1"
                  style={{ color: C.ink }}>
                  {c.title}
                </p>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: C.inkSoft }}>
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          icon="❓"
          title="Kemungkinan Pertanyaan Dosen"
          accent={C.lavender}>
          <ul className="space-y-2.5">
            {studyPack.pertanyaanDosen.map((q, i) => (
              <li
                key={i}
                className="text-[13.5px] leading-relaxed italic"
                style={{ color: C.inkSoft }}>
                "{q}"
              </li>
            ))}
          </ul>
        </Section>

        <Section
          icon="⚡"
          title="Quick Review"
          accent={C.mintDeep}
          tint="#8FD8BE1A">
          <p
            className="text-[13.5px] leading-relaxed font-medium"
            style={{ color: C.ink }}>
            {studyPack.quickReview}
          </p>
        </Section>

        <QuizSection quiz={studyPack.quiz} />

        <UjiPemahamanSection items={studyPack.ujiPemahaman} />
      </div>
    </div>
  );
}

function Section({ icon, title, accent, tint, children }) {
  return (
    <Card tint={tint} title={`${icon}  ${title}`} accent={accent}>
      {children}
    </Card>
  );
}

// ------------------------------------------------------------
// Quiz — 5-10 soal MCQ, jawab lalu langsung keliatan bener/salah +
// pembahasan. Skor dihitung dari state lokal (Fase 1: gak disimpen).
// ------------------------------------------------------------
function QuizSection({ quiz }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function pick(qid, idx) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qid]: idx }));
  }

  const allAnswered = quiz.every((q) => answers[q.id] !== undefined);
  const score = submitted
    ? quiz.filter((q) => answers[q.id] === q.correctIndex).length
    : null;

  return (
    <Card title="📝  Quiz" accent={C.roseDeep}>
      {submitted && (
        <div
          className="rounded-2xl px-4 py-3 mb-4 text-center"
          style={{ background: "#8FD8BE22" }}>
          <p
            className="text-[20px] font-bold"
            style={{ color: C.mintDeep, fontFamily: "'Fraunces', serif" }}>
            {score}/{quiz.length}
          </p>
          <p
            className="text-[11.5px] font-medium"
            style={{ color: C.mintDeep }}>
            jawaban benar
          </p>
        </div>
      )}

      <div className="space-y-5">
        {quiz.map((q, qi) => {
          const selected = answers[q.id];
          return (
            <div key={q.id}>
              <p
                className="text-[13.5px] font-semibold mb-2"
                style={{ color: C.ink }}>
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isSelected = selected === oi;
                  const isCorrect = oi === q.correctIndex;
                  let bg = "#463F5C08";
                  let borderColor = "#463F5C1F";
                  let textColor = C.inkSoft;
                  if (submitted) {
                    if (isCorrect) {
                      bg = "#8FD8BE22";
                      borderColor = C.mintDeep;
                      textColor = C.mintDeep;
                    } else if (isSelected && !isCorrect) {
                      bg = "#F4A6B71F";
                      borderColor = C.roseDeep;
                      textColor = C.roseDeep;
                    }
                  } else if (isSelected) {
                    bg = "#8B72C41A";
                    borderColor = C.lavender;
                    textColor = C.lavender;
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => pick(q.id, oi)}
                      disabled={submitted}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium transition-colors"
                      style={{
                        background: bg,
                        border: `1.5px solid ${borderColor}`,
                        color: textColor,
                      }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p
                  className="text-[11.5px] mt-2 leading-relaxed"
                  style={{ color: C.inkFaint }}>
                  💬 {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!allAnswered}
          className="w-full mt-5 py-3 rounded-2xl font-bold text-[13.5px] disabled:opacity-50"
          style={{ background: C.roseDeep, color: "#FFFFFF" }}>
          Cek Jawaban
        </button>
      )}
      {submitted && (
        <button
          onClick={() => {
            setAnswers({});
            setSubmitted(false);
          }}
          className="w-full mt-5 py-3 rounded-2xl font-bold text-[13.5px]"
          style={{ background: "#463F5C0f", color: C.ink }}>
          🔄 Ulangi Quiz
        </button>
      )}
    </Card>
  );
}

// ------------------------------------------------------------
// Uji Pemahaman — pertanyaan satu-per-satu, user jawab bebas,
// feedback muncul, lanjut ke soal berikutnya. Fase 1: feedback
// masih teks statis dari dummy data (bukan AI yang baca jawaban
// user beneran) -- Fase 5 baru diganti panggilan AI asli.
// ------------------------------------------------------------
function UjiPemahamanSection({ items }) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [done, setDone] = useState(false);

  const current = items[step];
  const isLast = step === items.length - 1;

  function submitAnswer() {
    if (!answer.trim()) return;
    setShowFeedback(true);
  }

  function next() {
    if (isLast) {
      setDone(true);
      return;
    }
    setStep((s) => s + 1);
    setAnswer("");
    setShowFeedback(false);
  }

  function restart() {
    setStep(0);
    setAnswer("");
    setShowFeedback(false);
    setDone(false);
  }

  return (
    <Card title="🎤  Uji Pemahaman" accent={C.lavender}>
      <p className="text-[12px] mb-4" style={{ color: C.inkFaint }}>
        Jawab pertanyaan satu-satu pakai kata-kata sendiri, nanti dikasih
        feedback.
      </p>

      {done ? (
        <div className="text-center py-4">
          <p className="text-[28px] mb-1">🎉</p>
          <p
            className="text-[13.5px] font-semibold mb-3"
            style={{ color: C.ink }}>
            Selesai! Kamu udah jawab semua pertanyaan.
          </p>
          <button
            onClick={restart}
            className="px-4 py-2.5 rounded-2xl font-semibold text-[12.5px]"
            style={{ background: "#463F5C0f", color: C.ink }}>
            🔄 Ulangi
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            {items.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{ background: i <= step ? C.lavender : "#463F5C14" }}
              />
            ))}
          </div>

          <p
            className="text-[13.5px] font-semibold mb-3"
            style={{ color: C.ink }}>
            {current.question}
          </p>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={showFeedback}
            placeholder="Tulis jawabanmu di sini..."
            rows={3}
            className="w-full px-3.5 py-3 rounded-2xl text-[13.5px] outline-none border-[1.5px] resize-none mb-3 focus:ring-4 focus:ring-[#8B72C42A]"
            style={{
              background: "#463F5C08",
              color: C.ink,
              borderColor: "#463F5C1F",
            }}
          />

          {showFeedback && (
            <div
              className="rounded-2xl px-3.5 py-3 mb-3"
              style={{ background: "#8B72C41A" }}>
              <p
                className="text-[11px] font-bold mb-1"
                style={{ color: C.lavender }}>
                💬 Feedback
              </p>
              <p
                className="text-[12.5px] leading-relaxed"
                style={{ color: C.ink }}>
                {current.feedback}
              </p>
            </div>
          )}

          {!showFeedback ? (
            <button
              onClick={submitAnswer}
              disabled={!answer.trim()}
              className="w-full py-3 rounded-2xl font-bold text-[13.5px] disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                color: "#FFFFFF",
              }}>
              Kirim Jawaban
            </button>
          ) : (
            <button
              onClick={next}
              className="w-full py-3 rounded-2xl font-bold text-[13.5px]"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                color: "#FFFFFF",
              }}>
              {isLast ? "Selesai" : "Pertanyaan Berikutnya →"}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
