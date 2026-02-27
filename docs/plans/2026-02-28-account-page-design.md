# Account Page Design

## Goal

Replace the fragmented `/account/[path]` route and scattered `UserButton` + `SettingsDialog` components with a unified account experience: one `/account` route, a modal variant, and a compact sidebar card — all sharing one `AccountContent` server component.

---

## User States

| State | Subscription badge |
|---|---|
| `status = ACTIVE` | `● Active` (green) |
| `status = CANCELLED / SUSPENDED / EXPIRED` | `● Inactive` (destructive) |
| No subscription row | `● Free` (muted) |

---

## Data Flow

`dashboard/layout.tsx` already calls `getSubscriptionStatus(user.id)` (React.cache). The full `SubscriptionRow | null` is passed as a prop into `AppSidebar` → `SidebarUserCard`. No extra DB calls.

`/account` route and `AccountModal` both render `<AccountContent>` — a server component that calls `auth()` + `getSubscriptionStatus()`. React.cache deduplicates the DB call within the same request.

---

## Components

### `AccountContent` (server component)
`src/components/shared/account-content.tsx`

Props: `{ user, subscription: SubscriptionRow | null }`

Renders three stacked sections:
1. **Profile** — `<AccountSettingsCards />` from `@neondatabase/auth/react`
2. **Security** — `<SecuritySettingsCards />` from `@neondatabase/auth/react`
3. **Subscription** — read-only card (see below)

### Subscription card (inside `AccountContent`)
- Plan name (e.g. "Pro — $19.99/mo" from `plan_id` lookup, or generic "Subscription")
- Status badge: `● Active` / `● Cancelled` / `● Suspended` / `● Free`
- Trial end date (if `trial_end_at` is set and in the future)
- Next billing date (if `next_billing_at` is set)
- No cancel/manage actions — read-only

### `/account` route
`src/app/account/page.tsx` (replaces `src/app/account/[path]/page.tsx`)

Server component. Calls `auth()` + `getSubscriptionStatus()`, renders `<AccountContent>` inside a full-page container.

### `AccountModal`
`src/components/shared/account-modal.tsx`

Client component. Replaces `SettingsDialog`. `Dialog` with scrollable body rendering `<AccountContent>`. Triggered from the sidebar compact card.

### `SidebarUserCard`
`src/components/shared/sidebar-user-card.tsx`

Client component. Lives in `AppSidebar`'s `<SidebarFooter>` — replaces the `© 2026` copyright line.

Layout:
```
┌─────────────────────────────────────┐
│  [avatar]  Name          [☀ theme]  │
│            email                    │
│            ● Active                 │
│  [Account ↗]          [⚙ Manage]   │
└─────────────────────────────────────┘
```

Props: `{ user, subscription: SubscriptionRow | null }`

Actions:
- "Account" — `<Link href="/account">` (opens full route page)
- Settings icon — opens `AccountModal`
- Theme toggle — `<ThemeToggle />` moved here from header

### `AppSidebar` changes
- Add `subscription: SubscriptionRow | null` prop
- Replace `<SidebarFooter>` copyright with `<SidebarUserCard>`

### `dashboard/layout.tsx` changes
- Pass `subscription` (the `SubscriptionRow | null`) into `<AppSidebar>`
- Remove `isPaid` from `SubscriptionProvider` if no longer needed, or keep both

### Header cleanup
- `DashboardHeader` — remove `<UserButton />` and `<ThemeToggle />`. If the header becomes empty, delete the component and remove it from the layout.
- `UserButton` — delete `src/components/shared/user-button.tsx` (unused)

---

## Routing

| Before | After |
|---|---|
| `/account/settings` | `/account` |
| `/account/security` | `/account` (Security section below Profile) |
| No subscription page | `/account` (Subscription section at bottom) |

The `[path]` dynamic segment is removed. `generateStaticParams` and `accountViewPaths` are no longer needed.

---

## Files

| File | Action |
|---|---|
| `src/app/account/page.tsx` | Create (replaces `[path]/page.tsx`) |
| `src/app/account/[path]/page.tsx` | Delete |
| `src/components/shared/account-content.tsx` | Create |
| `src/components/shared/account-modal.tsx` | Create (replaces `settings-dialog.tsx`) |
| `src/components/shared/sidebar-user-card.tsx` | Create |
| `src/components/shared/settings-dialog.tsx` | Delete |
| `src/components/shared/user-button.tsx` | Delete |
| `src/components/shared/app-sidebar.tsx` | Modify — add `subscription` prop, replace footer |
| `src/app/dashboard/layout.tsx` | Modify — pass `subscription` to AppSidebar |
| `src/components/dashboard/header.tsx` | Delete (or simplify to empty spacer) |
| `src/components/course/course-player-shell.tsx` | Modify — remove UserButton import if used |
