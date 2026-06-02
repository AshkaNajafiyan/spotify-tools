require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const albumsRouter = require('./routes/albums');
const { CLIENT_ID, REDIRECT_URI, PORT, FRONTEND_ORIGIN } = require('./config/env');
const querystring = require('querystring');
const session = require('express-session');


const app = express();

app.use(cors({
    origin: FRONTEND_ORIGIN || 'http://127.0.0.1:5173',
    credentials: true
}));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
  }));

// Login route
app.get('/login', (req, res) => {
    const scope = 'user-library-read';
    const params = querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope,
        redirect_uri: REDIRECT_URI,
        state: 'state123'
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// Albums routes
app.use('/albums', albumsRouter);

app.get('/', (req, res) => {
    res.send('Spotify API running...');
    res.redirect('http://127.0.0.1:5173');
});

app.listen(PORT, () => console.log(`Open http://127.0.0.1:${PORT}/login to start authorization`));