import { useEffect, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import { getLastUpdated, getAlbums } from './db.js';

export default function Landing() {
  const [loading, setLoading] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8888";
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    async function checkCacheAndAuth() {
      setLoading(true);
      try {
        const lastUpdated = await getLastUpdated();
        const cachedAlbums = await getAlbums();
        if (cachedAlbums.length > 0 && lastUpdated) {
          console.log('Using cached albums, last updated:', new Date(lastUpdated));
          navigate('/albums');
          return;
        }

        const params = new URLSearchParams(location.search);
        if (params.get('status') === 'ok') {
          navigate('/albums');
          return;
        }

        const resp = await fetch(`${backendUrl}/albums/genres`, { credentials: 'include' });
        if (resp.ok) {
          navigate('/albums');
        }
      } catch (err) {
        console.error('Error checking cache/auth:', err);
      } finally {
        setLoading(false);
      }
    }
    checkCacheAndAuth();
  }, [location.search, navigate, backendUrl]);
  
  if (loading) {
    return ( 
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-950 text-white font-sans flex items-center justify-center">
        <motion.button
          disabled
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-green-500/90 backdrop-blur-md border border-white/20 shadow-xl 
                    text-black px-10 py-3 rounded-full font-bold text-lg 
                    flex items-center justify-center cursor-not-allowed"
        >
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3"></div>
          <span>Loading your albums...</span>
        </motion.button>
      </div>
    );
  } else {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-950 text-white font-sans flex items-center justify-center relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-4 left-4 text-2xl font-bold"
        >
          Spotify Album Organizer
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center max-w-2xl px-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Discover Your Liked Albums
          </h1>
          <p className="text-xl mb-8 text-gray-300">
            Log in to Spotify to shuffle, filter, and explore your saved albums.
            Export data, apply genres, dates, and more.
          </p>
          <a href={`${backendUrl}/login`} onClick={() => setLoading(true)}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="bg-green-500/90 backdrop-blur-md border border-white/20 shadow-xl 
                        text-black px-10 py-3 rounded-full font-bold text-lg 
                        hover:bg-green-500 transition-all flex items-center justify-center"
            >
              <img
                src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Black.png"
                alt="Spotify Logo"
                className="w-6 h-6 mr-2"
              />
              Login with Spotify
            </motion.button>
          </a>
          <a
            href="#"
            className="mt-6 inline-flex items-center text-gray-300 hover:text-white text-sm"
          >
            <img
              src="https://logo.svgcdn.com/simple-icons/github-dark.png"
              alt="GitHub Logo"
              className="w-6 h-6 mr-2"
            />
            GitHub
          </a>
        </motion.div>
      </div>
    );
  }
}