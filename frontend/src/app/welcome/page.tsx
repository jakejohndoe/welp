"use client";

import Image from "next/image";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useCallback, useEffect, useRef, useState } from "react";
import { WELP_COIN_SVG, WelpCoin } from "@/components/WelpCoin";

const GRADIENT = "linear-gradient(135deg, #667eea 0%, #5a4fcf 25%, #764ba2 50%, #6B73D1 75%, #4A90E2 100%)";
const ROTATING_WORDS = ["impact", "value", "worth", "power", "weight", "voice", "reach"];

const TRUST_BADGES = [
  {
    emoji: "\u{1F512}",
    label: "Reviews can\u2019t be deleted",
    tooltip: "All reviews are permanently stored on IPFS and recorded on-chain",
  },
  {
    emoji: "\u{1F3EA}",
    label: "Spend rewards locally",
    tooltip: "Earn WELP tokens for every review and redeem them at partner businesses",
  },
  {
    emoji: "\u{1F465}",
    label: "Community owned",
    tooltip: "No corporation controls your reviews -- the community governs the platform",
  },
];

// Coin SVG/animation primitives live in @/components/WelpCoin so the
// TxLoadingModal and this page share one source of truth.
const COIN_SVG = WELP_COIN_SVG;

// ─── Interactive coin field ───
const COIN_COUNT = 38;
const EVADE_RADIUS = 55;
const EVADE_STRENGTH = 1.5;
const RESPAWN_DELAY = 6000;

interface CoinState {
  id: number;
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
  evadeFrozen: number; // timestamp when cursor first entered radius (0 = not near)
  popping: boolean;
  popScale: number;
  popOpacity: number;
  dead: boolean;
}

