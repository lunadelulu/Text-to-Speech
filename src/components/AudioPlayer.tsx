import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Download, Volume2, RotateCcw, Flame, Waves } from 'lucide-react';
import { SpeechStyle } from '../types';

interface AudioPlayerProps {
  audioUrl: string;
  voice: string;
  style: SpeechStyle;
  textSnippet: string;
  onDownload: (format: 'wav' | 'mp3') => void;
}

// Helper to safely access speechSynthesis without throwing SecurityError
function getSpeechSynthesis(): SpeechSynthesis | null {
  try {
    return window.speechSynthesis || null;
  } catch (err) {
    return null;
  }
}

export default function AudioPlayer({
  audioUrl,
  voice,
  style,
  textSnippet,
  onDownload,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLInputElement>(null);

  const isLocalSpeech = typeof audioUrl === 'string' && audioUrl.startsWith('local-speech:');
  const localText = isLocalSpeech ? audioUrl.replace(/^local-speech:(speed:[a-z]+:)?/, '') : '';

  // Calculate local voice speed prefix
  let localSpeedType = 'normal';
  if (typeof audioUrl === 'string' && audioUrl.startsWith('local-speech:speed:slow:')) {
    localSpeedType = 'slow';
  } else if (typeof audioUrl === 'string' && audioUrl.startsWith('local-speech:speed:fast:')) {
    localSpeedType = 'fast';
  }

  useEffect(() => {
    if (isLocalSpeech) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentTime(0);
      
      // Calculate realistic simulated duration
      const wordCount = localText.split(/\s+/).filter(Boolean).length;
      const calculatedDuration = Math.max(wordCount * 0.45 + 1.5, 3.5);
      setDuration(calculatedDuration);
      
      return () => {
        const synth = getSpeechSynthesis();
        if (synth) synth.cancel();
      };
    }

    // When the audio source url changes, load the new audio and start fresh
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    } else {
      audioRef.current = new Audio(audioUrl);
    }

    const audio = audioRef.current;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    // Initial sync
    audio.volume = volume;

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [audioUrl, isLocalSpeech]);

  // Sync volume with either engine
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Simulated progression timer for browser SpeechSynthesis
  useEffect(() => {
    if (!isLocalSpeech || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          setIsPlaying(false);
          const synth = getSpeechSynthesis();
          if (synth) synth.cancel();
          clearInterval(interval);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isLocalSpeech, isPlaying, duration]);

  // Client-side text-to-speech speaker trigger
  const speakLocal = () => {
    const synth = getSpeechSynthesis();
    if (!synth) return;
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(localText);
    const voices = synth.getVoices();
    let selectedVoiceObj = null;
    
    const safeVoice = voice || '';
    const lowerVoice = safeVoice.toLowerCase();
    const isMale = ['fenrir', 'charon', 'zephyr'].includes(lowerVoice);
    
    if (isMale) {
      selectedVoiceObj = voices.find(v => 
        v.name.toLowerCase().includes('male') || 
        v.name.toLowerCase().includes('david') || 
        v.name.toLowerCase().includes('google de') || 
        v.name.toLowerCase().includes('microsoft david')
      );
    } else {
      selectedVoiceObj = voices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('zira') || 
        v.name.toLowerCase().includes('google us english') || 
        v.name.toLowerCase().includes('microsoft zira') ||
        v.name.toLowerCase().includes('samantha')
      );
    }
    
    if (!selectedVoiceObj && voices.length > 0) {
      selectedVoiceObj = voices[0];
    }
    
    if (selectedVoiceObj) {
      utterance.voice = selectedVoiceObj;
    }
    
    // Speed mapping
    if (localSpeedType === 'slow') {
      utterance.rate = 0.75;
    } else if (localSpeedType === 'fast') {
      utterance.rate = 1.35;
    } else {
      utterance.rate = 1.0;
    }
    
    utterance.volume = volume;
    
    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    utterance.onerror = () => {
      setIsPlaying(false);
    };
    
    synth.speak(utterance);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isLocalSpeech) {
      const synth = getSpeechSynthesis();
      if (isPlaying) {
        if (synth) synth.cancel();
        setIsPlaying(false);
      } else {
        speakLocal();
      }
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Playback failed:", err);
      });
    }
  };

  const restartAudio = () => {
    if (isLocalSpeech) {
      setCurrentTime(0);
      speakLocal();
      return;
    }

    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.error("Playback failed:", err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    
    if (isLocalSpeech) {
      setCurrentTime(seekTime);
      if (isPlaying) {
        const synth = getSpeechSynthesis();
        if (synth) synth.cancel();
        speakLocal();
      }
      return;
    }

    if (!audioRef.current) return;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Helper to format 00:00 style
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Wave representation heights config
  const waveBarCount = 38;
  const seedHeights = [
    25, 33, 48, 55, 30, 22, 60, 75, 40, 30, 55, 80, 95, 65, 44, 72, 85, 50, 
    30, 68, 77, 45, 35, 52, 60, 38, 25, 46, 58, 30, 20, 48, 65, 42, 28, 50, 35, 20
  ];

  return (
    <div
      id="main-audio-player"
      className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-slate-800 space-y-4 md:space-y-6 relative overflow-hidden"
    >
      {/* Absolute decor lines */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />

      {/* Meta header info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-indigo-600 rounded-full text-indigo-100 flex items-center gap-1">
              <Waves className="w-3 h-3 animate-pulse" />
              Active Track
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
              Voice: {voice}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
              Style: {style}
            </span>
          </div>
          <h3 className="font-semibold text-slate-200 text-sm md:text-base line-clamp-1 italic">
            "{textSnippet || 'Generated speech transcription'}"
          </h3>
        </div>

        {/* Big Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={restartAudio}
            id="audio-retry-btn"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all hover:scale-105 cursor-pointer border border-slate-700 font-mono text-xs flex items-center gap-1.5"
            title="Start Over"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          
          {isLocalSpeech ? (
            <div className="text-[10px] uppercase font-mono tracking-wider px-3 py-2 bg-slate-800 text-slate-450 border border-slate-700 rounded-xl select-none italic text-center">
              Local Browser Playback Only
            </div>
          ) : (
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 shadow-inner">
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 text-slate-400 select-none">
                Download:
              </span>
              <button
                onClick={() => onDownload('wav')}
                id="audio-download-wav-btn"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all hover:scale-[1.03] cursor-pointer"
                title="Download Lossless WAV"
              >
                <Download className="w-3 h-3" />
                .WAV
              </button>
              <div className="w-[1px] h-4 bg-slate-700 mx-1.5" />
              <button
                onClick={() => onDownload('mp3')}
                id="audio-download-mp3-btn"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs transition-all hover:scale-[1.03] cursor-pointer"
                title="Download Compressed MP3"
              >
                <Download className="w-3 h-3" />
                .MP3
              </button>
            </div>
          )}
        </div>
      </div>

      {/* WAVE VISUALIZER */}
      <div id="deck-waveforms" className="h-16 md:h-20 flex items-end gap-[3px] px-1 md:px-4 bg-slate-950/40 rounded-xl py-3 border border-slate-800/60 select-none">
        {seedHeights.map((h, index) => {
          // Calculate progress to highlights active colors
          const barPercent = (index / waveBarCount) * 100;
          const playPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
          const isPassed = barPercent <= playPercent;

          // Compute bounce styles when playing
          const randomDelay = (index % 5) * 0.1;
          const animationStyle = isPlaying
            ? {
                animation: `bounceWave 1.4s ease-in-out infinite alternate`,
                animationDelay: `${randomDelay}s`,
              }
            : undefined;

          return (
            <div
              key={index}
              className={`flex-1 rounded-sm transition-all duration-300 ${
                isPassed
                  ? 'bg-gradient-to-t from-indigo-500 to-teal-400'
                  : 'bg-slate-700'
              }`}
              style={{
                height: `${h}%`,
                opacity: isPassed ? 1 : 0.5,
                transformOrigin: 'bottom',
                ...animationStyle,
              }}
            />
          );
        })}
      </div>

      {/* PLAYER CONTROLS ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        {/* Core Play Back Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            id="audio-play-pause-btn"
            className="p-3.5 rounded-2xl bg-white text-slate-950 hover:bg-indigo-50 transition-all hover:scale-105 shadow-md flex items-center justify-center cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Time text */}
          <div className="text-xs font-mono text-slate-400 select-none">
            <span className="text-white font-medium">{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 max-w-xl flex items-center gap-2">
          <input
            id="timeline-input-range"
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={duration === 0}
            className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 cursor-pointer accent-indigo-500 focus:outline-none transition-all disabled:opacity-50"
            ref={progressBarRef}
            style={{
              background: `linear-gradient(to right, #4338ca 0%, #14b8a6 ${
                duration > 0 ? (currentTime / duration) * 100 : 0
              }%, #1e293b ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #1e293b 100%)`,
            }}
          />
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2 max-w-[140px]" id="volume-group">
          <Volume2 className="w-4 h-4 text-slate-400 shrink-0 select-none" />
          <input
            id="volume-input-range"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 rounded-lg appearance-none bg-slate-800 cursor-pointer accent-indigo-500"
            style={{
              background: `linear-gradient(to right, #4338ca 0%, #4338ca ${volume * 100}%, #1e293b ${volume * 100}%, #1e293b 100%)`
            }}
          />
        </div>
      </div>

      {/* Styled animation keyframes inside component */}
      <style>{`
        @keyframes bounceWave {
          0% {
            transform: scaleY(1);
          }
          100% {
            transform: scaleY(0.4);
          }
        }
      `}</style>
    </div>
  );
}
