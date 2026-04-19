"use client";

import { useState, useEffect, useCallback } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How it works" },
  { id: "tiers", label: "Tiers & rewards" },
  { id: "design-principles", label: "Design principles" },
  { id: "architecture", label: "Architecture" },
  { id: "security", label: "Security" },
  { id: "modules", label: "Module map" },
  { id: "roadmap", label: "Roadmap" },
  { id: "contracts", label: "Contracts" },
];

const CONTRACTS = [
  {
    name: "ReviewRegistry",
    address: "0xed08ee493161Fb3eA1Fb8935271ed6E85fdD8C0C",
    note: "Reviews, votes, reputation, check-ins",
  },
  {
    name: "RewardsVault",
    address: "0xaCd596F9546A32469E4d7120593e7b54e119351B",
    note: "Tier calculation, mints WELP per review",
  },
  {
    name: "WelpToken",
    address: "0xDF76BdF11812E93f31BDF6363FE3CD1fE4078A52",
    note: "ERC-20, onlyRewardsVault can mint",
  },
  {
    name: "PriceFeed",
    address: "0xC1a5A807d0c0913BcD8635b345FFf9148EcE9dbb",
    note: "Chainlink ETH/USD, derives WELP/USD",
  },
];

const GITHUB = "https://github.com/jakejohndoe/welp";
const ETHERSCAN = (addr: string) => `https://sepolia.etherscan.io/address/${addr}`;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard unavailable -- ignore
        }
      }}
      className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
      aria-label="Copy address"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SectionHeading({ id, eyebrow, title, children }: { id: string; eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6">
      {eyebrow && (
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-primary mb-2">
          {eyebrow}
        </div>
      )}
      <h2 id={`${id}-title`} className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-fredoka)" }}>
        {title}
      </h2>
      {children && <p className="text-gray-600 leading-relaxed">{children}</p>}
    </header>
  );
}

