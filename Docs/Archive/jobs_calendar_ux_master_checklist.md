# Jobs/Calendar UX Master Checklist (Plumbing Agent)

This document consolidates:
- **Parity with Jobber** (what their Jobs/Calendar offers — web + mobile)
- **Parity‑plus UX** we’ll implement (your requested and added polish)
- **External research additions** (UX patterns, a11y, mobile, performance)
- Focus: **UX only**. Tech assumptions: Temporal + Europe/Amsterdam, RLS enforced, mobile‑first.

---

## 1) Parity with Jobber — What Jobber’s Jobs/Calendar Page Offers

### Views & Layout
- Day / Week / Month calendar views (web) with “Today” shortcut and current period highlight.
- Day view: time grid separated by assigned user; horizontal scroll for more hours.
- List view alternative showing All / Scheduled / Unscheduled groupings.
- Map view: day’s **scheduled**, **anytime**, and **unscheduled** items with pins (when linked to a client/property).
- New Schedule UI: **Map next to the schedule** (side‑by‑side context on desktop).
- Mobile app views: Day, List, **3‑Day**, Week, and Map; toggles (e.g., hide weekends, show/hide unscheduled on map).

### Item Types Shown
- Mixed item types: **Requests, Visits, Tasks, Calendar Events, Reminders**.
- “**Anytime**” items float at the top of a day; scheduled items occupy time slots.
- “**Unscheduled**” items: created with “schedule later” and planned from separate list/map.

### Scheduling & Editing
- **Drag‑and‑drop** to reschedule (desktop).
- Reassign via editing the team on the appointment.
- **Bulk scheduling tools**: assign **multiple visits at once**; “**New Visits**” tool to create **multiple visits** (recurring/series).

### Creation & Finding Time
- “**Find a Time**” flow: create jobs/requests/tasks/events and optionally **show availability** windows on the schedule.

### Map, Routing & Location
- Map view displays scheduled/anytime/unscheduled; user color appears on assigned visits.
- **Daily route** in Map view; supports “master route” and per‑day custom route; “Route From Here” start‑point option.

### Team Colors & Filtering
- **Calendar colors per user**; assigned visits adopt the user’s color.
- Filters & quick view switches (Day/Week/Month/Map/List).

### Unscheduled & Anytime Handling
- Clear separation of **anytime** vs **scheduled** vs **unscheduled**; ordering rules in list/map views.
- Mobile map toggle to **show/hide unscheduled**.

### Mobile App Specifics
- Schedule tab with fast view switching (Day, List, Map visible; Week & 3‑Day via options).
- Basic offline read for today; month picker jump.

### Calendar Sync (Contextual)
- **One‑way sync** from Jobber to external calendars (Google/Apple/Outlook) so personal calendars display Jobber appointments.

---

## 2) Parity‑Plus UX We Will Implement (Plumbing Agent)

### Creation & Editing
- **Click‑to‑Create**: click/tap an empty slot → **New Job** pre‑filled with that exact start time (default 60m, 15‑min snap). Also **drag‑to‑create** to define a range.
- **Undo everywhere safe**: reschedule/delete show snackbar **Undo** (10s). Confirm modals reserved for truly irreversible actions.
- **Mobile drag handles** on events (not whole card) to avoid scroll conflicts; 15‑min snap; rollback animation on failure.
- **Keyboard creation**: arrow to a slot → **Enter** to create; **Shift+Enter** to edit selected job.

### Guidance & Discoverability
- First‑run tip: “Tap‑hold a job to move it.” (dismissible helper).
- Micro‑help popover explaining **stripes = conflict**, **shading = lunch/closed**.

### Conflicts & Rules
- Conflict striping for same‑employee overlaps; non‑blocking banner + “Review” list.
- **Off‑hours**: Staff blocked with neutral toast; Owner/Admin can override via concise confirm dialog suggesting hours update.

### Unscheduled & Intake
- **Unscheduled bottom sheet** (AI/WhatsApp leads): “Apply proposal” → prefill → pick time → assign → create.
- One‑tap **“Schedule later”** pushes items into Unscheduled (with due‑by date).

### Team Lanes & Filtering
- Employee chips with colors; long‑press to **solo** an employee.
- Filters for job **status/priority**; badges for Urgent/Emergency/Completed.

### Map, Routing & Travel
- Route preview for selected day/employee; “Route from here” to change start.
- **Drive‑time estimate** between consecutive jobs; warn if chain is impossible.
- Toggle: show/hide **unscheduled** pins on map for planning.

### States & Microcopy
- **Skeletons** (200ms min) for rails + event stubs; inline error cards with **Retry**.
- Empty states with clear CTAs; consistent toasts: success (“Saved”), error (“Reverted”), action (“Undo”).
- Preserve scroll/focus on retry; avoid layout shift with loading shimmer.

### Accessibility & Inclusivity
- Hit targets **≥44×44pt (iOS)** / **≥48×48dp (Android)**; meet WCAG target‑size minimums.
- Calendar/dialogs follow **WAI‑ARIA APG**; keyboard nav across events; focus traps for drawers/modals; Escape closes.
- Screen‑reader labels: “08:30–09:15, John, Boiler fix, Priority High” (24‑hour time, nl‑NL later). 
- Respect **prefers‑reduced‑motion**; color‑blind‑safe event colors; AA/AAA contrast.

