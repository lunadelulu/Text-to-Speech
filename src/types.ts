export type SpeechStyle = 'default' | 'cheerful' | 'sad' | 'excited' | 'whisper' | 'formal' | 'dramatic';

export type SpeechSpeed = 'slow' | 'normal' | 'fast';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  description: string;
  tags: string[];
}

export interface SpeechConfig {
  text: string;
  voice: string;
  style: SpeechStyle;
  speed: SpeechSpeed;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  text: string;
  voice: string;
  style: SpeechStyle;
  speed: SpeechSpeed;
  audioUrl: string; // Base64 data URL
  wordCount: number;
  charCount: number;
}