export default function DocsPage() {
  const [active, setActive] = useState<string>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const els = SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));

    // Respect hash on initial load
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      if (SECTIONS.some((s) => s.id === id)) setActive(id);
    }

    return () => obs.disconnect();
  }, []);

  const handleAnchor = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    setDrawerOpen(false);
    history.replaceState(null, "", `#${id}`);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Mobile TOC trigger */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden mb-6 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Contents
      </button>

      <div className="lg:grid lg:grid-cols-12 lg:gap-10">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:col-span-3">
          <nav className="sticky top-28">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              On this page
            </div>
            <ul className="space-y-1 border-l border-gray-200 pl-4">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => handleAnchor(s.id, e)}
                    className={`block -ml-px border-l-2 pl-3 py-1.5 text-sm transition ${
                      active === s.id
                        ? "border-brand-primary text-brand-primary font-semibold"
                        : "border-transparent text-gray-600 hover:text-brand-primary"
                    }`}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
              <a
                href={GITHUB}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-gray-500 hover:text-brand-primary transition"
              >
                GitHub repo &rarr;
              </a>
              <a
                href="/welcome"
                className="block text-xs text-gray-500 hover:text-brand-primary transition"
              >
                Back to welp &rarr;
              </a>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="lg:col-span-9 space-y-6">
          {/* Overview */}
          <section id="overview" className="scroll-mt-28 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 sm:p-10">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-primary mb-3">
              Welp docs
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight" style={{ fontFamily: "var(--font-fredoka)" }}>
              On-chain reviews with real rewards.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              Welp is a decentralized review platform. Users check in at local businesses, publish reviews to IPFS, and earn WELP tokens for contributions that the community validates. Everything that matters lives on-chain: reviews, votes, reputation, and rewards.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              Reputation is earned from peer votes, not from self-action. Writing a review mints tokens. Votes shape whose reviews are trusted. The system is deliberately small: four contracts, a handful of state mappings, and a clear rule for every action.
            </p>

            <div className="mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Who it&apos;s for</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <li className="rounded-xl border border-gray-100 p-4">
                  <div className="font-semibold text-gray-900 mb-1">Reviewers</div>
                  <div className="text-sm text-gray-600">Share honest, permanent reviews and earn WELP for the ones that land.</div>
                </li>
                <li className="rounded-xl border border-gray-100 p-4">
                  <div className="font-semibold text-gray-900 mb-1">Businesses</div>
                  <div className="text-sm text-gray-600">A feed that can&apos;t be deleted, bought, or silently edited by a middleman.</div>
                </li>
                <li className="rounded-xl border border-gray-100 p-4">
                  <div className="font-semibold text-gray-900 mb-1">Curators</div>
                  <div className="text-sm text-gray-600">Vote gaslessly to shape reputation. No tokens, just influence over the signal.</div>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat value="4" label="Contracts on Sepolia" />
              <Stat value="96" label="Tests passing" />
              <Stat value="ERC-4337" label="Account abstraction" />
              <Stat value="Chainlink" label="Price oracle" />
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="scroll-mt-28 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 sm:p-10">
            <SectionHeading id="how-it-works" eyebrow="01" title="How it works">
              Six steps cover the full loop. Every step is either a transaction or a public read. Nothing hidden, nothing off-chain that matters.
            </SectionHeading>

            <ol className="space-y-3 mb-8">
              <FlowStep n={1} title="Connect a wallet" body="Any EVM wallet works. An ERC-4337 smart account is available so voting can be gasless." />
              <FlowStep n={2} title="Check in at a business" body="One check-in per business per hour. The check-in opens a 24-hour window to leave a review for that spot." />
              <FlowStep n={3} title="Submit a review" body="Rate 1 to 5 stars. The text is uploaded to IPFS via Pinata; the CID is stored on-chain. 48-hour cooldown per business." />
              <FlowStep n={4} title="Earn WELP tokens" body="RewardsVault reads the reviewer&apos;s current reputation, picks the tier, and mints 100 / 200 / 300 WELP." />
              <FlowStep n={5} title="Others vote on your reviews" body="Upvotes and downvotes are free. Gas is sponsored via ZeroDev paymaster. One vote per review, and it&apos;s permanent." />
              <FlowStep n={6} title="Build reputation, unlock tiers" body="+1 rep per upvote received, -1 per downvote. Cross 5 rep for Silver, 20 for Gold. Your future reviews mint more WELP." />
            </ol>

            <pre className="text-[11px] sm:text-xs bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-x-auto text-gray-700 font-mono leading-relaxed">
{`  connect  ──►  check in  ──►  review  ──►  mint WELP
                                               │
                                               ▼
                    reputation  ◄──  votes from peers`}
            </pre>
          </section>

          {/* Tiers */}
          <section id="tiers" className="scroll-mt-28 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 sm:p-10">
            <SectionHeading id="tiers" eyebrow="02" title="Tiers and rewards">
              Three tiers, one input: reputation. Crossing a threshold doesn&apos;t retroactively grant tokens -- it changes the amount of WELP your next review mints.
            </SectionHeading>

            <div className="overflow-x-auto rounded-xl border border-gray-100 mb-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Tier</th>
                    <th className="text-left px-4 py-3 font-semibold">Reputation</th>
                    <th className="text-left px-4 py-3 font-semibold">WELP per review</th>
                    <th className="text-left px-4 py-3 font-semibold">Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#A67C52]">Bronze</td>
                    <td className="px-4 py-3 text-gray-700">0 to 4</td>
                    <td className="px-4 py-3 font-mono text-gray-900">100 WELP</td>
                    <td className="px-4 py-3">🟤</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-gray-500">Silver</td>
                    <td className="px-4 py-3 text-gray-700">5 to 19</td>
                    <td className="px-4 py-3 font-mono text-gray-900">200 WELP</td>
                    <td className="px-4 py-3">🥈</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-amber-600">Gold</td>
                    <td className="px-4 py-3 text-gray-700">20+</td>
                    <td className="px-4 py-3 font-mono text-gray-900">300 WELP</td>
                    <td className="px-4 py-3">🥇</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3 text-gray-600 leading-relaxed">
              <p>
                Reputation is earned from peer votes only. Writing a review doesn&apos;t move your reputation -- it mints tokens. That separation is what keeps the reputation score meaningful: your number reflects what others think of your work, not how much you&apos;ve posted.
              </p>
              <p className="text-sm text-gray-500">
                Note: tier thresholds are owner-mutable on RewardsVault for Sepolia. A timelock is planned before any mainnet move. See the <a href="#roadmap" onClick={(e) => handleAnchor("roadmap", e)} className="text-brand-primary hover:underline">roadmap</a>.
              </p>
            </div>
          </section>

          {/* Design principles */}
          <section id="design-principles" className="scroll-mt-28 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 sm:p-10">
            <SectionHeading id="design-principles" eyebrow="03" title="Design principles">
              These are intentional choices. They shape how the system feels and why it can&apos;t be gamed the way centralized review sites are.
            </SectionHeading>

            <div className="space-y-6">
              <Principle
                title="Peer-validated reputation"
                body="Your reputation reflects community validation, not participation. You don&apos;t grind rep by posting more; you grow it by posting work other people want to back with a vote. That asymmetry is the whole point -- it makes the score mean something."
              />
              <Principle
                title="Voter as curator"
                body="Voters are unpaid moderators. Token rewards go to creators; voters get influence over reputation. Votes are gasless via account abstraction, so participation doesn&apos;t cost anything and doesn&apos;t need to be subsidized by an earnings promise that would just invite sybil farms."
              />
              <Principle
                title="Permanent votes"
                body="Once you vote, you can&apos;t change it. On-chain actions are final, and letting users flip their vote would require a directional flag plus a change-of-heart UX that dilutes the signal. If you want to vote differently, that&apos;s a separate review to vote on."
              />
              <Principle
                title="Reputation has no floor"
                body="A coordinated downvote wave can drive reputation negative. That&apos;s not a bug; it&apos;s an accountability mechanism. A capped-at-zero floor would reset bad actors for free. An int256 reputation surface is honest about the cost of earning it back."
              />
              <Principle
                title="Silent tier downgrades"
                body="Tier-up fires a celebration modal. Tier-down is silent -- the dashboard just shows the new tier. No punishment rituals, no shame UI. If the tier drops, the next review mints less WELP; that&apos;s the mechanism. A popup about it would be cruel without being useful."
              />
              <Principle
                title="No retroactive rewards"
                body="When you submit a review, the vault reads your reputation at that moment. Earning rep later doesn&apos;t upgrade an old review&apos;s payout. The contract doesn&apos;t store unrealized rewards, and users can reason about the earn-out in one direction: the score you had when you posted is what you were paid for."
              />
            </div>
          </section>

          {/* Architecture */}
          <section id="architecture" className="scroll-mt-28 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 sm:p-10">
            <SectionHeading id="architecture" eyebrow="04" title="Architecture">
              Four contracts, a Next.js frontend, and two off-chain services (Pinata for IPFS, ZeroDev for the AA bundler/paymaster). Sepolia-only for now.
            </SectionHeading>

            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Stack</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-sm">
              <li className="rounded-xl border border-gray-100 p-4">
                <div className="font-semibold text-gray-900 mb-1">Contracts</div>
                <div className="text-gray-600">Solidity 0.8.20, Foundry, OpenZeppelin (Ownable2Step, Pausable, ReentrancyGuard)</div>
              </li>
              <li className="rounded-xl border border-gray-100 p-4">
                <div className="font-semibold text-gray-900 mb-1">Frontend</div>
                <div className="text-gray-600">Next.js 16 (App Router), TypeScript, Tailwind, wagmi/viem</div>
              </li>
              <li className="rounded-xl border border-gray-100 p-4">
                <div className="font-semibold text-gray-900 mb-1">Account abstraction</div>
                <div className="text-gray-600">ZeroDev SDK, Kernel v3.1, EntryPoint v0.7, gas-sponsored votes</div>
              </li>
              <li className="rounded-xl border border-gray-100 p-4">
                <div className="font-semibold text-gray-900 mb-1">Storage &amp; oracle</div>
                <div className="text-gray-600">Pinata (IPFS pinning), Chainlink ETH/USD aggregator on Sepolia</div>
              </li>
            </ul>

            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Contract graph</h3>
            <pre className="text-[11px] sm:text-xs bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-x-auto text-gray-700 font-mono leading-relaxed mb-6">
{`     ┌────────────────────────────────────────────┐
     │             ReviewRegistry                 │
     │  reviews · votes · reputation · check-ins  │
     └──────────────────┬─────────────────────────┘
                        │ distributeReward(reviewer)
                        ▼
     ┌────────────────────────────────────────────┐
     │              RewardsVault                  │
     │     tier calculation · emits rewards       │
     └──────────────────┬─────────────────────────┘
                        │ mint(to, amount)
                        ▼
     ┌────────────────────────────────────────────┐
     │            WelpToken (ERC-20)              │
     │        only RewardsVault can mint          │
     └────────────────────────────────────────────┘

     ┌────────────────────────────────────────────┐
     │                PriceFeed                   │
     │   Chainlink ETH/USD  ─►  derived WELP/USD  │
     └────────────────────────────────────────────┘`}
            </pre>

            <p className="text-gray-600 leading-relaxed text-sm">
              The frontend reads all state via wagmi hooks and writes transactions either through the connected wallet (reviews, check-ins) or through the ZeroDev Kernel client (votes). IPFS uploads happen client-side via Pinata; the returned CID is passed to <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">submitReview</code>.
            </p>
            <p className="text-gray-500 leading-relaxed text-sm mt-3">
              Sepolia-only was a deliberate call. ZeroDev&apos;s free tier covers testnet paymasters, and shipping working AA on testnet gets M12 coverage. Base mainnet needs a paid plan or a self-funded paymaster; it&apos;s on the roadmap, not on the blocking path.
            </p>
          </section>

          {/* Security */}
          <section id="security" className="scroll-mt-28 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 sm:p-10">
            <SectionHeading id="security" eyebrow="05" title="Security">
              This section is a transparency pass, not an apology. Real protocols publish their findings. The full audit report is in <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">SECURITY.md</code>; what&apos;s below is the summary.
            </SectionHeading>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
              <Severity label="Critical" count={0} tone="gray" />
              <Severity label="High" count={0} tone="gray" />
              <Severity label="Medium" count={3} tone="amber" />
              <Severity label="Low" count={5} tone="blue" />
              <Severity label="Info" count={6} tone="gray" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-fredoka)" }}>
              Static analysis (Slither)
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              Slither v0.11.4 ran across 18 contracts with 100 detectors. 27 findings total; most land in OpenZeppelin library code. The findings on welp source are:
            </p>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li><strong className="text-gray-900">Missing interface inheritance</strong> (medium). <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">RewardsVault</code> and <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">WelpToken</code> should inherit from their declared interfaces so the compiler enforces the shape. Tracked for pre-mainnet fix.</li>
              <li><strong className="text-gray-900">Block timestamp usage</strong> (medium). Used for check-in windows and review cooldowns. Validator manipulation budget is much smaller than the 24h / 48h windows, so this is acceptable for the current use case.</li>
              <li><strong className="text-gray-900">Constable state</strong> (medium). <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">tier1Threshold</code> is never written after deploy and should be <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">constant</code>. Trivial gas win; tracked.</li>
              <li><strong className="text-gray-900">Naming convention</strong> (low). Flags underscore-prefixed parameter names. Intentional style; not changing it.</li>
              <li><strong className="text-gray-900">Pragma / solc-version</strong> (info). Locked at 0.8.20. None of the 0.8.20 compiler bugs affect the patterns used here. Upgrade to 0.8.24+ planned before mainnet.</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-fredoka)" }}>
              Access control
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100 mb-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Capability</th>
                    <th className="text-left px-4 py-3 font-semibold">Who can do it</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">WelpToken.mint</td>
                    <td className="px-4 py-3">Only RewardsVault (enforced by <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">onlyRewardsVault</code>)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">RewardsVault.distributeReward</td>
                    <td className="px-4 py-3">Only ReviewRegistry</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">RewardsVault.setTierConfig</td>
                    <td className="px-4 py-3">onlyOwner (Ownable2Step, timelock planned)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">ReviewRegistry.setRewardsVault</td>
                    <td className="px-4 py-3">onlyOwner (one-time wiring)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">Pause / unpause</td>
                    <td className="px-4 py-3">onlyOwner (emergency stop)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">Edit / delete a review</td>
                    <td className="px-4 py-3">No one. Reviews are immutable.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-fredoka)" }}>
              Reentrancy analysis
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              The only external call in the review path is <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">ReviewRegistry.submitReview</code> invoking <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">RewardsVault.distributeReward</code>, which in turn calls <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">WelpToken.mint</code>. Both entry points carry <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">nonReentrant</code>, and review state (the struct, the counter, the cooldown timestamp) is written before the vault is called. Even without the guard, the mint target is the original caller, not an attacker-controlled address; there&apos;s no callback into state that hasn&apos;t already been committed.
            </p>

            <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-fredoka)" }}>
              Manual findings
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li><strong className="text-gray-900">Self-voting allowed.</strong> A reviewer can upvote their own review. Low severity, flagged and tracked for a pre-mainnet <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">require(msg.sender != r.reviewer)</code>.</li>
              <li><strong className="text-gray-900">No check-in rate limit.</strong> A user can spam <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">checkIn</code> across businesses. The cost is their own gas; the reward loop isn&apos;t impacted. Will add a global cooldown before mainnet.</li>
              <li><strong className="text-gray-900">No supply cap on WELP.</strong> Appropriate for testnet scope. Tokenomics and a hard cap are on the roadmap.</li>
              <li><strong className="text-gray-900">Pinata JWT on the client.</strong> NEXT_PUBLIC_ exposure is a medium-severity issue that gets fixed by routing uploads through a backend endpoint in v2.1. For the Sepolia scope, the attack is &quot;use Jake&apos;s Pinata quota&quot;, not &quot;compromise review integrity&quot;.</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-fredoka)" }}>
              Known limitations (by design)
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><strong className="text-gray-900">Reputation can go negative.</strong> Intentional. See <a href="#design-principles" onClick={(e) => handleAnchor("design-principles", e)} className="text-brand-primary hover:underline">design principles</a>.</li>
              <li><strong className="text-gray-900">Votes cannot be flipped.</strong> Intentional. A single <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">hasVoted</code> boolean, not a direction flag.</li>
              <li><strong className="text-gray-900">No supply cap.</strong> Testnet scope. Cap and emission schedule are part of the tokenomics v1 milestone.</li>
              <li><strong className="text-gray-900">Owner can change tier config.</strong> Centralized for Sepolia. Timelock before decentralizing.</li>
            </ul>
          </section>

          {/* Modules */}
          <section id="modules" className="scroll-mt-28 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 sm:p-10">
            <SectionHeading id="modules" eyebrow="06" title="Module map (M1 - M16)">
              Where each Metana Solidity Bootcamp module shows up in the welp codebase.
            </SectionHeading>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Module</th>
                    <th className="text-left px-4 py-3 font-semibold">Topic</th>
                    <th className="text-left px-4 py-3 font-semibold">Where in welp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                  <tr>
                    <td className="px-4 py-3 font-semibold">M1 - M2</td>
                    <td className="px-4 py-3">Solidity fundamentals, Foundry tooling</td>
                    <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">contracts/</code> suite, 96/96 tests</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M3</td>
                    <td className="px-4 py-3">Smart contract security</td>
                    <td className="px-4 py-3">Access control, custom errors, <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">SECURITY.md</code></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M4</td>
                    <td className="px-4 py-3">Tokens + IPFS</td>
                    <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">WelpToken.sol</code> (ERC-20), Pinata IPFS integration</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M5</td>
                    <td className="px-4 py-3">Frontend dApp</td>
                    <td className="px-4 py-3">Next.js 16 + wagmi + viem + WalletConnect</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M6</td>
                    <td className="px-4 py-3">Reentrancy + gas</td>
                    <td className="px-4 py-3">Reentrancy guards, custom errors, storage packing</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M7</td>
                    <td className="px-4 py-3">Governance-adjacent</td>
                    <td className="px-4 py-3">Tier-based reputation system</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M8</td>
                    <td className="px-4 py-3">Vault mechanics</td>
                    <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">RewardsVault.sol</code>, <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">distributeReward</code>, tier config</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M9</td>
                    <td className="px-4 py-3">DeFi rewards</td>
                    <td className="px-4 py-3">Reputation-weighted WELP emissions</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M10</td>
                    <td className="px-4 py-3">Base L2 deploy</td>
                    <td className="px-4 py-3">Deferred -- see <a href="#roadmap" onClick={(e) => handleAnchor("roadmap", e)} className="text-brand-primary hover:underline">roadmap</a></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M11</td>
                    <td className="px-4 py-3">Gas optimization + Slither</td>
                    <td className="px-4 py-3">Slither report in <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">SECURITY.md</code>, gas optimizations</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M12</td>
                    <td className="px-4 py-3">Account Abstraction (ERC-4337)</td>
                    <td className="px-4 py-3">ZeroDev Kernel v3.1, gasless upvote/downvote</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M13</td>
                    <td className="px-4 py-3">Chainlink oracle</td>
                    <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">PriceFeed.sol</code>, ETH/USD aggregator, WELP/USD derivation</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M14</td>
                    <td className="px-4 py-3">Static analysis</td>
                    <td className="px-4 py-3">Slither integration, manual review</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">M15 - M16</td>
                    <td className="px-4 py-3">Final capstone + eval</td>
                    <td className="px-4 py-3">sepolia.welp.network deploy, <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/docs</code> route, demo walkthrough</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Roadmap */}
          <section id="roadmap" className="scroll-mt-28 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 sm:p-10">
            <SectionHeading id="roadmap" eyebrow="07" title="What&rsquo;s next">
              Features and hardening the current scope deliberately leaves for later. Nothing here blocks the core loop; each item upgrades it.
            </SectionHeading>

            <ul className="space-y-4">
              <RoadmapItem
                title="Soulbound tier NFTs (ERC-5114)"
                body="Mint a non-transferable badge when a user crosses into Silver or Gold. Permanent proof-of-tier that survives rep drops, without reintroducing the WELP floor."
              />
              <RoadmapItem
                title="WELP to NFT swap"
                body="Burn WELP to mint soulbound collectibles. Creates a token sink so the supply isn&apos;t purely emission-dominant, and gives the unlimited-mint testnet era an exit ramp."
              />
              <RoadmapItem
                title="Mini-game coin collect"
                body="Gamified reward-claim UI. The existing floating coin field on /welcome is the starting point -- clickable reward capsules that resolve to a batched on-chain claim."
              />
              <RoadmapItem
                title="Batched AA transactions"
                body="Check-in + review + upvote in a single UserOp. The AA infra is already wired; batching is a client change on top of ZeroDev Kernel&apos;s multicall support."
              />
              <RoadmapItem
                title="Base L2 deployment"
                body="Covers M10. Needs either a paid ZeroDev plan or a self-funded paymaster deployed on Base. Contracts themselves are chain-agnostic."
              />
              <RoadmapItem
                title="Hard supply cap and emission schedule"
                body="Tokenomics v1. Cap on total WELP, a mint schedule tied to active users or time, and a published curve instead of unbounded issuance."
              />
              <RoadmapItem
                title="Admin timelock"
                body="Owner actions on RewardsVault (tier thresholds, reward amounts) go through a timelock. Users see changes coming before they take effect. Decentralizes the trusted-owner assumption the testnet deploy carries."
              />
            </ul>
          </section>

          {/* Contracts */}
          <section id="contracts" className="scroll-mt-28 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 sm:p-10">
            <SectionHeading id="contracts" eyebrow="08" title="Contracts">
              Deployed on Sepolia. Copy the address or open it on Etherscan.
            </SectionHeading>

            <ul className="space-y-3 mb-8">
              {CONTRACTS.map((c) => (
                <li key={c.address} className="rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500 mb-1">{c.note}</div>
                    <div className="font-mono text-xs text-gray-700 break-all">{c.address}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyButton value={c.address} />
                    <a
                      href={ETHERSCAN(c.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-2 py-1 rounded-md bg-brand-primary hover:bg-brand-hover text-white transition"
                    >
                      Etherscan &rarr;
                    </a>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={GITHUB}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                View source on GitHub
              </a>
              <a
                href="/welcome"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition"
              >
                Try welp
              </a>
            </div>
          </section>
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white p-6 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                On this page
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <ul className="space-y-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => handleAnchor(s.id, e)}
                    className={`block px-3 py-2 rounded-lg text-sm transition ${
                      active === s.id
                        ? "text-brand-primary bg-blue-50 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 text-center">
      <div className="text-xl sm:text-2xl font-bold text-brand-primary" style={{ fontFamily: "var(--font-fredoka)" }}>
        {value}
      </div>
      <div className="text-[11px] sm:text-xs text-gray-500 mt-1 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function FlowStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-gray-100 p-4 flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-brand-primary text-white font-bold text-sm flex items-center justify-center">
        {n}
      </div>
      <div>
        <div className="font-semibold text-gray-900 mb-0.5">{title}</div>
        <div className="text-sm text-gray-600">{body}</div>
      </div>
    </li>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-brand-primary pl-4">
      <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-fredoka)" }}>
        {title}
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function Severity({ label, count, tone }: { label: string; count: number; tone: "gray" | "amber" | "blue" }) {
  const tones = {
    gray: "bg-gray-50 text-gray-700 border-gray-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
    blue: "bg-blue-50 text-blue-800 border-blue-100",
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${tones[tone]}`}>
      <div className="text-xl font-bold" style={{ fontFamily: "var(--font-fredoka)" }}>
        {count}
      </div>
      <div className="text-[11px] uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}

function RoadmapItem({ title, body }: { title: string; body: string }) {
  return (
    <li className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-6 h-6 rounded-full bg-blue-50 text-brand-primary flex items-center justify-center mt-0.5" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>
        <div>
          <div className="font-semibold text-gray-900 mb-1">{title}</div>
          <div className="text-sm text-gray-600 leading-relaxed">{body}</div>
        </div>
      </div>
    </li>
  );
}
