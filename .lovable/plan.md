

## Mobile & Tablet-First Responsive Overhaul

### Scope
Make the entire app responsive across mobile (< 768px), tablet (768-1024px), and desktop (> 1024px). Key areas: Header navigation, Admin/Partner sidebars, all dashboard/table pages, and public-facing pages.

---

### 1. Header — Mobile Hamburger Menu
**File:** `src/components/layout/Header.tsx`

- Add a hamburger menu button (visible on mobile, hidden on `md:` and up)
- Use a Sheet component (slide-in from right) containing nav links: Dashboard, Sign Out, Check Score
- Hide "Check Score" and "Sign In" text buttons on mobile; show them inside the hamburger sheet
- Keep the logo and user avatar visible at all screen sizes

---

### 2. Admin Sidebar — Collapsible Mobile Drawer
**Files:** `src/components/admin/AdminSidebar.tsx`, all `src/pages/admin/*.tsx`

- Convert the fixed `w-64` sidebar to:
  - **Mobile/Tablet:** Hidden by default, toggled via a hamburger button in a top bar. Use Sheet (slide-in from left)
  - **Desktop (lg+):** Visible as-is
- Add a shared `AdminLayout` wrapper component that handles the sidebar + trigger + main content layout so each admin page doesn't duplicate sidebar logic
- The trigger button stays visible at top-left on mobile

---

### 3. Partner Sidebar — Same Pattern
**Files:** `src/components/partner/PartnerSidebar.tsx`, all `src/pages/partner/*.tsx`

- Same Sheet-based approach as Admin sidebar
- Add a `PartnerLayout` wrapper component

---

### 4. Admin & Partner Dashboard Grids
**Files:** `src/pages/admin/AdminDashboard.tsx`, `src/pages/partner/PartnerDashboard.tsx`

- Stats grids: Change `grid md:grid-cols-2 lg:grid-cols-4` to `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Two-column grids: `grid lg:grid-cols-2` → `grid grid-cols-1 lg:grid-cols-2`
- Main padding: `p-8` → `p-4 md:p-6 lg:p-8`
- Partner dashboard form: `grid grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2`

---

### 5. Tables — Horizontal Scroll + Responsive
**Files:** All pages with tables (`AdminUsers`, `AdminPartners`, `AdminReports`, `AdminApiLogs`, `AdminRevenue`, `AdminPartnerLeads`, `PartnerClients`, `PartnerReports`)

- Wrap all `<table>` elements in `<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">` to allow horizontal scrolling on mobile without bleeding
- Add `min-w-[600px]` or similar to tables so they scroll rather than squish
- Reduce padding in table cells for mobile: `p-3` → `p-2 md:p-3`

---

### 6. Landing Page (Index)
**File:** `src/pages/Index.tsx`

- Already mostly responsive (uses `md:` breakpoints). Minor fixes:
  - Bureau badges in hero: ensure `flex-wrap` handles small screens (already present)
  - Pricing grid: `grid md:grid-cols-2 lg:grid-cols-4` → `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
  - Footer: already uses `flex-col md:flex-row`, but add text centering on mobile

---

### 7. CheckScore & Payment Pages
**Files:** `src/pages/CheckScore.tsx`, `src/pages/Payment.tsx`

- Already use `max-w-3xl` / `max-w-2xl` with `px-4` — mostly fine
- Fix: `grid grid-cols-2 gap-4` in Payment → `grid grid-cols-1 sm:grid-cols-2 gap-4`

---

### 8. Credit Report Page
**File:** `src/pages/CreditReport.tsx`

- Ensure report content doesn't overflow on mobile
- Add `overflow-x-auto` to any wide report tables/sections

---

### 9. Dialog/Modal Responsiveness
**File:** `src/pages/admin/AdminApiLogs.tsx` (and others with dialogs)

- `DialogContent className="max-w-4xl"` → add `w-[95vw] max-w-4xl` for mobile
- Tabs grid `grid-cols-3` is fine (small enough)

---

### 10. Global CSS Fix
**File:** `src/App.css`

- Remove `#root { max-width: 1280px; padding: 2rem; text-align: center; }` — this is a leftover from Vite boilerplate and interferes with full-width layouts
- Replace with `#root { width: 100%; }` or remove entirely

---

### Technical Details

**New files to create:**
- `src/components/layout/AdminLayout.tsx` — wraps AdminSidebar + Sheet trigger + children
- `src/components/layout/PartnerLayout.tsx` — wraps PartnerSidebar + Sheet trigger + children

**Components used:**
- `Sheet` from `@/components/ui/sheet` (already exists) for mobile sidebars
- `Menu` icon from `lucide-react` for hamburger triggers
- `useIsMobile` from `@/hooks/use-mobile` (already exists)

**Key patterns:**
- Sidebar hidden on mobile via `hidden lg:flex lg:flex-col`
- Sheet trigger visible on mobile via `lg:hidden`
- All fixed `px` widths on content containers → `w-full` with `max-w-*`
- `overflow-x-auto` on all table containers

**Files modified (total ~18):**
| File | Change |
|------|--------|
| `src/App.css` | Remove Vite boilerplate max-width/padding |
| `src/components/layout/Header.tsx` | Add mobile hamburger menu |
| `src/components/layout/AdminLayout.tsx` | New — responsive sidebar wrapper |
| `src/components/layout/PartnerLayout.tsx` | New — responsive sidebar wrapper |
| `src/components/admin/AdminSidebar.tsx` | Minor — remove min-h-screen (layout handles it) |
| `src/components/partner/PartnerSidebar.tsx` | Minor — remove min-h-screen |
| `src/pages/admin/AdminDashboard.tsx` | Use AdminLayout, fix grid breakpoints, padding |
| `src/pages/admin/AdminUsers.tsx` | Use AdminLayout, table overflow |
| `src/pages/admin/AdminPartners.tsx` | Use AdminLayout, table overflow |
| `src/pages/admin/AdminReports.tsx` | Use AdminLayout, table overflow |
| `src/pages/admin/AdminApiLogs.tsx` | Use AdminLayout, table overflow, dialog width |
| `src/pages/admin/AdminRevenue.tsx` | Use AdminLayout, table overflow |
| `src/pages/admin/AdminPartnerLeads.tsx` | Use AdminLayout, table overflow |
| `src/pages/admin/AdminSettings.tsx` | Use AdminLayout, fix grid |
| `src/pages/partner/PartnerDashboard.tsx` | Use PartnerLayout, fix grids |
| `src/pages/partner/PartnerGenerate.tsx` | Use PartnerLayout, fix form grids |
| `src/pages/partner/PartnerClients.tsx` | Use PartnerLayout, table overflow |
| `src/pages/partner/PartnerReports.tsx` | Use PartnerLayout, table overflow |
| `src/pages/partner/PartnerWallet.tsx` | Use PartnerLayout, table overflow |
| `src/pages/Index.tsx` | Fix pricing grid, footer alignment |
| `src/pages/Payment.tsx` | Fix grid-cols-2 → responsive |

