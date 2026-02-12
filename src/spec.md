# Specification

## Summary
**Goal:** Fix the post-login flow so the app reliably transitions from splash + Internet Identity login to the main calendar + chat screen without getting stuck on an infinite full-screen loader, and show a clear error state when initialization fails.

**Planned changes:**
- Update the post-login navigation/loading flow so that after successful Internet Identity login and proceeding past splash, the main calendar + chat screen renders instead of an indefinite “Loading...” spinner.
- Add explicit, user-visible error handling in the authentication gate for cases where actor initialization or current user profile initialization fails or stalls, including a clear recovery action (e.g., Retry and/or Reload).
- Implement the fixes by adjusting usage patterns and UI behavior in editable components (e.g., App/pages/components) without modifying the immutable auth/actor hook files.

**User-visible outcome:** After logging in and continuing past the splash page, the user sees the main calendar + group chat screen without needing a manual refresh; if initialization cannot complete, the user sees an English error message with a working recovery button instead of a permanent loading screen.
