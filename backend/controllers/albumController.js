const { getAccessToken, fetchAllSavedAlbums, fetchArtistGenres, refreshAccessToken, ensureAccessToken } = require('../services/spotifyApi');
const { stringify } = require('csv-stringify/sync');
const { FRONTEND_ORIGIN } = require('../config/env');

const PAGE_SIZE = 50;

// CSV export columns
const exportColumns = [
  { key: 'album_id', header: 'album_id' },
  { key: 'album_name', header: 'album_name' },
  { key: 'artists', header: 'artists' },
  { key: 'release_date', header: 'release_date' },
  { key: 'total_tracks', header: 'total_tracks' },
  { key: 'added_at', header: 'added_at' },
  { key: 'url', header: 'url' },
  { key: 'artist_urls', header: 'artist_urls' },
  { key: 'genres', header: 'genres' },
  { key: 'popularity', header: 'popularity' },
  { key: 'image_url', header: 'image_url' },
  { key: 'total_duration', header: 'total_duration_seconds' },
];

// applies filters and sorting to the albums based on query parameters.
function applyFilters(query, sessionAlbums) {
  const { genre, minTracks, maxTracks, releaseAfter, releaseBefore, addedAfter, addedBefore, minDuration, maxDuration, sort, order } = query;

  let albums = [...(sessionAlbums || [])];

  // Multi-genre filter (comma-separated in query: ?genre=rock,pop)
  if (genre) {
    const selectedGenres = genre.split(',').map(g => g.trim().toLowerCase());
    albums = albums.filter(a => {
      const albumGenres = (a.genres || '').toLowerCase();
      return selectedGenres.some(g => albumGenres.includes(g));
    });
  }

  if (minTracks) albums = albums.filter(a => a.total_tracks >= Number(minTracks));
  if (maxTracks) albums = albums.filter(a => a.total_tracks <= Number(maxTracks));

  // Date filters with validation
  if (releaseAfter) {
    try {
      albums = albums.filter(a => new Date(a.release_date) >= new Date(releaseAfter));
    } catch (err) {
      console.error('Invalid releaseAfter date:', releaseAfter);
    }
  }
  if (releaseBefore) {
    try {
      albums = albums.filter(a => new Date(a.release_date) <= new Date(releaseBefore));
    } catch (err) {
      console.error('Invalid releaseBefore date:', releaseBefore);
    }
  }
  if (addedAfter) {
    try {
      albums = albums.filter(a => new Date(a.added_at) >= new Date(addedAfter));
    } catch (err) {
      console.error('Invalid addedAfter date:', addedAfter);
    }
  }
  if (addedBefore) {
    try {
      albums = albums.filter(a => new Date(a.added_at) <= new Date(addedBefore));
    } catch (err) {
      console.error('Invalid addedBefore date:', addedBefore);
    }
  }

  // Duration filters (convert minutes to seconds)
  const minDurationSeconds = minDuration ? Math.floor(Number(minDuration) * 60) : null;
  const maxDurationSeconds = maxDuration ? Math.floor(Number(maxDuration) * 60) : null;
  if (minDurationSeconds) albums = albums.filter(a => Math.floor(a.total_duration) >= minDurationSeconds);
  if (maxDurationSeconds) albums = albums.filter(a => Math.floor(a.total_duration) <= maxDurationSeconds);

  // Sorting
  if (sort) {
    albums.sort((a, b) => {
      let aVal = a[sort], bVal = b[sort];
      if (sort === 'album_name' || sort === 'artists') {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      } else if (sort === 'release_date' || sort === 'added_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (sort === 'total_tracks' || sort === 'popularity' || sort === 'total_duration') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }
      if (order === 'desc') return aVal < bVal ? 1 : -1;
      return aVal > bVal ? 1 : -1;
    });
  }

  return albums;
}

// Handles the Spotify callback to fetch and cache saved albums with genres
async function handleCallback(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code query param');

  try {
    console.log('Received code:', code);
    const { access_token, refresh_token, expires_in } = await getAccessToken(code);
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.tokenExpiry = Date.now() + (expires_in * 1000);
    console.log('Access token obtained');
    const albums = await fetchAllSavedAlbums(access_token);
    console.log('Fetched albums count:', albums.length);

    // Fetch genres
    const artistIdSet = new Set();
    albums.forEach(r => r.artist_ids.split('; ').forEach(id => id && artistIdSet.add(id)));
    const artistGenresMap = await fetchArtistGenres([...artistIdSet], access_token);

    albums.forEach(r => {
      const ids = r.artist_ids.split('; ').filter(Boolean);
      const genres = new Set();
      ids.forEach(id => {
        (artistGenresMap.get(id) || []).forEach(g => genres.add(g));
      });
      r.genres = [...genres].join('; ');
    });

    req.session.albums = albums;  

    const redirectTo = (FRONTEND_ORIGIN || 'http://127.0.0.1:5173') + '/?status=ok';
    console.log('Redirecting to:', redirectTo)
    return res.redirect(redirectTo);
  } catch (err) {
    console.error('handleCallback error:', err.response?.data || err.message);
    res.status(500).send('Error. See console.');
  }
}

// Handles filtering, sorting, and pagination of albums.
function handleFilter(req, res) {
  if (!req.session.albums || req.session.albums.length === 0) {
    return res.status(400).json({ error: 'No albums loaded. Authorize first.' });
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || PAGE_SIZE;

  const albums = applyFilters(req.query, req.session.albums);

  const totalAlbums = albums.length;
  const totalPages = Math.ceil(totalAlbums / limit);
  const paginatedAlbums = albums.slice((page - 1) * limit, page * limit);

  // Filter summary for frontend
  const summary = {
    totalAlbums,
    filters: {
      genres: req.query.genre ? req.query.genre.split(',').map(g => g.trim()) : [],
      minTracks: req.query.minTracks || null,
      maxTracks: req.query.maxTracks || null,
      releaseAfter: req.query.releaseAfter || null,
      releaseBefore: req.query.releaseBefore || null,
      addedAfter: req.query.addedAfter || null,
      addedBefore: req.query.addedBefore || null,
      minDuration: req.query.minDuration || null,
      maxDuration: req.query.maxDuration || null,
    }
  };

  res.json({ count: totalAlbums, albums: paginatedAlbums, totalPages, summary });
}

// Shuffles and returns all albums (ignores filters and pagination).
function handleShuffle(req, res) {
  if (!req.session.albums || req.session.albums.length === 0) {
    return res.status(400).json({ error: 'Albums not loaded yet. Authorize first.' });
  }

  const shuffled = req.session.albums
    .map(a => ({ sort: Math.random(), value: a }))
    .sort((a, b) => a.sort - b.sort)
    .map(a => a.value);

  res.json({ count: shuffled.length, albums: shuffled });
}

// Returns a sorted list of unique genres from all albums.
function getGenres(req, res) {
  if (!req.session.albums || req.session.albums.length === 0) {
    return res.status(400).json({ error: 'No albums loaded. Authorize first.' });
  }
  const genreCounts = new Map();
  req.session.albums.forEach(a => {
    (a.genres || '').split('; ').forEach(g => {
      if (g.trim()) {
        genreCounts.set(g.trim(), (genreCounts.get(g.trim()) || 0) + 1);
      }
    });
  });
  const genres = [...genreCounts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
  res.json({ genres });
}

// Exports all albums to CSV.
function exportCsv(req, res) {
  if (!req.session.albums || req.session.albums.length === 0) {
    return res.status(400).json({ error: 'No albums to export' });
  }
  try {
    const csv = stringify(req.session.albums, { header: true, columns: exportColumns });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="saved_albums.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('CSV export failed. See console.');
  }
}

// Exports filtered albums to CSV.
function exportFilteredCsv(req, res) {
  if (!req.session.albums || req.session.albums.length === 0) {
    return res.status(400).json({ error: 'No albums to export' });
  }
  try {
    const filtered = applyFilters(req.query, req.session.albums);
    const csv = stringify(filtered, { header: true, columns: exportColumns });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="saved_albums_filtered.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Filtered CSV export failed. See console.');
  }
}

// Exports all albums to JSON.
function exportJson(req, res) {
  if (!req.session.albums || req.session.albums.length === 0) {
    return res.status(400).json({ error: 'No albums to export' });
  }
  res.setHeader('Content-Disposition', 'attachment; filename="saved_albums.json"');
  res.json(req.session.albums);
}

// Exports filtered albums to JSON.
function exportFilteredJson(req, res) {
  if (!req.session.albums || req.session.albums.length === 0) {
    return res.status(400).json({ error: 'No albums to export' });
  }
  const filtered = applyFilters(req.query, req.session.albums);
  res.setHeader('Content-Disposition', 'attachment; filename="saved_albums_filtered.json"');
  res.json(filtered);
}

function handleFull(req, res) {
  if (!req.session.albums || req.session.albums.length === 0) {
    return res.status(400).json({ error: 'No albums loaded. Authorize first.' });
  }
  const albums = applyFilters(req.query, req.session.albums);
  res.json({ albums });
}

async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true });
  });
}


