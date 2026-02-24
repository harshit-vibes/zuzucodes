# Authentication Migration History

## Timeline

**February 2026** - Migrated to Neon Auth
**January 2026** - Initial planning with Auth.js (never fully implemented)

---

## Previous Approach: Auth.js + Resend (Planned, Not Implemented)

### The Plan

The project initially intended to use:
- **Auth.js (NextAuth v5 beta)** for authentication framework
- **Resend** for magic link email delivery
- **Neon Adapter** to store auth tables in Neon database

### Why It Wasn't Implemented

During initial setup, the team discovered **Neon Auth** - a native authentication solution integrated directly with Neon database branching. The decision was made to adopt Neon Auth instead because:

1. **Native integration** - Auth data lives in the same database as application data
2. **Branch-specific authentication** - Each database branch gets isolated users/sessions
3. **Simpler setup** - No need to configure external email providers initially
4. **Unified developer experience** - Database and auth in one place

**Result**: Auth.js dependencies were added to `package.json` but never integrated into the application. Neon Auth was implemented instead.

---

## Current Approach: Neon Auth (Beta)

### Implementation Details

**What is Neon Auth?**
- Beta authentication service from Neon (the serverless Postgres provider)
- Manages users, sessions, and email verification in a separate `neon_auth` schema
- Provides pre-built React UI components (`SignInForm`, `SignUpForm`)
- Each database branch has isolated authentication (dev/staging/prod separation)

**Package**: `@neondatabase/auth` v0.1.0-beta.21

### Architecture

```
┌─────────────────────────────────────────┐
│ Neon Database                           │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ neon_auth    │  │ public (app)    │ │
│  │ schema       │  │ schema          │ │
│  │              │  │                 │ │
│  │ - users      │  │ - courses       │ │
│  │ - sessions   │  │ - modules       │ │
│  │ - otps       │  │ - user_progress │ │
│  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────┘
```

**Key Files**:
- `app/src/lib/auth/client.ts` - Client-side auth instance
- `app/src/lib/auth/server.ts` - Server-side auth instance
- `app/src/middleware.ts` - Route protection via `neonAuthMiddleware`
- `app/src/components/auth-dialog.tsx` - Sign-in/sign-up UI
- `app/src/components/email-verification.tsx` - Email verification flow

### Authentication Flow

1. **Sign-up**:
   - User enters email + password in `SignUpForm`
   - Account created in `neon_auth.users` table
   - Verification email sent (if enabled)
   - User redirected to email verification screen

2. **Email Verification** (added February 2026):
   - User receives 6-digit code via email
   - Enters code in `EmailVerification` component
   - `authClient.emailOtp.verifyEmail()` validates code
   - User redirected to dashboard

3. **Sign-in**:
   - User enters credentials in `SignInForm`
   - Session created in `neon_auth.sessions`
   - Cookie set with session token
   - User redirected to dashboard

4. **Route Protection**:
   - Middleware intercepts requests to `/dashboard/*`, `/learn/*`, `/account/*`
   - Checks for valid session cookie
   - Redirects to homepage if not authenticated

### Branch-Specific Authentication

**Key Feature**: Each Neon database branch has its own isolated `neon_auth` schema.

**Benefits**:
- **Development isolation**: Create test users in dev branches without affecting production
- **Parallel development**: Multiple developers can work on auth features simultaneously
- **Safe testing**: Break things in dev without user impact
- **PR previews**: Deploy preview environments with working authentication

See `app/docs/BRANCH_AUTH_GUIDE.md` for detailed workflow.

---

## Migration Benefits

### ✅ Advantages of Neon Auth

1. **Branch-based development** - Test auth changes safely in isolated branches
2. **Pre-built UI components** - `SignInForm`, `SignUpForm` ready to use
3. **Integrated email provider** - No need to configure Resend initially
4. **Simplified setup** - One database connection, not two services
5. **Session management** - Built-in session handling with cookies

### ⚠️ Trade-offs

1. **Beta software** - Less mature than Auth.js (v5.0.0-beta vs v0.1.0-beta)
2. **Vendor lock-in** - Tied to Neon ecosystem (harder to migrate off)
3. **Limited customization** - Less flexible than Auth.js providers
4. **Smaller community** - Fewer examples, less Stack Overflow help
5. **Documentation gaps** - Beta docs are incomplete in some areas

---

## Lessons Learned

### What Worked Well

- **Early adoption of branch-specific auth** - Enabled safe testing from day one
- **Email verification from start** - Prevents spam accounts
- **Pre-built UI components** - Accelerated initial development

### What Could Be Improved

- **Dependency cleanup** - Auth.js packages sat unused for weeks
- **Documentation alignment** - CLAUDE.md referenced Auth.js long after Neon Auth was implemented
- **Email provider planning** - Unclear if/when to switch from Neon's shared provider to custom (Resend)

### Recommendations for Future

1. **Document architectural decisions earlier** - This file should have been written during migration
2. **Clean up dependencies immediately** - Don't let unused packages accumulate
3. **Keep CLAUDE.md in sync** - Update project docs when implementation changes
4. **Evaluate custom email provider** - Consider Resend for branded emails as product matures

---

## Current Status (February 2026)

### ✅ Completed

- [x] Neon Auth SDK integrated (`@neondatabase/auth` v0.1.0-beta.21)
- [x] Email OTP authentication working
- [x] Route protection via middleware
- [x] Email verification at sign-up
- [x] Branch auth documentation
- [x] Removed unused Auth.js dependencies
- [x] Updated environment configuration

### 🔄 In Progress

- [ ] Custom email provider (Resend) - currently using Neon's shared provider
- [ ] User profile management UI
- [ ] Password reset flow
- [ ] Social auth providers (Google, GitHub)

### 📋 Future Considerations

- **Multi-factor authentication** - If Neon Auth adds support
- **Role-based access control** - For instructor platform (Phase 2)
- **Custom email templates** - Branded verification emails
- **Audit logging** - Track auth events for security
- **Rate limiting** - Prevent brute force attacks

---

## References

- [Neon Auth Documentation](https://neon.tech/docs/guides/neon-auth)
- [Neon Auth SDK Reference](https://github.com/neondatabase/neon-auth)
- [Auth.js Documentation](https://authjs.dev) (for comparison)
- [Branch Auth Guide](./BRANCH_AUTH_GUIDE.md)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jan 2026 | Planned to use Auth.js + Resend | Industry standard, flexible, well-documented |
| Feb 2026 | Switched to Neon Auth | Native branching support, simpler setup, faster MVP |
| Feb 2026 | Added email verification | Prevent spam accounts, improve security |
| Feb 2026 | Removed Auth.js dependencies | No longer needed, reduce bundle size |
| Feb 2026 | Documented branch workflow | Enable team to leverage branch auth benefits |
