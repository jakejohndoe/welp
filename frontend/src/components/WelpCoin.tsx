"use client";

export const WELP_COIN_SVG = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="14.5" fill="none" stroke="#F5A623" stroke-width="1.8"/>
  <circle cx="16" cy="16" r="12" fill="none" stroke="#F5A623" stroke-width="0.6"/>
  <line x1="3.5" y1="9" x2="5" y2="10" stroke="#F5A623" stroke-width="0.5"/>
  <line x1="2.5" y1="12" x2="4" y2="12.5" stroke="#F5A623" stroke-width="0.5"/>
  <line x1="2" y1="15" x2="3.5" y2="15.5" stroke="#F5A623" stroke-width="0.5"/>
  <line x1="2.5" y1="18" x2="4" y2="18.5" stroke="#F5A623" stroke-width="0.5"/>
  <line x1="3.5" y1="21" x2="5" y2="21.5" stroke="#F5A623" stroke-width="0.5"/>
  <text x="16" y="21.5" text-anchor="middle" fill="none" stroke="#F5A623" stroke-width="1.2" font-size="14" font-weight="bold" font-family="sans-serif">W</text>
</svg>`;

type Animation = "spin" | "flip" | "none";

type Props = {
  size?: number;
  animation?: Animation;
  durationSec?: number;
};

export function WelpCoin({ size = 64, animation = "flip", durationSec = 1.5 }: Props) {
  const anim =
    animation === "spin"
      ? `spin-coin ${durationSec}s linear infinite`
      : animation === "flip"
      ? `coin-flip ${durationSec}s linear infinite`
      : undefined;
  return (
    <div
      style={{
        width: size,
        height: size,
        animation: anim,
        transformStyle: animation === "flip" ? "preserve-3d" : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: WELP_COIN_SVG }}
    />
  );
}
