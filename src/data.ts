import { VoiceOption, SpeechStyle, SpeechSpeed } from './types';

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    description: 'A crisp, warm, and professional ambient voice designed for narrations and general content.',
    tags: ['Warm', 'Narrative', 'Clear']
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male',
    description: 'An energetic, cheerful, and highly animated voice perfect for storytelling and upbeat alerts.',
    tags: ['Playful', 'Upbeat', 'Friendly']
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Female',
    description: 'A gentle, peaceful, and clean voice suitable for mindfulness, guides, and soft audiobooks.',
    tags: ['Gentle', 'Soothing', 'Calm']
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    description: 'A deep, resonant, and calm voice that commands authority, ideal for dramatic or formal reads.',
    tags: ['Deep', 'Serene', 'Commanding']
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    description: 'A strong, articulate, and professional-grade voice suitable for business and audio presentations.',
    tags: ['Articulate', 'Executive', 'Solid']
  }
];

export interface StyleOption {
  id: SpeechStyle;
  label: string;
  emoji: string;
  description: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'default',
    label: 'Natural (Default)',
    emoji: '🎙️',
    description: 'Standard talking cadence with neutral, highly professional pacing.'
  },
  {
    id: 'cheerful',
    label: 'Cheerful & Warm',
    emoji: '☀️',
    description: 'Add a friendly, sunny smile to the voice, great for announcements.'
  },
  {
    id: 'whisper',
    label: 'Soft Whisper',
    emoji: '🤫',
    description: 'Very soft, whisper-like delivery suited for ASMR, sleep, or intimate narration.'
  },
  {
    id: 'formal',
    label: 'Formal Corporate',
    emoji: '👔',
    description: 'Authoritative, precise, and serious voice designed for corporate presentations.'
  },
  {
    id: 'dramatic',
    label: 'Dramatic Reading',
    emoji: '🎭',
    description: 'Deep expression, rich pauses, and a cinematic storytelling tone.'
  },
  {
    id: 'excited',
    label: 'Excited Energy',
    emoji: '⚡',
    description: 'High energy and enthusiastic delivery that builds momentum.'
  },
  {
    id: 'sad',
    label: 'Somber & Reflective',
    emoji: '🌧️',
    description: 'Soft, slow, and somber voice suited for sad or deeply reflective narratives.'
  }
];

export interface SpeedOption {
  id: SpeechSpeed;
  label: string;
  description: string;
}

export const SPEED_OPTIONS: SpeedOption[] = [
  {
    id: 'slow',
    label: 'Slow (0.8x)',
    description: 'Deliberate and highly articulate'
  },
  {
    id: 'normal',
    label: 'Normal (1.0x)',
    description: 'Natural human speaking speed'
  },
  {
    id: 'fast',
    label: 'Fast (1.25x)',
    description: 'Energetic and compressed'
  }
];

export const SAMPLE_TEXTS = [
  {
    title: '🎙️ Welcome Greeting',
    text: 'Welcome to the Text to Speech Studio! This application transforms your words into incredible, lifelike auditory experiences using state-of-the-art synthetic voice technology. Feel free to explore our voices, try different styles, and customize the delivery speed to find your perfect fit.'
  },
  {
    title: '📖 Short Storybook',
    text: 'Deep in the heart of the whispering woods, a small owl named Pip decided to stay awake past sunrise. For the first time, he saw a world awash in Golden sunlight, with dew-drops glistening like tiny diamonds on every leaf.'
  },
  {
    title: '🏢 Executive Briefing',
    text: 'Our primary objective for the coming quarter is streamlining product delivery while remaining firmly committed to complete client satisfaction. We appreciate your focus and drive as we initiate this transitional roadmap.'
  },
  {
    title: '🧘 Meditation Guide',
    text: 'Close your eyes. Let your shoulders drop away from your ears. Slowly draw in a deep, clean breath, holding it for just a moment, and then release it, letting go of any tension you might be holding onto.'
  }
];
