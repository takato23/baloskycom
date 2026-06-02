import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { HomeMusicContent } from '@/types';

export type MusicTrack = {
  id: string;
  category: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverImage: string;
  accentColor: string;
};

type MusicPlayerContextValue = {
  allTracks: MusicTrack[];
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  playlist: MusicTrack[];
  currentTrack: MusicTrack | null;
  currentIndex: number;
  selectTrack: (trackId: string) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  statusMessage: string;
  playPause: () => Promise<void>;
  nextTrack: () => void;
  previousTrack: () => void;
  seekTo: (time: number) => void;
  setVolumeLevel: (volume: number) => void;
  toggleMute: () => void;
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array | null;
  timeDomainData: Uint8Array | null;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | undefined>(undefined);

const createTrackId = (seed: string, index: number) =>
  `track-${seed.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${index}`;

export function MusicPlayerProvider({
  content,
  children,
}: {
  content?: HomeMusicContent;
  children: ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeDomainDataRef = useRef<Uint8Array | null>(null);
  const pendingAutoplayRef = useRef(false);

  const allTracks = useMemo<MusicTrack[]>(
    () =>
      (content?.tracks ?? [])
        .filter((track) => track.audioUrl.trim())
        .map((track, index) => ({
          ...track,
          id: createTrackId(`${track.category}-${track.title}-${track.audioUrl}`, index),
          category: track.category?.trim() || 'Singles',
          artist: track.artist || 'Santi Balosky',
          accentColor: track.accentColor || '#00FF00',
        })),
    [content?.tracks]
  );

  const categories = useMemo(
    () => Array.from(new Set(allTracks.map((track) => track.category))),
    [allTracks]
  );

  const [activeCategory, setActiveCategory] = useState(categories[0] ?? 'Singles');
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(allTracks[0]?.id ?? null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.86);
  const [isMuted, setIsMuted] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    allTracks.length
      ? 'Elegí un tema para escuchar.'
      : 'Pronto, nueva música.'
  );

  useEffect(() => {
    if (!categories.length) {
      setActiveCategory('Singles');
      return;
    }

    if (!categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [activeCategory, categories]);

  const playlist = useMemo(
    () => allTracks.filter((track) => track.category === activeCategory),
    [activeCategory, allTracks]
  );

  useEffect(() => {
    if (!allTracks.length) {
      setCurrentTrackId(null);
      setStatusMessage('Pronto, nueva música.');
      return;
    }

    const currentTrackStillExists = currentTrackId
      ? allTracks.some((track) => track.id === currentTrackId)
      : false;

    if (!currentTrackStillExists) {
      setCurrentTrackId(allTracks[0].id);
    }
  }, [allTracks, currentTrackId]);

  useEffect(() => {
    if (!playlist.length) return;

    const currentTrackInCategory = currentTrackId
      ? playlist.some((track) => track.id === currentTrackId)
      : false;

    if (!currentTrackInCategory) {
      setCurrentTrackId(playlist[0].id);
    }
  }, [playlist, currentTrackId]);

  const currentIndex = useMemo(
    () => playlist.findIndex((track) => track.id === currentTrackId),
    [currentTrackId, playlist]
  );

  const currentTrack = currentIndex >= 0 ? playlist[currentIndex] : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
  }, [isMuted]);

  const ensureAnalyser = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    const context = audioContextRef.current;
    if (context.state === 'suspended') {
      await context.resume();
    }

    if (!mediaSourceRef.current) {
      mediaSourceRef.current = context.createMediaElementSource(audio);
    }

    if (!analyserRef.current) {
      analyserRef.current = context.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.82;
      mediaSourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(context.destination);
      frequencyDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      timeDomainDataRef.current = new Uint8Array(analyserRef.current.fftSize);
    }
  }, []);

  const playCurrentTrack = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    try {
      await ensureAnalyser();
      await audio.play();
      setIsPlaying(true);
      setStatusMessage(`Reproduciendo ${currentTrack.title}.`);
    } catch (error) {
      console.error('No se pudo reproducir el track', error);
      setIsPlaying(false);
      setStatusMessage('No se pudo reproducir el audio. Probá de nuevo en un rato.');
    }
  }, [currentTrack, ensureAnalyser]);

  const pauseCurrentTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    pauseCurrentTrack();
    setCurrentTime(0);
    setDuration(0);

    if (!currentTrack) {
      audio.removeAttribute('src');
      audio.load();
      setStatusMessage(
        playlist.length
          ? 'Elegí un tema para reproducir.'
          : 'Todavía no hay temas en esta categoría.'
      );
      return;
    }

    audio.crossOrigin = 'anonymous';
    audio.src = currentTrack.audioUrl;
    audio.load();
    setStatusMessage(`Track listo: ${currentTrack.title}.`);

    if (pendingAutoplayRef.current) {
      pendingAutoplayRef.current = false;
      void playCurrentTrack();
    }
  }, [currentTrack, pauseCurrentTrack, playCurrentTrack, playlist.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncTime = () => setCurrentTime(audio.currentTime);
    const syncMetadata = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (playlist.length > 1 && currentIndex >= 0) {
        pendingAutoplayRef.current = true;
        const nextIndex = (currentIndex + 1) % playlist.length;
        setCurrentTrackId(playlist[nextIndex].id);
      }
    };
    const handleError = () => {
      setIsPlaying(false);
      setStatusMessage('No se pudo reproducir el audio. Probá de nuevo en un rato.');
    };
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('loadedmetadata', syncMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('loadedmetadata', syncMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [currentIndex, playlist]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  const selectTrack = useCallback(
    (trackId: string) => {
      const targetTrack = allTracks.find((track) => track.id === trackId);
      if (!targetTrack) return;

      if (targetTrack.category !== activeCategory) {
        setActiveCategory(targetTrack.category);
      }

      pendingAutoplayRef.current = isPlaying;
      setCurrentTrackId(trackId);
    },
    [activeCategory, allTracks, isPlaying]
  );

  const nextTrack = useCallback(() => {
    if (!playlist.length || currentIndex < 0) return;
    pendingAutoplayRef.current = isPlaying;
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentTrackId(playlist[nextIndex].id);
  }, [currentIndex, isPlaying, playlist]);

  const previousTrack = useCallback(() => {
    if (!playlist.length || currentIndex < 0) return;
    pendingAutoplayRef.current = isPlaying;
    const previousIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackId(playlist[previousIndex].id);
  }, [currentIndex, isPlaying, playlist]);

  const playPause = useCallback(async () => {
    if (!currentTrack) {
      setStatusMessage('Todavía no hay temas en esta categoría.');
      return;
    }

    if (isPlaying) {
      pauseCurrentTrack();
      setStatusMessage('Pausado.');
      return;
    }

    await playCurrentTrack();
  }, [currentTrack, isPlaying, pauseCurrentTrack, playCurrentTrack]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolumeLevel = useCallback((nextVolume: number) => {
    setVolume(nextVolume);
    if (nextVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const value = useMemo<MusicPlayerContextValue>(
    () => ({
      allTracks,
      categories,
      activeCategory,
      setActiveCategory,
      playlist,
      currentTrack,
      currentIndex,
      selectTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      statusMessage,
      playPause,
      nextTrack,
      previousTrack,
      seekTo,
      setVolumeLevel,
      toggleMute,
      analyser: analyserRef.current,
      frequencyData: frequencyDataRef.current,
      timeDomainData: timeDomainDataRef.current,
    }),
    [
      activeCategory,
      allTracks,
      categories,
      currentIndex,
      currentTime,
      currentTrack,
      duration,
      isMuted,
      isPlaying,
      nextTrack,
      playPause,
      playlist,
      previousTrack,
      seekTo,
      selectTrack,
      setVolumeLevel,
      statusMessage,
      toggleMute,
      volume,
    ]
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used inside MusicPlayerProvider');
  }
  return context;
}
