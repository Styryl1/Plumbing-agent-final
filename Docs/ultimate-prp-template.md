# Ultimate PRP Template v3 - Context-Rich Production-Ready Implementation

**Template optimized for AI agents to implement features with complete context and self-validation capabilities to achieve working code through iterative refinement.**

---

## Executive Summary

**Feature Name**: [Specific feature name with version if applicable]
**One-Line Description**: [What this feature does for the user in under 15 words]
**Business Impact**: [Revenue impact, user retention, cost savings - quantified when possible]
**Estimated Complexity**: [Simple (1-4h) | Medium (4-8h) | Complex (8-16h) | Epic (16+ hours)]
**Stack Compatibility**: [T3 Stack components this feature uses: Next.js, tRPC, Supabase, etc.]

---

## Goals & Context

### Goal
[What needs to be built - be specific about the end state and desired user experience]

### Why
- [Business value and user impact - what problem does this solve?]
- [Integration with existing features - how does this fit the bigger picture?]
- [Problems this solves and for whom - specific user personas and pain points]

### What
[User-visible behavior and technical requirements - what will users see and do?]

### Success Criteria
- [ ] [Specific measurable outcomes - quantified when possible]
- [ ] [User behavior changes or business metrics]
- [ ] [Technical milestones that indicate completion]

---

## Requirements

### Functional Requirements
- **FR1**: [Each requirement is a bullet with identifier starting with FR]
- **FR2**: [Focus on WHAT the system must do, not HOW]
- **FR3**: [Make requirements testable and verifiable]

### Non-Functional Requirements
- **NFR1**: [Performance, security, scalability requirements]
- **NFR2**: [GDPR compliance, Dutch market requirements]
- **NFR3**: [Accessibility, browser compatibility, mobile responsiveness]

### Explicitly Out of Scope
- [What we are NOT building in this PRP]
- [Features deferred to future iterations]
- [Assumptions about what already exists]

