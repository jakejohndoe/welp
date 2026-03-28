# Welp Security Audit Report

**Date:** 2026-03-27
**Auditor:** Automated (Slither v0.11.4) + Manual Code Review
**Contracts:** ReviewRegistry.sol, RewardsVault.sol, WelpToken.sol
**Solidity:** 0.8.20 | **Framework:** Foundry | **Network:** Sepolia Testnet

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Slither Static Analysis](#slither-static-analysis)
3. [Manual Code Review](#manual-code-review)
4. [Frontend Security Audit](#frontend-security-audit)
5. [Full App Flow Audit](#full-app-flow-audit)
6. [Recommendations](#recommendations)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 3 |
| Low | 5 |
| Informational | 6 |

The contracts are well-structured with appropriate use of OpenZeppelin's `Ownable2Step`, `Pausable`, and `ReentrancyGuard`. No critical or high-severity issues were found. The medium findings relate to design patterns that should be addressed before mainnet deployment.

---

## Slither Static Analysis

Slither analyzed 18 contracts with 100 detectors, producing 27 results. Below are the findings relevant to the Welp source contracts (OpenZeppelin library findings excluded).

### Medium: Missing Interface Inheritance

**Detector:** `missing-inheritance`
- `RewardsVault` should inherit from `IRewardsVault` (defined in ReviewRegistry.sol)
- `WelpToken` should inherit from `IWelpToken` (defined in RewardsVault.sol)

**Impact:** Without explicit inheritance, the compiler won't catch interface mismatches. If the interface changes but the implementation doesn't, calls will silently revert.

**Recommendation:** Have `RewardsVault is IRewardsVault, ...` and `WelpToken is IWelpToken, ...`.

### Medium: Block Timestamp Usage

**Detector:** `timestamp`
- `ReviewRegistry.submitReview()` uses `block.timestamp` for check-in window validation (`checkInTime == 0 || block.timestamp > checkInTime + CHECKIN_WINDOW`) and review cooldown (`lastReview != 0 && block.timestamp < lastReview + REVIEW_COOLDOWN`).

**Impact:** Miners can manipulate `block.timestamp` by ~15 seconds on PoW chains. On Sepolia/mainnet PoS, validators have less manipulation ability. Given the 24h/48h windows, this is negligible risk.

**Recommendation:** Acceptable for current use case. No action needed.

### Medium: RewardsVault.tier1Threshold Should Be Constant

**Detector:** `constable-states`
- `RewardsVault.tier1Threshold` (line 22) is never modified after deployment and should be declared `constant`.

**Impact:** Wastes a small amount of gas on every read.

**Recommendation:** Change to `int256 public constant tier1Threshold = 0;` or include it in `setTierConfig` if it should be configurable.

### Low: Naming Convention

**Detector:** `naming-convention`
- Parameters in `RewardsVault.setTierConfig()` use underscore prefix (`_tier2Threshold`, etc.) which Slither flags.

**Impact:** Style-only. No functional impact.

**Recommendation:** This is an intentional naming convention to distinguish parameters from state variables. No change needed.

### Informational: Pragma Version Diversity

**Detector:** `pragma`, `solc-version`
- OpenZeppelin uses `^0.8.20`, Welp contracts use locked `0.8.20`. Minor Solidity bugs flagged for 0.8.20 (`VerbatimInvalidDeduplication`, `FullInlinerNonExpressionSplitArgumentEvaluationOrder`, `MissingSideEffectsOnSelectorAccess`).

**Impact:** None of these bugs affect the patterns used in Welp contracts (no verbatim assembly, no complex inline functions, no `.selector` access on errors).

**Recommendation:** Consider upgrading to 0.8.24+ for mainnet to get all bug fixes. Locked pragma is good practice.

### Informational: Assembly Usage

**Detector:** `assembly`
- Only in OpenZeppelin's `StorageSlot.sol`. Not in Welp source code.

---

## Manual Code Review

### ReviewRegistry.sol

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | **Self-voting allowed** — A reviewer can upvote/downvote their own reviews. `_vote()` does not check `msg.sender != r.reviewer`. | Low | Open |
| 2 | **No check-in rate limiting** — A user can call `checkIn()` repeatedly with no cooldown, spamming `CheckedIn` events. | Low | Open |
| 3 | **Reputation can go negative** — `reputation` is `int256` and can be driven arbitrarily negative by coordinated downvoting. Consider a floor (e.g., 0). | Informational | Open |
| 4 | **Silent skip if rewardsVault not set** — `submitReview()` silently skips reward distribution if `rewardsVault == address(0)` (line 163). This means reviews submitted before vault is wired get no reward retroactively. | Informational | By Design |
| 5 | **No ipfsHash validation** — The `ipfsHash` parameter is not validated for length or format. A malicious user could pass an empty string or very long string. | Informational | Open |
| 6 | **Review data immutability** — Once submitted, reviews cannot be edited or deleted. This is intentional for on-chain integrity but means wrong/malicious content persists. | Informational | By Design |

### RewardsVault.sol

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | **Redundant RegistryNotSet check** — Line 102 checks `address(reviewRegistry) == address(0)`, but line 100 already requires `msg.sender == address(reviewRegistry)`. If registry is zero, `msg.sender` can't be zero, so this check is unreachable. | Informational | Open |
| 2 | **No reward cap / rate limiting** — Any number of rewards can be minted per block. If ReviewRegistry is compromised or a bug allows rapid review submissions, token supply inflates unchecked. | Low | Open |

### WelpToken.sol

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | **No supply cap** — `mint()` has no max supply check. Unlimited tokens can be minted. | Low | Open |
| 2 | **Clean and minimal** — Good use of `onlyRewardsVault` modifier and `Pausable`. No issues found. | — | — |

### Cross-Contract Architecture

- **Wiring is correct:** Deploy script properly connects all three contracts.
- **Ownable2Step** used everywhere — two-step ownership transfer prevents accidental loss.
- **ReentrancyGuard** on `submitReview` and `distributeReward` — prevents reentrancy between the two.
- **Pausable** on ReviewRegistry and WelpToken — owner can emergency-stop operations.

---

## Frontend Security Audit

| # | Finding | Severity |
|---|---------|----------|
| 1 | **Profile stored in localStorage** — `useProfile` stores user profile (displayName, avatar, categories) in `localStorage`. This is client-side only and easily manipulated. Not a security risk for a review platform since all meaningful data is on-chain. | Informational |
| 2 | **No input sanitization on display name** — Onboarding accepts any string up to 24 chars. Since it's only rendered in React (which auto-escapes), XSS is not a risk. | Informational |
| 3 | **Pinata JWT in NEXT_PUBLIC_ env var** — The Pinata API key is exposed to the client. Anyone can use it to upload to your Pinata account. For production, route IPFS uploads through a backend API. | Medium |
| 4 | **Placeholder IPFS hash on failure** — If Pinata upload fails, a fake hash `QmPlaceholder{timestamp}` is used. This means on-chain reviews may reference non-existent IPFS content. | Low |

---

## Full App Flow Audit

### Route: `/` (Root Redirect)
- **Status:** Working
- Correctly redirects: no wallet → `/welcome`, wallet + no profile → `/onboarding`, ready → `/dashboard`

### Route: `/welcome`
- **Status:** Working
- Connect Wallet button functions correctly
- "Learn More" scroll works
- "Get Started" button at bottom connects wallet
- Auto-redirects to `/onboarding` or `/dashboard` when wallet connects
- **Issue:** None

### Route: `/onboarding`
- **Status:** Working
- 3-step flow (name → avatar → categories) works correctly
- Progress indicator updates properly
- Back/Next navigation works
- Validation: name ≥ 2 chars, avatar required, 2-3 categories required
- "Complete Setup" saves to localStorage and redirects to `/dashboard`
- **Issue:** None

### Route: `/dashboard`
- **Status:** Working with notes
- Personalized greeting with avatar + display name: **Working** (from localStorage)
- Getting Started card: **Working** — disappears after first review (uses `hasReviewed` flag)
- Tier progress bar: **Working** — reads `reputation` from ReviewRegistry + tier thresholds from RewardsVault
- 4 stat cards: **Working** — Total Visits and Reviews Written both show review count (these are the same number since there's no separate visit tracking)
- Points Balance: **Working** — reads WELP token `balanceOf` from chain
- Recent Activity: **Working** — shows user's reviews with business names, ratings, dates
- Quick Actions: **Working** — all 4 buttons link to `/businesses` or `/feed`
- Nearby Businesses: **Working** (after off-by-one fix applied in this session)
- **Issues found:**
  - "Scan QR Code" quick action just links to `/businesses` — no QR functionality exists
  - "Settings" quick action links to `/feed` — there is no settings page
  - Nearby Businesses shows hardcoded "4.8" rating and "0.5 mi" distance — not real data
  - "Total Visits" card shows review count, not actual check-in count (no on-chain check-in counter exists)
  - "Badges: No badges yet" is hardcoded — no badge system exists

### Route: `/businesses`
- **Status:** Working (after off-by-one fix)
- Search by name/category: **Working**
- Category filter pills: **Working**
- Business cards with avatars: **Working**
- "Showing X of Y businesses" counter: **Working**
- Stars are hardcoded to 5 stars for all businesses (no average rating calculation)
- **Issue (FIXED this session):** Was querying business IDs 1-10 instead of 0-9. Cosetta's (ID 0) was missing.

### Route: `/business/[id]`
- **Status:** Working (after fixes applied this session)
- Business header card with avatar, name, category, location: **Working**
- Check In button: **Working** (calls `checkIn` on-chain)
- "Checked In ✓" state: **Working** (after `queryClient.invalidateQueries` fix)
- "Write a Review" button appears after check-in: **Working**
- Reviews section: **Working** — shows reviews with avatars, addresses, dates, ratings, vote counts
- Stars in header are hardcoded to 5 — no average calculation
- **Issue (FIXED this session):** Check-in confirmation didn't update UI. Fixed with query invalidation + `checkInConfirmed` fallback.

### Route: `/review?businessId=X&businessName=Y`
- **Status:** Working (after error handling added this session)
- Star rating picker: **Working** — hover + click + display
- Review text textarea: **Working**
- Submit flow: IPFS upload → on-chain `submitReview` → confirmation screen with confetti
- Error toasts for `NotCheckedIn`, `ReviewCooldown`, `InvalidRating`, user rejection: **Working** (added this session)
- Confirmation screen shows "You earned $1.00 WLP" — this is hardcoded, actual reward is 100 WELP tokens (100e18 wei)
- "Back to Business" button on confirmation: **Working**
- **Issues:**
  - Can navigate directly to `/review?businessId=0` without checking in — the on-chain tx will revert with proper error toast now
  - "$1.00 WLP" text is misleading — should say "100 WELP" or similar
  - No gate checking if user is checked in before showing the form

### Route: `/feed`
- **Status:** Working (after off-by-one fix)
- Reviews load newest-first: **Working**
- Business names resolve from on-chain data: **Working**
- Upvote/Downvote buttons: **Working** — calls on-chain `upvote`/`downvote`, disables after voting
- "Already voted" state persists across page loads: **Working** (reads `hasVoted` from chain)
- Reputation badges (Rep: X, Elite/Premium): **Working**
- **Issue (FIXED this session):** Business name resolution was querying IDs 1-N instead of 0-N.

### Disconnect/Reconnect Behavior
- Disconnecting wallet → navbar shows "Connect Wallet" only, nav links hidden
- Navigating to `/dashboard` while disconnected → redirects to `/welcome`
- Reconnecting → onboarding skipped if profile exists in localStorage
- **Issue:** If a user clears localStorage but keeps the same wallet, they must re-onboard (by design)

### Data Sources Summary

| Data Point | Source |
|------------|--------|
| Display name, avatar, categories | localStorage |
| WELP balance | On-chain (WelpToken.balanceOf) |
| Reputation / XP | On-chain (ReviewRegistry.reputation) |
| Tier thresholds | On-chain (RewardsVault.tier2Threshold, tier3Threshold) |
| Reviews, ratings, votes | On-chain (ReviewRegistry.reviews) |
| Business list | On-chain (ReviewRegistry.businesses) |
| Check-in status | On-chain (ReviewRegistry.lastCheckIn) |
| Star ratings on cards | Hardcoded (always 5 stars) |
| Distance on dashboard | Hardcoded ("0.5 mi") |
| Badges | Hardcoded ("No badges yet") |
| "$1.00 WLP" reward text | Hardcoded (actual: 100 WELP tokens) |
| QR code scanning | Not implemented (links to /businesses) |
| Settings page | Not implemented (links to /feed) |

---

## Recommendations

### Before Mainnet (Must Fix)
1. **Add supply cap to WelpToken** — prevent unlimited minting
2. **Route Pinata uploads through backend** — don't expose JWT to client
3. **Implement IRewardsVault/IWelpToken inheritance** — compiler-enforced interface compliance
4. **Add self-vote prevention** — `require(msg.sender != r.reviewer)` in `_vote()`

### Before Mainnet (Should Fix)
5. Add check-in rate limiting (e.g., once per hour per business)
6. Validate `ipfsHash` parameter length (min 46, max 64 chars)
7. Calculate and display actual average ratings instead of hardcoded 5 stars
8. Fix reward display text to match actual token amounts
9. Remove or implement placeholder features (QR scan, Settings, badges, distance)
10. Consider upgrading to Solidity 0.8.24+

### Nice to Have
11. Add Echidna/Foundry fuzz testing for invariants
12. Implement on-chain check-in counter for accurate "Total Visits" stat
13. Add governance or multisig for owner operations
14. Add `RewardsVaultNotSet` revert instead of silent skip in `submitReview`
