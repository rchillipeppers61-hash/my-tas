import { C } from "./theme";
import { rupiah } from "../lib/shared";

export default function SavingsGoalItem({ goal, saldo, onDelete }) {
  const pct = Math.max(
    0,
    Math.min(100, Math.round((saldo / goal.target_amount) * 100)),
  );
  const achieved = saldo >= goal.target_amount;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[13px] mb-1">
        <span
          className="font-medium truncate flex items-center gap-1.5"
          style={{ color: C.ink }}>
          {achieved ? "🏆" : "🎯"} {goal.title}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{ color: C.inkFaint }}>
            {rupiah(Math.min(saldo, goal.target_amount))} /{" "}
            {rupiah(goal.target_amount)}
          </span>
          {onDelete && (
            <button
              onClick={() => onDelete(goal.id)}
              aria-label="Hapus target"
              className="text-[11px] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#463F5C0f", color: C.inkFaint }}>
              ✕
            </button>
          )}
        </div>
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: "#463F5C14" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: achieved
              ? `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`
              : `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
          }}
        />
      </div>
      {achieved && (
        <p
          className="text-[11px] mt-1 font-semibold"
          style={{ color: C.mintDeep }}>
          🎉 Target tercapai!
        </p>
      )}
    </div>
  );
}