---

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window before starting
documentation:
  - url: [Official API docs URL]
    sections: [Specific sections/methods you'll need]
    critical: [Key insights that prevent common errors]
    
  - url: [Library documentation URL]
    sections: [Specific parts relevant to this feature]
    gotchas: [Known pitfalls and how to avoid them]
    
existing_patterns:
  - file: [path/to/similar_feature.tsx]
    pattern: [What to mirror - component structure, error handling, etc.]
    avoid: [Anti-patterns in this file to not copy]
    
  - file: [path/to/integration_point.ts]
    integration: [How this feature connects to existing code]
    preserve: [Existing method signatures that must not change]

research_approach:
  - web_search: "[T3 Stack] + [feature type] patterns latest documentation"
    focus: [Implementation examples and best practices]
    
  - context7_mcp: "[library name] documentation current version"
    focus: [API reference and integration patterns]
    
  - file_search: "Similar features in existing codebase"
    focus: [Existing patterns to mirror and extend]

docfiles:
  - file: [PRPs/ai_docs/existing_context.md]
    relevance: [Why this context is needed for implementation]
```

### Current Codebase Analysis
```bash
# Run `tree` command in project root - paste output here
[Current project structure showing relevant directories]
```

### Desired Codebase Structure
```bash
# New files and directories this PRP will create
[Desired structure with file responsibilities]

New Files:
├── src/components/[feature]/
│   ├── [FeatureComponent].tsx      # Main UI component
│   ├── [FeatureForm].tsx           # Form handling with React Hook Form
│   └── hooks/use[Feature].ts       # Custom hooks for business logic
├── src/server/api/routers/[feature].ts  # tRPC router
├── src/server/db/schema/[feature].ts     # Drizzle schema
└── src/app/[feature]/              # App Router pages
    ├── page.tsx                    # Main page
    └── loading.tsx                 # Loading UI
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: [Library name] specific requirements
// Example: Supabase RLS policies must be enabled before first query
// Example: tRPC requires .input() validation before .query() or .mutation()
// Example: Next.js App Router requires 'use client' for interactive components
// Example: Dutch postal codes follow NNNNAA format, not NNNNN
// Example: iDEAL requires specific merchant ID format for Netherlands

// T3 Stack Patterns (MANDATORY):
// - All database operations through tRPC routers
// - Client components use tRPC hooks (api.feature.getAll.useQuery)
// - Server components use tRPC callers (api.feature.getAll())
// - Form validation with Zod schemas shared between client/server
// - Error boundaries for all major features
```

---

## Technical Architecture

### Stack Requirements
```yaml
Required Dependencies:
  - Next.js: [App Router, specific features needed]
  - tRPC: [Router setup, client configuration]
  - Supabase: [Tables, RLS policies, real-time if needed]
  - Zod: [Validation schemas for forms and API]
  - React Hook Form: [Form management if UI includes forms]
  - shadcn/ui: [Specific components needed]

Optional Dependencies:
  - Schedule-X: [If calendar functionality needed]
  - Mollie API: [If payment processing needed]
  - Clerk: [If authentication changes needed]
```

### Data Models
```typescript
// Core data structures - define interfaces and Zod schemas
// Example:
interface Feature {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  // ... other fields
}

// Zod Schema (shared between client/server)
export const FeatureSchema = z.object({
  name: z.string().min(1).max(100),
  // ... other validations
});

// Database Schema (Drizzle)
export const features = pgTable('features', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  // ... other columns
});
```

### API Contracts
```typescript
// tRPC router structure
export const featureRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    // Implementation
  }),
  
  create: publicProcedure
    .input(FeatureSchema)
    .mutation(async ({ input, ctx }) => {
      // Implementation
    }),
});
```

### Database Schema Changes
```sql
-- Migration: Add tables/columns needed
-- Include indexes for performance
-- Include RLS policies for security
-- Include any triggers or functions needed
```

---

## Implementation Blueprint

### Sequential Task List
```yaml
Task 1: Foundation Setup
  type: CREATE
  files:
    - src/server/db/schema/[feature].ts
    - src/lib/validators/[feature].ts
  pattern: "Mirror from existing schema pattern in src/server/db/schema/"
  description: "Set up database schema and validation schemas"
  validation: "Run `npm run db:generate` to verify schema"

Task 2: tRPC Router
  type: CREATE
  files:
    - src/server/api/routers/[feature].ts
  pattern: "Follow existing router pattern in src/server/api/routers/"
  inject_into: src/server/api/root.ts
  description: "Create API endpoints with full CRUD operations"
  validation: "Test endpoints with Postman or curl"

Task 3: Core UI Components
  type: CREATE
  files:
    - src/components/[feature]/[FeatureList].tsx
    - src/components/[feature]/[FeatureForm].tsx
  pattern: "Follow shadcn/ui component patterns from src/components/ui/"
  description: "Build reusable UI components with proper TypeScript"
  validation: "Components render without console errors"

Task 4: Custom Hooks
  type: CREATE
  files:
    - src/components/[feature]/hooks/use[Feature].ts
  pattern: "Follow existing hook patterns with tRPC integration"
  description: "Create business logic hooks with error handling"
  validation: "Hooks return proper loading/error/data states"

Task 5: App Router Pages
  type: CREATE
  files:
    - src/app/[feature]/page.tsx
    - src/app/[feature]/loading.tsx
    - src/app/[feature]/error.tsx
  pattern: "Follow App Router conventions from existing pages"
  description: "Create user-facing pages with proper SEO and loading states"
  validation: "Pages load correctly and handle all error states"

Task 6: Integration Testing
  type: MODIFY
  files:
    - [existing integration points]
  description: "Connect feature to existing navigation, auth, etc."
  validation: "Feature works end-to-end in development"
```

### Per-Task Implementation Details
```typescript
// Task 1: Database Schema Example
export const features = pgTable('features', {
  id: uuid('id').defaultRandom().primaryKey(),
  // PATTERN: Always include audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // PATTERN: Use proper constraints
  name: varchar('name', { length: 100 }).notNull(),
  // GOTCHA: Supabase requires explicit indexes for performance
});

