# Specification

## Summary
**Goal:** Adjust chat message header avatar/name sizing in the chat box only, and extend the availability start-time dropdown to cover 8:00 AM–9:00 PM.

**Planned changes:**
- Update the chat message list header in `frontend/src/components/chat/ChatPanel.tsx` so each message shows a 25x25 sender avatar and a 14px sender display name, without affecting avatar/name sizing elsewhere in the app.
- Update `TIME_OPTIONS` on `frontend/src/pages/AddAvailabilityPage.tsx` so the dropdown runs from 8:00 AM through 9:00 PM (inclusive), while preserving out-of-range existing values as selectable “(legacy)” options.

**User-visible outcome:** Chat messages show a slightly larger avatar and name in the chat box only, and availability start times can be selected from 8:00 AM to 9:00 PM with older out-of-range times still retained when editing.
