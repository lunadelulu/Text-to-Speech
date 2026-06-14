import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { STYLE_OPTIONS } from '../data';
import { ListMusic, Play, Download, Trash, Trash2, Calendar, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

interface HistoryListProps {
  items: HistoryItem[];
  activeItemId: string | null;
  onSelectTrack: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export default function HistoryList({
  items,
  activeItemId,
  onSelectTrack,
  onDeleteItem,
  onClearAll,
}: HistoryListProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Get style emoji
  const getStyleEmojiAndLabel = (styleId: string) => {
    const match = STYLE_OPTIONS.find((s) => s.id === styleId);
    return {
      emoji: match?.emoji || '🎙️',
      label: match?.label || styleId,
    };
  };

  const getFormattedDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  if (items.length === 0) {
    return (
      <div id="history-empty-view" className="border border-slate-150 rounded-2xl p-8 text-center bg-slate-50/30">
        <div className="mx-auto w-10 h-10 rounded-full bg-slate-150 flex items-center justify-center text-slate-400 mb-3">
          <ListMusic className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-slate-700 text-sm">No synthesized tracks yet</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Configure a voice, write some text, and click the generator above to start building your speech history.
        </p>
      </div>
    );
  }

  return (
    <div id="history-list-wrapper" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-800 flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-indigo-500" />
            Synthesized Tracks Library ({items.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Quickly play or redownload previous conversions.</p>
        </div>
        <button
          onClick={onClearAll}
          id="clear-all-history-btn"
          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 transition-all cursor-pointer bg-white"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Library
        </button>
      </div>

      {/* Grid List */}
      <div className="space-y-3" id="history-grid-items">
        {items.map((item) => {
          const isActive = activeItemId === item.id;
          const isExpanded = expandedItemId === item.id;
          const styleInfo = getStyleEmojiAndLabel(item.style);

          return (
            <div
              key={item.id}
              onClick={() => onSelectTrack(item)}
              id={`history-item-row-${item.id}`}
              className={`group border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Main row layout */}
              <div className="p-4 flex items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {/* Play circle trigger */}
                  <div
                    className={`p-2.5 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>

                  {/* Text details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={`text-sm font-medium leading-normal text-slate-800 line-clamp-1 ${isActive ? 'text-indigo-950 font-semibold' : ''}`}>
                      {item.text}
                    </p>
                    
                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-600 px-1.5 py-0.5 bg-slate-100 rounded-md">
                        {item.voice}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <span className="text-xs">{styleInfo.emoji}</span> {styleInfo.label}
                      </span>
                      <span>•</span>
                      <span className="capitalize font-medium">Speed: {item.speed}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-slate-350" />
                        {getFormattedDate(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Left/Right actions panel */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => toggleExpand(e, item.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded"
                    title={isExpanded ? 'Collapse' : 'Show full script'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <a
                    href={item.audioUrl}
                    download={`${item.voice}_${item.style}_${(item.id || 'track').substring(0, 4)}.wav`}
                    className="p-2 bg-slate-50 hover:bg-teal-50 text-slate-500 hover:text-teal-700 border border-slate-200 hover:border-teal-200 rounded-lg transition-all"
                    title="Quick Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-all cursor-pointer"
                    title="Delete track"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expansive script segment */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 block text-xs leading-relaxed text-slate-600 md:ml-12">
                  <div className="flex gap-2 items-start mt-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800">Full Text Draft:</p>
                      <p className="mt-1 bg-white p-2.5 rounded-lg border border-slate-150 select-text whitespace-pre-wrap leading-relaxed select-all">
                        {item.text}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2 font-mono">
                        Stats: {item.charCount} characters | {item.wordCount} words
                      </p>
                      
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-150">
                        <span className="text-[9.5px] uppercase font-mono tracking-wider font-semibold text-slate-400 select-none mr-1">Export Format:</span>
                        <a
                          href={item.audioUrl}
                          download={`${item.voice}_${item.style}_${(item.id || 'track').substring(0, 5)}.wav`}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700 hover:text-white hover:bg-teal-600 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-150 transition-all cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> WAV (Lossless)
                        </a>
                        <a
                          href={item.audioUrl}
                          download={`${item.voice}_${item.style}_${(item.id || 'track').substring(0, 5)}.mp3`}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 hover:text-white hover:bg-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-150 transition-all cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> MP3 (Compressed)
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
