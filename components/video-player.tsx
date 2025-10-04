// PrimeVicio - Site - Copia/components/video-player.tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, FastForward, Rewind, Settings, PictureInPicture, X, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-context"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { userFirestore } from "@/lib/firebase"

type VideoPlayerProps = {
  src: string
  title: string
  downloadUrl?: string
  onClose?: () => void
  rememberPositionKey?: string
  hasNextEpisode?: boolean
  onNextEpisode?: () => void
  mediaInfo?: { // Adicionando informações de mídia para salvar no histórico
    mediaId: string;
    mediaType: 'movie' | 'tv';
    poster_path: string | null;
    season?: number;
    episode?: number;
  }
}

export default function VideoPlayer({
  src,
  title,
  downloadUrl,
  onClose,
  rememberPositionKey,
  hasNextEpisode,
  onNextEpisode,
  mediaInfo,
}: VideoPlayerProps) {
  const { user } = useAuth(); // Pega o usuário logado

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressWrapRef = useRef<HTMLDivElement>(null)
  const continueWatchingDialogRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(true)
  const [showControls, setShowControls] = useState(true)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedEnd, setBufferedEnd] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [pipSupported, setPipSupported] = useState(false)
  const [isPipActive, setIsPipActive] = useState(false)

  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [showSeekHint, setShowSeekHint] = useState<null | { dir: "fwd" | "back"; by: number }>(null)
  const [showSpeedHint, setShowSpeedHint] = useState(false)
  const [showContinueWatching, setShowContinueWatching] = useState(false)
  
  // Estados para a reprodução automática
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true)
  const [showNextEpisodeOverlay, setShowNextEpisodeOverlay] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [endingTriggered, setEndingTriggered] = useState(false); // Novo estado para controle

  const volumeKey = "video-player-volume"
  const autoplayKey = "video-player-autoplay-enabled"
  
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<{ time: number, side: 'left' | 'right' | 'center' }>({ time: 0, side: 'center' });
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const originalRateRef = useRef<number>(1)
  const spacebarDownTimer = useRef<NodeJS.Timeout | null>(null);
  const isSpeedingUpRef = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    setEndingTriggered(false);
    return () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
      }
    };
  }, [src]);
  
  // Carrega posição salva
  useEffect(() => {
    const loadPosition = async () => {
        if (!rememberPositionKey || !videoRef.current) return;

        let savedTime = 0;

        if (user) { // Se o usuário está logado, busca no Firestore
            const historyDocRef = doc(userFirestore, 'users', user.uid, 'watchHistory', rememberPositionKey);
            const docSnap = await getDoc(historyDocRef);
            if (docSnap.exists()) {
                savedTime = docSnap.data().currentTime || 0;
            }
        } else { // Senão, busca no Local Storage
            const savedPos = localStorage.getItem(rememberPositionKey);
            if (savedPos) {
                savedTime = Number.parseFloat(savedPos);
            }
        }

        if (videoRef.current && !isNaN(savedTime) && savedTime > 5) {
            videoRef.current.currentTime = savedTime;
            setCurrentTime(savedTime);
            setShowContinueWatching(true);
        }
    };

    try {
      const savedVolume = localStorage.getItem(volumeKey)
      if (savedVolume) {
        const v = Number.parseFloat(savedVolume)
        setVolume(v)
        if (videoRef.current) videoRef.current.volume = v
      }
      
      const savedAutoplay = localStorage.getItem(autoplayKey);
      if (savedAutoplay !== null) setIsAutoplayEnabled(JSON.parse(savedAutoplay));
      
      loadPosition();

    } catch (e) { /* no-op */ }
  }, [rememberPositionKey, user]);

  // Salva a posição
  useEffect(() => {
    const intervalId = setInterval(async () => {
        if (!videoRef.current || videoRef.current.paused || !rememberPositionKey) return;
        
        const currentProgress = {
            currentTime: videoRef.current.currentTime,
            duration: videoRef.current.duration,
            progress: (videoRef.current.currentTime / videoRef.current.duration) * 100
        };

        if (user && mediaInfo) { // Se logado, salva no Firestore
            const historyDocRef = doc(userFirestore, 'users', user.uid, 'watchHistory', rememberPositionKey);
            try {
                await setDoc(historyDocRef, {
                    ...mediaInfo,
                    title,
                    ...currentProgress,
                    lastWatched: serverTimestamp()
                }, { merge: true });
            } catch (error) {
                console.error("Erro ao salvar histórico no Firestore:", error);
            }
        } else { // Senão, salva no Local Storage
            try {
                localStorage.setItem(rememberPositionKey, String(currentProgress.currentTime));
            } catch (e) { /* no-op */ }
        }
    }, 5000); // Salva a cada 5 segundos

    return () => clearInterval(intervalId);
  }, [rememberPositionKey, user, mediaInfo, title]);


  useEffect(() => {
    setPipSupported(typeof document !== "undefined" && "pictureInPictureEnabled" in document)
  }, [])

  const hideControls = useCallback(() => {
    if (isPlaying) {
      setShowControls(false);
    }
  }, [isPlaying]);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(hideControls, 3500);
  }, [hideControls]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", resetControlsTimeout);
      container.addEventListener("mouseleave", hideControls);
      container.addEventListener("touchstart", resetControlsTimeout, { passive: true });
    }
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (container) {
        container.removeEventListener("mousemove", resetControlsTimeout);
        container.removeEventListener("mouseleave", hideControls);
        container.removeEventListener("touchstart", resetControlsTimeout);
      }
    };
  }, [resetControlsTimeout, hideControls]);

  const triggerNextEpisodeOverlay = useCallback(() => {
    if (endingTriggered || !isAutoplayEnabled || !hasNextEpisode || !onNextEpisode) {
        return;
    }
    setEndingTriggered(true);
    setShowNextEpisodeOverlay(true);
    setCountdown(5);
  }, [endingTriggered, isAutoplayEnabled, hasNextEpisode, onNextEpisode]);


  const handleLoadStart = () => {
    setIsLoading(true)
    setError(null)
  }
  const handleCanPlay = () => {
    setIsLoading(false)
    const v = videoRef.current;
    if (v && !showContinueWatching) {
      v.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Autoplay foi impedido:", err)
        setIsPlaying(false);
      });
    }
  }
  const handleError = () => {
    setIsLoading(false)
    setError("Não foi possível carregar o vídeo.")
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    setCurrentTime(currentTime);

    if (duration > 0 && duration - currentTime < 1.5) {
      triggerNextEpisodeOverlay();
    }
  
    try {
      const buf = videoRef.current.buffered;
      if (buf && buf.length > 0) {
        const end = buf.end(buf.length - 1);
        setBufferedEnd(end);
      }
    } catch {}
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    setDuration(videoRef.current.duration || 0)
  }

  const handleEnded = () => {
    triggerNextEpisodeOverlay(); // Fallback
    setIsPlaying(false)
  };

  const handlePlayNext = useCallback(() => {
    setShowNextEpisodeOverlay(false);
    onNextEpisode?.();
  }, [onNextEpisode]);

  const handleCancelAutoplay = () => {
    setShowNextEpisodeOverlay(false);
    setShowControls(true)
    if (videoRef.current) {
      videoRef.current.currentTime = videoRef.current.duration;
    }
  };
  
  useEffect(() => {
    if (showNextEpisodeOverlay) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            handlePlayNext();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showNextEpisodeOverlay, handlePlayNext]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => handleError())
    } else {
      v.pause()
    }
    setIsPlaying(!v.paused)
  }, [])

  const handleMainClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ('ontouchstart' in window) return;
    if ((e.target as HTMLElement).closest('[data-controls]')) return;
    togglePlay();
  };

  const seek = useCallback((amount: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.min(Math.max(0, v.currentTime + amount), duration || v.duration || 0)
    setShowSeekHint({ dir: amount > 0 ? "fwd" : "back", by: Math.abs(amount) })
    setTimeout(() => setShowSeekHint(null), 700)
  }, [duration])

  const handleSeekSlider = (value: number[]) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const newMuted = !v.muted
    v.muted = newMuted
    setIsMuted(newMuted)
    if (!newMuted && v.volume === 0) {
      v.volume = 0.5
      setVolume(0.5)
    }
  }, [])

  const handleVolumeChange = (value: number[]) => {
    const v = videoRef.current
    if (!v) return
    const newVolume = value[0]
    v.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    try {
      localStorage.setItem(volumeKey, String(newVolume))
    } catch { }
  }

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          await screen.orientation.lock('landscape');
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Erro ao gerenciar tela cheia ou orientação:", err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && screen.orientation && typeof screen.orientation.unlock === 'function') {
        screen.orientation.unlock();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return
    videoRef.current.playbackRate = rate
    setPlaybackRate(rate)
  }

  const toggleAutoplay = () => {
    setIsAutoplayEnabled(prev => {
      const newState = !prev;
      try {
        localStorage.setItem(autoplayKey, JSON.stringify(newState));
      } catch (e) { /* no-op */ }
      return newState;
    });
  };

  const togglePip = useCallback(async () => {
    const v = videoRef.current
    if (!v || !document.pictureInPictureEnabled) return
    try {
      if (document.pictureInPictureElement) {
        await (document as any).exitPictureInPicture()
      } else {
        await (v as any).requestPictureInPicture()
      }
    } catch (e) {
      console.error("Erro no PIP", e)
    }
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onEnterPip = () => setIsPipActive(true)
    const onLeavePip = () => setIsPipActive(false)
    v.addEventListener("enterpictureinpicture", onEnterPip as any)
    v.addEventListener("leavepictureinpicture", onLeavePip as any)
    return () => {
      v.removeEventListener("enterpictureinpicture", onEnterPip as any)
      v.removeEventListener("leavepictureinpicture", onLeavePip as any)
    }
  }, [])

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return "00:00"
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    const mm = String(minutes).padStart(2, "0")
    const ss = String(seconds).padStart(2, "0")
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
  }

  const retry = () => {
    if (videoRef.current) videoRef.current.load()
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("role") === "slider")
      ) {
        return
      }

      if (e.key === ' ' && !e.repeat) {
        e.preventDefault()
        if (!isPlaying || isSpeedingUpRef.current) return

        spacebarDownTimer.current = setTimeout(() => {
          if (videoRef.current && isPlaying) {
            isSpeedingUpRef.current = true;
            originalRateRef.current = videoRef.current.playbackRate;
            videoRef.current.playbackRate = 2.0;
            setPlaybackRate(2.0);
            setShowSpeedHint(true);
          }
        }, 200);
      }

      switch (e.key.toLowerCase()) {
        case "k": e.preventDefault(); togglePlay(); break
        case "f": toggleFullscreen(); break
        case "m": toggleMute(); break
        case "p": togglePip(); break
        case "arrowright": seek(10); break
        case "arrowleft": seek(-10); break
        case "arrowup": e.preventDefault(); handleVolumeChange([Math.min(1, volume + 0.1)]); break
        case "arrowdown": e.preventDefault(); handleVolumeChange([Math.max(0, volume - 0.1)]); break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        if (spacebarDownTimer.current) {
          clearTimeout(spacebarDownTimer.current);
          spacebarDownTimer.current = null;
          if (!isSpeedingUpRef.current) {
            togglePlay();
          }
        }
        if (isSpeedingUpRef.current) {
          if (videoRef.current) {
            videoRef.current.playbackRate = originalRateRef.current;
          }
          setPlaybackRate(originalRateRef.current);
          setShowSpeedHint(false);
          isSpeedingUpRef.current = false;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp);
      if (spacebarDownTimer.current) clearTimeout(spacebarDownTimer.current);
    }
  }, [volume, togglePlay, toggleFullscreen, toggleMute, togglePip, seek, isPlaying])

  const onProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !progressWrapRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const time = duration * pct;
    setHoverTime(time);
  };

  const onProgressLeave = () => {
    setHoverTime(null);
  };

  const onMobileTap = (side: 'left' | 'right' | 'center') => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current.time < 350 && lastTapRef.current.side === side;

    if (isDoubleTap) {
      if (side === 'left') seek(-10);
      if (side === 'right') seek(10);
      lastTapRef.current = { time: 0, side: 'center' };
    } else if (side === 'center') {
      togglePlay();
      lastTapRef.current = { time: now, side };
    } else {
      resetControlsTimeout();
      lastTapRef.current = { time: now, side };
    }
  };

  const handleTouchStart = () => {
    holdTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && isPlaying) {
        originalRateRef.current = videoRef.current.playbackRate
        videoRef.current.playbackRate = 2
        setShowSpeedHint(true)
      }
    }, 500)
  }

  const handleTouchEnd = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (videoRef.current && videoRef.current.playbackRate === 2) {
      videoRef.current.playbackRate = originalRateRef.current
      setShowSpeedHint(false)
    }
  }

  const handleContinue = () => {
    setShowContinueWatching(false)
    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  const handleRestart = () => {
    setShowContinueWatching(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play()
    }
  }

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2]

  const hoverLeft =
    hoverTime !== null && duration > 0 && progressWrapRef.current
      ? Math.min(1, Math.max(0, hoverTime / duration)) * (progressWrapRef.current.clientWidth || 0)
      : 0
  
  const bufferPercentage = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div
        ref={containerRef}
        className={cn(
          "relative w-full aspect-video bg-black rounded-xl overflow-hidden group select-none",
          isPlaying && !showControls && !showNextEpisodeOverlay && "cursor-none"
        )}
        onDoubleClick={e => e.preventDefault()}
      >
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full object-contain"
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          preload="metadata"
          autoPlay
          playsInline
        />

        <div
          className="absolute inset-0 z-0"
          onClick={handleMainClick}
        />

        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <p className="mb-4 text-sm text-zinc-200">{error}</p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={retry} variant="secondary" className="h-9">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Tentar novamente
                </Button>
                {onClose && (
                  <Button onClick={onClose} variant="outline" className="h-9">
                    Fechar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && !isPlaying && !showNextEpisodeOverlay && (
          <button
            aria-label="Reproduzir"
            onClick={togglePlay}
            className={cn(
              "absolute z-10 inset-0 m-auto h-16 w-16 rounded-full",
              "bg-white/10 text-white ring-1 ring-white/20 backdrop-blur",
              "flex items-center justify-center hover:bg-white/20 transition-colors",
            )}
            style={{ height: 64, width: 64 }}
          >
            <Play className="h-7 w-7" />
          </button>
        )}

        {showContinueWatching && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70"
            ref={continueWatchingDialogRef}
          >
            <p className="text-white text-lg mb-4">Deseja continuar assistindo de onde parou?</p>
            <div className="flex gap-4">
              <Button onClick={handleContinue} className="bg-white text-black">Sim</Button>
              <Button onClick={handleRestart} variant="secondary">Recomeçar</Button>
            </div>
          </div>
        )}

        {showSeekHint && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="rounded-full bg-black/60 px-3 py-1 text-sm text-white ring-1 ring-white/10">
              {showSeekHint.dir === "fwd" ? "+10s" : "-10s"}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showSpeedHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            >
              <div className="rounded-full bg-black/60 px-4 py-2 text-lg font-bold text-white ring-1 ring-white/10">
                2x
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {showNextEpisodeOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90"
            >
              <p className="text-white text-lg mb-6 font-semibold">
                Reproduzindo Próximo Episódio em {countdown}
              </p>
              <div className="flex gap-4">
                <Button onClick={handlePlayNext} className="bg-white text-black hover:bg-zinc-200">Reproduzir</Button>
                <Button onClick={handleCancelAutoplay} variant="secondary">Cancelar</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 z-0 flex md:hidden">
          <div className="flex-1" onClick={() => onMobileTap('left')} />
          <div className="w-1/3" onClick={() => onMobileTap('center')} />
          <div className="flex-1" onClick={() => onMobileTap('right')} />
        </div>

        <div
          data-controls
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2 md:p-3 transition-opacity duration-300",
            "bg-gradient-to-t from-black/50 to-transparent",
            showControls && !showNextEpisodeOverlay ? "opacity-100" : "opacity-0",
          )}
        >
          <div
            ref={progressWrapRef}
            onMouseMove={onProgressMouseMove}
            onMouseLeave={onProgressLeave}
            className="pointer-events-auto group/progress relative mb-3 cursor-pointer"
          >
             <div
              className="absolute bottom-full mb-2 hidden -translate-x-1/2 rounded bg-black px-2 py-1 text-xs text-white md:block"
              style={{
                left: hoverLeft,
                visibility: hoverTime !== null ? 'visible' : 'hidden',
              }}
            >
                {formatTime(hoverTime ?? 0)}
            </div>
            
            <div className="relative flex items-center h-2.5 transition-[height] duration-200">
                <div
                    className="absolute top-1/2 -translate-y-1/2 h-full w-full bg-zinc-800 rounded-full"
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 h-full bg-white/50 rounded-full"
                    style={{ width: `${bufferPercentage}%` }}
                />
                <Slider
                    value={[Math.min(currentTime, duration || 0)]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeekSlider}
                    className="absolute w-full inset-0"
                    trackClassName="bg-transparent"
                    rangeClassName="bg-red-600"
                    thumbClassName="bg-red-600 border-red-600 h-3 w-3 group-hover/progress:h-5 group-hover/progress:w-5 transition-all"
                />
            </div>
          </div>

          <div className="pointer-events-auto flex items-center justify-between rounded-lg bg-[#212121] px-1 py-1 md:px-2 md:py-2">
            <div className="flex items-center gap-1 md:gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={togglePlay} size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 text-white hover:bg-white/15">
                    {isPlaying ? <Pause className="h-5 w-5 md:h-6 md:w-6" /> : <Play className="h-5 w-5 md:h-6 md:w-6" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isPlaying ? "Pausar (K)" : "Reproduzir (K)"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => seek(-10)} size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 text-white hover:bg-white/15">
                    <Rewind className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>-10s (←)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => seek(10)} size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 text-white hover:bg-white/15">
                    <FastForward className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>+10s (→)</TooltipContent>
              </Tooltip>

              <div className="h-6 w-px bg-white/20" />

              <div className="flex items-center gap-2 group/vol">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={toggleMute} size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 text-white hover:bg-white/15">
                      {isMuted || volume === 0 ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mudo (M)</TooltipContent>
                </Tooltip>
                <div className="w-0 overflow-hidden transition-all duration-300 group-hover/vol:w-24 md:w-0 md:group-hover/vol:w-24">
                  <Slider value={[volume]} max={1} step={0.05} onValueChange={handleVolumeChange} />
                </div>
              </div>
              <div className="hidden select-none justify-between text-sm text-white/80 md:flex items-center gap-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="pointer-events-none absolute left-1/2 hidden max-w-[40vw] -translate-x-1/2 truncate text-sm text-white/80 md:block">
              {title}
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              {downloadUrl && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={downloadUrl}>
                        <Button size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 text-white hover:bg-white/15">
                          <Download className="h-5 w-5 md:h-6 md:w-6" />
                        </Button>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Baixar</TooltipContent>
                  </Tooltip>
                  <div className="h-6 w-px bg-white/20" />
                </>
              )}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 text-white hover:bg-white/15">
                        <Settings className="h-5 w-5 md:h-6 md:w-6" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Configurações</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-56 border-zinc-700 bg-black/80 p-2 text-white backdrop-blur">
                  {hasNextEpisode && (
                    <>
                      <div className="mb-2 px-1 text-xs font-semibold text-white/80">Controles</div>
                      <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between h-8 w-full px-1">
                            <Label htmlFor="autoplay-switch" className="text-sm font-normal">Próximo ep. automático</Label>
                            <Switch
                              id="autoplay-switch"
                              checked={isAutoplayEnabled}
                              onCheckedChange={toggleAutoplay}
                            />
                          </div>
                      </div>
                    </>
                  )}
                  <div className="my-2 px-1 text-xs font-semibold text-white/80">Velocidade</div>
                  <div className="flex flex-col gap-1">
                    {playbackRates.map((r) => (
                      <Button
                        key={r}
                        variant={playbackRate === r ? "secondary" : "ghost"}
                        className="h-8 w-full justify-start"
                        onClick={() => changePlaybackRate(r)}
                      >
                        {r === 1 ? "Normal" : `${r}x`}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {pipSupported && (
                 <>
                    <div className="h-6 w-px bg-white/20" />
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={togglePip} size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 text-white hover:bg-white/15">
                        <PictureInPicture className={cn("h-5 w-5 md:h-6 md:w-6", isPipActive && "text-red-400")} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Picture-in-Picture (P)</TooltipContent>
                    </Tooltip>
                 </>
              )}

              <div className="h-6 w-px bg-white/20" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={toggleFullscreen} size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 text-white hover:bg-white/15">
                    {isFullscreen ? <Minimize className="h-5 w-5 md:h-6 md:w-6" /> : <Maximize className="h-5 w-5 md:h-6 md:w-6" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tela cheia (F)</TooltipContent>
              </Tooltip>

              {onClose && (
                <>
                  <div className="h-6 w-px bg-white/20" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={onClose} size="icon" variant="ghost" className="h-9 w-9 md:h-10 md:w-10 text-white hover:bg-white/15">
                        <X className="h-5 w-5 md:h-6 md:w-6" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fechar</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}