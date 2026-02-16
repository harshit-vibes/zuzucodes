# Branch-Based Authentication Workflow

## Overview

Each Neon database branch gets isolated authentication:
- **Separate user data** - No cross-contamination between dev/staging/prod
- **Independent auth configuration** - Test email settings safely
- **Unique Auth API endpoint per branch** - Each branch has its own authentication URL
- **Automatic session isolation** - Users and sessions are scoped to the branch

This architecture enables safe parallel development and testing without affecting production users.

---

## Creating a Development Branch

### Using Neon Console (Recommended)

1. Navigate to your Neon project: [console.neon.tech](https://console.neon.tech)
2. Go to **Branches** in the sidebar
3. Click **Create Branch**
4. Configure:
   - **Name**: `dev-<feature-name>` or `staging`
   - **Parent**: `main` (or another branch to fork from)
   - **Include parent data**: ✅ (recommended to copy schema)
5. Click **Create**

### Using Neon CLI

```bash
# Install Neon CLI (one-time)
npm install -g neonctl

# Create a feature branch
npx neonctl branches create --name dev-feature-name --project-id late-sky-89059162

# List all branches
npx neonctl branches list
```

---

## Environment Setup for Branch

After creating a branch, you need to update your local environment variables to point to it.

### 1. Get Branch Connection String

**From Neon Console**:
- Navigate to your branch
- Copy the **Connection string** from the dashboard
- It will look like: `postgresql://...@ep-branch-xxx.neonauth.c-4.us-east-1.aws.neon.tech/neondb`

**From CLI**:
```bash
npx neonctl branches get dev-feature-name --project-id late-sky-89059162
```

### 2. Get Branch Auth URL

The Auth URL follows this pattern:
- If your database URL is: `ep-branch-12345.neonauth.c-4.us-east-1.aws.neon.tech`
- Your auth URL is: `https://ep-branch-12345.neonauth.c-4.us-east-1.aws.neon.tech`

Basically: `https://` + the database host

### 3. Update `.env.local`

```bash
# Replace these with your branch values
DATABASE_URL=postgresql://user:pass@ep-branch-xxx.neonauth.c-4.us-east-1.aws.neon.tech/neondb
NEON_AUTH_BASE_URL=https://ep-branch-xxx.neonauth.c-4.us-east-1.aws.neon.tech

# Generate a new cookie secret for the branch (optional but recommended)
NEON_AUTH_COOKIE_SECRET=$(openssl rand -base64 32)

# Keep these the same
NEXT_PUBLIC_ROOT_DOMAIN=zuzu.codes
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Validate Configuration

Run the branch config checker to ensure DATABASE_URL and NEON_AUTH_BASE_URL are from the same branch:

```bash
npm run check-branch
```

You should see:
```
✅ Branch config valid: branch-12345
```

If they're mismatched, you'll get a warning:
```
⚠️  WARNING: DATABASE_URL and NEON_AUTH_BASE_URL may be from different branches
```

---

## Testing Workflow

### Step 1: Create and Configure Branch
```bash
# Create branch from main
npx neonctl branches create --name dev-email-verification

# Update .env.local with branch URLs
# Run validation
npm run check-branch
```

### Step 2: Apply Schema Changes to Branch

If you're making database schema changes, apply them to the branch first:

```bash
# Example: Run migration on branch
# (Your migration command here)
psql $DATABASE_URL < migrations/001_add_column.sql
```

### Step 3: Test with Branch Auth

```bash
# Start development server
npm run dev:branch

# Test authentication flow
# - Sign up creates users in branch `neon_auth` schema
# - Users are isolated from main branch
# - Email verification works independently
```

### Step 4: Verify Isolation

**Test that users don't leak between branches**:

1. Sign up a user in your dev branch (e.g., `test@example.com`)
2. Switch `.env.local` back to main branch
3. Try to sign in with `test@example.com` → should fail (user doesn't exist in main)
4. Switch back to dev branch
5. Sign in should work (user exists in dev branch)

### Step 5: Merge to Main

Once testing is complete:

1. **Apply schema changes to main** (if any)
2. **Merge code changes** via pull request
3. **Users stay separate** - dev branch users are NOT copied to main
4. **Clean up branch** when done testing

```bash
# Delete branch (users will be lost)
npx neonctl branches delete dev-email-verification
```

---

## Key Benefits

### ✅ Safe Auth Testing

- Test email verification settings without affecting production
- Experiment with auth flows in isolation
- Break things without fear

### ✅ Parallel Development

- Multiple developers can work on different auth features simultaneously
- Each developer gets their own branch with isolated users
- No conflicts or interference

### ✅ PR Previews with Working Auth

- Deploy preview environments with branch-specific auth
- Reviewers can test auth flows without affecting production data
- Each PR can have its own isolated user base

### ✅ Safe RBAC Testing

- Test role-based access control changes before production
- Create test users with different roles in branch
- Verify permission logic without risk

---

## Common Scenarios

### Scenario 1: Testing Email Verification Changes

```bash
# 1. Create branch
npx neonctl branches create --name dev-email-verification

# 2. Update .env.local with branch URLs
# 3. Enable verification in Neon Console → Branch → Auth → Settings
# 4. Test sign-up flow with verification codes
# 5. Merge changes to main once validated
# 6. Configure production branch auth settings
# 7. Delete dev branch
```

### Scenario 2: Testing Schema Migrations

```bash
# 1. Create branch from main
npx neonctl branches create --name dev-add-user-metadata

# 2. Point .env.local to branch
# 3. Run migration on branch
psql $DATABASE_URL < migrations/002_user_metadata.sql

# 4. Test application with new schema
# 5. If successful, run migration on main
# 6. Merge code changes
# 7. Delete branch
```

### Scenario 3: Staging Environment

```bash
# 1. Create long-lived staging branch
npx neonctl branches create --name staging

# 2. Configure staging environment vars
DATABASE_URL=<staging-branch-url>
NEON_AUTH_BASE_URL=<staging-auth-url>

# 3. Deploy to staging (Vercel/Netlify)
# 4. Staging has its own users, isolated from production
# 5. Test features with real data before production deploy
```

---

## Best Practices

### ✅ DO

- **Validate branch config** before starting work (`npm run check-branch`)
- **Use descriptive branch names** (`dev-feature-name`, not `test123`)
- **Delete branches after merging** to avoid clutter
- **Document branch purpose** in PR description
- **Keep branch lifetimes short** for feature branches (days, not months)
- **Use staging branch** for long-term pre-production testing

### ❌ DON'T

- **Don't mix branch URLs** - DATABASE_URL and NEON_AUTH_BASE_URL must match
- **Don't commit `.env.local`** - keep branch configs local
- **Don't reuse production secrets** in dev branches
- **Don't expect branch users to migrate** - they stay in the branch
- **Don't forget to update auth settings** per branch if needed

---

## Troubleshooting

### Problem: "Invalid credentials" after switching branches

**Cause**: Session cookie is from different branch

**Solution**:
```bash
# Clear browser cookies
# Or use incognito mode when testing different branches
```

### Problem: Email verification not working

**Cause**: Verification not enabled in branch auth settings

**Solution**:
1. Go to Neon Console → Your Branch → Auth → Settings
2. Enable "Verify at Sign-up"
3. Save changes
4. Try sign-up again

### Problem: Database connection fails

**Cause**: Branch may have been deleted or connection string incorrect

**Solution**:
```bash
# Verify branch exists
npx neonctl branches list

# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Run validation
npm run check-branch
```

### Problem: Users created in wrong branch

**Cause**: `.env.local` pointing to wrong branch

**Solution**:
```bash
# Check current branch config
npm run check-branch

# Update .env.local with correct branch URLs
# Restart dev server
npm run dev
```

---

## Resources

- [Neon Branching Documentation](https://neon.tech/docs/introduction/branching)
- [Neon Auth Documentation](https://neon.tech/docs/guides/neon-auth)
- [Neon CLI Reference](https://neon.tech/docs/reference/neon-cli)

---

## Quick Reference

```bash
# Create branch
npx neonctl branches create --name dev-feature

# List branches
npx neonctl branches list

# Delete branch
npx neonctl branches delete dev-feature

# Check branch config
npm run check-branch

# Start dev with branch reminder
npm run dev:branch
```
