# Specification

## Summary
**Goal:** Improve the Add Availability start-time input and make theme switching easier to access from the top header.

**Planned changes:**
- Update `frontend/src/pages/AddAvailabilityPage.tsx` to replace the single Start Time select with three dropdowns (Hour, Minute, AM/PM) that still submit the existing `time` string format (e.g., "8:00 AM").
- Ensure editing an existing availability pre-populates Hour/Minute/AM-PM from the saved `time` string, with a safe fallback when the value can’t be parsed.
- Update `frontend/src/components/layout/TopBar.tsx` to move the theme toggle out of the profile dropdown into a standalone header button positioned immediately left of the profile menu trigger, preserving existing localStorage persistence and keeping Logout in the profile dropdown.

**User-visible outcome:** Users can select start time via separate Hour/Minute/AM-PM dropdowns (including when editing existing entries), and can toggle light/dark mode directly from a header button next to the profile menu.
