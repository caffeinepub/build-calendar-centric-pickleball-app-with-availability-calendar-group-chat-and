# Specification

## Summary
**Goal:** Fix mobile chat layout so messages, replies, and attachments stay within the chat panel by enabling vertical scrolling for the message list and ensuring content wraps responsively.

**Planned changes:**
- Make the chat message list area scroll vertically on mobile while keeping the composer (input and action buttons) visible within the chat card.
- Ensure message and reply text wraps within available width, including breaking long unbroken strings (e.g., URLs) to prevent horizontal overflow.
- Make posted images and composer attachment previews responsive so they never exceed the chat panel width while preserving aspect ratio.
- Adjust chat panel containers on the standalone Chat page and Calendar month page to use a stable, mobile-safe height/layout so the embedded chat does not overflow and the message list scroll works consistently.

**User-visible outcome:** On mobile, the chat stays contained within its box: messages scroll vertically, the message input remains accessible, long text wraps instead of overflowing, and attached images scale to fit without causing horizontal scrolling.
