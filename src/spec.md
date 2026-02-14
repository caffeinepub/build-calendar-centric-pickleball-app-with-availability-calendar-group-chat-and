# Specification

## Summary
**Goal:** Restore the missing “Add Availability” button in the calendar day detail view and ensure it correctly navigates to the add/edit availability screen for the selected day.

**Planned changes:**
- Add an always-visible “Add Availability” button to the day detail view content area, positioned above the availability list.
- Ensure the button appears in both populated and empty-state day detail views (when there are zero availability entries).
- Wire the button to navigate to `/add-availability` while passing the selected day as a date search parameter so the add/edit form opens on that day.

**User-visible outcome:** When a user clicks a date on the calendar, the day detail view shows an “Add Availability” button above the availability content (even if none exists yet), and clicking it opens the Add/Edit Availability page for that same date.
