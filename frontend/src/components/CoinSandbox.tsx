"use client";

import { useEffect, useRef } from "react";
import { WELP_COIN_SVG } from "@/components/WelpCoin";

const COIN_SVG = WELP_COIN_SVG;

const EVADE_RADIUS = 55;
const EVADE_STRENGTH = 1.5;
const BOMB_ATTRACT_MULT = -2.0;
const RESPAWN_DELAY = 6000;
const BOMB_SPAWN_RATE = 0.08;

export type CoinKind = "coin" | "bomb";

interface CoinState {
  id: number;
  kind: CoinKind;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  spinDuration: number;
  spinReverse: boolean;
  floatPhase: number;
  floatSpeedX: number;
  floatSpeedY: number;
  floatAmpX: number;
  floatAmpY: number;
  evadeFrozen: number;
  popping: boolean;
  popScale: number;
  popOpacity: number;
  dead: boolean;
}

function createCoin(id: number, w: number, h: number, fromEdge = false, allowBombs = false): CoinState {
  let x: number, y: number;
  if (fromEdge) {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = Math.random() * w; y = -30; }
    else if (edge === 1) { x = w + 30; y = Math.random() * h; }
    else if (edge === 2) { x = Math.random() * w; y = h + 30; }
    else { x = -30; y = Math.random() * h; }
  } else {
    x = Math.random() * w;
    y = Math.random() * h;
  }
  const kind: CoinKind = allowBombs && Math.random() < BOMB_SPAWN_RATE ? "bomb" : "coin";
  return {
    id,
    kind,
    x, y,
    baseX: x, baseY: y,
    vx: 0, vy: 0,
    size: 16 + Math.random() * 16,
    opacity: 0.25 + Math.random() * 0.15,
    spinDuration: 15 + Math.random() * 10,
    spinReverse: Math.random() > 0.5,
    floatPhase: Math.random() * Math.PI * 2,
    floatSpeedX: 0.2 + Math.random() * 0.3,
    floatSpeedY: 0.15 + Math.random() * 0.25,
    floatAmpX: 15 + Math.random() * 25,
    floatAmpY: 10 + Math.random() * 20,
    evadeFrozen: 0,
    popping: false,
    popScale: 1,
    popOpacity: 1,
    dead: false,
  };
}

export interface CoinSandboxProps {
  width?: number | string;
  height?: number | string;
  count?: number;
  onPop?: (coinId: number, kind: CoinKind) => void;
  paused?: boolean;
  /**
   * When true, the sandbox renders its own width/height wrapper with
   * overflow:hidden so coins are clipped to the box. When false the
   * sandbox is `absolute inset-0` and fills whatever parent it's placed
   * in -- used on /welcome where the parent is `fixed inset-0` over the
   * full viewport.
   */
  bounded?: boolean;
  /**
   * Multiplier applied to each coin's rendered opacity (clamped to 1).
   * Default 1 preserves original welcome-page behavior. /minigame passes
   * 2.5 to make coins pop visually for the clicking game.
   */
  opacityBoost?: number;
  /**
   * When true, spawned coins have a chance of being bombs (8%).
   * Default false keeps the welcome page bomb-free.
   */
  enableBombs?: boolean;
}

/**
 * Interactive field of floating WELP coins with cursor-evade, click-to-pop,
 * and respawn. Extracted from /welcome so /minigame can reuse the animation
 * and hook up `onPop` for scoring. Animation behavior is identical to the
 * original welcome-page implementation -- just relocated.
 */
