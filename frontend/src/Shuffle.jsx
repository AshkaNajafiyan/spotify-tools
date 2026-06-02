import { useEffect, useState, useRef, useContext } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { isObject, motion } from "framer-motion";
import DateSelector from './DateSelector.jsx';
import { FilterContext } from './FilterContext.jsx';
import ExportButtons from './ExportButtons.jsx';
import Toast from './Toast.jsx';
import { saveAlbums, getAlbums, getGenres, getLastUpdated, clearDB } from './db.js';
import Papa from "papaparse";
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { toast } from 'react-toastify';

function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function DateInput({ placeholder, value, onChange }) {
  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function sanitizeDate(val) {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length !== 3) return '';
    let [y, m, d] = parts.map(p => parseInt(p, 10));
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return '';
    if (y < 1000) y = 1000;
    if (y > 9999) y = 9999;
    if (m < 1) m = 1;
    if (m > 12) m = 12;
    const maxDay = daysInMonth(y, m);
    if (d < 1) d = 1;
    if (d > maxDay) d = maxDay;
    const ys = String(y).padStart(4, '0');
    const ms = String(m).padStart(2, '0');
    const ds = String(d).padStart(2, '0');
    return `${ys}-${ms}-${ds}`;
  }

  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={e => onChange(sanitizeDate(e.target.value))}
        min="1000-01-01"
        max="9999-12-31"
        className="px-3 py-2 rounded-full border border-gray-700 bg-gray-800 w-36 text-sm italic text-white cursor-text"
      />
      {!value && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm italic pointer-events-none">
          {placeholder}
        </span>
      )}
    </div>
  );
}