async function refresh(req, res) {
  if (!req.session.refreshToken) {
    return res.status(401).json({ error: 'No session to refresh' });
  }

  try {
    // Ensure we have a valid access token before fetching
    const tokenData = await ensureAccessToken(
      req.session.accessToken,
      req.session.refreshToken,
      req.session.tokenExpiry
    );
    
    req.session.accessToken = tokenData.accessToken;
    req.session.refreshToken = tokenData.refreshToken;
    req.session.tokenExpiry = tokenData.tokenExpiry;
    
    const albums = await fetchAllSavedAlbums(tokenData.accessToken);
    
    const artistIdSet = new Set();
    albums.forEach(r => r.artist_ids.split('; ').forEach(id => id && artistIdSet.add(id)));
    const artistGenresMap = await fetchArtistGenres([...artistIdSet], tokenData.accessToken);

    albums.forEach(r => {
      const ids = r.artist_ids.split('; ').filter(Boolean);
      const genres = new Set();
      ids.forEach(id => {
        (artistGenresMap.get(id) || []).forEach(g => genres.add(g));
      });
      r.genres = [...genres].join('; ');
    });

    req.session.albums = albums;
    res.json({ success: true, count: albums.length });
  } catch (err) {
    console.error('Refresh failed:', err);
    res.status(500).json({ error: 'Refresh failed', message: err.message });
  }
}

module.exports = {
  handleCallback,
  handleFilter,
  handleShuffle,
  getGenres,
  exportCsv,
  exportFilteredCsv,
  exportJson,
  exportFilteredJson,
  handleFull,
  logout,
  refresh
};