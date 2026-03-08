# Somers Scheduler

## Current State

The app is a full-featured pickleball social scheduler with a chat panel (`ChatPanel.tsx`), leaderboard (`LeaderboardPage.tsx`), profile page, and admin features. There are four known bugs and one new feature to implement.

**Chat bugs identified in code:**

1. **Message deletion not reflecting in UI:** `ThreadedPostTree.tsx` calls `deletePost` via `useDeletePost()`, which on success calls `queryClient.invalidateQueries({ queryKey: ["posts"] })`. However, `ChatPanel` manages its own local `posts` state from a manual paginated fetch (not from React Query's cache), so query invalidation alone does NOT cause the chat list to re-render. The deleted post remains visible.

2. **Emoji reaction defaulting to thumbs up:** In `ReactionControls.tsx`, `selectedEmoji` is local component state initialized to `null`. When the component re-renders (tab switch, scroll, etc.), the state is reset to `null`. The logic then falls back to showing `likesCount` on the `👍` slot since no like-mapped emoji is selected. This means if any `likesCount > 0` exists, a 👍 pill appears even if the user never selected thumbs up.

3. **"Jump to Latest" scrolling to oldest:** `ChatPanel` renders the scroll container with messages ordered oldest-at-top, newest-at-bottom. The `scrollToBottom` function uses `el.scrollTo({ top: el.scrollHeight })` which is correct. However, on initial load `scrollToBottom` is also called, and there may be a race or the container scroll direction isn't establishing `scrollHeight` correctly before the jump occurs. The button triggers `scrollToBottom(true)` with smooth behavior; the issue may be that the DOM hasn't painted yet or the container layout isn't complete, causing `scrollHeight` to equal `clientHeight` (effectively 0 offset from top).

4. **Season Champion badge not visible to other users:** The `BadgeDefinition` with `id = "season-champion"` (or similar) is awarded to the top player at season end, but there is no shared `SeasonChampionBadge` component that displays it in profile, leaderboard rows, or next to names in chat.

## Requested Changes (Diff)

### Add

- `SeasonChampionBadge` shared component in `src/frontend/src/components/badges/SeasonChampionBadge.tsx`: renders a small 🏆 crown/trophy badge pill. Accepts `badgeIds: string[]` and `allDefinitions: BadgeDefinition[]` as props; renders only if the user holds the Season Champion badge (identified by `id === "season-champion"`). Consistent size, border, and hover tooltip across all usages.
- `useGetUserBadges` is already available in `useQueries.ts` — use it to fetch badge IDs per player in leaderboard rows and chat messages.

### Modify

- **`ChatPanel.tsx` — fix deletion:** Add a `handlePostDeleted(postId: bigint)` callback that is passed down into `ThreadedPostTree` → `PostItem`. When delete succeeds, call this callback to immediately filter the deleted post (and its replies) from the local `posts` state without waiting for a re-fetch.
- **`ChatPanel.tsx` — fix Jump to Latest:** Ensure the scroll container uses `overflow-y: scroll` (not `auto`) and that the button's `onClick` uses a `requestAnimationFrame` with a small delay or a `setTimeout(0)` to ensure the DOM has painted before calling `scrollToBottom`. Also double-check that `scrollHeight` is correct by logging or wrapping in a rAF.
- **`ReactionControls.tsx` — fix emoji default:** Remove the fallback `count = emojiDef.emoji === "👍" ? likesCount : 0` logic that shows 👍 when no emoji is selected. If no like-mapped emoji is selected by the current user and `likesCount > 0`, show the count on 👍 only if the post truly has reactions from _other_ users. Since the backend does not return per-user emoji info (only total `likesCount` and `dislikesCount`), the correct fix is: when `selectedEmoji` is null (no reaction from this user), display `likesCount` on 👍 only if `likesCount > 0`. This is actually what the current code does — but the issue is `selectedEmoji` **resets to null** when component re-renders. Fix: persist `selectedEmoji` per post id using a ref or derive it from the post data. Since the backend doesn't return per-user emoji, the best approach is to store the per-post emoji selection in a module-level `Map<string, string>` (keyed by post id string) that survives re-renders and tab switches.
- **`ThreadedPostTree.tsx`** — accept an `onPostDeleted?: (postId: bigint) => void` prop and call it after successful delete. Also pass the prop through to nested `ThreadedPostTree` for replies.
- **`LeaderboardPage.tsx` — show Season Champion badge:** In `LeaderboardTable`, next to each player's `AvatarName`, fetch and display the `SeasonChampionBadge` component if the player holds that badge.
- **`ProfileBadges.tsx` / `ProfilePage.tsx`** — `SeasonChampionBadge` is already shown via the earned badges grid, but the shared compact badge should also appear prominently near the player's name/avatar at the top of their profile card.
- **`ThreadedPostTree.tsx` (chat)** — next to each message author's `AvatarName`, display `SeasonChampionBadge` if that user holds it.

### Remove

- The hardcoded fallback in `ReactionControls.tsx` that defaults `likesCount` to the 👍 slot when `selectedEmoji` is null and no data about the user's actual selection is available.

## Implementation Plan

1. **Fix message deletion (ChatPanel + ThreadedPostTree):**
   - Add `onPostDeleted: (postId: bigint) => void` prop to `ThreadedPostTree` and `PostItem`.
   - In `PostItem.handleDeleteConfirm`, after `mutateAsync` succeeds, call `onPostDeleted(post.id)`.
   - In `ChatPanel`, implement `handlePostDeleted` that calls `setPosts(prev => prev.filter(p => p.id !== postId && p.parentId !== postId))` (removes the post and any direct replies from local state).
   - Pass `handlePostDeleted` down through `renderTreeWithDateSeparators → ThreadedPostTree`.

2. **Fix Jump to Latest (ChatPanel):**
   - In the "Jump to Latest" button `onClick`, replace direct `scrollToBottom(true)` with a double `requestAnimationFrame` to guarantee the container has fully painted before measuring `scrollHeight`.
   - Alternatively, store a ref `bottomAnchorRef` on a sentinel div at the end of the message list and call `bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })` instead.

3. **Fix emoji reaction default (ReactionControls):**
   - Create a module-level `Map<string, string>` called `emojiSelectionStore` keyed by `post.id.toString()`.
   - Initialize `selectedEmoji` state from this store on mount: `useState(() => emojiSelectionStore.get(post.id.toString()) ?? null)`.
   - On every `setSelectedEmoji(...)` call, also update the store: `emojiSelectionStore.set(postId, emoji)` or `emojiSelectionStore.delete(postId)` on removal.
   - Update the pill display logic: when `selectedEmoji` is null, show `likesCount` on 👍 only if there are genuine other reactions (i.e. `likesCount > 0`). This preserves the informational count without implying the current user selected thumbs up.

4. **Season Champion badge component:**
   - Create `SeasonChampionBadge.tsx`: accepts `earnedBadgeIds: string[]` and `allDefinitions: BadgeDefinition[]`. Returns a small pill `🏆 Champion` with a ring border and tooltip showing the badge name, only if `earnedBadgeIds` includes any badge with `name` matching `"Season Champion"` or `id === "season-champion"`.
   - Add to leaderboard rows: in `LeaderboardTable`, each row already calls `useUserDirectoryWithAvatars`; add `useGetUserBadges` per player (or fetch batch) and pass badge ids to `SeasonChampionBadge`.
   - Add to chat: in `PostItem`, fetch `useGetUserBadges(post.author)` and `useGetAllBadgeDefinitions()`, render `SeasonChampionBadge` next to `AvatarName`.
   - Add to profile: in `ProfileCard` or the profile page header, render `SeasonChampionBadge` next to the player's display name.
