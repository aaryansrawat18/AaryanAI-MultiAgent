import { APP_NAME, LOGO_SRC } from "../constants/brand";

/**
 * Reusable AaryanAI mark.
 * @param {"sm"|"md"|"lg"} size
 * @param {boolean} withName — show wordmark beside icon
 */
export default function BrandLogo({ size = "md", withName = false, className = "" }) {
  const dims = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-14 h-14",
  }[size];

  const textSize = {
    sm: "text-[15px]",
    md: "text-[16px]",
    lg: "text-[22px]",
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={LOGO_SRC}
        alt={APP_NAME}
        className={`${dims} rounded-[10px] shadow-lg shadow-indigo-500/15 shrink-0`}
      />
      {withName && (
        <span className={`${textSize} font-semibold text-slate-100 tracking-tight`}>
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
