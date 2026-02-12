# Specification

## Summary
**Goal:** Improve the monthly calendar layout by repositioning the availability indicator within each day cell and widening the month grid so day numbers remain readable.

**Planned changes:**
- In the monthly calendar view (CalendarMonthPage), move the availability indicator dot from the top row (near the date number) to the bottom area of the day cell while keeping existing availability tinting and the “today” highlight behavior unchanged.
- Slightly increase the effective width of the monthly calendar component and its 7-column day grid to prevent day numbers from being clipped, including handling very small screens via horizontal overflow/scrolling rather than cutting off content.

**User-visible outcome:** In the month view, day numbers are fully readable and not cut off, and availability is still clearly indicated—now via a dot positioned at the bottom of each relevant day cell.