function createCoin(id: number, w: number, h: number, fromEdge = false): CoinState {
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
  return {
    id,
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

function FloatingCoins() {
  const containerRef = useRef<HTMLDivElement>(null);
  const coinsRef = useRef<CoinState[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const frameRef = useRef(0);
  const nextIdRef = useRef(COIN_COUNT);
  const respawnQueue = useRef<{ time: number }[]>([]);
  const startTimeRef = useRef(0);
  // Track burst elements for cleanup
  const burstsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const _container = containerRef.current;
    if (!_container) return;
    const container = _container;
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // Initialize coins
    coinsRef.current = Array.from({ length: COIN_COUNT }, (_, i) => createCoin(i, w, h));
    startTimeRef.current = performance.now();

    // Create DOM elements for each coin
    const coinEls = new Map<number, HTMLDivElement>();

    function ensureDom(coin: CoinState) {
      if (coinEls.has(coin.id)) return coinEls.get(coin.id)!;
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.width = `${coin.size}px`;
      el.style.height = `${coin.size}px`;
      el.style.cursor = "pointer";
      el.style.willChange = "transform, opacity";
      el.innerHTML = COIN_SVG;
      const svg = el.querySelector("svg")!;
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.animation = `spin-coin ${coin.spinDuration}s linear infinite ${coin.spinReverse ? "reverse" : "normal"}`;
      el.addEventListener("click", () => popCoin(coin.id));
      container.appendChild(el);
      coinEls.set(coin.id, el);
      return el;
    }

    function popCoin(id: number) {
      const coin = coinsRef.current.find((c) => c.id === id);
      if (!coin || coin.popping || coin.dead) return;
      coin.popping = true;
      coin.popScale = 1;
      coin.popOpacity = coin.opacity;

      // Spawn burst particles
      spawnBurst(coin.x, coin.y);

      // Queue respawn
      respawnQueue.current.push({ time: performance.now() + RESPAWN_DELAY });
    }

    function spawnBurst(cx: number, cy: number) {
      const burstCount = 5;
      for (let i = 0; i < burstCount; i++) {
        const angle = (Math.PI * 2 * i) / burstCount + Math.random() * 0.3;
        const dist = 30 + Math.random() * 20;
        const dot = document.createElement("div");
        dot.style.position = "absolute";
        dot.style.width = "4px";
        dot.style.height = "4px";
        dot.style.borderRadius = "50%";
        dot.style.background = "#F5A623";
        dot.style.left = `${cx}px`;
        dot.style.top = `${cy}px`;
        dot.style.pointerEvents = "none";
        dot.style.willChange = "transform, opacity";
        dot.style.transition = "transform 0.4s ease-out, opacity 0.4s ease-out";
        container.appendChild(dot);
        burstsRef.current.push(dot);
        // Trigger animation next frame
        requestAnimationFrame(() => {
          dot.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
          dot.style.opacity = "0";
        });
        setTimeout(() => {
          dot.remove();
          burstsRef.current = burstsRef.current.filter((b) => b !== dot);
        }, 500);
      }

      // Golden ring flash
      const ring = document.createElement("div");
      ring.style.position = "absolute";
      ring.style.left = `${cx - 20}px`;
      ring.style.top = `${cy - 20}px`;
      ring.style.width = "40px";
      ring.style.height = "40px";
      ring.style.borderRadius = "50%";
      ring.style.border = "2px solid #F5A623";
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

    // Mouse tracking
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    function onMouseMove(e: MouseEvent) {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    }

    if (!isMobile) {
      window.addEventListener("mousemove", onMouseMove);
    }

    // Animation loop
    function tick() {
      const now = performance.now();
      const t = (now - startTimeRef.current) / 1000;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Handle respawns
      while (respawnQueue.current.length > 0 && respawnQueue.current[0].time <= now) {
        respawnQueue.current.shift();
        const newId = nextIdRef.current++;
        coinsRef.current.push(createCoin(newId, w, h, true));
      }

      for (let i = coinsRef.current.length - 1; i >= 0; i--) {
        const c = coinsRef.current[i];

        if (c.dead) {
          const el = coinEls.get(c.id);
          if (el) { el.remove(); coinEls.delete(c.id); }
          coinsRef.current.splice(i, 1);
          continue;
        }

        // Pop animation
        if (c.popping) {
          c.popScale += 0.08;
          c.popOpacity -= 0.06;
          if (c.popOpacity <= 0) {
            c.dead = true;
            continue;
          }
          const el = ensureDom(c);
          el.style.transform = `translate(${c.x - c.size / 2}px, ${c.y - c.size / 2}px) scale(${c.popScale})`;
          el.style.opacity = `${Math.max(0, c.popOpacity)}`;
          continue;
        }

        // Float motion
        const floatX = Math.sin(t * c.floatSpeedX + c.floatPhase) * c.floatAmpX;
        const floatY = Math.cos(t * c.floatSpeedY + c.floatPhase) * c.floatAmpY;
        let targetX = c.baseX + floatX;
        let targetY = c.baseY + floatY;

        // Mouse evade (desktop only) with brief freeze on first contact
        if (!isMobile) {
          const dx = targetX - mx;
          const dy = targetY - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EVADE_RADIUS && dist > 0) {
            if (c.evadeFrozen === 0) {
              c.evadeFrozen = now; // cursor just entered -- start freeze
            }
            // Only evade after 100ms freeze window
            if (now - c.evadeFrozen > 100) {
              const force = (1 - dist / EVADE_RADIUS) * EVADE_STRENGTH;
              targetX += (dx / dist) * force * 15;
              targetY += (dy / dist) * force * 15;
            }
          } else {
            c.evadeFrozen = 0; // cursor left radius -- reset
          }
        }

        // Smooth interpolation
        c.x += (targetX - c.x) * 0.08;
        c.y += (targetY - c.y) * 0.08;

        const el = ensureDom(c);
        el.style.transform = `translate(${c.x - c.size / 2}px, ${c.y - c.size / 2}px)`;
        el.style.opacity = `${c.opacity}`;
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
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
}

// ─── Main Welcome page ───
export default function Welcome() {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const learnMoreRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  // Rotating headline word
  const [wordIndex, setWordIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        setFadeIn(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Cursor parallax on gradient background (desktop only)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!parallaxRef.current) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 10;
    const y = (e.clientY / window.innerHeight - 0.5) * 10;
    parallaxRef.current.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) return;
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Override html/body background so no cream shows anywhere on this page
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.background;
    const prevBodyMin = body.style.minHeight;
    html.style.backgroundColor = "#5a4fcf";
    body.style.background = GRADIENT;
    body.style.minHeight = "100vh";
    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.background = prevBodyBg;
      body.style.minHeight = prevBodyMin;
    };
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Wallet connecting modal */}
      {isConnecting && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6">
            <WelpCoin size={80} animation="flip" />
            <div className="text-center">
              <p className="text-white text-lg font-semibold">Connecting your wallet...</p>
              <p className="text-white/60 text-sm mt-1">This may take a moment</p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive floating coins */}
      <div
        ref={parallaxRef}
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={{ zIndex: 1 }}
      >
        <FloatingCoins />
      </div>

      {/* Hero content */}
      <div className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-12 pb-8" style={{ zIndex: 10, pointerEvents: "none" }}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
          <span className="text-sm">{"\u{1F310}"}</span>
          <span className="text-white/90 text-sm font-medium">Community-Owned Review Platform</span>
        </div>

        {/* Headline with rotating word */}
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 leading-tight flex flex-wrap items-baseline justify-center gap-x-4">
          <span>Your opinion has</span>
          <span className="inline-block text-left" style={{ minWidth: "4.5em" }}>
            <span
              className="text-[#F5D033] inline-block transition-all duration-300"
              style={{
                opacity: fadeIn ? 1 : 0,
                transform: fadeIn ? "translateY(0)" : "translateY(8px)",
              }}
            >
              {ROTATING_WORDS[wordIndex]}.
            </span>
          </span>
        </h1>

        <p className="text-white/80 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Welp{" "}
          <span className="font-semibold text-white bg-emerald-500/30 px-1.5 py-0.5 rounded">
            rewards you
          </span>{" "}
          for honest reviews and lets you{" "}
          <span className="font-semibold text-white bg-[#F5D033]/30 px-1.5 py-0.5 rounded">
            spend those rewards
          </span>{" "}
          at local businesses in your neighborhood.
        </p>

        {/* CTA with sheen -- Enter App when connected, Connect Wallet otherwise */}
        {isConnected ? (
          <div className="flex flex-col sm:flex-row items-center gap-3" style={{ pointerEvents: "auto" }}>
            <Link
              href="/dashboard"
              className="btn-sheen px-10 py-4 rounded-xl bg-[#F5D033] hover:bg-[#E6C029] text-gray-900 text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(245,208,51,0.5)] hover:scale-[1.05]"
            >
              Enter App →
            </Link>
            <span className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            className="btn-sheen px-10 py-4 rounded-xl bg-[#F5D033] hover:bg-[#E6C029] text-gray-900 text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(245,208,51,0.5)] hover:scale-[1.05]"
            style={{ pointerEvents: "auto" }}
          >
            Connect Wallet
          </button>
        )}

        {/* Trust badges with tooltips */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-10" style={{ pointerEvents: "auto" }}>
          {TRUST_BADGES.map((badge) => (
            <div key={badge.label} className="group relative">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm cursor-default hover:-translate-y-0.5 hover:bg-white/15 transition-all duration-300">
                <span>{badge.emoji}</span>
                <span className="text-white/90 text-sm font-medium">{badge.label}</span>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                {badge.tooltip}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900/90" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works cards */}
      <div ref={learnMoreRef} className="relative px-4 sm:px-6 lg:px-8 pb-16 pt-4" style={{ zIndex: 10, pointerEvents: "none" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-5">
            How <span className="text-[#4A90E2]">Welp</span> Works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ pointerEvents: "auto" }}>
            <div className="group rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-5 text-center hover:-translate-y-1 hover:bg-white/15 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                <Image src="/icons/locationicon.png" alt="Visit" width={24} height={24} />
              </div>
              <h3 className="font-semibold text-white mb-1.5">Visit</h3>
              <p className="text-sm text-white/70">Check in at any partner business in Saint Paul and discover new local gems.</p>
            </div>

            <div className="group rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-5 text-center hover:-translate-y-1 hover:bg-white/15 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                <Image src="/icons/badgeicon-ribbon.png" alt="Review" width={24} height={24} />
              </div>
              <h3 className="font-semibold text-white mb-1.5">Review</h3>
              <p className="text-sm text-white/70">Share honest reviews stored permanently on IPFS. Your words live forever on-chain.</p>
            </div>

            <div className="group rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-5 text-center hover:-translate-y-1 hover:bg-white/15 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                <Image src="/icons/trophyicon.png" alt="Earn" width={24} height={24} />
              </div>
              <h3 className="font-semibold text-white mb-1.5">Earn</h3>
              <p className="text-sm text-white/70">Get WELP tokens for every review. Build reputation and unlock higher reward tiers.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-8 mt-4" style={{ zIndex: 10, pointerEvents: "auto" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image src="/logos/welp-logo-adblue.png" alt="welp" width={100} height={32} className="h-8 w-auto brightness-0 invert opacity-60" />
              <span className="text-white/40 text-sm">&copy; 2026 Welp</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/60 text-xs font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><path d="M12 6l-1 6h2l-1 6 4-7h-3l2-5h-3z" fill="#667eea" /></svg>
              Built on Sepolia
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-white/40 hover:text-white/70 transition-colors" aria-label="X (Twitter)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="#" className="text-white/40 hover:text-white/70 transition-colors" aria-label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
