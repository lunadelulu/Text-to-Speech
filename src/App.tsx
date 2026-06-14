import { useState, useEffect } from 'react';
import { SpeechStyle, SpeechSpeed, HistoryItem } from './types';
import { SAMPLE_TEXTS } from './data';
import VoiceSelector from './components/VoiceSelector';
import TextPanel from './components/TextPanel';
import StyleConfigurator from './components/StyleConfigurator';
import AudioPlayer from './components/AudioPlayer';
import HistoryList from './components/HistoryList';
import { Mic, Info, Sparkles, Loader, AlertCircle, Play, Music, Flame, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CHAR_LIMIT = 100000;

export default function App() {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [selectedStyle, setSelectedStyle] = useState<SpeechStyle>('default');
  const [selectedSpeed, setSelectedSpeed] = useState<SpeechSpeed>('normal');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTrack, setActiveTrack] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('tts_user_api_key') || '';
    } catch {
      return '';
    }
  });

  // Sync custom user API Key to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tts_user_api_key', userApiKey);
    } catch (err) {
      console.error('Error saving user API key:', err);
    }
  }, [userApiKey]);

  // On mount, load initial text and local storage history
  useEffect(() => {
    // Set first sample text as a neat working placeholder
    if (SAMPLE_TEXTS.length > 0) {
      setText(SAMPLE_TEXTS[0].text);
    }

    try {
      const storedHistory = localStorage.getItem('tts_history');
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          // Gracefully filter out any legacy local SpeechSynthesis entries that cannot be downloaded
          const filtered = parsed.filter((item: any) => 
            typeof item?.audioUrl === 'string' && !item.audioUrl.startsWith('local-speech:')
          ) as HistoryItem[];
          
          setHistory(filtered);
          
          // Load the most recent cloud track into the player automatically if present
          if (filtered.length > 0) {
            setActiveTrack(filtered[0]);
          }
          
          // Save the cleaned history back to localStorage
          localStorage.setItem('tts_history', JSON.stringify(filtered));
        }
      }
    } catch (err) {
      console.error('Error restoring storage history:', err);
    }
  }, []);

  // Main synthesis trigger
  const handleSynthesize = async () => {
    if (!text.trim()) {
      setError('Please write or paste some text before synthesizing.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: selectedVoice,
          style: selectedStyle,
          speed: selectedSpeed,
          apiKey: userApiKey.trim() || undefined,
        }),
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textError = await response.text();
        throw new Error(`Server returned non-JSON response (${response.status}): ${textError.substring(0, 150) || 'Unknown error'}`);
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to synthesize speech.');
      }

      const generatedTrack: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        text: text.trim(),
        voice: selectedVoice,
        style: selectedStyle,
        speed: selectedSpeed,
        audioUrl: data.audioData,
        wordCount: data.wordCount,
        charCount: data.charCount,
      };

      setActiveTrack(generatedTrack);

      setHistory((prev) => {
        const updated = [generatedTrack, ...prev];
        try { localStorage.setItem('tts_history', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });

    } catch (err: any) {
      console.error('Synthesis error:', err);
      setError(err.message || 'An error occurred while generating audio. Please check your setup & API context and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct demo hello playback per voice card
  const handlePlayVoicePreview = async (voiceId: string, demoText: string) => {
    setPreviewingVoiceId(voiceId);
    setError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: demoText,
          voice: voiceId,
          style: 'default',
          speed: 'normal',
          apiKey: userApiKey.trim() || undefined,
        }),
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textError = await response.text();
        throw new Error(`Server returned non-JSON response (${response.status}): ${textError.substring(0, 150) || 'Unknown error'}`);
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load preview.');
      }

      // Load and play preview on the fly
      const audio = new Audio(data.audioData);
      audio.volume = 0.9;
      await audio.play();

    } catch (err: any) {
      console.error('Voice preview failed:', err);
      setError(err.message || 'Failed to play voice preview. Please check your setup & API Key.');
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  // Helper selectors
  const handleSelectTrack = (item: HistoryItem) => {
    setActiveTrack(item);
    // Sync current editor settings to match historic selections optionally
    setSelectedVoice(item.voice);
    setSelectedStyle(item.style);
    setSelectedSpeed(item.speed);
    setText(item.text);
    
    // Jump to focus player
    const playerEl = document.getElementById('main-audio-player');
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try { localStorage.setItem('tts_history', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    if (activeTrack?.id === id) {
      setActiveTrack(null);
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to delete all saved recordings from your library? This action is permanent.')) {
      setHistory([]);
      try { localStorage.removeItem('tts_history'); } catch (e) {}
      setActiveTrack(null);
    }
  };

  const handleDownloadActiveTrack = (format: 'wav' | 'mp3' = 'wav') => {
    if (!activeTrack) return;
    const link = document.createElement('a');
    link.href = activeTrack.audioUrl;
    const safeText = activeTrack.text || '';
    const cleanSnippet = safeText.substring(0, 16).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    link.download = `${activeTrack.voice}_${activeTrack.style}_${cleanSnippet || 'track'}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="app-viewport" className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* HEADER NAV BRAND */}
      <header id="main-header" className="bg-white border-b border-slate-150 py-3.5 px-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative p-2 bg-gradient-to-tr from-indigo-600 to-indigo-700 rounded-xl text-white shadow-sm flex items-center justify-center">
              <Mic className="w-5 h-5 shrink-0" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-teal-400 rounded-full animate-ping" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-teal-400 rounded-full" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 leading-none">Text-to-Speech Studio</h1>
              <p className="text-[10px] md:text-xs text-slate-400 font-medium mt-0.5">Instant natural narration by Gemini AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs font-mono font-bold tracking-tight py-1 px-2.5 rounded-full bg-slate-100 text-slate-600 border border-slate-150">
              Sample Rate: 24kHz
            </span>
          </div>
        </div>
      </header>

      {/* BODY WORKSPACE CONTAINER */}
      <main id="main-workspace" className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* LEFT COLUMN: CRITERIA EDIT CONTROLS */}
        <section id="controls-panel" className="lg:col-span-8 space-y-6 md:space-y-8">
          
          {/* Error Banner */}
          {error && (
            <div
              id="error-feedback-alert"
              className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4.5 bg-rose-50 border border-rose-150 text-rose-850 rounded-xl text-sm shadow-sm"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Synthesizer Operation Notice</p>
                  <p className="text-xs text-rose-700 leading-relaxed max-w-2xl">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Synthesizer Settings card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm space-y-3.5" id="engine-selector-card">
            <div className="space-y-3">
              <div className="text-xs text-amber-805 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0 animate-pulse" />
                <p className="leading-normal text-slate-700">
                  <strong className="font-semibold text-slate-850">Cloud Neural Engine:</strong> Synthesizes highly expressive, studio-grade voices. Generates PCM streams that are 100% downloadable as lossless WAV files. Input your personal API key below to secure your own unlimited high-rate limits.
                </p>
              </div>

              {/* API Key Input Container */}
              <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="space-y-0.5">
                  <label htmlFor="user-api-key-input" className="text-xs font-bold text-slate-755 flex items-center gap-1.5">
                    <span>Personal Gemini API Key</span>
                    <span className="text-[10px] text-slate-400 font-normal bg-slate-200/50 px-1.5 py-0.2 rounded-md">Optional</span>
                  </label>
                  <p className="text-[11px] text-slate-500 max-w-sm">Provide your own key to secure unlimited high-rate quotas. Key is saved locally in your browser.</p>
                </div>
                <div className="relative flex-1 max-w-xs md:max-w-md">
                  <input
                    type="password"
                    id="user-api-key-input"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="Use default server key or enter your API Key"
                    className="w-full pl-3 pr-20 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-505 focus:ring-1 focus:ring-indigo-505 transition-all shadow-inner"
                  />
                  {userApiKey && (
                    <button
                      onClick={() => setUserApiKey('')}
                      id="clear-key-btn"
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 cursor-pointer"
                      title="Clear API Key"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 1. Voice Selecting card array */}
          <VoiceSelector
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            onPlayPreview={handlePlayVoicePreview}
            previewingVoiceId={previewingVoiceId}
          />

          {/* 2. Text Box Narrative Board */}
          <TextPanel
            text={text}
            onTextChange={setText}
            characterLimit={CHAR_LIMIT}
          />

          {/* 3. Style Selection and Speed settings */}
          <StyleConfigurator
            selectedStyle={selectedStyle}
            onStyleChange={setSelectedStyle}
            selectedSpeed={selectedSpeed}
            onSpeedChange={setSelectedSpeed}
          />

          {/* SYNTHESIS ACTION ROW */}
          <div id="action-center-trigger-bar" className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleSynthesize}
              disabled={isGenerating || !text.trim()}
              id="synthesize-audio-btn"
              className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2.5 py-4 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm tracking-tight shadow-md disabled:opacity-40 hover:shadow-lg disabled:hover:shadow-md active:scale-[0.99] transition-all cursor-pointer select-none"
            >
              {isGenerating ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {isGenerating ? (
                text.trim().length > 8000 
                  ? 'Synthesizing (Auto-buffering long text)...' 
                  : 'Synthesizing Narrative...'
              ) : (
                'Convert to Audio'
              )}
            </button>
            <p className="text-xs text-slate-400 max-w-sm text-center sm:text-left leading-normal" id="action-hint-label">
              Converts text using Gemini's highly expressive Cloud Neural model in 24kHz studio grade quality.
            </p>
          </div>
        </section>

        {/* RIGHT COLUMN: ACTIVE DECK PLAYER & LIBRARY */}
        <section id="output-library-panel" className="lg:col-span-4 space-y-6 md:space-y-8 sticky lg:top-20">
          
          {/* ACTIVE TRACK PLAYER DECK CONTAINER */}
          <div id="active-deck-player-column" className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 select-none">
              Audio Playback Deck
            </h2>
            
            {activeTrack ? (
              <AudioPlayer
                audioUrl={activeTrack.audioUrl}
                voice={activeTrack.voice}
                style={activeTrack.style}
                textSnippet={activeTrack.text}
                onDownload={handleDownloadActiveTrack}
              />
            ) : (
              <div
                id="offline-active-deck"
                className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 select-none flex flex-col items-center justify-center min-h-[14rem]"
              >
                <div className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center bg-slate-50 mb-3 text-slate-350">
                  <Music className="w-6 h-6" />
                </div>
                <h3 className="text-slate-700 font-semibold text-sm">No Active Track Loaded</h3>
                <p className="text-xs text-slate-450 mt-1.5 max-w-[200px] mx-auto leading-normal">
                  Convert a script or select standard files from your track library.
                </p>
              </div>
            )}
          </div>

          {/* HISTORICAL TRACKS LIBRARY */}
          <HistoryList
            items={history}
            activeItemId={activeTrack?.id || null}
            onSelectTrack={handleSelectTrack}
            onDeleteItem={handleDeleteItem}
            onClearAll={handleClearAllHistory}
          />
        </section>

      </main>

      {/* FOOTER */}
      <footer id="app-footer" className="mt-auto bg-white border-t border-slate-150 py-5 text-center px-4">
        <p className="text-xs text-slate-400 font-medium">Text-to-Speech Converter • Google AI Studio</p>
      </footer>
    </div>
  );
}
