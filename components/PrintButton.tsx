"use client";

export function PrintButton({
  label = "Print / PDF",
  className = "btn primary small",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      {label}
    </button>
  );
}
