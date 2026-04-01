---
trigger: always_on
---

# WholeScale OS – Development Rules

## Code Style
- Always use TypeScript with proper typing
- Never use `any`
- Prefer functional components over class components
- Use Tailwind CSS for styling
- Follow existing code patterns in the project

## File Structure
- Pages go in /src/pages
- Components go in /src/components
- Library files go in /src/lib
- Types go in /src/types
- Always check for existing files before creating new ones

## State Management
- Use Zustand store (useStore.ts) for global state
- Use useState for local component state
- Never create a new store file without checking if the existing store can handle it

## Error Handling
- Always add try-catch blocks for async operations
- Show user-friendly error messages using toast notifications
- Log errors to console with console.error

## Supabase Operations
- Check if tables exist before querying
- Use RLS policies
- Add proper error handling
- Never expose secrets in client code

## Theme Consistency
- Always use CSS variables (var(--t-*)) for colors
- Never hardcode colors like white, black, or blue-500
- Ensure all new components work in both light and dark themes

## Edge Functions
- Use the same pattern as existing functions
- Include CORS headers
- Return proper status codes
- Add detailed error logging

## Git Workflow
- Run git pull before making changes
- Run npm run build to ensure no errors
- Use descriptive commit messages

## Testing
- Always provide a testing checklist after implementing features
- Include what the user should test and what results to expect

## Performance
- Avoid unnecessary re-renders
- Use React.memo for expensive components
- Use useCallback and useMemo where appropriate
- Lazy load routes

## Workflows

### New Feature Workflow
1. Ask user for detailed requirements
2. Check existing code for similar features
3. Propose implementation plan
4. Get approval before coding
5. Implement with proper error handling
6. Add to task.md and walkthrough.md
7. Provide testing checklist

### Bug Fix Workflow
1. Identify root cause
2. Check if issue was caused by recent changes
3. Propose fix with explanation
4. Implement fix
5. Verify fix doesn't break other features
6. Document in walkthrough.md

### Database Changes Workflow
1. Check Supabase schema first
2. Provide SQL migration script
3. Include RLS policies
4. Update database.types.ts
5. Test with existing data

### UI Component Creation Workflow
1. Check if component already exists
2. Use existing theme variables
3. Make responsive (mobile first)
4. Add proper loading and error states
5. Ensure accessibility (aria labels, keyboard navigation)