const axios = require('axios');
const querystring = require('querystring');
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require('../config/env');

// === AUTH HEADER (for client credentials) ===
function basicAuthHeader() {
    return 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
}

// === EXCHANGE AUTH CODE FOR ACCESS TOKEN ===
async function getAccessToken(code) {
    try {
        const resp = await axios.post('https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': basicAuthHeader(),
                },
            }
        );

        return resp.data; // { access_token, refresh_token, expires_in }
    } catch (err) {
        console.error('Error exchanging auth code:', err.response?.data || err.message);
        throw err;
    }
}

// === REFRESH ACCESS TOKEN ===
async function refreshAccessToken(refreshToken) {
    if (!refreshToken) throw new Error('No refresh token provided');

    try {
        const resp = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: basicAuthHeader(),
                },
            }
        );

        const newAccessToken = resp.data.access_token;
        const newRefreshToken = resp.data.refresh_token || refreshToken;  // Spotify may not always return new refresh
        const newExpiry = Date.now() + resp.data.expires_in * 1000;
    
        return { accessToken: newAccessToken, refreshToken: newRefreshToken, tokenExpiry: newExpiry };
    } catch (err) {
        console.error('Error refreshing access token:', err.response?.data || err.message);
        throw err;
    }
}

// === ENSURE VALID ACCESS TOKEN ===
async function ensureAccessToken(currentAccessToken, currentRefreshToken, currentExpiry) {
    if (!currentAccessToken || !currentExpiry || Date.now() >= currentExpiry) {
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }
      const refreshed = await refreshAccessToken(currentRefreshToken);
      return refreshed; 
    }
    return { accessToken: currentAccessToken, refreshToken: currentRefreshToken, tokenExpiry: currentExpiry };
}

// === FETCH ALL LIKED ALBUMS (PAGINATED) ===
async function fetchAllSavedAlbums(accessToken) {
    const limit = 50;
    let offset = 0;
    let total = null;
    const rows = [];

    while (total === null || offset < total) {
        try {
            const resp = await axios.get('https://api.spotify.com/v1/me/albums', {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { limit, offset }
            });

            const data = resp.data;
            total = data.total;

            for (const item of data.items) {
                const album = item.album;
                rows.push({
                    album_id: album.id,
                    album_name: album.name,
                    artists: album.artists.map(a => a.name).join('; '),
                    artist_ids: album.artists.map(a => a.id).join('; '),
                    artist_urls: album.artists.map(a => a.external_urls.spotify).join('; '),
                    release_date: album.release_date,
                    total_tracks: album.total_tracks,
                    added_at: item.added_at,
                    url: album.external_urls.spotify,
                    images: album.images.map(img => img.url).join('; '),
                    genres: '',
                    popularity: album.popularity,
                    image_url: album.images?.[0]?.url || '',
                    total_duration: 0
                });
            }

            offset += data.items.length;
        } catch (err) {
            console.error('Error fetching saved albums:', err.response?.data || err.message);
            throw err;
        }
    }

    const batchSize = 20;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batchIds = rows.slice(i, i + batchSize).map(r => r.album_id).join(',');
        try {
            const resp = await axios.get(`https://api.spotify.com/v1/albums?ids=${batchIds}`, {
                headers: {Authorization: `Bearer ${accessToken}`},
            });
            resp.data.albums.forEach((fullAlbum, idx) => {
                const duration = fullAlbum.tracks.items.map(t => t.duration_ms);
                rows[i + idx].total_duration = duration.reduce((sum, d) => sum + d, 0) / 1000;
            });
        } catch (err) {
            console.error('Error fetching album duration:', err.response?.data || err.message);
        }
    }

    return rows;
}

// === FETCH ARTIST GENRES IN BATCHES ===
async function fetchArtistGenres(artistIds, accessToken) {
    const map = new Map();
    const batchSize = 50;

    for (let i = 0; i < artistIds.length; i += batchSize) {
        const batch = artistIds.slice(i, i + batchSize);
        try {
            const resp = await axios.get('https://api.spotify.com/v1/artists', {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { ids: batch.join(',') }
            });

            for (const artist of resp.data.artists) {
                map.set(artist.id, artist.genres || []);
            }
        } catch (err) {
            console.error('Error fetching artist genres:', err.response?.data || err.message);
            throw err;
        }
    }

    return map;
}

module.exports = { getAccessToken, fetchAllSavedAlbums, fetchArtistGenres, refreshAccessToken, ensureAccessToken };