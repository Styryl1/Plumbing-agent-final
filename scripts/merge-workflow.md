# Conflict-Free Merge Workflow

## Why Conflicts Happen
- Both repositories modify the same files independently
- Git can't automatically resolve which changes to keep
- Configuration files (package.json, env.ts) are especially prone to conflicts

## Solution: Domain Separation Strategy

### 1. Work in Separate Domains
```
plumbing-agent/     (Main - Invoice/Business Logic)
├── src/app/invoices/       ✅ Main repo
├── src/components/invoices/ ✅ Main repo  
├── src/server/api/routers/  ✅ Main repo
└── src/server/services/     ✅ Main repo

plumbing-agent-web/ (Marketing Website)  
├── src/app/en/launch/      ✅ Web repo
├── src/app/nl/launch/      ✅ Web repo
├── src/components/launch/  ✅ Web repo
└── src/components/analytics/ ✅ Web repo

plumbing-agent-in/  (Infrastructure/Integrations)
├── src/server/integrations/ ✅ In repo
├── src/lib/providers/      ✅ In repo  
└── workbench/              ✅ In repo
```

### 2. Shared Files Strategy
For files that both repos might modify:

**env.ts**: Use domain-specific sections
```typescript
// ✅ Main repo manages these
WHATSAPP_*, SUPABASE_*, CLERK_*

// ✅ Web repo manages these  
NEXT_PUBLIC_GA_*, AIRTABLE_*

// ✅ In repo manages these
MONEYBIRD_*, MOLLIE_*
```

**package.json**: Use dependency groups
```json
{
  "dependencies": {
    // Core (Main repo)
    "@supabase/supabase-js": "...",
    "@trpc/server": "...",
    
    // Marketing (Web repo)
    "framer-motion": "...",
    "recharts": "...",
    
    // Integrations (In repo)  
    "stripe": "...",
    "nodemailer": "..."
  }
}
```

## 3. Easy Sync Script

Before any merge, run:
```bash
bash scripts/sync-repositories.sh
```

This ensures all repos are at the same starting point.

## 4. Merge Commands

### From Web to Main (Marketing features)
```bash
cd plumbing-agent
git remote add web ../plumbing-agent-web
git fetch web  
git merge web/main --strategy=recursive -X ours
# Keeps main version on conflicts
```

### From In to Main (Infrastructure)
```bash  
cd plumbing-agent
git remote add infra ../plumbing-agent-in
git fetch infra
git merge infra/main --strategy=recursive -X ours
```

## 5. Future Workflow

1. **Start**: Run sync script
2. **Develop**: Work in domain-specific directories
3. **Test**: Each repo works independently  
4. **Merge**: Use strategy commands above
5. **Sync**: Run sync script to update other repos

This approach eliminates 90% of merge conflicts by keeping work separated by domain.