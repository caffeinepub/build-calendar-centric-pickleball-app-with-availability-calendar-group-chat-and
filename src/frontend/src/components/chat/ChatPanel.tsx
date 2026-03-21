import { ArrowDown, Loader2, Paperclip, Send, X } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import ThreadedPostTree from "./ThreadedPostTree";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30n;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createPost, isPending } = useCreatePost();

  // Scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const wasAtBottomRef = useRef(true);
  const prependingRef = useRef(false);
  const initialScrollDoneRef = useRef(false);

  // ── Fetch helpers ────────────────────────────────────────────────────────

  /**
   * Fetches replies for all top-level posts and merges them into a flat array.
   * This ensures replies are included in the thread tree.
   */
  const fetchRepliesForPosts = useCallback(
    async (topLevelPosts: Post[]): Promise<Post[]> => {
      if (!actor || topLevelPosts.length === 0) return topLevelPosts;
      try {
        const replyArrays = await Promise.all(
          topLevelPosts.map((p) => actor.getReplies(p.id)),
        );
        const allReplies = replyArrays.flat();
        // Merge: top-level posts + their replies (deduplicated)
        const seen = new Set(topLevelPosts.map((p) => p.id.toString()));
        const newReplies = allReplies.filter((r) => !seen.has(r.id.toString()));
        return [...topLevelPosts, ...newReplies];
      } catch {
        return topLevelPosts;
      }
    },
    [actor],
  );

  const fetchPage = useCallback(
    async (pageOffset: bigint, loadOlder: boolean) => {
      if (!actor || actorFetching) return;
      try {
        const page = await actor.getPosts(PAGE_SIZE, pageOffset);
        const withReplies = await fetchRepliesForPosts(page);

        if (loadOlder) {
          // Older messages go to the BEGINNING (prepend, so they appear above current)
          prependingRef.current = true;
          setPosts((prev) => {
            // Deduplicate against existing posts
            const existingIds = new Set(prev.map((p) => p.id.toString()));
            const newPosts = withReplies.filter(
              (p) => !existingIds.has(p.id.toString()),
            );
            return [...newPosts, ...prev];
          });
        } else {
          // Initial load: sort oldest-first so newest is at bottom
          const sorted = [...withReplies].sort((a, b) =>
            a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
          );
          setPosts(sorted);
        }
        setHasMore(page.length >= Number(PAGE_SIZE));
        setOffset(pageOffset + PAGE_SIZE);
      } catch {
        setLoadError("Failed to load messages.");
      }
    },
    [actor, actorFetching, fetchRepliesForPosts],
  );

  // Initial load — also re-fetches when a reply is posted (refreshFlag changes)
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshFlag is intentional trigger
  useEffect(() => {
    if (!actor || actorFetching) return;
    setIsLoadingInitial(true);
    setLoadError(null);
    fetchPage(0n, false).finally(() => setIsLoadingInitial(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, actorFetching, fetchPage, refreshFlag]);

  // Poll for new messages (newest page only)
  useEffect(() => {
    if (!actor || actorFetching || isLoadingInitial) return;
    const interval = setInterval(async () => {
      if (!actor || document.hidden) return;
      try {
        const latestPage = await actor.getPosts(PAGE_SIZE, 0n);
        // Fetch replies for any new top-level posts
        const withReplies = await fetchRepliesForPosts(latestPage);
        setPosts((prev) => {
          const prevIds = new Set(prev.map((p) => p.id.toString()));
          const newItems = withReplies.filter(
            (p) => !prevIds.has(p.id.toString()),
          );
          if (newItems.length === 0) return prev;
          // Append new messages to END (newest at bottom)
          const newTopLevel = newItems.filter((p) => !p.parentId);
          const newReplies = newItems.filter((p) => p.parentId);
          return [...prev, ...newTopLevel, ...newReplies];
        });
        // Auto-scroll to bottom if user was already at bottom
        if (wasAtBottomRef.current) {
          requestAnimationFrame(() => scrollToBottom(false));
        }
      } catch {
        // silent — polling failure shouldn't flash errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [actor, actorFetching, isLoadingInitial, fetchRepliesForPosts]);

  // ── Scroll handling ──────────────────────────────────────────────────────

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!actor || isLoadingOlder || !hasMore) return;
    setIsLoadingOlder(true);
    const el = scrollContainerRef.current;
    const prevScrollHeight = el ? el.scrollHeight : 0;
    await fetchPage(offset, true);
    setIsLoadingOlder(false);
    requestAnimationFrame(() => {
      prependingRef.current = false;
      // Maintain scroll position after prepend
      if (el) {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop += newScrollHeight - prevScrollHeight;
      }
    });
  }, [actor, isLoadingOlder, hasMore, offset, fetchPage]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distFromBottom < 100;
    wasAtBottomRef.current = atBottom;
    setShowJumpToLatest(!atBottom);

    // Load older messages when user scrolls to the top
    const distFromTop = el.scrollTop;
    if (
      distFromTop < 200 &&
      hasMore &&
      !isLoadingOlder &&
      !prependingRef.current
    ) {
      loadOlderMessages();
    }
  }, [hasMore, isLoadingOlder, loadOlderMessages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (
      !isLoadingInitial &&
      posts.length > 0 &&
      !initialScrollDoneRef.current
    ) {
      initialScrollDoneRef.current = true;
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [isLoadingInitial, posts.length, scrollToBottom]);

  // Auto-scroll to bottom when new messages arrive (only if was at bottom)
  const prevPostsLengthRef = useRef(0);
  useEffect(() => {
    const grew = posts.length > prevPostsLengthRef.current;
    prevPostsLengthRef.current = posts.length;
    if (
      grew &&
      wasAtBottomRef.current &&
      initialScrollDoneRef.current &&
      !prependingRef.current
    ) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [posts.length, scrollToBottom]);

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
            wasAtBottomRef.current = true;
            requestAnimationFrame(() => scrollToBottom(false));
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

  // ── Handle post deletion ─────────────────────────────────────────────────
  const handlePostDeleted = useCallback((postId: bigint) => {
    setPosts((prev) =>
      prev.filter((p) => p.id !== postId && p.parentId !== postId),
    );
  }, []);

  // ── Handle reply posted — trigger refresh to fetch new replies ────────────
  const handleReplyPosted = useCallback(() => {
    setRefreshFlag((f) => f + 1);
  }, []);

  // ── Build thread tree ────────────────────────────────────────────────────
  const threadTree = buildThreadTree(posts);
  const topLevelPosts = posts.filter((p) => !p.parentId);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader
        className="flex-shrink-0 pb-2"
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d1b69 100%)",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <CardTitle className="text-white">Group Chat</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden px-3 pb-3">
        {/* ── Message list ─────────────────────────────────────────────── */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto pr-1"
            style={{
              background: "linear-gradient(180deg, #0a0f1e 0%, #050810 100%)",
            }}
            onScroll={handleScroll}
          >
            <div className="space-y-4 pb-2" data-testid="chat-messages">
              {/* Load-older indicator / button at top (oldest messages) */}
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
              {isLoadingOlder && (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {isLoadingInitial ? (
                <div className="space-y-3 pt-2" data-ocid="chat.loading_state">
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
                  handlePostDeleted,
                  handleReplyPosted,
                )
              )}

              {/* Load-older indicator / button at bottom (oldest messages) */}
              {/* Bottom sentinel */}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Jump to Latest button — scrolls to BOTTOM where newest messages are */}
          {showJumpToLatest && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
              <Button
                size="sm"
                className="pointer-events-auto shadow-lg gap-1.5 text-xs h-8 px-3"
                onClick={() => {
                  scrollToBottom(true);
                  setShowJumpToLatest(false);
                }}
                data-ocid="chat.jump_to_latest.button"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                Jump to Latest
              </Button>
            </div>
          )}
        </div>

        {/* ── Compose form ─────────────────────────────────────────────── */}
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

          {/* Input row: [text] [paperclip] [send] */}
          <div className="flex gap-2 min-w-0 items-center">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isPending}
              className="text-[14px] min-w-0 flex-1"
              data-ocid="chat.input"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
              aria-label="Attach image"
              data-ocid="chat.upload_button"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              disabled={(!message.trim() && !selectedImage) || isPending}
              size="icon"
              className="flex-shrink-0"
              data-ocid="chat.submit_button"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Helper: render thread nodes with date separators ───────────────────────

function renderTreeWithDateSeparators(
  nodes: ReturnType<typeof buildThreadTree>,
  topLevelPosts: Post[],
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
    elements.push(
      <ThreadedPostTree
        key={node.post.id.toString()}
        nodes={[node]}
        depth={0}
        onPostDeleted={onPostDeleted}
        onReplyPosted={onReplyPosted}
      />,
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