// Task 2: tRPC Router Pattern
export const featureRouter = createTRPCRouter({
  // PATTERN: Always validate inputs with Zod
  create: publicProcedure
    .input(FeatureSchema)
    .mutation(async ({ input, ctx }) => {
      // PATTERN: Use database transaction for data integrity
      return await ctx.db.transaction(async (tx) => {
        // GOTCHA: Always handle database constraints
        return await tx.insert(features).values(input);
      });
    }),
});
```

### Integration Points
```yaml
Navigation:
  - file: src/components/navigation/NavBar.tsx
  - action: "Add new menu item for feature"
  - pattern: "Follow existing menu item structure"

Authentication:
  - file: src/middleware.ts
  - action: "Add route protection if needed"
  - pattern: "Use existing auth middleware patterns"

Database:
  - migration: "Add feature tables with proper indexes"
  - rls: "Create Row Level Security policies for multi-tenancy"
  - relationships: "Define foreign keys to existing tables"

Configuration:
  - file: src/env.mjs
  - action: "Add environment variables if needed"
  - validation: "Include in Zod schema validation"
```

---

## Validation Loops

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                    # ESLint fixes
npm run type-check             # TypeScript validation
npm run format                 # Prettier formatting

# Expected: No errors. If errors exist, READ and fix before continuing.
```

### Level 2: Unit Tests
```typescript
// CREATE test files for each major component/function
// Pattern: [filename].test.tsx or [filename].test.ts

// Example test structure:
describe('[FeatureName]', () => {
  test('renders without crashing', () => {
    render(<FeatureComponent />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('handles user interactions correctly', () => {
    // Test user flows
  });

  test('handles error states gracefully', () => {
    // Test error handling
  });
});
```

```bash
# Run and iterate until passing:
npm run test
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Testing
```bash
# Start development server
npm run dev

# Test the feature end-to-end
# 1. Navigate to feature page
# 2. Test all user interactions
# 3. Verify data persistence
# 4. Test error scenarios

# Expected: All user flows work without console errors
```

### Level 4: Security & Performance
```bash
# Security scan (MANDATORY before commit)
npx @biomejs/biome check src/

# Performance check
npm run build                  # Check for build warnings
npm run start                  # Test production build

# Expected: No security issues, acceptable build size
```

---

## UI/UX Specifications
*(Include this section only if the PRP involves user-facing features)*

### Core Screens/Components
- **[Screen Name]**: [Purpose and key interactions]
- **[Component Name]**: [Functionality and user experience]

### Interaction Patterns
- [Specific user workflows and expected behaviors]
- [Loading states, error handling, success feedback]

### Accessibility Requirements
- **WCAG Level**: [AA or AAA compliance needed]
- **Screen Reader**: [Proper ARIA labels and semantic HTML]
- **Keyboard Navigation**: [Tab order and keyboard shortcuts]

### Dutch Market Considerations
- **Language**: [Dutch/English toggle or Dutch-first]
- **Date/Time Format**: [DD-MM-YYYY, 24-hour time]
- **Currency**: [Euro formatting with proper decimal places]
- **Address Format**: [Dutch postal code and address conventions]

---

## Testing Strategy

### Manual Testing Checklist
- [ ] Feature loads without console errors
- [ ] All user interactions work as expected
- [ ] Form validation shows appropriate error messages
- [ ] Data persists correctly to database
- [ ] Error states display user-friendly messages
- [ ] Loading states provide good UX
- [ ] Feature works on mobile devices
- [ ] Feature works with JavaScript disabled (where applicable)

### Automated Testing
```bash
# Unit tests for business logic
npm run test src/components/[feature]/

# Integration tests for API endpoints
npm run test src/server/api/routers/[feature].test.ts

