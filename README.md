# Spotify Tools

Spotify Tools is a local web app for working with a Spotify user's liked albums. It connects to Spotify, fetches saved albums, enriches them with artist genres and album duration, then lets the user filter, sort, shuffle, cache, and export the collection.

## Features

- Log in with Spotify OAuth using the `user-library-read` scope.
- Fetch all saved albums from the user's Spotify library.
- Enrich albums with artist genres, popularity, cover image URLs, artist URLs, and total album duration.
- Filter by genre, track count, release date, date added, duration, and text search.
- Sort by album name, artist, release date, date added, track count, popularity, or duration.
- Shuffle the current album set for discovery.
- Export all or filtered albums as CSV or JSON.
- Cache album data in the browser with IndexedDB for faster reloads and limited offline use.
- Refresh cached data from Spotify when the session is still valid.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Dexie, Papa Parse, Vite PWA
- Backend: Node.js, Express, Spotify Web API, Express Session
- Data export: `csv-stringify` on the backend and Papa Parse in the frontend

## Project Structure

```text
.
├── backend/
│   ├── config/env.js
│   ├── controllers/albumController.js
│   ├── routes/albums.js
│   ├── services/spotifyApi.js
│   └── index.js
├── frontend/
│   ├── src/
│   │   ├── Albums.jsx
│   │   ├── Shuffle.jsx
│   │   ├── Landing.jsx
│   │   ├── FilterContext.jsx
│   │   └── db.js
│   └── vite.config.js
├── package.json
└── .env
```

## Prerequisites

- Node.js and npm
- A Spotify account
- A Spotify app created in the Spotify Developer Dashboard

## Spotify App Setup

1. Create an app at the Spotify Developer Dashboard.
2. Copy the app's Client ID and Client Secret.
3. Add this redirect URI to the Spotify app:

```text
http://127.0.0.1:5173/albums/callback
```

The Vite dev server proxies `/albums/callback` to the backend, where the OAuth code is exchanged for access and refresh tokens.

## Environment

Create a `.env` file in the project root:

```env
CLIENT_ID=your_spotify_client_id
CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=http://127.0.0.1:5173/albums/callback
FRONTEND_ORIGIN=http://127.0.0.1:5173
PORT=8888
SESSION_SECRET=replace_with_a_long_random_string
```

The frontend can also use `VITE_BACKEND_URL` when the backend is not running at the default URL:

```env
VITE_BACKEND_URL=http://127.0.0.1:8888
```

## Install

Install dependencies for the root scripts, backend, and frontend:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

## Run Locally

Start the frontend and backend together:

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:5173
```

The backend runs on:

```text
http://127.0.0.1:8888
```

You can also start the Spotify login flow directly:

```text
http://127.0.0.1:8888/login
```

## Available Scripts

Root:

```bash
npm run dev
```

Backend:

```bash
npm start --prefix backend
```

Frontend:

```bash
npm run dev --prefix frontend
npm run build --prefix frontend
npm run preview --prefix frontend
npm run lint --prefix frontend
```

## API Routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/login` | Redirects to Spotify authorization. |
| `GET` | `/albums/callback` | Handles Spotify OAuth callback and fetches albums. |
| `GET` | `/albums` | Returns filtered, sorted, paginated albums. |
| `GET` | `/albums/full` | Returns the full filtered album list. |
| `GET` | `/albums/shuffle` | Returns all albums in random order. |
| `GET` | `/albums/genres` | Returns genres with album counts. |
| `POST` | `/albums/refresh` | Refreshes the Spotify token when needed and reloads albums. |
| `GET` | `/albums/logout` | Destroys the server session. |
| `GET` | `/albums/export/csv` | Exports all albums as CSV. |
| `GET` | `/albums/export/csv/filtered` | Exports filtered albums as CSV. |
| `GET` | `/albums/export/json` | Exports all albums as JSON. |
| `GET` | `/albums/export/json/filtered` | Exports filtered albums as JSON. |

## Filter Query Parameters

The album endpoints support these query parameters:

| Parameter | Example | Description |
| --- | --- | --- |
| `genre` | `rock,pop` | Comma-separated genre match. |
| `minTracks` | `8` | Minimum track count. |
| `maxTracks` | `20` | Maximum track count. |
| `releaseAfter` | `2000-01-01` | Minimum release date. |
| `releaseBefore` | `2024-12-31` | Maximum release date. |
| `addedAfter` | `2024-01-01` | Minimum library added date. |
| `addedBefore` | `2024-12-31` | Maximum library added date. |
| `minDuration` | `30` | Minimum album duration in minutes. |
| `maxDuration` | `90` | Maximum album duration in minutes. |
| `sort` | `release_date` | Field to sort by. |
| `order` | `desc` | Sort direction: `asc` or `desc`. |
| `page` | `1` | Results page for `/albums`. |
| `limit` | `50` | Page size for `/albums`. |

## Exported Fields

CSV and JSON exports include:

```text
album_id
album_name
artists
release_date
total_tracks
added_at
url
artist_urls
genres
popularity
image_url
total_duration
```

## Notes

- Album data is cached in the browser's IndexedDB database named `SpotifyAlbumsDB`.
- Server-side session data stores the Spotify tokens and fetched albums during the active session.
- The current backend uses the default in-memory Express session store, which is suitable for local development but not production.
- The app currently targets local development on `127.0.0.1`.