export function CoinSandbox({
  width,
  height,
  count = 38,
  onPop,
  paused = false,
  bounded = false,
  opacityBoost = 1,
  enableBombs = false,
}: CoinSandboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const coinsRef = useRef<CoinState[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const frameRef = useRef(0);
  const nextIdRef = useRef(count);
  const respawnQueue = useRef<{ time: number }[]>([]);
  const startTimeRef = useRef(0);
  const burstsRef = useRef<HTMLDivElement[]>([]);
  const pausedRef = useRef(paused);
  const onPopRef = useRef(onPop);
  const opacityBoostRef = useRef(opacityBoost);
  const enableBombsRef = useRef(enableBombs);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onPopRef.current = onPop; }, [onPop]);
  useEffect(() => { opacityBoostRef.current = opacityBoost; }, [opacityBoost]);
  useEffect(() => { enableBombsRef.current = enableBombs; }, [enableBombs]);

  useEffect(() => {
    const _container = containerRef.current;
    if (!_container) return;
    const container = _container;
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    coinsRef.current = Array.from({ length: count }, (_, i) =>
      createCoin(i, w, h, false, enableBombsRef.current)
    );
    startTimeRef.current = performance.now();
    nextIdRef.current = count;

    const coinEls = new Map<number, HTMLDivElement>();

    function renderOpacity(raw: number): number {
      return Math.min(1, Math.max(0, raw) * opacityBoostRef.current);
    }

    function ensureDom(coin: CoinState) {
      if (coinEls.has(coin.id)) return coinEls.get(coin.id)!;
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.width = `${coin.size}px`;
      el.style.height = `${coin.size}px`;
      el.style.cursor = "pointer";
      el.style.pointerEvents = "auto";
      el.style.willChange = "transform, opacity";
      if (coin.kind === "bomb") {
        el.style.fontSize = `${coin.size}px`;
        el.style.lineHeight = `${coin.size}px`;
        el.style.textAlign = "center";
        el.style.userSelect = "none";
        // Body font (Nunito) is Latin-subset only; explicit emoji stack
        // ensures 💣 renders instead of falling through to a missing glyph.
        el.style.fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", emoji, sans-serif';
        el.textContent = "\u{1F4A3}";
      } else {
        el.innerHTML = COIN_SVG;
        const svg = el.querySelector("svg")!;
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.animation = `spin-coin ${coin.spinDuration}s linear infinite ${coin.spinReverse ? "reverse" : "normal"}`;
      }
      el.addEventListener("click", () => popCoin(coin.id));
      container.appendChild(el);
      coinEls.set(coin.id, el);
      return el;
    }

    function popCoin(id: number) {
      const coin = coinsRef.current.find((c) => c.id === id);
      if (!coin || coin.popping || coin.dead) return;
      onPopRef.current?.(id, coin.kind);
      coin.popping = true;
      coin.popScale = 1;
      coin.popOpacity = coin.opacity;

      spawnBurst(coin.x, coin.y, coin.kind);

      if (!pausedRef.current) {
        respawnQueue.current.push({ time: performance.now() + RESPAWN_DELAY });
      }
    }

    function spawnBurst(cx: number, cy: number, kind: CoinKind) {
      const color = kind === "bomb" ? "#EF4444" : "#F5A623";
      const burstCount = kind === "bomb" ? 8 : 5;
      for (let i = 0; i < burstCount; i++) {
        const angle = (Math.PI * 2 * i) / burstCount + Math.random() * 0.3;
        const dist = 30 + Math.random() * 20;
        const dot = document.createElement("div");
        dot.style.position = "absolute";
        dot.style.width = "4px";
        dot.style.height = "4px";
        dot.style.borderRadius = "50%";
        dot.style.background = color;
        dot.style.left = `${cx}px`;
        dot.style.top = `${cy}px`;
        dot.style.pointerEvents = "none";
        dot.style.willChange = "transform, opacity";
        dot.style.transition = "transform 0.4s ease-out, opacity 0.4s ease-out";
        container.appendChild(dot);
        burstsRef.current.push(dot);
        requestAnimationFrame(() => {
          dot.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
          dot.style.opacity = "0";
        });
        setTimeout(() => {
          dot.remove();
          burstsRef.current = burstsRef.current.filter((b) => b !== dot);
        }, 500);
      }

      const ring = document.createElement("div");
      ring.style.position = "absolute";
      ring.style.left = `${cx - 20}px`;
      ring.style.top = `${cy - 20}px`;
      ring.style.width = "40px";
      ring.style.height = "40px";
      ring.style.borderRadius = "50%";
      ring.style.border = `2px solid ${color}`;
      ring.style.pointerEvents = "none";
      ring.style.willChange = "transform, opacity";
      ring.style.transition = "transform 0.35s ease-out, opacity 0.35s ease-out";
      container.appendChild(ring);
      burstsRef.current.push(ring);
      requestAnimationFrame(() => {
        ring.style.transform = "scale(2.5)";
        ring.style.opacity = "0";
      });
      setTimeout(() => {
        ring.remove();
        burstsRef.current = burstsRef.current.filter((b) => b !== ring);
      }, 400);
    }

    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    function onMouseMove(e: MouseEvent) {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    }

    if (!isMobile) {
      window.addEventListener("mousemove", onMouseMove);
    }

    function tick() {
      const now = performance.now();
      const t = (now - startTimeRef.current) / 1000;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      if (!pausedRef.current) {
        while (respawnQueue.current.length > 0 && respawnQueue.current[0].time <= now) {
          respawnQueue.current.shift();
          const newId = nextIdRef.current++;
          coinsRef.current.push(createCoin(newId, w, h, true, enableBombsRef.current));
        }
      }

      for (let i = coinsRef.current.length - 1; i >= 0; i--) {
        const c = coinsRef.current[i];

        if (c.dead) {
          const el = coinEls.get(c.id);
          if (el) { el.remove(); coinEls.delete(c.id); }
          coinsRef.current.splice(i, 1);
          continue;
        }

        if (c.popping) {
          c.popScale += 0.08;
          c.popOpacity -= 0.06;
          if (c.popOpacity <= 0) {
            c.dead = true;
            continue;
          }
          const el = ensureDom(c);
          el.style.transform = `translate(${c.x - c.size / 2}px, ${c.y - c.size / 2}px) scale(${c.popScale})`;
          el.style.opacity = `${renderOpacity(c.popOpacity)}`;
          continue;
        }

        const floatX = Math.sin(t * c.floatSpeedX + c.floatPhase) * c.floatAmpX;
        const floatY = Math.cos(t * c.floatSpeedY + c.floatPhase) * c.floatAmpY;
        let targetX = c.baseX + floatX;
        let targetY = c.baseY + floatY;

        if (!isMobile) {
          const dx = targetX - mx;
          const dy = targetY - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EVADE_RADIUS && dist > 0) {
            if (c.evadeFrozen === 0) {
              c.evadeFrozen = now;
            }
            if (now - c.evadeFrozen > 100) {
              const force = (1 - dist / EVADE_RADIUS) * EVADE_STRENGTH;
              const strengthMult = c.kind === "bomb" ? BOMB_ATTRACT_MULT : 1;
              targetX += (dx / dist) * force * 15 * strengthMult;
              targetY += (dy / dist) * force * 15 * strengthMult;
            }
          } else {
            c.evadeFrozen = 0;
          }
        }

        c.x += (targetX - c.x) * 0.08;
        c.y += (targetY - c.y) * 0.08;

        const el = ensureDom(c);
        el.style.transform = `translate(${c.x - c.size / 2}px, ${c.y - c.size / 2}px)`;
        el.style.opacity = `${renderOpacity(c.opacity)}`;
      }

      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (!isMobile) window.removeEventListener("mousemove", onMouseMove);
      coinEls.forEach((el) => el.remove());
      coinEls.clear();
      burstsRef.current.forEach((b) => b.remove());
      burstsRef.current = [];
    };
  }, [count]);

  if (bounded) {
    return (
      <div
        ref={containerRef}
        className="relative"
        style={{ width, height, overflow: "hidden", pointerEvents: "none" }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
