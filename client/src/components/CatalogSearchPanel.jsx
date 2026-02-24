import { useState } from "react";
import { searchCatalogTracks } from "../services/catalogApi";

export default function CatalogSearchPanel({ onUseTrack }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const runSearch = async () => {
    const nextQuery = query.trim();
    if (!nextQuery) return;

    setIsLoading(true);
    setError("");
    try {
      const tracks = await searchCatalogTracks(nextQuery, 8);
      setResults(tracks);
    } catch (searchError) {
      setResults([]);
      setError(searchError?.message || "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
      <p className="text-sm font-medium text-slate-200">Search Songs</p>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void runSearch();
            }
          }}
          placeholder="Artist name..."
          className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan"
        />

        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={isLoading}
          className="rounded-xl border border-cyan/40 bg-cyan/15 px-3 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/25 disabled:opacity-50"
        >
          {isLoading ? "..." : "Search"}
        </button>
      </div>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      {results.length ? (
        <ul className="max-h-48 space-y-2 overflow-auto pr-1">
          {results.map((track) => (
            <li
              key={track.id}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-100">{track.name}</p>
                <p className="truncate text-slate-400">
                  {track.artistName} - {track.albumName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUseTrack(track.audio)}
                className="rounded-md border border-emerald-400/40 bg-emerald-400/20 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-400/30"
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
