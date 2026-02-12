# Specification

## Summary
**Goal:** Replace the Somers Scheduler logo asset usage across the UI with the provided blob URL, consistently.

**Planned changes:**
- Update all frontend logo render locations (e.g., login screen and top bar/header) to use the provided blob URL instead of `/assets/generated/somers-scheduler-logo.dim_512x512.png`.
- Ensure logo alt text remains in English (e.g., "Somers Scheduler").
- Verify via project-wide search that the old logo asset path is no longer used for app branding/logo rendering.

**User-visible outcome:** The app displays the updated logo from the provided URL everywhere the Somers Scheduler logo appears (including login and header).
