<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes -- APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Build workflow

- Do NOT run `npm run build` / `next build` locally as a verification step. It hangs indefinitely in this environment (Turbopack + Next 16 issue, 12+ min observed, never completes).
- Vercel is the source of truth for builds. Push to main and watch the Vercel deploy log.
- For fast local validation before pushing, use `npx tsc --noEmit` (type check only) or `npm run lint`. Both complete in seconds.
- Only run a full local build if explicitly asked by the user, and set a hard timeout (e.g. 3 min) -- kill if it exceeds.

