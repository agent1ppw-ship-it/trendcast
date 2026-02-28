# TrendCast - AI Home Services Suite

TrendCast is an end-to-end B2B SaaS platform specifically designed to automate lead generation, customer communication, and sales pipelines for home service businesses (roofers, landscapers, pressure washers, HVAC, etc.).

## 🏗 System Architecture

*   **Frontend**: Next.js 14 (App Router), Tailwind CSS, Shadcn/UI
*   **Database**: PostgreSQL via Prisma ORM
*   **Background Jobs**: BullMQ & Redis (Handles Playwright Stealth Scraping)
*   **AI Engine**: OpenAI GPT-4o Structured Outputs & Vision API
*   **Omnichannel Routing**: Twilio Webhooks (SMS) and Vapi.ai (Voice)

## 🚀 Local Deployment Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add the following:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/trendcast?schema=public"

# Redis Queue
REDIS_URL="redis://localhost:6379"

# AI
OPENAI_API_KEY="sk-proj-..."
```

### 3. Database Initialization
```bash
# Push schema to the database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed the database with mock Leads and Organizations for testing
npx tsx prisma/seed.ts
```

### 4. Run the Application
```bash
# Terminal 1: Next.js Frontend & API
npm run dev

# Terminal 2: Background Playwright Scraper Worker
npx tsx src/workers/scraper.ts
```

## 🧠 Core Feature Paths
*   **Tier 1 (SEO)**: `src/app/service/[slug]/page.tsx`
*   **Tier 2 (Scraper)**: `src/workers/scraper.ts`
*   **Tier 3 (AI SMS)**: `src/app/api/webhooks/twilio/route.ts` & `src/lib/ai/prompts.ts`
*   **Tier 4 (CRM)**: `src/app/dashboard/crm/page.tsx`
*   **Voice Handoff**: `src/app/api/webhooks/voice/route.ts`
