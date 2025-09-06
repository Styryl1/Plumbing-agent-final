# 🚀 Netherlands Plumber SaaS - Emergency Dispatch Platform

Transform "oh fuck, I need a plumber" → "let me book one in 30 seconds"

**Target Market**: Netherlands (Amsterdam → Rotterdam → Utrecht)  
**Stack**: T3 + Supabase + Clerk + Mollie + Playwright + Expert Agents  

> 📊 **Status & Progress**: [PROJECT_STATUS.md](./Docs/PROJECT_STATUS.md)  
> 🛠 **Development Guide**: [CLAUDE.md](./CLAUDE.md) 

---

## 🚀 Quick Start

**Requires Node 22.18.0**

```bash
# Setup
nvm use 22.18.0
corepack enable && corepack prepare pnpm@latest --activate

# Install and run
git clone <repo> && cd plumbing-agent
pnpm install
pnpm dev
```

**Development Commands:**
- `pnpm check` - Quick typecheck
- `pnpm guard` - Complete validation 
- `pnpm context` - Bundle for ChatGPT

---

## 🏗 Architecture

**Tech Stack**: Next.js 15 + React 19 + TypeScript + tRPC + Supabase + Clerk + Schedule-X + shadcn/ui

**Structure**: App Router architecture with `~/` import aliases, strict TypeScript, Dutch market compliance (GDPR, KVK, BTW)

---

## 🔧 Environment Setup

**Required Environment Variables**: Supabase (DATABASE_URL, SUPABASE_URL, keys), Clerk (auth keys), optional Mollie (payments)

**Setup**: Node 22.18.0 → `pnpm install` → `pnpm dev`

---

**For detailed development workflows, troubleshooting, and technical guidance**: See [CLAUDE.md](./CLAUDE.md)
