import { ArrowDown, Loader2, Paperclip, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Post } from "../../backend";
import { ExternalBlob } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { useCreatePost } from "../../hooks/useQueries";
import { buildThreadTree } from "../../lib/chatThreads";
import { fileToUint8Array, validateImageFile } from "../../utils/file";
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

/** Returns the "YYYY-MM-DD" date string from a nanosecond timestamp */
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

  // Compose state
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createPost, isPending } = useCreatePost();

  // Scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [_isAtBottom, setIsAtBottom] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const wasAtBottomRef = useRef(true);
  // Flag to prevent load-older trigger after prepending old messages
  const prependingRef = useRef(false);
  // Flag to scroll to bottom on very first load
  const initialScrollDoneRef = useRef(false);

  // ── Fetch helpers ────────────────────────────────────────────────────────

  const fetchPage = useCallback(
    async (pageOffset: bigint, prepend: boolean) => {
      if (!actor || actorFetching) return;
      try {
        const page = await actor.getPosts(PAGE_SIZE, pageOffset);
        // API returns newest-first; reverse so we can render oldest-at-top
        const reversed = [...page].reverse();
        if (prepend) {
          prependingRef.current = true;
          setPosts((prev) => [...reversed, ...prev]);
        } else {
          setPosts(reversed);
        }
        setHasMore(page.length >= Number(PAGE_SIZE));
        setOffset(pageOffset + PAGE_SIZE);
      } catch {
        setLoadError("Failed to load messages.");
      }
    },
    [actor, actorFetching],
  );

  // Initial load
  useEffect(() => {
    if (!actor || actorFetching) return;
    setIsLoadingInitial(true);
    setLoadError(null);
    fetchPage(0n, false).finally(() => setIsLoadingInitial(false));
  }, [actor, actorFetching, fetchPage]);

  // Poll for new messages (newest page only)
  useEffect(() => {
    if (!actor || actorFetching || isLoadingInitial) return;
    const interval = setInterval(async () => {
      if (!actor) return;
      try {
        const latestPage = await actor.getPosts(PAGE_SIZE, 0n);
        const reversed = [...latestPage].reverse();
        setPosts((prev) => {
          // Merge: keep all old posts that are older than the oldest in latestPage
          // and append any new ones from latestPage not already in prev
          const prevIds = new Set(prev.map((p) => p.id.toString()));
          const newPosts = reversed.filter(
            (p) => !prevIds.has(p.id.toString()),
          );
          if (newPosts.length === 0) return prev;
          return [...prev, ...newPosts];
        });
      } catch {
        // silent — polling failure shouldn't flash errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [actor, actorFetching, isLoadingInitial]);

  // ── Scroll handling ──────────────────────────────────────────────────────

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distFromBottom < 100;
    setIsAtBottom(atBottom);
    wasAtBottomRef.current = atBottom;
    setShowJumpToLatest(!atBottom);

    // Load older messages when near top
    if (
      el.scrollTop < 200 &&
      hasMore &&
      !isLoadingOlder &&
      !prependingRef.current
    ) {
      loadOlderMessages();
    }
  }, [hasMore, isLoadingOlder]);

  const loadOlderMessages = useCallback(async () => {
    if (!actor || isLoadingOlder || !hasMore) return;
    setIsLoadingOlder(true);

    // Remember scroll position before prepend
    const el = scrollContainerRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    await fetchPage(offset, true);

    setIsLoadingOlder(false);

    // Restore scroll position after DOM updates
    requestAnimationFrame(() => {
      if (el) {
        el.scrollTop = el.scrollHeight - prevScrollHeight;
        prependingRef.current = false;
      }
    });
  }, [actor, isLoadingOlder, hasMore, offset, fetchPage]);

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

  // Auto-scroll when new messages arrive (only if was at bottom)
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

    try {
      let imageBlob: ExternalBlob | null = null;
      if (selectedImage) {
        const bytes = await fileToUint8Array(selectedImage);
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
            // Ensure we scroll to bottom after sending
            wasAtBottomRef.current = true;
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

  // ── Build thread tree from top-level posts only ──────────────────────────
  // All posts (including replies) are stored flat in state; buildThreadTree
  // groups them into a nested structure.
  const threadTree = buildThreadTree(posts);

  // ── Date separators ──────────────────────────────────────────────────────
  // We need to inject date separators between thread roots that cross a day
  // boundary. We'll track dates per top-level post.
  const topLevelPosts = posts.filter((p) => !p.parentId);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle>Group Chat</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden px-3 pb-3">
        {/* ── Message list ─────────────────────────────────────────────── */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto pr-1"
            onScroll={handleScroll}
          >
            {/* Load-older indicator */}
            {isLoadingOlder && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Load-older button (when near top but hasMore) */}
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

            <div className="space-y-4 pb-2">
              {isLoadingInitial ? (
                <div className="space-y-3 pt-2" data-ocid="chat.loading_state">
                  {/* Row 1 — left aligned */}
                  <div className="flex items-start gap-2">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5 flex-1 max-w-[65%]">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  </div>
                  {/* Row 2 — right aligned */}
                  <div className="flex items-start gap-2 flex-row-reverse">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5 flex-1 max-w-[65%] items-end flex flex-col">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                  </div>
                  {/* Row 3 — left aligned */}
                  <div className="flex items-start gap-2">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5 flex-1 max-w-[55%]">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-full rounded-xl" />
                    </div>
                  </div>
                  {/* Row 4 — right aligned */}
                  <div className="flex items-start gap-2 flex-row-reverse">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5 flex-1 max-w-[70%] items-end flex flex-col">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  </div>
                  {/* Row 5 — left aligned */}
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
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                /* Render thread tree with date separators between top-level nodes */
                renderTreeWithDateSeparators(threadTree, topLevelPosts)
              )}
            </div>
          </div>

          {/* Jump to Latest button */}
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
) {
  if (nodes.length === 0) return null;

  // Map postId → date key for quick lookup
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
