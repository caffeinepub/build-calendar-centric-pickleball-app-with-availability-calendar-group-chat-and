import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const GIPHY_API_KEY = "qohVIe02dMlAlSTnVtSwYOwF0DQ9qZDN";

interface GiphyImage {
  url: string;
}

interface GiphyGif {
  id: string;
  images: {
    fixed_height: GiphyImage;
    original: GiphyImage;
  };
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = searchQuery.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch GIFs");
      const json = await res.json();
      setGifs(json.data || []);
    } catch {
      setError("Failed to load GIFs");
      setGifs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load: trending
  useEffect(() => {
    fetchGifs("");
  }, [fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchGifs]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full mb-2 left-0 z-50 rounded-xl border border-white/10 shadow-2xl overflow-hidden"
      style={{
        width: "320px",
        background: "rgba(15, 23, 42, 0.97)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="h-8 pl-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
            autoFocus
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 text-white/50 hover:text-white hover:bg-white/10"
          onClick={onClose}
          aria-label="Close GIF picker"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Label */}
      <div className="px-3 py-1 text-[10px] text-white/30 uppercase tracking-wider font-semibold">
        {query.trim() ? "Search Results" : "Trending"}
      </div>

      {/* GIF Grid */}
      <div className="overflow-y-auto p-2" style={{ maxHeight: "260px" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : error ? (
          <p className="text-center text-xs text-red-400/80 py-6">{error}</p>
        ) : gifs.length === 0 ? (
          <p className="text-center text-xs text-white/30 py-6">
            No results found
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => {
                  onSelect(gif.images.original.url);
                }}
                className="rounded-lg overflow-hidden border border-white/10 hover:border-primary/70 hover:scale-[1.04] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label="Send GIF"
              >
                <img
                  src={gif.images.fixed_height.url}
                  alt="GIF"
                  className="w-full h-auto object-cover block"
                  style={{ aspectRatio: "1 / 1", objectFit: "cover" }}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Giphy attribution */}
      <div className="px-3 py-1.5 border-t border-white/10 flex items-center justify-end">
        <span className="text-[9px] text-white/20 uppercase tracking-wider">
          Powered by GIPHY
        </span>
      </div>
    </div>
  );
}
