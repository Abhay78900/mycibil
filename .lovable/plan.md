

## Admin Notification / Broadcast System

### Overview
Add a broadcast notification system where admins can send announcements to all partners. Partners see unread notifications as a modal on dashboard load and via a bell icon in the header.

### Database Changes (1 migration)

**Table: `admin_notifications`**
- `id` uuid PK default gen_random_uuid()
- `title` text NOT NULL
- `message` text NOT NULL
- `created_by` uuid NOT NULL (admin user id)
- `is_active` boolean default true
- `created_at` timestamptz default now()

**Table: `notification_reads`**
- `id` uuid PK default gen_random_uuid()
- `notification_id` uuid NOT NULL references admin_notifications(id) on delete cascade
- `partner_id` uuid NOT NULL (partners.id)
- `read_at` timestamptz default now()
- unique(notification_id, partner_id)

**RLS:**
- Admins: ALL on both tables
- Partners: SELECT on `admin_notifications` (where is_active = true), INSERT on `notification_reads` (own partner_id), SELECT on `notification_reads` (own partner_id)

### UI Changes

1. **Admin Settings / Dashboard — "Broadcast Notification" section** (`AdminSettings.tsx` or new section in AdminDashboard)
   - Card with Title input + Message textarea + "Send to All Partners" button
   - List of past notifications with active/inactive toggle
   - Shows how many partners have read each notification

2. **Partner Header — Notification Bell** (`PartnerLayout.tsx` or `PartnerSidebar.tsx`)
   - Bell icon with red dot badge when unread notifications exist
   - Clicking opens a dropdown/popover listing recent notifications with dismiss action

3. **Partner Dashboard — Auto-popup Modal** (`PartnerDashboard.tsx`)
   - On load, query `admin_notifications` where `is_active = true` and no matching row in `notification_reads` for current partner
   - Show the latest unread notification in a Dialog/modal
   - "Dismiss" button inserts a row into `notification_reads`, closing the modal

4. **New hook: `usePartnerNotifications.ts`**
   - Fetches unread notifications for current partner
   - Provides `markAsRead(notificationId)` function
   - Returns `unreadCount` for the bell badge

### File Changes Summary
| File | Change |
|------|--------|
| New migration | Create `admin_notifications` + `notification_reads` tables with RLS |
| `src/hooks/usePartnerNotifications.ts` | New hook for fetching/dismissing notifications |
| `src/pages/admin/AdminSettings.tsx` | Add "Broadcast Notification" card section |
| `src/components/layout/PartnerLayout.tsx` | Add bell icon with unread badge |
| `src/pages/partner/PartnerDashboard.tsx` | Add auto-popup modal for unread notifications |

### Technical Notes
- No realtime needed; notifications are fetched on page load
- "Mark as read" persists in DB so it survives across sessions
- Bell badge uses `unreadCount > 0` to show/hide red dot
- The types file will auto-update after migration

