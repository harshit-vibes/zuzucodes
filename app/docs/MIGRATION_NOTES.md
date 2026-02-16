# Migration Notes - Supabase to Neon

## Status: Partial Migration Complete

### ✅ Completed

- [x] Main learner platform uses Neon Auth and Neon database
- [x] `src/lib/supabase.ts` renamed to `src/lib/data.ts`
- [x] All learner-facing routes updated to use Neon
- [x] Authentication fully migrated to Neon Auth
- [x] Removed unused dependencies (Auth.js, Resend, Supabase client)

### ⚠️ Incomplete - Internal Admin Routes

The following API routes still reference the old Supabase client and are **currently broken**:

**CRUD Operations**:
- `src/app/api/internal/courses/route.ts` - Course creation/listing
- `src/app/api/internal/courses/[id]/route.ts` - Course get/update/delete
- `src/app/api/internal/modules/route.ts` - Module creation/listing
- `src/app/api/internal/modules/[id]/route.ts` - Module get/update/delete

**Reordering**:
- `src/app/api/internal/courses/[id]/reorder/route.ts` - Module reordering
- `src/app/api/internal/modules/[id]/reorder/route.ts` - Lesson reordering

**Schema Management**:
- `src/app/api/internal/module-schema/route.ts`
- `src/app/api/internal/module-schema/[version]/route.ts`

**Bulk Operations**:
- `src/app/api/internal/bulk/modules/route.ts`

### Why These Were Not Migrated

These routes are part of the **instructor/admin platform (Phase 2)**, which is not yet implemented in the frontend. They were scaffolded early but never fully integrated.

### Migration Options

**Option 1: Delete Them** (Recommended if not using)
```bash
rm -rf app/src/app/api/internal
```

Since there's no admin UI consuming these endpoints, deleting them simplifies the codebase.

**Option 2: Convert to Neon** (If you need them)

Replace the Supabase client pattern:

**Before (Supabase)**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
const { data, error } = await supabase
  .from('courses')
  .select('*')
  .eq('id', courseId);
```

**After (Neon)**:
```typescript
import { sql } from '@/lib/neon';

const courses = await sql`
  SELECT * FROM courses WHERE id = ${courseId}
`;
const course = courses[0];
```

**Option 3: Leave As TODO**

If you plan to implement the instructor platform later, leave these routes in place but add a comment:

```typescript
/**
 * TODO: Migrate to Neon SQL
 * This route currently uses Supabase client which has been removed.
 * See docs/MIGRATION_NOTES.md for migration pattern.
 */
```

### Recommendation

**For Phase 1 (Current - Learner Platform)**:
- Delete the `/api/internal/*` routes
- They're not used by the learner-facing application
- Reduces maintenance burden

**For Phase 2 (Future - Instructor Platform)**:
- Re-implement these routes when building the admin UI
- Use Neon SQL from the start
- Follow the pattern in `src/lib/data.ts`

### Impact Assessment

**Deleting internal routes will NOT affect**:
- ✅ Learner sign-up/sign-in
- ✅ Course viewing
- ✅ Progress tracking
- ✅ Quiz submissions
- ✅ Dashboard functionality

**These routes are ONLY needed for**:
- ❌ Creating new courses (admin only)
- ❌ Editing course content (instructor only)
- ❌ Reordering modules/lessons (instructor only)
- ❌ Managing content schema (admin only)

**Currently, course content is managed**:
- Via direct database access
- Or seeding scripts
- Not through these API routes

### Decision Required

Choose one:

1. **Clean slate**: `rm -rf app/src/app/api/internal` (recommended)
2. **Migrate now**: Convert all routes to Neon SQL (~2-3 hours work)
3. **Defer**: Add TODO comments, migrate when building Phase 2

Let me know which approach you prefer!
