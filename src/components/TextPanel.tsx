import React, { useState, useRef } from 'react';
import { SAMPLE_TEXTS } from '../data';
import { FileText, Upload, Trash2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface TextPanelProps {
  text: string;
  onTextChange: (newText: string) => void;
  characterLimit: number;
}

export default function TextPanel({ text, onTextChange, characterLimit }: TextPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const characterCount = text.length;

  // Preset selection handler
  const loadPreset = (presetText: string) => {
    onTextChange(presetText);
    setUploadStatus({ status: 'idle', message: '' });
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      setUploadStatus({
        status: 'error',
        message: 'Only .txt files are supported. Please convert your file to plain text.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target?.result as string;
      if (fileContent) {
        if (fileContent.length > characterLimit) {
          onTextChange(fileContent.substring(0, characterLimit));
          setUploadStatus({
            status: 'success',
            message: `Imported text truncated to fit the limit of ${characterLimit} characters.`,
          });
        } else {
          onTextChange(fileContent);
          setUploadStatus({
            status: 'success',
            message: `Successfully loaded "${file.name}" (${fileContent.length} characters).`,
          });
        }
      }
    };
    reader.onerror = () => {
      setUploadStatus({
        status: 'error',
        message: 'Error reading file. Please try again or copy-paste directly.',
      });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearText = () => {
    onTextChange('');
    setUploadStatus({ status: 'idle', message: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div id="text-panel-container" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            2. Write, Paste, or Upload Text
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Enter the script you want converted into high-fidelity audio.</p>
        </div>
        {text && (
          <button
            onClick={clearText}
            id="clear-text-btn"
            className="self-start flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-600 hover:text-white border border-rose-300 hover:border-rose-600 hover:bg-rose-600 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Input
          </button>
        )}
      </div>

      {/* Preset Library */}
      <div id="template-presets" className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Quick Presets</span>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_TEXTS.map((preset) => {
            const isMatch = text === preset.text;
            return (
              <button
                key={preset.title}
                onClick={() => loadPreset(preset.text)}
                type="button"
                className={`py-1.5 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                  isMatch
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {preset.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor pad + File drop zone */}
      <div id="editor-wrapper" className="relative group/editor border-0">
        <textarea
          id="script-textarea"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          maxLength={characterLimit}
          placeholder="Type or paste your narrative here... or drop a .txt file below"
          className="w-full min-h-[12rem] max-h-[22rem] p-4 text-sm leading-relaxed text-slate-700 bg-white rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 focus:outline-none transition-all resize-y group-hover/editor:border-slate-300"
        />

        {/* Counter floating badges */}
        <div className="absolute right-3.5 bottom-3 text-[10px] font-mono select-none px-2.5 py-1 rounded-full bg-slate-900/5 backdrop-blur-sm text-slate-600 flex items-center gap-1.5 z-10 pointer-events-none">
          <span className="font-semibold">{wordCount} words</span>
          <span className="text-slate-300">|</span>
          <span className={characterCount >= characterLimit * 0.9 ? 'text-amber-600 font-bold' : ''}>
            {characterCount} / {characterLimit} chars
          </span>
        </div>
      </div>

      {/* Drag & Drop File Upload Area */}
      <div
        id="file-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center py-4 px-6 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700'
            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".txt"
          className="hidden"
          id="file-input-raw"
        />
        
        <div className="flex items-center gap-2.5 text-slate-500">
          <Upload className={`w-4 h-4 ${isDragging ? 'text-indigo-600 animate-bounce' : 'text-slate-400'}`} />
          <p className="text-xs">
            <span className="font-semibold text-indigo-600 hover:underline">Click to upload doc</span> or drag-and-drop a <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[10px] select-all font-mono font-bold">.txt</code> file here.
          </p>
        </div>
      </div>

      {/* File feedback alerts */}
      {uploadStatus.status !== 'idle' && (
        <div
          id="upload-status-display"
          className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
            uploadStatus.status === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-150'
              : 'bg-rose-50 text-rose-800 border border-rose-150'
          }`}
        >
          {uploadStatus.status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="leading-normal">{uploadStatus.message}</span>
        </div>
      )}
    </div>
  );
}
