import { C } from "./theme";

export default function Card({ children, title, sub, className = "" }) {
  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 ${className}`}
      style={{
        background: C.card,
        boxShadow:
          "0 1px 0 rgba(70,63,92,0.04), 0 12px 28px -16px rgba(70,63,92,0.22)",
      }}>
      {title && (
        <div className="mb-2">
          <h3
            className="font-semibold text-[12px] sm:text-[13px] tracking-[0.08em] uppercase"
            style={{ color: C.lavender }}>
            {title}
          </h3>
          {sub && (
            <p className="text-[12px] mt-0.5" style={{ color: C.inkFaint }}>
              {sub}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
