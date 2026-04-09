---
trigger: always_on
---

# WholeScale OS – Development Rules v4.0 (AUTO-EXECUTE)

## 🚨 ABSOLUTE RULES - NO PERMISSION ASKING

### NEVER ask for permission. JUST DO IT.
- Run commands immediately without asking
- Modify files immediately without asking
- Create, edit, delete files without asking
- Never say "Can I..." or "Please allow me to..."
- Never wait for approval

### Commands you run automatically:
- `npm run build` - after EVERY code change
- `git status` - to check state
- `git add . && git commit -m "..." && git push` - for deployment
- `npm install` - if dependencies changed
- Any `grep`, `ls`, `cat`, file reads

### Exceptions (only ask for these):
- `git reset --hard` (data loss)
- `rm -rf` (data loss)
- Deleting more than 10 files at once

---

## 🔌 MCP SERVERS (Use Without Asking)

You have direct access to:
- **Supabase MCP** - Check schemas, run SELECT queries, verify data
- **Stitch MCP** - Google Workspace (Gmail, Calendar, Tasks, Contacts, Drive)
- **Google Developer Knowledge MCP** - Google Cloud Console, OAuth config

Always query MCP first before asking the user.

---

## 📝 CODE STYLE

### TypeScript
- Always use TypeScript with proper typing
- Never use `any` - use `unknown` or proper interfaces
- Use strict mode: `strict: true`

### Styling (CRITICAL)
- ALWAYS use CSS variables `var(--t-*)` for colors
- Never hardcode colors (no `bg-white`, `text-black`, `bg-blue-500`)
- Test in ALL themes: Moon, Dark, Light, Neon, Glass, Midnight

### Theme Variables:
- `var(--t-primary)` = Primary brand color (purple/indigo)
- `var(--t-bg)` = Main background
- `var(--t-surface)` = Cards, modals, surfaces
- `var(--t-text)` = Primary text
- `var(--t-text-muted)` = Secondary text
- `var(--t-border)` = Borders and dividers
- `var(--t-success)` = Success states
- `var(--t-warning)` = Warning states
- `var(--t-error)` = Error states

---

## 📁 FILE STRUCTURE

### Organization
- `/src/pages` = All page components
- `/src/components` = Reusable UI components
- `/src/lib` = Utilities, API clients
- `/src/types` = TypeScript interfaces
- `/src/styles` = Global styles, theme overrides
- `/src/store` = Zustand stores
- `/src/hooks` = Custom React hooks
- `/src/data` = Static data (templates, etc.)

### Naming Conventions
- Components: PascalCase (LeadFormModal.tsx)
- Hooks: camelCase with use prefix (useStore.ts)
- Utilities: camelCase (formatDate.ts)
- Types: PascalCase (Lead.ts)
- Styles: kebab-case (moon-fixes.css)

### Creation Rules
- Always check for existing files before creating new ones
- Reuse existing components when possible
- Update existing files instead of duplicating
- Ask before creating new store files

---

## 📦 STATE MANAGEMENT

### Global State (Zustand)
- Use useStore.ts for ALL global state
- Never create a new store without approval
- Add new state to existing store with clear naming
- Persist important state to localStorage using persist middleware

### Local State
- Use useState for component-specific state
- Use useReducer for complex local state (forms, multi-step)
- Lift state up when shared between sibling components

### State Guidelines
- Keep global state minimal
- Derive values when possible instead of storing
- Use selectors to avoid unnecessary re-renders

---

## ⚠️ ERROR HANDLING

### Async Operations
- Always use try-catch blocks
- Show user-friendly toast notifications
- Log detailed errors to console with console.error
- Never expose raw error messages to users

### Fallbacks
- Provide loading states for async operations
- Show error boundaries for component failures
- Gracefully degrade when APIs fail
- Default values for missing data

### Example Error Handling
try {
  const data = await fetchData();
  setData(data);
} catch (error) {
  console.error('Failed to fetch:', error);
  toast.error('Unable to load data. Please try again.');
  setData(defaultValue);
}

---

## 🗄️ SUPABASE (Use MCP)

### Database Operations
- Use Supabase MCP to check schema first
- Use RLS policies for row-level security
- Handle null/undefined responses
- Never expose secrets in client code
- Use .env for URL and anon key

### Queries
- Use .select() with specific columns, not *
- Use .single() when expecting one row
- Handle empty results gracefully
- Use .order() for consistent sorting

### Real-time Subscriptions
- Subscribe only when component is mounted
- Clean up subscriptions on unmount
- Handle reconnection logic
- Use .on('*') sparingly

