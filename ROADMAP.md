# Meta Insights Platform - Roadmap & Status

## Overall Goal
To build a web application that automates fetching Facebook/Instagram post data, calculates engagement scores, ranks posts, and allows Online Managers (OMs) to add qualitative insights, replacing the current manual reporting process for Today's Carolinian.

## Key Technologies
- **Frontend:** Next.js (App Router), React, TypeScript
- **UI:** ShadCN/UI, Tailwind CSS
- **Backend:** Next.js API Routes (Node.js)
- **Database & Auth:** Supabase (PostgreSQL + Google OAuth)
- **Deployment:** Vercel
- **Version Control:** Git, GitHub
- **Package Manager:** pnpm (in Monorepo)
- **Commits:** Conventional Commits standard

---

## Phase 1: Foundation & Setup (Status: Not Started)
*Goal: Have a basic, deployable Next.js app shell connected to Supabase and GitHub/Vercel.*
- [ ] Set up Supabase project (Create project, enable Google Auth provider, note Project URL/Anon Key).
- [ ] Create GitHub repository (private or public).
- [ ] Initialize local Git repository & perform initial commit.
- [ ] Set up Monorepo using pnpm workspaces (e.g., `apps/web`, `packages/ui`, `packages/types`).
- [ ] Initialize Next.js app within `apps/web` (App Router, TypeScript, Tailwind).
- [ ] Integrate ShadCN/UI into `apps/web`.
- [ ] Configure environment variables (`.env.local`) in `apps/web` for Supabase URL/Anon Key.
- [ ] Create basic root layout component (`apps/web/app/layout.tsx`).
- [ ] Create Supabase client utility (`apps/web/lib/supabase/client.ts` or similar).
- [ ] Link GitHub repo to a new Vercel project.
- [ ] Perform initial deployment to Vercel to test the connection.

## Phase 2: Authentication (Status: Not Started)
*Goal: Users can securely log in/out with their university Google account via Supabase.*
- [ ] Implement Google OAuth sign-in/sign-out flow using Supabase Auth helpers (`@supabase/auth-helpers-nextjs` or equivalent).
    - [ ] Add Sign In/Sign Out buttons/UI elements.
    - [ ] Set up necessary callback routes/handlers.
    - [ ] Manage user session state (client & server).
- [ ] Configure domain whitelisting in Supabase Auth settings (e.g., `@university.edu`).
- [ ] Create examples of protected routes/pages (redirecting if not authenticated).
- [ ] Display basic user information (e.g., email) when logged in.

## Phase 3: Core Backend Logic (Status: Not Started)
*Goal: Backend can fetch data, process it (score/rank), and store/retrieve results in Supabase.*
- [ ] Define final DB schema for `social_posts` table in Supabase Studio (or using Prisma migrations if preferred later).
- [ ] Create API route (`/api/v1/meta/fetch` or similar) to fetch post data from Meta Graph API.
    - [ ] Handle Meta API authentication (User OAuth token).
    - [ ] Handle pagination if necessary.
    - [ ] Resolve critical unknown: Exact Meta API field names for metrics.
    - [ ] Resolve critical unknown: Post ID format/uniqueness.
    - [ ] Basic error handling for API calls.
- [ ] Create API route (`/api/v1/posts` or similar) for reading/writing posts to Supabase DB.
    - [ ] Implement function to `upsert` (insert or update) posts based on `post_id`.
    - [ ] Implement function to read historical posts (needed for normalization).
- [ ] Port normalization and scoring logic from `main.py` to TypeScript (likely in a utility file or service).
    - [ ] Implement Min-Max scaling function.
    - [ ] Implement weighted score calculation.
    - [ ] Implement ranking logic (handling ties).
- [ ] Create the main analysis endpoint (`/api/v1/analysis/run`).
    - [ ] Orchestrate: Fetch from Meta -> Get historical from DB -> Normalize/Score/Rank -> Save results to DB.
    - [ ] Return the ranked list of *new* posts.
- [ ] Protect relevant API routes (ensure user is authenticated).

## Phase 4: Core Frontend UI & Integration (Status: Not Started)
*Goal: Users can trigger analysis, view ranked results, and add/edit insights via the UI.*
- [ ] Build UI component (`RunAnalysisForm.tsx`?) to trigger the analysis run (e.g., button, maybe date pickers later).
    - [ ] Add API call to `/api/v1/analysis/run`.
    - [ ] Handle loading state during analysis.
- [ ] Build UI component (`ResultsTable.tsx`?) using ShadCN DataTable to display ranked results.
    - [ ] Fetch results from a new API endpoint (e.g., `/api/v1/analysis/latest` or `/api/v1/posts?period=...`).
    - [ ] Display key metrics, score, rank, permalink.
- [ ] Build UI component (`InsightEditor.tsx`?) for viewing/editing `qualitative_analysis`.
    - [ ] Likely triggered by clicking a row in the `ResultsTable`.
    - [ ] Use ShadCN Textarea.
    - [ ] Fetch existing analysis for the selected post (`/api/v1/insights/{postId}`).
    - [ ] Implement Save button/logic.
- [ ] Create API endpoint (`/api/v1/insights/{postId}`) to handle GET (fetch existing) and PUT/POST (save new) insights.
    - [ ] Update Supabase DB with analysis text, user email, and timestamp.
- [ ] Integrate components onto relevant pages.
- [ ] Ensure UI updates correctly after running analysis or saving insights.

## Phase 5: Refinement & Polish (Status: Not Started)
*Goal: A functional, reasonably polished MVP ready for internal use.*
- [ ] Improve overall styling and layout consistency.
- [ ] Enhance user experience (clearer instructions, better feedback).
- [ ] Add comprehensive loading states across the app.
- [ ] Implement user-friendly error handling and display messages (e.g., using ShadCN Toast).
- [ ] Perform thorough manual testing across different scenarios.
- [ ] Code cleanup, add comments where necessary.
- [ ] Review Supabase Row Level Security (RLS) policies if needed for extra security.
- [ ] Final deployment checks and testing on Vercel.

---

## Critical Unknowns / Blockers
*(Track items preventing progress)*
- [ ] Exact Meta Graph API field names for metrics (Views, Reach, Interactions, Link Clicks) - *Needed for Phase 3*
- [ ] Meta Graph API Post ID format/uniqueness verification (FB vs IG) - *Needed for Phase 3*
- [ ] Meta App setup and permissions approval process - *Needed for Phase 3*

## Key Decisions Made
*(Record significant choices)*
- Stack: Next.js, TypeScript, Supabase, ShadCN, Vercel
- Auth: Supabase Google OAuth with domain restriction
- DB: Supabase PostgreSQL
- Deployment: Vercel Hobby Tier
- Version Control: Git/GitHub with Conventional Commits

---
