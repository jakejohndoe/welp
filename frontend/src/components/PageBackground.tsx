"use client";

// Subtle purple atmospheric backdrop that fades into the cream page bg.
// Echoes the /welcome hero gradient at very low opacity so inner pages feel
// like part of the same product without competing with content surfaces.
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[70vh]"
      style={{
        background:
          "radial-gradient(ellipse 90% 55% at 50% -10%, rgba(118, 75, 162, 0.10) 0%, rgba(102, 126, 234, 0.06) 28%, rgba(74, 144, 226, 0.03) 55%, transparent 80%)",
      }}
    />
  );
}
