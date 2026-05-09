# Indian Music Streaming App — RaagaPlay 🎵

A fully working modern Indian Music Streaming Web Application powered by the JioSaavn unofficial API.

## Features

- 🔍 **Search Songs** — Real-time search with debouncing
- 🎵 **Stream Online** — Direct audio streaming, no downloads
- 🇮🇳 **Indian Languages** — Hindi, Telugu, Tamil, Malayalam, Kannada, Punjabi
- 🎛️ **Full Player Controls** — Play, Pause, Next, Previous, Seek, Volume, Repeat, Shuffle
- 💾 **Recent Searches** — Saved in localStorage
- 📱 **Responsive Design** — Works on mobile and desktop
- 🌙 **Dark Theme** — Spotify-inspired dark UI with green accents
- ⚡ **Loading States** — Skeleton loaders and error handling

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| State | React Context + useReducer |
| HTTP | Axios |
| Icons | Lucide React |
| Routing | React Router DOM |
| Backend | Express.js |
| API Source | JioSaavn (via saavn.dev) |

## Project Structure

```
taskAudio/
├── client/                    # React Frontend (Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Player.jsx     # Sticky bottom player
│   │   │   ├── SongCard.jsx   # Song grid/list card
│   │   │   ├── Sidebar.jsx    # Navigation sidebar
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ErrorMessage.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx       # Trending songs by language
│   │   │   └── Search.jsx     # Search page
│   │   ├── context/
│   │   │   └── PlayerContext.jsx  # Audio player state
│   │   ├── services/
│   │   │   └── api.js         # Axios API calls
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
│
└── server/                    # Express Backend
    ├── controllers/
    │   └── musicController.js # JioSaavn API logic
    ├── routes/
    │   └── music.js           # API routes
    ├── index.js               # Server entry
    └── .env                   # Environment variables
```

## Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn

### 1. Start the Backend

```bash
cd server
npm install
npm start
```

Server starts at `http://localhost:5000`

### 2. Start the Frontend

```bash
cd client
npm install
npm run dev
```

App opens at `http://localhost:5173`

### 3. Open in Browser

Navigate to [http://localhost:5173](http://localhost:5173)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?query=kesariya` | Search songs |
| GET | `/api/trending?lang=hindi` | Trending songs |
| GET | `/api/song/:id` | Song details |
| GET | `/api/suggestions?id=:id` | Song suggestions |

## Supported Languages

- 🎵 Hindi (Bollywood)
- 🎶 Telugu (Tollywood)
- 🎸 Tamil (Kollywood)
- 🎤 Malayalam
- 🥁 Kannada (Sandalwood)
- 🎺 Punjabi

## Deployment

### Frontend → Vercel

```bash
cd client
npm run build
# Push to GitHub → Connect to Vercel → Set VITE_API_URL env var
```

### Backend → Render

1. Push `server/` to GitHub
2. Create new Web Service on Render
3. Set environment variables:
   - `SAAVN_API_BASE=https://saavn.dev/api`
   - `NODE_ENV=production`
4. Build command: `npm install`
5. Start command: `npm start`

### Environment Variables

**Client** (`.env.local`):
```
VITE_API_URL=https://your-backend.onrender.com
```

**Server** (`.env`):
```
PORT=5000
SAAVN_API_BASE=https://saavn.dev/api
NODE_ENV=production
```

## License

For educational and personal use only. Music content belongs to respective rights holders.

---

Built with ❤️ for Indian Music lovers
