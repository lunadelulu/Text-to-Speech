import React, { useState } from 'react';
import { VOICE_OPTIONS } from '../data';
import { VoiceOption } from '../types';
import { Volume2, VolumeX, User, Sparkles, Play, Loader } from 'lucide-react';
import { motion } from 'motion/react';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  onPlayPreview: (voiceId: string, text: string) => Promise<void>;
  previewingVoiceId: string | null;
}

export default function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  onPlayPreview,
  previewingVoiceId,
}: VoiceSelectorProps) {
  const [hoveredVoice, setHoveredVoice] = useState<string | null>(null);

  const handleDemoClick = (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation();
    const demoTexts: Record<string, string> = {
      Kore: "Hello! I am Kore. I have a warm, natural female voice designed for smooth, everyday reading.",
      Puck: "Hi there! I am Puck. I love reading with bright, energetic, and playful tones!",
      Zephyr: "Welcome. I am Zephyr, a gentle and calming female speaker designed for quiet narration and peace.",
      Charon: "Good day. I am Charon. My voice is deep, resonant, and commands absolute authority.",
      Fenrir: "Greetings. My name is Fenrir. I deliver clear, articulate, and highly professional speech."
    };
    onPlayPreview(voice.id, demoTexts[voice.id] || `Hello, my name is ${voice.id}.`);
  };

  return (
    <div id="voice-selector-container" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            1. Choose Your Voice
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Select a voice actor to narrate your text. Click the Demo button to preview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="voice-grid">
        {VOICE_OPTIONS.map((voice) => {
          const isSelected = selectedVoice === voice.id;
          const isPreviewing = previewingVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              id={`voice-card-${voice.id}`}
              onClick={() => onVoiceChange(voice.id)}
              onMouseEnter={() => setHoveredVoice(voice.id)}
              onMouseLeave={() => setHoveredVoice(null)}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                  : 'border-slate-200 bg-white hover:border-slate-350 hover:shadow-md'
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm leading-none">{voice.name}</h3>
                      <span className="text-[10px] text-slate-400 font-medium">{voice.gender} Voice</span>
                    </div>
                  </div>
                  
                  {/* Say Hello / Demo Button */}
                  <button
                    onClick={(e) => handleDemoClick(e, voice)}
                    disabled={previewingVoiceId !== null && !isPreviewing}
                    className={`flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold tracking-tight transition-all disabled:opacity-50 ${
                      isPreviewing
                        ? 'bg-amber-100 text-amber-700 animate-pulse'
                        : isSelected
                        ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Generate direct voice hello demo"
                  >
                    {isPreviewing ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-2.5 h-2.5 fill-current" />
                    )}
                    {isPreviewing ? 'Demoing...' : 'Demo Voice'}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 mt-3 line-clamp-2 min-h-[2rem]">
                  {voice.description}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-slate-100">
                {voice.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isSelected
                        ? 'bg-indigo-100/50 text-indigo-700 border border-indigo-250'
                        : 'bg-slate-50 text-slate-500 border border-slate-150'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
