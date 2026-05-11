import React, { createContext, useContext, useReducer, useRef, useEffect, useCallback } from 'react';
import { getYouTubeStreamUrl } from '../services/api';

// ─── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
  currentSong: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  isLoading: false,
  duration: 0,
  currentTime: 0,
  volume: 0.8,
  isMuted: false,
  isRepeat: false,
  isShuffle: false,
  error: null,
};

// ─── Actions ───────────────────────────────────────────────────────────────────
const ACTIONS = {
  SET_SONG: 'SET_SONG',
  SET_QUEUE: 'SET_QUEUE',
  SET_PLAYING: 'SET_PLAYING',
  SET_LOADING: 'SET_LOADING',
  SET_DURATION: 'SET_DURATION',
  SET_CURRENT_TIME: 'SET_CURRENT_TIME',
  SET_VOLUME: 'SET_VOLUME',
  SET_MUTED: 'SET_MUTED',
  SET_REPEAT: 'SET_REPEAT',
  SET_SHUFFLE: 'SET_SHUFFLE',
  SET_ERROR: 'SET_ERROR',
  NEXT_SONG: 'NEXT_SONG',
  PREV_SONG: 'PREV_SONG',
};

// ─── Reducer ───────────────────────────────────────────────────────────────────
function playerReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_SONG:
      return {
        ...state,
        currentSong: action.payload.song,
        currentIndex: action.payload.index ?? state.currentIndex,
        isLoading: true,
        error: null,
        currentTime: 0,
      };
    case ACTIONS.SET_QUEUE:
      return { ...state, queue: action.payload };
    case ACTIONS.SET_PLAYING:
      return { ...state, isPlaying: action.payload };
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTIONS.SET_DURATION:
      return { ...state, duration: action.payload };
    case ACTIONS.SET_CURRENT_TIME:
      return { ...state, currentTime: action.payload };
    case ACTIONS.SET_VOLUME:
      return { ...state, volume: action.payload, isMuted: action.payload === 0 };
    case ACTIONS.SET_MUTED:
      return { ...state, isMuted: action.payload };
    case ACTIONS.SET_REPEAT:
      return { ...state, isRepeat: !state.isRepeat };
    case ACTIONS.SET_SHUFFLE:
      return { ...state, isShuffle: !state.isShuffle };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false, isPlaying: false };
    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────
const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const audioRef = useRef(new Audio());
  const stateRef = useRef(state);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ─── Audio Event Listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      dispatch({ type: ACTIONS.SET_CURRENT_TIME, payload: audio.currentTime });
    };

    const handleDurationChange = () => {
      dispatch({ type: ACTIONS.SET_DURATION, payload: audio.duration });
    };

    const handleCanPlay = () => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      audio.play().catch(() => { });
      dispatch({ type: ACTIONS.SET_PLAYING, payload: true });
    };

    const handleEnded = () => {
      const { isRepeat, queue, currentIndex } = stateRef.current;
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => { });
      } else if (currentIndex < queue.length - 1) {
        playNext();
      } else {
        dispatch({ type: ACTIONS.SET_PLAYING, payload: false });
      }
    };

    const handleError = () => {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to load audio. Try another song.' });
    };

    const handleWaiting = () => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    };

    const handlePlaying = () => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    audio.volume = 0.8;

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const playSong = useCallback(async (song, queue = [], index = 0) => {
    const audio = audioRef.current;

    if (!song?.title) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'No song data available.' });
      return;
    }

    // If same song, toggle play/pause
    if (stateRef.current.currentSong?.id === song.id) {
      togglePlay();
      return;
    }

    audio.pause();
    dispatch({ type: ACTIONS.SET_SONG, payload: { song, index } });
    dispatch({ type: ACTIONS.SET_QUEUE, payload: queue.length > 0 ? queue : [song] });
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });

    // Fetch YouTube stream URL for full-length audio
    // Falls back to Saavn URL if YouTube fetch fails
    try {
      const ytResult = await getYouTubeStreamUrl(song.title, song.artist);
      if (ytResult?.streamUrl) {
        audio.src = ytResult.streamUrl;
        if (ytResult.duration && ytResult.duration > 30) {
          dispatch({ type: ACTIONS.SET_DURATION, payload: ytResult.duration });
        }
      } else if (song.streamUrl && song.streamUrl !== '__pending__') {
        // Fallback to Saavn URL
        audio.src = song.streamUrl;
      } else {
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Could not load stream. Try another song.' });
        return;
      }
    } catch {
      if (song.streamUrl && song.streamUrl !== '__pending__') {
        audio.src = song.streamUrl;
      } else {
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Could not load stream. Try another song.' });
        return;
      }
    }

    audio.load();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!stateRef.current.currentSong) return;

    if (stateRef.current.isPlaying) {
      audio.pause();
      dispatch({ type: ACTIONS.SET_PLAYING, payload: false });
    } else {
      audio.play().catch(() => { });
      dispatch({ type: ACTIONS.SET_PLAYING, payload: true });
    }
  }, []);

  const playNext = useCallback(async () => {
    const { queue, currentIndex, isShuffle } = stateRef.current;
    if (queue.length === 0) return;

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }

    const nextSong = queue[nextIndex];
    if (nextSong) {
      const audio = audioRef.current;
      audio.pause();
      dispatch({ type: ACTIONS.SET_SONG, payload: { song: nextSong, index: nextIndex } });
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      try {
        const ytResult = await getYouTubeStreamUrl(nextSong.title, nextSong.artist);
        audio.src = ytResult?.streamUrl || nextSong.streamUrl || '';
      } catch {
        audio.src = nextSong.streamUrl || '';
      }
      audio.load();
    }
  }, []);

  const playPrev = useCallback(async () => {
    const { queue, currentIndex, currentTime } = stateRef.current;
    if (queue.length === 0) return;

    if (currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    const prevSong = queue[prevIndex];
    if (prevSong) {
      const audio = audioRef.current;
      audio.pause();
      dispatch({ type: ACTIONS.SET_SONG, payload: { song: prevSong, index: prevIndex } });
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      try {
        const ytResult = await getYouTubeStreamUrl(prevSong.title, prevSong.artist);
        audio.src = ytResult?.streamUrl || prevSong.streamUrl || '';
      } catch {
        audio.src = prevSong.streamUrl || '';
      }
      audio.load();
    }
  }, []);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    audio.currentTime = time;
    dispatch({ type: ACTIONS.SET_CURRENT_TIME, payload: time });
  }, []);

  const setVolume = useCallback((vol) => {
    const audio = audioRef.current;
    audio.volume = vol;
    audio.muted = vol === 0;
    dispatch({ type: ACTIONS.SET_VOLUME, payload: vol });
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    const newMuted = !stateRef.current.isMuted;
    audio.muted = newMuted;
    dispatch({ type: ACTIONS.SET_MUTED, payload: newMuted });
  }, []);

  const toggleRepeat = useCallback(() => {
    dispatch({ type: ACTIONS.SET_REPEAT });
  }, []);

  const toggleShuffle = useCallback(() => {
    dispatch({ type: ACTIONS.SET_SHUFFLE });
  }, []);

  const value = {
    ...state,
    playSong,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
}

export default PlayerContext;
