require('dotenv').config( { path: '../.env'}); // loads .env automatically from root

module.exports = {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,
    REDIRECT_URI: process.env.REDIRECT_URI || 'http://127.0.0.1:5173',
    PORT: process.env.PORT || 8888,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN  || 'http://127.0.0.1:5173'
};