import { ArrowUp, Loader2, Paperclip, Send, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Post } from "../../backend";
import { ExternalBlob } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { useCreatePost } from "../../hooks/useQueries";
import { buildThreadTree } from "../../lib/chatThreads";
import { storageService } from "../../services/storageService";
import { validateImageFile } from "../../utils/file";
import { ErrorState } from "../common/ErrorState";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import GifPicker from "./GifPicker";
import ThreadedPostTree from "./ThreadedPostTree";

// ─── CSS animations injected once ────────────────────────────────────────────

const CHAT_ANIMATION_STYLE = `
  @keyframes chatSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes chatGlowFade {
    0%   { box-shadow: 0 0 14px rgba(139, 92, 246, 0.55); }
    100% { box-shadow: 0 0 0px transparent; }
  }
  .chat-msg-new {
    animation: chatSlideUp 0.28s ease-out, chatGlowFade 2s ease-out;
  }
`;

let styleInjected = false;
function ensureChatStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const el = document.createElement("style");
  el.textContent = CHAT_ANIMATION_STYLE;
  document.head.appendChild(el);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30n;

const SPLASH_BG_URL =
  "https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3Ac922d63f8271822d4f882642444f8f2bdb0d1941683fa577854ba343e6b0ce7d&owner_id=bjzp7-xyaaa-aaaaf-qbsta-cai&project_id=0198d89b-d4eb-711d-abfd-9b50202a1152";

