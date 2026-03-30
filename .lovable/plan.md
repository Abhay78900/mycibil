

## Fix: Pages Not Using Responsive Layout on Mobile

### Problem
Two pages were missed during the responsive overhaul and still use the old direct-sidebar pattern (no mobile hamburger menu, sidebar always visible, content hidden on small screens):

1. **`src/pages/admin/AdminPartnerLeadDetail.tsx`** — Uses `AdminSidebar` directly with `<div className="min-h-screen bg-background flex">` instead of `AdminLayout`
2. **`src/pages/partner/PartnerRegister.tsx`** — Has no sidebar/layout wrapper at all (standalone page)

All other admin and partner pages already use `AdminLayout` / `PartnerLayout` correctly.

### Fix

#### 1. `AdminPartnerLeadDetail.tsx`
- Replace the direct `AdminSidebar` import and manual flex layout with `AdminLayout`
- Remove the `handleLogout` function and `AdminSidebar` import
- Wrap the page content in `<AdminLayout>...</AdminLayout>` (same pattern as all other admin pages)
- Remove the outer `<div className="min-h-screen bg-background flex">` and `<main>` wrapper since `AdminLayout` provides those

#### 2. `PartnerRegister.tsx`
- This is a standalone registration page (no sidebar needed) — it just needs basic mobile padding/responsive fixes
- Ensure content uses `px-4` and responsive max-width so it doesn't bleed on mobile

### Files to Change

| File | Change |
|------|--------|
| `src/pages/admin/AdminPartnerLeadDetail.tsx` | Replace direct `AdminSidebar` usage with `AdminLayout` wrapper |
| `src/pages/partner/PartnerRegister.tsx` | Add responsive padding if missing (verify) |

### Console Warning Fix (bonus)
The `SheetContent` in `AdminLayout` and `PartnerLayout` is missing a `DialogTitle` (Radix accessibility warning). Add a visually hidden `SheetTitle` inside each `SheetContent` to suppress the warning.

| File | Change |
|------|--------|
| `src/components/layout/AdminLayout.tsx` | Add hidden `SheetTitle` inside `SheetContent` |
| `src/components/layout/PartnerLayout.tsx` | Add hidden `SheetTitle` inside `SheetContent` |