# E2E tests with Playwright (if complex user flows)
npx playwright test tests/[feature].spec.ts
```

### Performance Testing
```bash
# Bundle size analysis
npm run build -- --analyze

# Lighthouse audit (for UI features)
npm run dev
# Run Lighthouse in Chrome DevTools
```

---

## Anti-Patterns & Golden Rules

### T3 Stack Anti-Patterns
- ❌ Don't bypass tRPC for direct database access in client components
- ❌ Don't use `any` types - T3 Stack provides end-to-end type safety
- ❌ Don't ignore Next.js App Router conventions (use proper loading/error pages)
- ❌ Don't skip Zod validation - it's your type safety and runtime validation

### Project-Specific Rules (From CLAUDE.md)
- ❌ **NO Mock Data**: Always use real data or show loading/error states
- ❌ **Smart Comments**: Only add JSDoc for functions, section markers for complex logic
- ❌ **Shared Components**: Never duplicate code - create reusable components
- ❌ **Type Safety**: Never use `any` - leverage Supabase + tRPC + Zod stack
- ❌ **Latest Versions**: Don't hardcode versions - use "latest" in documentation
- ❌ **CRITICAL: USE MCP SERVERS**: Always use MCP tools directly - Supabase MCP for database, Context7 for docs, Firecrawl for examples

### Netherlands-Specific Gotchas
- ❌ Don't assume US address formats (postal codes are NNNNAA)
- ❌ Don't ignore GDPR cookie consent requirements
- ❌ Don't forget iDEAL as primary payment method
- ❌ Don't use American date formats (use DD-MM-YYYY)

### Performance & Security
- ❌ Don't skip Row Level Security policies in Supabase
- ❌ Don't expose sensitive data in client-side code
- ❌ Don't skip input validation on both client and server
- ❌ Don't forget to add proper loading states for better UX

---

## Rollback Plan

### Git Checkpoints
```bash
# MANDATORY: Commit before starting implementation
git add -A
git commit -m "Checkpoint: Pre-[feature] implementation"

# Commit after each major task completion
git add -A
git commit -m "Checkpoint: [Task N] - [brief description]"

# If rollback needed:
git log --oneline                    # Find checkpoint
git reset --hard [checkpoint-hash]  # Revert to safe state
```

### Alternative Approaches (Ranked by Preference)
1. **Plan A**: [Primary implementation approach described above]
2. **Plan B**: [Alternative if Plan A fails - different technical approach]
3. **Plan C**: [Minimal viable version if time/complexity constraints]

### Failure Recovery
- **After 3 failed attempts**: Stop implementation, document blockers, escalate
- **Common failure points**: [Known issues and how to resolve them]
- **Escalation path**: [Who to ask for help and what information to provide]

---

## Final Validation Checklist

**Pre-Commit Requirements**:
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] Security scan clean: Semgrep/Biome passes
- [ ] Manual testing completed successfully
- [ ] Performance acceptable (build time, bundle size)
- [ ] GDPR compliance verified (if handling personal data)
- [ ] Dutch market requirements met (if applicable)
- [ ] Documentation updated (JSDoc for new functions)
- [ ] Git commit with descriptive message includes feature completion

**Post-Deployment Verification**:
- [ ] Feature works in production environment
- [ ] No production errors in monitoring/logs
- [ ] Database migrations applied successfully
- [ ] Performance metrics within acceptable ranges

---

## Notes & Assumptions

**Assumptions Made**:
- [List any assumptions about existing code, user behavior, or technical constraints]
- [Document dependencies on other features or external services]

**Technical Debt Created** *(if any)*:
- [Temporary workarounds that need future improvement]
- [Performance optimizations deferred to later iterations]

**Future Enhancements**:
- [Features intentionally left for future PRPs]
- [Scaling considerations for high-traffic scenarios]

---

**Template Version**: 3.0  
**Last Updated**: January 2025  
**Compatible With**: T3 Stack, Next.js App Router, Supabase, Dutch market requirements  
**Review Required**: UX for UI features, Architecture for complex integrations, Security for data handling