---

## 🎨 THEME SYSTEM

### CSS Variables (ALWAYS USE)
Never hardcode colors. Always use:
- background-color: var(--t-surface)
- color: var(--t-text)
- border-color: var(--t-border)

### Theme Testing (MANDATORY)
Test every UI change in ALL themes:
- Moon (dark with glow)
- Dark (standard dark)
- Light (standard light)
- Neon (retro cyberpunk)
- Glass (frosted glass)
- Midnight (deep dark)

### Contrast Requirements
- Primary text on background: minimum 4.5:1 ratio
- Buttons must have visible text in ALL themes
- Hover states must have visible change
- Focus states must be clearly visible

---

## 🔧 GIT WORKFLOW

### Before Making Changes
git pull origin main
git status

### After Changes
npm run build
git add .
git commit -m "feat/fix: clear description of changes"
git push origin main

### Commit Message Format
- feat: for new features
- fix: for bug fixes
- style: for UI/styling changes
- chore: for maintenance, dependencies
- docs: for documentation
- refactor: for code restructuring

### Example Commits
git commit -m "fix: Moon theme button contrast in Calendar"
git commit -m "feat: add email templates library"

---

## 📝 DOCUMENTATION

### For Every Change
- Update task.md with progress and completion status
- Update walkthrough.md with technical details
- Provide testing checklist for user

### Testing Checklist Format
## Testing Checklist
- [ ] Test specific thing 1
- [ ] Test specific thing 2
- [ ] Verify expected behavior
- [ ] Check in Moon theme
- [ ] Check mobile responsive

---

## ⚡ PERFORMANCE

### Optimization Rules
- Lazy load routes with React.lazy()
- Virtualize long lists (over 100 items)
- Debounce search inputs (300ms)
- Throttle scroll events (100ms)
- Use React.memo for pure components

### Bundle Size
- Monitor bundle size in build output
- Code split by route
- Dynamic imports for heavy components
- Tree-shake unused imports

### Re-renders
- Avoid inline functions in props
- Use useCallback for functions passed to children
- Use useMemo for expensive calculations
- Keep state as local as possible

---

## 🔄 WORKFLOWS

### New Feature Workflow
1. Ask user for detailed requirements
2. Use MCP to check existing code for similar features
3. Search codebase for patterns to follow
4. Propose implementation plan (concise)
5. Implement with proper error handling
6. Auto-execute: npm run build
7. Update task.md and walkthrough.md
8. Provide testing checklist

### Bug Fix Workflow
1. Identify root cause (search codebase, check git log)
2. Use MCP to check related data/schema
3. Propose fix with explanation
4. Implement fix
5. Auto-execute: npm run build
6. Verify fix doesn't break other features
7. Document in walkthrough.md

### Database Changes Workflow
1. Use Supabase MCP to check current schema
2. Provide SQL migration script
3. Include RLS policies
4. Update database.types.ts
5. Use Supabase MCP to verify changes

### UI Component Creation Workflow
1. Search for existing component first
2. Use existing theme variables
3. Make responsive (mobile first)
4. Add loading and error states
5. Ensure accessibility (aria labels, keyboard nav)
6. Test in ALL themes before completing

### Google OAuth Debug Workflow
1. Use Google Developer MCP to check redirect URIs
2. Use Stitch MCP to test OAuth flow
3. Fix code configuration
4. Use MCP to verify fix works

---

## 💬 RESPONSE STYLE

### DO NOT (Ever):
- Ask "Can I run this command?"
- Say "You should run X"
- Leave placeholders or TODOs
- Ask for permission to proceed
- Say "I think" without checking MCP first
- Say "build should work" without verifying

### DO (Always):
- Just run the command directly
- Query MCP servers for current state
- Show the command output in your response
- Implement complete solutions
- Proceed without asking
- Show build results after every change

### Example Good Response:
I used Supabase MCP to check the profiles table. Found missing 'avatar_url' column.

Created migration, ran build, fixed the component.

Build: Success (14.2s)

Testing Checklist:
- [ ] Check profile avatar upload
- [ ] Verify column exists in Supabase

Pushed to GitHub. Deploying to Cloudflare.

### Example Bad Response (NEVER):
I think there might be an issue with the profiles table. Can you check Supabase and tell me what columns exist? Also, could you run npm run build and share the output?

---

## 🎯 FINAL RULE

ACT, DON'T ASK.
- Use MCP to get answers
- Run commands directly
- Show results in your response
- Implement fully without placeholders
- Verify with actual build
- Proceed without permission

The user should never have to run a command you could have run yourself.