function getDateLabel(timestampNs: bigint): string {
  const ms = Number(timestampNs / 1_000_000n);
  const d = new Date(ms);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Returns a date key string from a nanosecond timestamp */
function getDateKey(timestampNs: bigint): string {
  const ms = Number(timestampNs / 1_000_000n);
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatPanel() {
  const { actor, isFetching: actorFetching } = useActor();

  // Pagination state
  const [posts, setPosts] = useState<Post[]>([]);
  const [offset, setOffset] = useState(0n);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // refreshFlag: increment to trigger a full re-fetch (e.g. after posting a reply)
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Compose state
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createPost, isPending } = useCreatePost();

  // Scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const wasAtTopRef = useRef(true);
  const prependingRef = useRef(false);
  const initialScrollDoneRef = useRef(false);

  // New-message animation tracking
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  // Incremental polling: track the highest message ID seen
  const lastMessageIdRef = useRef<bigint | null>(null);

  // Track whether initial load is fully done (including background reply fetch)
  const initialLoadDoneRef = useRef(false);

  // Inject CSS animations once on mount
  useEffect(() => {
    ensureChatStyles();
  }, []);

  // ── Fetch helpers ────────────────────────────────────────────────────────

  /**
   * BFS fetch of ALL replies at all levels of nesting.
   * Starts from a given set of posts and keeps fetching replies-of-replies
   * until no new replies are found.
   * Returns the original posts plus all discovered replies.
   */
  const fetchAllRepliesDeep = useCallback(
    async (seedPosts: Post[]): Promise<Post[]> => {
      if (!actor || seedPosts.length === 0) return seedPosts;
      const allPosts = [...seedPosts];
      const seen = new Set(seedPosts.map((p) => p.id.toString()));
      let currentLevel = seedPosts;

      // BFS: keep fetching replies until nothing new is found
      while (currentLevel.length > 0) {
        try {
          const replyArrays = await Promise.all(
            currentLevel.map((p) => actor.getReplies(p.id)),
          );
          const newReplies = replyArrays
            .flat()
            .filter((r) => !seen.has(r.id.toString()));
          if (newReplies.length === 0) break;
          for (const r of newReplies) seen.add(r.id.toString());
          allPosts.push(...newReplies);
          currentLevel = newReplies;
        } catch {
          break;
        }
      }

      return allPosts;
    },
    [actor],
  );

  /**
   * Background merge: fetches all replies (all levels) for the given posts
   * and merges any new ones into the existing posts state.
   */
  const fetchAndMergeReplies = useCallback(
    async (topLevelPosts: Post[]) => {
      if (!actor || topLevelPosts.length === 0) return;
      try {
        const allWithReplies = await fetchAllRepliesDeep(topLevelPosts);
        const replyOnly = allWithReplies.slice(topLevelPosts.length);
        if (replyOnly.length === 0) return;
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id.toString()));
          const newReplies = replyOnly.filter(
            (r) => !existingIds.has(r.id.toString()),
          );
          if (newReplies.length === 0) return prev;
          return [...prev, ...newReplies];
        });
      } catch {
        // silent
      }
    },
    [actor, fetchAllRepliesDeep],
  );

  const fetchPage = useCallback(
    async (pageOffset: bigint, loadOlder: boolean) => {
      if (!actor || actorFetching) return;
      try {
        const page = await actor.getPosts(PAGE_SIZE, pageOffset);

        if (loadOlder) {
          const withReplies = await fetchAllRepliesDeep(page);
          prependingRef.current = true;
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id.toString()));
            const newPosts = withReplies.filter(
              (p) => !existingIds.has(p.id.toString()),
            );
            return [...prev, ...newPosts];
          });
        } else {
          setPosts(page);

          if (page.length > 0) {
            const maxId = page.reduce(
              (max, p) => (p.id > max ? p.id : max),
              page[0].id,
            );
            lastMessageIdRef.current = maxId;
          }

          // Background: load all replies (all depths) without blocking render
          fetchAndMergeReplies(page);
        }

        setHasMore(page.length >= Number(PAGE_SIZE));
        setOffset(pageOffset + PAGE_SIZE);
      } catch {
        setLoadError("Failed to load messages.");
      }
    },
    [actor, actorFetching, fetchAllRepliesDeep, fetchAndMergeReplies],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshFlag is intentional trigger
  useEffect(() => {
    if (!actor || actorFetching) return;
    initialLoadDoneRef.current = false;
    setIsLoadingInitial(true);
    setLoadError(null);
    fetchPage(0n, false).finally(() => {
      setIsLoadingInitial(false);
      initialLoadDoneRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, actorFetching, fetchPage, refreshFlag]);

  // Polling
  useEffect(() => {
    if (!actor || actorFetching || isLoadingInitial) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (!actor || document.hidden) return;
      try {
        const latestPage = await actor.getPosts(PAGE_SIZE, 0n);
        // Fetch replies at all depths for the latest page
        const withReplies = await fetchAllRepliesDeep(latestPage);

        setPosts((prev) => {
          const prevIds = new Set(prev.map((p) => p.id.toString()));
          const freshById = new Map(
            withReplies.map((p) => [p.id.toString(), p]),
          );
          const lastKnownId = lastMessageIdRef.current;

          const newItems = withReplies.filter((p) => {
            if (prevIds.has(p.id.toString())) return false;
            // For replies (which have parentId), always include them if not seen,
            // regardless of their own ID vs lastKnownId (replies may have lower IDs
            // than the top-level post they belong to if recorded before a refresh)
            if (p.parentId !== null && p.parentId !== undefined) return true;
            if (lastKnownId !== null && p.id <= lastKnownId) return false;
            return true;
          });

          // Update reaction counts on existing posts (optimistic patch)
          let reactionsChanged = false;
          const updatedPrev = prev.map((p) => {
            const fresh = freshById.get(p.id.toString());
            if (
              fresh &&
              (fresh.likesCount !== p.likesCount ||
                fresh.dislikesCount !== p.dislikesCount ||
                fresh.edited !== p.edited ||
                fresh.content !== p.content)
            ) {
              reactionsChanged = true;
              return {
                ...p,
                likesCount: fresh.likesCount,
                dislikesCount: fresh.dislikesCount,
                edited: fresh.edited,
                content: fresh.content,
              };
            }
            return p;
          });

          if (newItems.length === 0 && !reactionsChanged) return prev;

          const topLevelNew = newItems.filter(
            (p) => p.parentId === null || p.parentId === undefined,
          );
          if (topLevelNew.length > 0) {
            const maxNew = topLevelNew.reduce(
              (max, p) => (p.id > max ? p.id : max),
              topLevelNew[0].id,
            );
            if (
              lastMessageIdRef.current === null ||
              maxNew > lastMessageIdRef.current
            ) {
              lastMessageIdRef.current = maxNew;
            }
          }

          if (newItems.length === 0) return updatedPrev;

          const newTopLevel = newItems.filter(
            (p) => p.parentId === null || p.parentId === undefined,
          );
          const newReplies = newItems.filter(
            (p) => p.parentId !== null && p.parentId !== undefined,
          );
          return [...newTopLevel, ...newReplies, ...updatedPrev];
        });
      } catch {
        // silent
      }
    };

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(poll, 4000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        poll();
      }
    };

    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [actor, actorFetching, isLoadingInitial, fetchAllRepliesDeep]);

  useEffect(() => {
    for (const post of posts) {
      seenMessageIdsRef.current.add(post.id.toString());
    }
  }, [posts]);

  // ── Scroll ───────────────────────────────────────────────────────────────

  const scrollToTop = useCallback((smooth = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: smooth ? "smooth" : "instant" });
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!actor || isLoadingOlder || !hasMore) return;
    setIsLoadingOlder(true);
    await fetchPage(offset, true);
    setIsLoadingOlder(false);
    requestAnimationFrame(() => {
      prependingRef.current = false;
    });
  }, [actor, isLoadingOlder, hasMore, offset, fetchPage]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distFromTop = el.scrollTop;
    const atTop = distFromTop < 100;
    wasAtTopRef.current = atTop;
    setShowJumpToLatest(!atTop);

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (
      distFromBottom < 200 &&
      hasMore &&
      !isLoadingOlder &&
      !prependingRef.current
    ) {
      loadOlderMessages();
    }
  }, [hasMore, isLoadingOlder, loadOlderMessages]);

  useEffect(() => {
    if (
      !isLoadingInitial &&
      posts.length > 0 &&
      !initialScrollDoneRef.current
    ) {
      initialScrollDoneRef.current = true;
      requestAnimationFrame(() => scrollToTop(false));
    }
  }, [isLoadingInitial, posts.length, scrollToTop]);

  const prevPostsLengthRef = useRef(0);
  useEffect(() => {
    const grew = posts.length > prevPostsLengthRef.current;
    prevPostsLengthRef.current = posts.length;
    if (
      grew &&
      wasAtTopRef.current &&
      initialScrollDoneRef.current &&
      !prependingRef.current
    ) {
      requestAnimationFrame(() => scrollToTop(false));
    }
  }, [posts.length, scrollToTop]);

  // ── Image handling ───────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedImage(file);
  };

  const handleClearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Send ─────────────────────────────────────────────────────────────────

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedImage) || isPending) return;

    if (!navigator.onLine) {
      toast.error("You are offline. Your message cannot be sent right now.");
      return;
    }

    try {
      let imageBlob: ExternalBlob | null = null;
      if (selectedImage) {
        const { bytes } =
          await storageService.prepareImageForUpload(selectedImage);
        imageBlob = ExternalBlob.fromBytes(
          bytes as Uint8Array<ArrayBuffer>,
        ).withUploadProgress((pct) => setUploadProgress(pct));
      }

      createPost(
        { content: message.trim(), parentId: null, image: imageBlob },
        {
          onSuccess: () => {
            setMessage("");
            handleClearImage();
            setUploadProgress(0);
            toast.success("Message sent");
            wasAtTopRef.current = true;
            requestAnimationFrame(() => scrollToTop(false));
          },
          onError: (err: any) => {
            toast.error(err?.message || "Failed to send message");
            setUploadProgress(0);
          },
        },
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to prepare image");
      setUploadProgress(0);
    }
  };

  // ── Handle GIF select ────────────────────────────────────────────────────
  const handleGifSelect = (gifUrl: string) => {
    setShowGifPicker(false);
    if (!navigator.onLine) {
      toast.error("You are offline.");
      return;
    }
    createPost(
      { content: gifUrl, parentId: null, image: null },
      {
        onSuccess: () => {
          toast.success("GIF sent");
          wasAtTopRef.current = true;
          requestAnimationFrame(() => scrollToTop(false));
        },
        onError: (err: any) =>
          toast.error(err?.message || "Failed to send GIF"),
      },
    );
  };

  // ── Handle post deletion ─────────────────────────────────────────────────
  const handlePostDeleted = useCallback((postId: bigint) => {
    setPosts((prev) =>
      prev.filter((p) => p.id !== postId && p.parentId !== postId),
    );
  }, []);

  // ── Handle reply posted ───────────────────────────────────────────────────
  // Trigger a full refresh so the new reply (and any reply-to-reply) is fetched
  const handleReplyPosted = useCallback(() => {
    setRefreshFlag((f) => f + 1);
  }, []);

  // ── Build thread tree ────────────────────────────────────────────────────
  const threadTree = buildThreadTree(posts);
  const topLevelPosts = posts.filter(
    (p) => p.parentId === null || p.parentId === undefined,
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Card className="flex flex-col h-full overflow-hidden border-0 rounded-xl">
      {/* ── Chat header ──────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 py-3 rounded-t-xl"
        style={{
          background: "oklch(0.82 0.25 118)",
        }}
      >
        <h2 className="text-base font-semibold text-black tracking-wide">
          Group Chat
        </h2>
      </div>

      <CardContent
        className="flex-1 flex flex-col min-h-0 overflow-hidden px-3 pb-3 pt-3"
        style={{
          backgroundImage: `url("${SPLASH_BG_URL}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(2, 6, 23, 0.82)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Content above overlay */}
        <div
          className="relative flex flex-col flex-1 min-h-0 space-y-3"
          style={{ zIndex: 1 }}
        >
          {/* ── Message list ─────────────────────────────────────────── */}
          <div className="relative flex-1 min-h-0">
            <div
              ref={scrollContainerRef}
              className="h-full overflow-y-auto pr-1"
              onScroll={handleScroll}
            >
              <div className="space-y-4 pb-2" data-testid="chat-messages">
                {isLoadingInitial ? (
                  <div
                    className="space-y-3 pt-2"
                    data-ocid="chat.loading_state"
                  >
                    <div className="flex items-start gap-2">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="space-y-1.5 flex-1 max-w-[65%]">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2 flex-row-reverse">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="space-y-1.5 flex-1 max-w-[65%] items-end flex flex-col">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-14 w-full rounded-xl" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="space-y-1.5 flex-1 max-w-[55%]">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-8 w-full rounded-xl" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2 flex-row-reverse">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="space-y-1.5 flex-1 max-w-[70%] items-end flex flex-col">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="space-y-1.5 flex-1 max-w-[60%]">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-16 w-full rounded-xl" />
                      </div>
                    </div>
                  </div>
                ) : loadError ? (
                  <ErrorState
                    message={loadError}
                    onRetry={() => {
                      setLoadError(null);
                      setIsLoadingInitial(true);
                      fetchPage(0n, false).finally(() =>
                        setIsLoadingInitial(false),
                      );
                    }}
                  />
                ) : posts.length === 0 ? (
                  <p
                    className="text-center text-muted-foreground py-8 text-sm"
                    data-ocid="chat.empty_state"
                  >
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  renderTreeWithDateSeparators(
                    threadTree,
                    topLevelPosts,
                    seenMessageIdsRef.current,
                    handlePostDeleted,
                    handleReplyPosted,
                  )
                )}

                {isLoadingOlder && (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isLoadingOlder && hasMore && posts.length > 0 && (
                  <div className="flex justify-center py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-7"
                      onClick={loadOlderMessages}
                      data-ocid="chat.load_older.button"
                    >
                      Load older messages
                    </Button>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            {showJumpToLatest && (
              <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
                <Button
                  size="sm"
                  className="pointer-events-auto shadow-lg gap-1.5 text-xs h-8 px-3"
                  onClick={() => {
                    scrollToTop(true);
                    setShowJumpToLatest(false);
                  }}
                  data-ocid="chat.jump_to_latest.button"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Jump to Latest
                </Button>
              </div>
            )}
          </div>

          {/* ── Compose form ─────────────────────────────────────────── */}
          <form onSubmit={handleSend} className="flex-shrink-0 space-y-2">
            {previewUrl && selectedImage && (
              <div className="relative inline-block max-w-full">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto rounded-lg border border-border"
                  style={{ maxHeight: "200px" }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={handleClearImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="text-xs text-muted-foreground">
                Uploading: {uploadProgress}%
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Input row: [text] [GIF] [paperclip] [send] */}
            <div className="flex gap-2 min-w-0 items-center">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isPending}
                className="text-[14px] min-w-0 flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-violet-500/50"
                data-ocid="chat.input"
              />
              {/* GIF button */}
              <div className="relative flex-shrink-0">
                {showGifPicker && (
                  <GifPicker
                    onSelect={handleGifSelect}
                    onClose={() => setShowGifPicker(false)}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className="flex-shrink-0 text-white/60 hover:text-white hover:bg-white/10 text-xs font-bold h-9 px-2"
                  aria-label="Search GIFs"
                  data-ocid="chat.toggle"
                >
                  GIF
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 text-white/60 hover:text-white hover:bg-white/10"
                aria-label="Attach image"
                data-ocid="chat.upload_button"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                type="submit"
                disabled={(!message.trim() && !selectedImage) || isPending}
                size="icon"
                className="flex-shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
                data-ocid="chat.submit_button"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helper: render thread nodes with date separators ───────────────────────

function renderTreeWithDateSeparators(
  nodes: ReturnType<typeof buildThreadTree>,
  topLevelPosts: Post[],
  seenIds: Set<string>,
  onPostDeleted?: (postId: bigint) => void,
  onReplyPosted?: () => void,
) {
  if (nodes.length === 0) return null;

  const postDateMap = new Map<string, string>();
  for (const p of topLevelPosts) {
    postDateMap.set(p.id.toString(), getDateKey(p.timestamp));
  }

  const elements: React.ReactNode[] = [];
  let lastDateKey: string | null = null;

  for (const node of nodes) {
    const dateKey = postDateMap.get(node.post.id.toString());
    if (dateKey && dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      elements.push(
        <DateSeparator
          key={`sep-${dateKey}`}
          label={getDateLabel(node.post.timestamp)}
        />,
      );
    }
    const isNew = !seenIds.has(node.post.id.toString());
    elements.push(
      <div
        key={node.post.id.toString()}
        className={isNew ? "chat-msg-new" : undefined}
      >
        <ThreadedPostTree
          nodes={[node]}
          depth={0}
          onPostDeleted={onPostDeleted}
          onReplyPosted={onReplyPosted}
        />
      </div>,
    );
  }

  return <>{elements}</>;
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/40 border border-border/30 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}