export default function Shuffle() {
  const location = useLocation();
  const [shuffledAlbums, setShuffledAlbums] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { filters, setFilters, handleFilterChange, toggleGenre, resetFilters, clearAllGenres } = useContext(FilterContext);
  const [allGenres, setAllGenres] = useState([]);
  const [showGenres, setShowGenres] = useState(false);
  const [genreSearch, setGenreSearch] = useState('');
  const genreDropdownRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8888";
  const navigate = useNavigate();

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    async function checkAuthAndLoad() {
      setLoading(true);
      try {
        const cachedAlbums = await getAlbums();
        const cachedGenres = await getGenres();
        const lastUpdated = await getLastUpdated();
        if (cachedAlbums.length > 0) {
          console.log('Loading from cache, last updated:', lastUpdated ? new Date(lastUpdated) : 'Unknown');
          setAllGenres(cachedGenres);
          applyShuffleAndFilters(cachedAlbums);
          setIsInitialLoad(false);
        }
        const isOnline = navigator.onLine;
        const isStale = !lastUpdated || (Date.now() - lastUpdated > 7 * 24 * 60 * 60 * 1000);
        if (isOnline && (isStale || cachedAlbums.length === 0)) {
          console.log('Syncing with backend...');
          setIsRefreshing(true);
          const resp = await fetch(`${backendUrl}/albums/genres`, { credentials: 'include' });
          if (!resp.ok) {
            navigate('/');
            return;
          }
          const data = await resp.json();
          setAllGenres(data.genres || []);

          const fullResp = await fetch(`${backendUrl}/albums/full`, { credentials: 'include' });
          if (fullResp.ok) {
            const fullData = await fullResp.json();
            await saveAlbums(fullData.albums || []);
            const updatedAlbums = await getAlbums();
            applyShuffleAndFilters(updatedAlbums);
            setIsInitialLoad(false);
          }
        } else if (!isOnline) {
          console.log('Offline: Using cache only');
          toast.info('Offline: Using cached albums');
          setIsInitialLoad(false);
        }
      } catch (err) {
        console.error('Error in Shuffle load:', err);
        if (!navigator.onLine) {
          toast.error('Offline: Showing cached data if available');
          toast.warn('Offline - data may be stale');
        } else {
          navigate('/');
        }
        setIsInitialLoad(false);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
    checkAuthAndLoad();
  }, [navigate, backendUrl]);

  // Single effect for filter changes - use local cache, not backend
  useEffect(() => {
    // Don't apply filters during initial load
    if (isInitialLoad) return;
    
    async function applyOnFilters() {
      const albums = await getAlbums();
      if (albums.length > 0) {
        applyShuffleAndFilters(albums);
      }
    }
    applyOnFilters();
  }, [filters, searchQuery]);

  function applyShuffleAndFilters(albums) {
    let filtered = albums;

    if (filters.genre.length > 0) {filtered = filtered.filter(a => filters.genre.some(g => (a.genres || '').toLowerCase().includes(g.toLowerCase())));}
    if (filters.minTracks) filtered = filtered.filter(a => a.total_tracks >= Number(filters.minTracks));
    if (filters.maxTracks) filtered = filtered.filter(a => a.total_tracks <= Number(filters.maxTracks));
    if (filters.releaseAfter) filtered = filtered.filter(a => new Date(a.release_date) >= new Date(filters.releaseAfter));
    if (filters.releaseBefore) filtered = filtered.filter(a => new Date(a.release_date) <= new Date(filters.releaseBefore));
    if (filters.addedAfter) filtered = filtered.filter(a => new Date(a.added_at) >= new Date(filters.addedAfter));
    if (filters.addedBefore) filtered = filtered.filter(a => new Date(a.added_at) <= new Date(filters.addedBefore));
    const minDurationSeconds = filters.minDuration ? Number(filters.minDuration) * 60 : null;
    const maxDurationSeconds = filters.maxDuration ? Number(filters.maxDuration) * 60 : null;
    if (minDurationSeconds) filtered = filtered.filter(a => a.total_duration >= minDurationSeconds);
    if (maxDurationSeconds) filtered = filtered.filter(a => a.total_duration <= maxDurationSeconds);
    if (searchQuery.trim()) {const sq = searchQuery.toLowerCase(); filtered = filtered.filter(a => a.album_name.toLowerCase().includes(sq) || a.artists.toLowerCase().includes(sq));}

    if (filters.sort) {
      filtered.sort((a, b) => {
        let aVal = a[filters.sort], bVal = b[filters.sort];
        if (['album_name', 'artists'].includes(filters.sort)) {
          aVal = (aVal || '').toLowerCase();
          bVal = (bVal || '').toLowerCase();
        } else if (['release_date', 'added_at'].includes(filters.sort)) {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        } else {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        return filters.order === 'desc' ? (aVal < bVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
      });
    }

    const shuffled = shuffleArray([...filtered]);
    setShuffledAlbums(shuffled);
    setCurrentIndex(0);
  }

  async function handleRefresh() {
    if (!navigator.onLine) {
      toast.error('You are offline. Cannot refresh from server.');
      toast.warn('Offline - data may be stale');
      return;
    }
    setIsRefreshing(true);
    try {
      const refreshResp = await fetch(`${backendUrl}/albums/refresh`, { method: 'POST', credentials: 'include' });
      if (refreshResp.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/');
        return;
      }
      if (!refreshResp.ok) {
        throw new Error('Refresh failed');
      }
      const fullResp = await fetch(`${backendUrl}/albums/full`, { credentials: 'include' });
      if (fullResp.ok) {
        const fullData = await fullResp.json();
        await saveAlbums(fullData.albums || []);
        const updatedAlbums = await getAlbums();
        applyShuffleAndFilters(updatedAlbums);
      }
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Failed to refresh albums');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleLogout() {
    if (!navigator.onLine) {
      await clearDB();
      navigate('/');
      toast.error('Offline: Local data cleared. Server session may persist until online.');
      toast.warn('Offline - data may be stale');
      return;
    }
    try {
      await fetch(`${backendUrl}/albums/logout`, { credentials: 'include' });
      await clearDB();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      toast.error('Failed to logout from server');
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target)) {
        setShowGenres(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function nextAlbum() {
    setCurrentIndex((prev) => (prev + 1) % shuffledAlbums.length);
  }

  function prevAlbum() {
    setCurrentIndex((prev) => (prev - 1 + shuffledAlbums.length) % shuffledAlbums.length);
  }

  function removeFilterChip(key, value) {
    if (key === "genre") {
      toggleGenre(value);
    } else if (key === "sort") {
      handleFilterChange("sort", "");
      handleFilterChange("order", "asc");
    } else {
      handleFilterChange(key, "");
    }
  }

  const exportColumns = ['album_id', 'album_name', 'artists', 'release_date', 'total_tracks', 'added_at', 'url','artist_urls', 'genres', 'popularity', 'image_url', 'total_duration'];

  async function handleExport(format, filtered = false) {
    try {
      let albums = await getAlbums();
      if (filtered) {
        if (filters.genre.length > 0) {albums = albums.filter(a => filters.genre.some(g => (a.genres || '').toLowerCase().includes(g.toLowerCase())));}
        if (filters.minTracks) albums = albums.filter(a => a.total_tracks >= Number(filters.minTracks));
        if (filters.maxTracks) albums = albums.filter(a => a.total_tracks <= Number(filters.maxTracks));
        if (filters.releaseAfter) albums = albums.filter(a => new Date(a.release_date) >= new Date(filters.releaseAfter));
        if (filters.releaseBefore) albums = albums.filter(a => new Date(a.release_date) <= new Date(filters.releaseBefore));
        if (filters.addedAfter) albums = albums.filter(a => new Date(a.added_at) >= new Date(filters.addedAfter));
        if (filters.addedBefore) albums = albums.filter(a => new Date(a.added_at) <= new Date(filters.addedBefore));
        const minDurationSeconds = filters.minDuration ? Number(filters.minDuration) * 60 : null;
        const maxDurationSeconds = filters.maxDuration ? Number(filters.maxDuration) * 60 : null;
        if (minDurationSeconds) albums = albums.filter(a => a.total_duration >= minDurationSeconds);
        if (maxDurationSeconds) albums = albums.filter(a => a.total_duration <= maxDurationSeconds);

        if (filters.sort) {
          albums.sort((a, b) => {
            let aVal = a[filters.sort], bVal = b[filters.sort];
            if (['album_name', 'artists'].includes(filters.sort)) {
              aVal = (aVal || '').toLowerCase();
              bVal = (bVal || '').toLowerCase();
            } else if (['release_date', 'added_at'].includes(filters.sort)) {
              aVal = new Date(aVal);
              bVal = new Date(bVal);
            } else {
              aVal = Number(aVal);
              bVal = Number(bVal);
            }
            return filters.order === 'desc' ? (aVal < bVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
          });
        }
      }

      if (format === 'csv') {
        const csv = Papa.unparse(albums, { columns: exportColumns, header: true });
        downloadFile(csv, `saved_albums${filtered ? '_filtered' : ''}.csv`, 'text/csv');
        setToast(`Exported CSV${filtered ? ' (filtered)' : ''}`);
        setTimeout(() => setToast(''), 3000);
      } else if (format === 'json') {
        const json = JSON.stringify(albums, null, 2);
        downloadFile(json, `saved_albums${filtered ? '_filtered' : ''}.json`, 'application/json');
        setToast(`Exported JSON${filtered ? ' (filtered)' : ''}`);
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export');
    }
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const currentAlbum = shuffledAlbums[currentIndex];
  const [toast, setToast] = useState('');

  try {
    return (
      <>
        <div
          className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-950 text-white font-sans"
          style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}
        >
          <div className="max-w-7xl mx-auto p-4">
            <h1 className="text-4xl font-bold mb-6 text-center">Shuffle Liked Albums</h1>

            {isRefreshing && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" aria-live="polite" aria-label="Syncing albums">
                <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-2xl border border-gray-700 shadow-xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" aria-hidden="true"></div>
                  <span className="text-white text-lg">Syncing albums...</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 mb-6 justify-center items-center">
              <button onClick={handleRefresh} className="rounded-full bg-purple-800 text-white px-5 py-2 font-semibold hover:bg-gray-700 shadow-md transition cursor-pointer border border-white/30" disabled={loading || isRefreshing} aria-label="Refresh albums from server">
                Refresh Albums
              </button>

              <button
                className="rounded-full bg-gray-800 text-white px-5 py-2 font-semibold hover:bg-gray-700 shadow-md transition cursor-pointer border border-white/30"
                onClick={() => navigate("/albums", { state: { filters } })}
                aria-label="Back to albums view"
              >
                Back to Albums
              </button>

              <ExportButtons handleExport={handleExport} loading={loading} />

              <button
                onClick={() => setShowFilters(v => !v)}
                className={`ml-1 rounded-full px-5 py-2 flex items-center gap-3 transition shadow-md cursor-pointer border border-white/30
                          ${showFilters ? "bg-green-500 text-black" : "bg-gray-800 text-white hover:bg-gray-700"}`}
                aria-expanded={showFilters}
              >
                <svg className={`w-5 h-5 transform transition ${showFilters ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">{showFilters ? "Hide Filters" : "Show Filters"}</span>
              </button>
            </div>

            <motion.div
              initial={false}
              animate={{ height: showFilters ? "auto" : 0, opacity: showFilters ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              className={`mb-6 ${showFilters ? 'overflow-visible' : 'overflow-hidden'}`}
            >
              <div className="bg-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-700">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="relative w-full sm:w-auto" ref={genreDropdownRef}>
                    <button
                      type="button"
                      className="rounded-full px-4 py-2 bg-gray-800 border border-gray-700 w-full sm:w-56 text-left flex items-center justify-between shadow-sm cursor-pointer"
                      onClick={() => setShowGenres(!showGenres)}
                    >
                      <span className="truncate text-sm italic text-gray-400">
                        {filters.genre.length
                          ? filters.genre.length <= 2
                            ? filters.genre.join(", ")
                            : `${filters.genre.slice(0, 2).join(", ")}...`
                          : "Select Genres"}
                      </span>
                      <svg className="w-4 h-4 ml-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
                    </button>

                    {showGenres && (
                      <div className="absolute z-20 mt-2 bg-gray-800 border border-gray-700 rounded-2xl p-3 w-56 max-h-64 overflow-auto shadow-xl">
                        <div className="relative mb-2">
                          <input
                            type="text"
                            placeholder="Search genres"
                            value={genreSearch}
                            onChange={e => setGenreSearch(e.target.value.toLowerCase())}
                            className="w-full px-3 py-2 rounded-full border border-gray-700 bg-gray-900 text-sm placeholder-gray-500 focus:outline-none"
                          />
                          {genreSearch && (
                            <button
                              onClick={() => setGenreSearch('')}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {filters.genre.length > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
                              <span>Selected ({filters.genre.length})</span>
                              <button onClick={clearAllGenres} className="text-red-400 hover:underline text-sm cursor-pointer">Clear</button>
                            </div>

                            <div className="flex flex-col gap-1 mb-2">
                              {filters.genre.map(selectedGenre => {
                                const genreObj = allGenres.find(g => g.genre === selectedGenre);
                                return (
                                  <label key={`selected-${selectedGenre}`} className="flex items-center gap-2 text-sm text-gray-300 py-1 px-2 rounded-full bg-gray-900/40 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={true}
                                      onChange={() => toggleGenre(selectedGenre)}
                                      className="w-4 h-4"
                                    />
                                    <span>{selectedGenre} <span className="text-gray-500">({genreObj?.count || 0})</span></span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-1">
                          {allGenres
                            .filter(g => (g.genre || '').toLowerCase().includes(genreSearch))
                            .map(g => (
                              <label
                                key={g.genre}
                                className="flex items-center gap-2 text-sm text-gray-300 py-2 px-2 rounded hover:bg-gray-700 transition cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={filters.genre.includes(g.genre)}
                                  onChange={() => toggleGenre(g.genre)}
                                  className="w-4 h-4"
                                />
                                <span className="truncate">{g.genre} <span className="text-gray-500">({g.count})</span></span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Debug fallback when genres are empty (helps detect clipping vs. no-data) */}
                    {!loading && allGenres.length === 0 && (
                      <div className="mt-2 text-sm text-red-400">No genres loaded (allGenres.length === 0) — check backend or styles</div>
                    )}
                  </div>

                  <div className="w-full sm:w-auto">
                    <label htmlFor="shuffleMinTracks" className="sr-only">Min Tracks</label>
                    <input
                      id="shuffleMinTracks"
                      placeholder="Min Tracks"
                      type="number"
                      value={filters.minTracks}
                      onChange={e => handleFilterChange("minTracks", e.target.value)}
                      className="px-3 py-2 rounded-full border border-gray-700 bg-gray-800 w-full sm:w-36 text-sm italic placeholder-gray-400 cursor-text"
                      aria-label="Minimum number of tracks"
                    />
                  </div>

                  <div className="w-full sm:w-auto">
                    <label htmlFor="shuffleMaxTracks" className="sr-only">Max Tracks</label>
                    <input
                      id="shuffleMaxTracks"
                      placeholder="Max Tracks"
                      type="number"
                      value={filters.maxTracks}
                      onChange={e => handleFilterChange("maxTracks", e.target.value)}
                      className="px-3 py-2 rounded-full border border-gray-700 bg-gray-800 w-full sm:w-36 text-sm italic placeholder-gray-400 cursor-text"
                      aria-label="Maximum number of tracks"
                    />
                  </div>

                  <div className="w-full sm:w-auto">
                    <DateSelector
                      placeholder="Release After"
                      value={filters.releaseAfter}
                      onChange={value => handleFilterChange("releaseAfter", value)}
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <DateSelector
                      placeholder="Release Before"
                      value={filters.releaseBefore}
                      onChange={value => handleFilterChange("releaseBefore", value)}
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <DateSelector
                      placeholder="Added After"
                      value={filters.addedAfter}
                      onChange={value => handleFilterChange("addedAfter", value)}
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <DateSelector
                      placeholder="Added Before"
                      value={filters.addedBefore}
                      onChange={value => handleFilterChange("addedBefore", value)}
                    />
                  </div>

                  <div className="w-full sm:w-auto">
                    <label htmlFor="shuffleMinDuration" className="sr-only">Min Duration</label>
                    <input
                      id="shuffleMinDuration"
                      placeholder="Min Duration"
                      type="number"
                      value={filters.minDuration}
                      onChange={e => handleFilterChange("minDuration", e.target.value)}
                      className="px-3 py-2 rounded-full border border-gray-700 bg-gray-800 w-full sm:w-36 text-sm italic placeholder-gray-400 cursor-text"
                      aria-label="Minimum duration in minutes"
                    />
                  </div>

                  <div className="w-full sm:w-auto">
                    <label htmlFor="shuffleMaxDuration" className="sr-only">Max Duration</label>
                    <input
                      id="shuffleMaxDuration"
                      placeholder="Max Duration"
                      type="number"
                      value={filters.maxDuration}
                      onChange={e => handleFilterChange("maxDuration", e.target.value)}
                      className="px-3 py-2 rounded-full border border-gray-700 bg-gray-800 w-full sm:w-36 text-sm italic placeholder-gray-400 cursor-text"
                      aria-label="Maximum duration in minutes"
                    />
                  </div>

                  <div className="w-full sm:w-auto">
                    <label htmlFor="shuffleSortBy" className="sr-only">Sort by</label>
                    <select
                      id="shuffleSortBy"
                      value={filters.sort}
                      onChange={e => handleFilterChange("sort", e.target.value)}
                      className="px-4 py-2 rounded-full border border-gray-700 bg-gray-800 w-full sm:w-44 text-sm appearance-none cursor-pointer"
                      aria-label="Sort albums by"
                    >
                      <option value="">Sort by</option>
                      <option value="album_name">Album Name</option>
                      <option value="artists">Artists</option>
                      <option value="release_date">Release Date</option>
                      <option value="total_tracks">Total Tracks</option>
                      <option value="popularity">Popularity</option>
                      <option value="added_at">Added At</option>
                      <option value="total_duration">Total Duration</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-auto">
                    <label htmlFor="shuffleSortOrder" className="sr-only">Sort order</label>
                    <select
                      id="shuffleSortOrder"
                      value={filters.order}
                      onChange={e => handleFilterChange("order", e.target.value)}
                      className="px-4 py-2 rounded-full border border-gray-700 bg-gray-800 w-full sm:w-36 text-sm appearance-none cursor-pointer"
                      aria-label="Sort order"
                    >
                      <option value="asc">Asc</option>
                      <option value="desc">Desc</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label htmlFor="shuffleSearchQuery" className="sr-only">Search</label>
                    <input
                      id="shuffleSearchQuery"
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Album or artist name"
                      className="px-3 py-2 rounded-full border border-gray-700 bg-gray-800 text-sm text-white w-full sm:w-48"
                      aria-label="Search albums or artists"
                    />
                  </div>

                  <div className="w-full sm:w-auto">
                    <button
                      onClick={() => { resetFilters(); setSearchQuery(''); }}
                      className="rounded-full bg-red-600 text-white px-5 py-2 hover:bg-red-700 shadow-sm cursor-pointer border border-white/30 font-semibold w-full sm:w-auto"
                      aria-label="Reset all filters"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {(filters.genre.length ||
              filters.minTracks ||
              filters.maxTracks ||
              filters.releaseAfter ||
              filters.releaseBefore ||
              filters.addedAfter ||
              filters.addedBefore ||
              filters.minDuration ||
              filters.maxDuration ||
              filters.sort) && (
              <div className="mb-4 inline-block bg-gray-800 rounded-full p-2 text-sm text-gray-300 flex flex-wrap gap-2 items-center">
                <span className="font-semibold mr-2">Active filters:</span>
                {filters.genre.map(g => (
                  <button
                    key={g}
                    onClick={() => removeFilterChip("genre", g)}
                    className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer"
                  >
                    {g}
                  </button>
                ))}
                {filters.minTracks && (
                  <button onClick={() => removeFilterChip("minTracks")} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    Min Tracks: {filters.minTracks}
                  </button>
                )}
                {filters.maxTracks && (
                  <button onClick={() => removeFilterChip("maxTracks")} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    Max Tracks: {filters.maxTracks}
                  </button>
                )}
                {filters.releaseAfter && (
                  <button onClick={() => removeFilterChip("releaseAfter")} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    After: {filters.releaseAfter}
                  </button>
                )}
                {filters.releaseBefore && (
                  <button onClick={() => removeFilterChip("releaseBefore")} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    Before: {filters.releaseBefore}
                  </button>
                )}
                {filters.addedAfter && (
                  <button onClick={() => removeFilterChip("addedAfter")} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    Added After: {filters.addedAfter}
                  </button>
                )}
                {filters.addedBefore && (
                  <button onClick={() => removeFilterChip("addedBefore")} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    Added Before: {filters.addedBefore}
                  </button>
                )}
                {filters.minDuration && (
                  <button onClick={() => removeFilterChip("minDuration")} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    Min Duration: {filters.minDuration} min
                  </button>
                )}
                {filters.maxDuration && (
                  <button onClick={() => removeFilterChip("maxDuration")} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    Max Duration: {filters.maxDuration} min
                  </button>
                )}
                {filters.sort && (
                  <button onClick={() => removeFilterChip("sort")} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    Sort: {filters.sort} ({filters.order})
                  </button>
                )}
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                    Search: {searchQuery}
                  </button>
                )}
                <button onClick={() => { resetFilters(); setSearchQuery(''); }} className="ml-2 rounded-full bg-gray-700 px-3 py-1 text-sm cursor-pointer">
                  Clear all
                </button>
              </div>
            )}

            {loading && !isRefreshing && (
              <div className="text-center mb-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
                <span className="ml-2 text-gray-300">Loading shuffled albums...</span>
              </div>
            )}

            <div className="mb-4">
              <div className="inline-block bg-gray-800 rounded-full px-4 py-2 text-sm text-gray-300">
                Album {currentIndex + 1} of {shuffledAlbums.length}
              </div>
            </div>

            {shuffledAlbums.length === 0 && !loading && (
              <div className="text-center text-gray-300">No albums available. Please adjust filters.</div>
            )}

            {currentAlbum && (
              <div className="flex justify-center mb-6">
                <motion.div 
                  key={currentAlbum.album_id} 
                  className="bg-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-md cursor-pointer w-full max-w-md" 
                  role="article" 
                  aria-label={`${currentAlbum.album_name} by ${currentAlbum.artists}`}
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.4 }}
                >
                  <a 
                    href={currentAlbum.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="block"
                    aria-label={`Open ${currentAlbum.album_name} by ${currentAlbum.artists} on Spotify`}
                  >
                    <img 
                      src={currentAlbum.image_url} 
                      alt={`Cover of ${currentAlbum.album_name} by ${currentAlbum.artists}`} 
                      className="w-full h-64 object-cover" 
                    />
                  </a>
                  <div className="p-3 flex flex-col gap-1">
                    <a 
                      href={currentAlbum.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="font-semibold text-white truncate hover:underline cursor-pointer"
                      aria-label={`Open ${currentAlbum.album_name} by ${currentAlbum.artists} on Spotify`}
                    >
                      {currentAlbum.album_name}
                    </a>
                    <div className="text-gray-300 text-sm truncate">
                      {currentAlbum.artists.split("; ").map((artist, i) => (
                        <span key={i}>
                          <a
                            href={currentAlbum.artist_urls.split("; ")[i]}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline cursor-pointer"
                            aria-label={`View ${artist} on Spotify`}
                          >
                            {artist}
                          </a>
                          {i < currentAlbum.artists.split("; ").length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-gray-500 text-xs flex-1">
                        {currentAlbum.release_date} • {currentAlbum.total_tracks} tracks • Added: {currentAlbum.added_at.split("T")[0]}
                      </div>
                      <div className="mt-1 w-10 h-10 flex-shrink-0">
                        <CircularProgressbar
                          value={currentAlbum.popularity}
                          text={`${currentAlbum.popularity}%`}
                          styles={{
                            path: { stroke: '#22c55e' },
                            text: { fill: '#fff', fontSize: '16px' }
                          }}
                        />
                      </div>
                    </div>
                    <a 
                      href={currentAlbum.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="mt-2 inline-block text-green-500 text-sm hover:underline cursor-pointer"
                      aria-label={`Open ${currentAlbum.album_name} by ${currentAlbum.artists} on Spotify`}
                    >
                      Open
                    </a>
                  </div>
                </motion.div>
              </div>
            )}

            <div className="flex justify-center gap-4 mt-4 mb-8">
              {currentIndex > 0 && (
                <button
                  onClick={prevAlbum}
                  className="rounded-full bg-gray-800 text-white px-5 py-2 font-semibold hover:bg-gray-700 shadow-md transition disabled:opacity-50 cursor-pointer border border-white/30"
                  disabled={loading || shuffledAlbums.length <= 1}
                  aria-label="Previous album"
                >
                  Previous
                </button>
              )}
              <button
                onClick={nextAlbum}
                className="rounded-full bg-gray-800 text-white px-5 py-2 font-semibold hover:bg-gray-700 shadow-md transition disabled:opacity-50 cursor-pointer border border-white/30"
                disabled={loading || shuffledAlbums.length <= 1}
                aria-label="Next album"
              >
                Next
              </button>
            </div>
            

            {/* Export actions moved to header via ExportButtons component */}

            <Toast message={toast} />

          </div>
        </div>
      </>
    );
  } catch (e) {
    console.error('Render error:', e);
    return <div>Error rendering Shuffle page</div>;
  }
}