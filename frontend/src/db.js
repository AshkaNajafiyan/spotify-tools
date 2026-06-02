import Dexie from 'dexie';

const db = new Dexie('SpotifyAlbumsDB');

db.version(1).stores({
  albums: 'album_id, album_name, artists, release_date, total_tracks, added_at, url, artist_urls, genres, popularity, image_url, total_duration',
  metadata: 'key'
});

export async function saveAlbums(albums) {
  await db.albums.bulkPut(albums);
  await db.metadata.put({ key: 'lastUpdated', value: Date.now() });
}

export async function getAlbums() {
  return await db.albums.orderBy('added_at').reverse().toArray();
}

export async function getLastUpdated() {
  const meta = await db.metadata.get('lastUpdated');
  return meta ? meta.value : null;
}

export async function getGenres() {
  const albums = await getAlbums();
  const genreCounts = new Map();
  albums.forEach(a => {
    (a.genres || '').split('; ').forEach(g => {
      const trimmed = g.trim();
      if (trimmed) {
        genreCounts.set(trimmed, (genreCounts.get(trimmed) || 0) + 1);
      }
    });
  });
  return [...genreCounts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

export async function clearDB() {
  await db.albums.clear();
  await db.metadata.clear();
}

export default db;