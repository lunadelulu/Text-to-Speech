import { STYLE_OPTIONS, SPEED_OPTIONS } from '../data';
import { SpeechStyle, SpeechSpeed } from '../types';
import { Sliders, Gauge } from 'lucide-react';

interface StyleConfiguratorProps {
  selectedStyle: SpeechStyle;
  onStyleChange: (style: SpeechStyle) => void;
  selectedSpeed: SpeechSpeed;
  onSpeedChange: (speed: SpeechSpeed) => void;
}

export default function StyleConfigurator({
  selectedStyle,
  onStyleChange,
  selectedSpeed,
  onSpeedChange,
}: StyleConfiguratorProps) {
  return (
    <div id="style-configurator-container" className="space-y-6">
      {/* Voice Expression / Style */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-500" />
            3. Select Voice Style & Tone
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Determine how the speaker emotes and delivers the prose.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" id="style-grid">
          {STYLE_OPTIONS.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                id={`style-btn-${style.id}`}
                onClick={() => onStyleChange(style.id)}
                className={`flex items-start text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-600/5'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl mr-3 select-none" role="img" aria-label={style.label}>
                  {style.emoji}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-800 text-xs">{style.label}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{style.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Speed Configuration */}
      <div className="space-y-3 pt-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-indigo-500" />
            4. Adjust Speech Velocity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Change how quickly the speaker narrate.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:max-w-md" id="speed-selector-row">
          {SPEED_OPTIONS.map((speed) => {
            const isSelected = selectedSpeed === speed.id;
            return (
              <button
                key={speed.id}
                id={`speed-btn-${speed.id}`}
                onClick={() => onSpeedChange(speed.id)}
                className={`flex-1 text-center py-2 px-3 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {speed.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