### Mobile‑First
- One‑hand thumb‑zone actions; floating **Create** FAB opening Unscheduled or New Job.
- Sticky Save/Primary action in drawers; no nested scroll traps.
- Haptics on drag pickup/snap (where supported).

### Performance & Reliability
- Virtualize heavy weeks; chunk rendering to stay 60fps.
- Debounce writes during drag; commit on drop only.
- Offline read for **today** (mobile) with safe queuing for quick edits.

### Preferences & Personalization
- Remember last view (Week/Day), selected employees, last time window.
- Density switch: **compact** vs **cozy** cards.
- Per‑user defaults: duration, default assignee (solo plumbers).

### Insights & Intelligence (light now, smarter later)
- Smart defaults: duration by job type; suggested assignees based on history.
- “Tight schedule” warnings when travel/buffers make chains risky.
- “Bundle nearby jobs” suggestions (same area/day).

### Comms from Calendar
- One‑tap **“On my way”** SMS/WhatsApp templates from job context menu.
- Late‑running nudge: if prior job overruns, propose sending a delay message.

### Printing & Sharing
- **Day sheet** PDF per employee (jobs, addresses, notes).
- Per‑employee **ICS** feed (read‑only) for personal calendar apps.

### Security, Roles & Audit (UX surfaced)
- Staff visibility limited to own lanes (configurable).
- Audit trail in Job Drawer **Activity** tab (who changed what/when).
- Clear copy on permission blocks with actionable next step (not just “Not allowed”).

### Date/Time & Pickers
- 24‑hour **nl‑NL** time; quick +/‑ 15‑minute buttons; single‑keystroke hour/minute editing.
- Progressive disclosure for advanced scheduling (recurrence, skills/tools constraints).

---

## 3) External Research Additions — Extra Ideas to Consider

### Navigation & Views
- Month overview (read‑only) that deep‑links to Day/Week.
- Sticky header with **Today, ‹, ›, Week | Day**, employee chips; **Jump to Now**.
- List fallback (agenda) if calendar fails (graceful degradation).
- Optional **Map beside calendar** on desktop (routing context while scheduling).

### Creating & Editing
- **Click‑to‑Create** and **drag‑to‑create** ranges (with default/last‑used duration).
- **Bulk assign/move** via multi‑select.
- **Keyboard**: slot‑focused **Enter** to create; **Shift+Enter** to edit.

### Availability & “Find a Time”
- Visual availability windows across selected employees (respect business hours & lunch).
- **Service windows** (arrival 09:00–11:00) vs. exact times.
- Constraints toggles: skills, tools, max daily jobs per tech.

### Unscheduled & Intake
- AI/WhatsApp leads pre‑filled with title/priority/duration; keep sheet open on errors.
- “Schedule later” with due‑by date + reminders.

### Conflicts & Rules
- Stripe overlaps; banner with Review list (keyboard‑friendly).
- Off‑hours: Staff blocked with neutral language; Owner/Admin override confirm with help text.
- **Travel hints** between tight back‑to‑back jobs; optional auto‑buffer insertion.

### Team Lanes & Filtering
- Long‑press to **solo** employee; color dot + initials on each event.
- Filters for status/priority; tiny badges for Urgent/Emergency/Completed.

### Map, Routing & Travel
- Route preview per employee; “Route from here” start.
- Drive‑time estimates & infeasible‑chain warnings.
- Toggle unscheduled pins for planning.

### States & Microcopy
- Skeletons for rails/events; inline error cards with Retry; consistent toasts.
- Empty states with strong, helpful CTAs (e.g., “Create job”, “Open Unscheduled”).

### Accessibility & Inclusivity
- 44–48px targets; APG‑compliant dialogs; proper roles/landmarks.
- SR labels include time range, employee, title, priority; dark‑mode AA/AAA.

### Mobile‑First
- Thumb‑zone FAB; sticky actions; no nested scroll traps; haptics on drag pickup.

### Performance & Reliability
- Virtualize; chunk renders; debounce writes; commit on drop; offline today.

### Preferences & Personalization
- Persist view/time window/chips; density control; per‑user defaults.

### Insights & Intelligence
- Smart defaults for duration/assignee; nearby‑jobs bundling; risky‑chain alerts.

### Comms & Sharing
- One‑tap comms; day sheet PDFs; per‑employee ICS feeds.

### Security & Audit
- Lane visibility rules; Activity tab audit; friendly permission messages.

---

## 4) Next Steps (turn into BMAD stories)

Recommended first set to implement:
1. **Click‑to‑Create & Drag‑to‑Create** (exact time prefill, default duration, snap).
2. **Current‑Time Line + “Jump to Now”** (Day/Week).
3. **Conflict Striping + Review Banner** (non‑blocking).
4. **Mobile Drag Handles + Undo** (reschedule/delete).
5. **Unscheduled Bottom Sheet (AI/WhatsApp → Assign)**.
6. **Empty/Loading/Error State System** (skeletons + retry + toasts).
7. **A11y Baseline & 44–48px Targets** (keyboard + SR labels).
8. **Travel Hints & Optional Auto‑Buffer**.

Each of these can be authored as a story (`/stories/*.story.md`) with scope, Gherkin ACs, microcopy, a11y, test plan, and touch map.
