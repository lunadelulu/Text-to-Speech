import { GoogleGenAI } from "@google/genai";
import { Router } from "express";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

export const apiRouter = Router();

// Support JSON body parsing in the router
apiRouter.use(express.json({ limit: "10mb" }));

// Route log middleware
apiRouter.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    console.log(`[Vite API Routing Log] Incoming request: ${req.method} ${req.path}`);
  }
  next();
});

// Simple health API endpoint
apiRouter.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API endpoint for Text-to-Speech
apiRouter.post("/api/tts", async (req, res) => {
  try {
    const { text, voice, style, speed, apiKey } = req.body;

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!effectiveApiKey) {
      return res.status(400).json({
        error: "GEMINI_API_KEY is not configured. Please enter your personal Gemini API Key or register the key in the Settings panel."
      });
    }

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required and must be a string." });
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return res.status(400).json({ error: "Text cannot be blank." });
    }

    if (trimmedText.length > 250000) {
      return res.status(400).json({ error: "Text exceeds the safe limit of 250,000 characters." });
    }

    const voiceName = voice || "Kore";
    const validVoices = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
    if (!validVoices.includes(voiceName)) {
      return res.status(400).json({ error: "Invalid voice selection." });
    }

    // Isolate the cache partition based on the last 8 digits of the API key to avoid data leakage
    const keySnippet = effectiveApiKey.slice(-8);
    const cacheKey = `${voiceName}_${style || "default"}_${speed || "normal"}_${keySnippet}_${trimmedText}`;
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`[TTS Cache HIT] Served synthesized track from in-memory cache.`);
      return res.json(cached);
    }

    // Initialize a safe, scoped GoogleGenAI client lazily for this request
    const activeGenai = new GoogleGenAI({
      apiKey: effectiveApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Split text into safe chunk payloads of up to 1200 characters
    // ~200 words/characters per chunk is ideal to make it flow naturally and prevent disjointed speech
    const chunks = chunkText(trimmedText, 1200);

    const base64Chunks: string[] = [];
    const hasCustomKey = !!apiKey;

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const chunkKey = `${voiceName}_${style || "default"}_${speed || "normal"}_${keySnippet}_${chunk}`;
      
      const cachedChunkAudio = getChunkCache(chunkKey);
      if (cachedChunkAudio) {
        console.log(`[Chunk Cache HIT] Reused synthesized block ${index + 1}/${chunks.length}`);
        base64Chunks.push(cachedChunkAudio);
        continue;
      }

      // Simple pacing sleep between chunks to avoid concurrent execute spikes
      if (index > 0) {
        await sleep(hasCustomKey ? 500 : 1000);
      }

      const promptText = buildPromptText(chunk, style, speed);

      try {
        const base64Audio = await runInSequentialQueue(() =>
          generateContentWithRetry(
            activeGenai,
            "gemini-3.1-flash-tts-preview",
            promptText,
            voiceName,
            hasCustomKey
          )
        );
        base64Chunks.push(base64Audio);
        setChunkCache(chunkKey, base64Audio);
      } catch (err: any) {
        console.error(`Error in TTS segment ${index}:`, err);
        throw err; // Propagate the specific error cleanly
      }
    }

    // Concatenate the decoded PCM binary arrays
    const pcmBuffers = base64Chunks.map((b64) => Buffer.from(b64, "base64"));
    const concatenatedPCM = Buffer.concat(pcmBuffers);

    // Convert raw PCM stream to downloadable WAV
    const wavBuffer = pcmToWav(concatenatedPCM, 24000); // 24000 Hz, mono, 16-bit PCM

    const resultBase64 = wavBuffer.toString("base64");
    const jsonResponse = {
      audioData: `data:audio/wav;base64,${resultBase64}`,
      format: "wav",
      voice: voiceName,
      style: style || "default",
      speed: speed || "normal",
      wordCount: trimmedText.split(/\s+/).filter(Boolean).length,
      charCount: trimmedText.length
    };

    // Save to cache
    setCache(cacheKey, jsonResponse);

    res.json(jsonResponse);

  } catch (error: any) {
    console.error("TTS generation error:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred during audio generation."
    });
  }
});

// Simple pcmToWav converter helper
function pcmToWav(pcmBuffer: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const subChunk2Size = pcmBuffer.length;
  const chunkSize = 36 + subChunk2Size;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  const header = Buffer.alloc(44);

  // RIFF identifier
  header.write("RIFF", 0);
  // File length
  header.writeUInt32LE(chunkSize, 4);
  // RIFF type
  header.write("WAVE", 8);
  // format chunk identifier
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // linear PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(subChunk2Size, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Split text into chunks safe for the Gemini TTS model (ideally ~1200 characters)
function chunkText(text: string, maxLength: number = 1200): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n+/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    // If paragraph is within maxLength, merge it with currentChunk if possible
    if (trimmedParagraph.length <= maxLength) {
      if ((currentChunk + "\n" + trimmedParagraph).trim().length <= maxLength) {
        currentChunk = (currentChunk ? currentChunk + "\n" + trimmedParagraph : trimmedParagraph).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = trimmedParagraph;
      }
    } else {
      // Paragraph itself is too long, we split it by sentence boundaries
      // Supports Western (.!?) and Eastern (。？！；;) sentence bounds
      const sentenceRegex = /[^.!?。？！；;\n]+[.!?。？！；;\n]*|.+/g;
      const sentences = trimmedParagraph.match(sentenceRegex) || [trimmedParagraph];

      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        if (trimmedSentence.length > maxLength) {
          // Gracefully partition very long sentences or continuous non-spaced texts (e.g. Chinese)
          let start = 0;
          while (start < trimmedSentence.length) {
            let end = start + maxLength;
            if (end < trimmedSentence.length) {
              let bestSplit = end;
              const searchRange = Math.min(50, end - start);
              for (let i = 0; i < searchRange; i++) {
                const idx = end - i;
                if (idx <= start) break;
                const char = trimmedSentence[idx];
                if (/\s|[,，、.!?。？！；;]/.test(char)) {
                  bestSplit = idx + 1;
                  break;
                }
              }
              end = bestSplit;
            }
            const part = trimmedSentence.substring(start, end).trim();
            if (part) {
              if ((currentChunk + " " + part).trim().length <= maxLength) {
                currentChunk = (currentChunk ? currentChunk + " " + part : part).trim();
              } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = part;
              }
            }
            start = end;
          }
        } else {
          if ((currentChunk + " " + trimmedSentence).trim().length <= maxLength) {
            currentChunk = (currentChunk ? currentChunk + " " + trimmedSentence : trimmedSentence).trim();
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = trimmedSentence;
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Build style and speed instruction prompts surrounding the narrative chunk
function buildPromptText(trimmedText: string, style: string, speed: string): string {
  if ((!style || style === "default") && (!speed || speed === "normal")) {
    return trimmedText;
  }

  let styleDesc = "";
  switch (style) {
    case "cheerful":
      styleDesc = "cheerfully and warmly";
      break;
    case "whisper":
      styleDesc = "in a soft, quiet whispered tone";
      break;
    case "formal":
      styleDesc = "in a professional, formal tone";
      break;
    case "dramatic":
      styleDesc = "in a dramatic, highly expressive tone";
      break;
    case "excited":
      styleDesc = "in an excited, enthusiastic tone";
      break;
    case "sad":
      styleDesc = "in a sad, somber tone";
      break;
    default:
      styleDesc = "clearly and naturally";
      break;
  }

  let speedDesc = "";
  if (speed === "slow") {
    speedDesc = "slowly";
  } else if (speed === "fast") {
    speedDesc = "quickly";
  }

  let instruction = "Say";
  if (styleDesc && speedDesc) {
    instruction = `Say ${styleDesc} and ${speedDesc}:`;
  } else if (styleDesc) {
    instruction = `Say ${styleDesc}:`;
  } else if (speedDesc) {
    instruction = `Say ${speedDesc}:`;
  }

  return `${instruction} ${trimmedText}`;
}

// Simple sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate content with exponential backoff on 429 / resource exhausted rate limit errors
async function generateContentWithRetry(
  genai: GoogleGenAI,
  modelName: string,
  promptText: string,
  voiceName: string,
  isCustomKey: boolean = false,
  maxRetries = 10
): Promise<string> {
  let attempt = 0;
  let delay = 2500;

  while (true) {
    try {
      // Prior to making ANY actual API call attempt (including retries),
      // we must acquire a valid sliding window rate limiting slot!
      await acquireRateLimitSlot(isCustomKey);

      const response = await genai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: promptText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("Base64 audio part missing from API response.");
      }
      return base64Audio;
    } catch (err: any) {
      const errStr = String(err?.message || err || "");
      
      // Look for permanent billing & plan limits. These cannot be bypassed by waiting,
      // so we must fail immediately rather than locking up the retry loop.
      const isBillingOrPlanExhausted = 
        errStr.includes("plan") || 
        errStr.includes("billing") || 
        errStr.includes("current quota") ||
        errStr.includes("credit") ||
        errStr.includes("Credit") ||
        errStr.includes("Payment") ||
        errStr.includes("payment");

      if (isBillingOrPlanExhausted) {
        throw new Error(
          "Your Gemini API billing quota or plan limit is exceeded. Please check your credit balance and billing activation in your Google AI Studio or Google Cloud Console settings, or wait for your daily limits to refresh."
        );
      }

      attempt++;
      const isRateLimit =
        errStr.includes("429") ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("quota") ||
        errStr.includes("Quota");

      if (isRateLimit && attempt <= maxRetries) {
        let parsedDelay = delay;
        // Search for specific recommendation in API error
        const match = errStr.match(/retry in ([\d\.]+)ms/i);
        if (match && match[1]) {
          parsedDelay = Math.ceil(parseFloat(match[1])) + 2000; // Add extra safety buffer
        } else {
          parsedDelay = delay;
          delay = Math.min(delay * 2, 40000); // Back off up to 40 seconds
        }

        // If the error message identifies minute-based requests exhaustion,
        // wait dynamically longer periods to allow sliding window reset.
        if (errStr.includes("generate_content_free_tier_requests") || errStr.includes("requests")) {
          parsedDelay = Math.max(parsedDelay, 15000 + (attempt * 5000));
        }

        console.warn(`[TTS Retry Queue] Received rate limit (429/quota). Retrying ${attempt}/${maxRetries} in ${parsedDelay}ms. Error: ${errStr.substring(0, 150)}...`);
        await sleep(parsedDelay);
        continue;
      }

      throw err;
    }
  }
}

interface CacheEntry {
  audioData: string;
  format: string;
  voice: string;
  style: string;
  speed: string;
  wordCount: number;
  charCount: number;
}

const ttsCache = new Map<string, CacheEntry>();

function getCache(key: string): CacheEntry | undefined {
  return ttsCache.get(key);
}

function setCache(key: string, entry: CacheEntry) {
  if (ttsCache.size >= 100) {
    const firstKey = ttsCache.keys().next().value;
    if (firstKey !== undefined) {
      ttsCache.delete(firstKey);
    }
  }
  ttsCache.set(key, entry);
}

// Chunk-level cache to speed up dynamic editing and conserve user quota
const chunkAudioCache = new Map<string, string>(); // Chunk key -> base64 audio

function getChunkCache(key: string): string | undefined {
  return chunkAudioCache.get(key);
}

function setChunkCache(key: string, base64Audio: string) {
  if (chunkAudioCache.size >= 1000) {
    const firstKey = chunkAudioCache.keys().next().value;
    if (firstKey !== undefined) {
      chunkAudioCache.delete(firstKey);
    }
  }
  chunkAudioCache.set(key, base64Audio);
}

// Sliding window rate limiter variables
const apiCallTimestamps: number[] = [];

async function acquireRateLimitSlot(isCustomKey: boolean) {
  const windowMs = 60000;
  const maxRequestsPerWindow = isCustomKey ? 25 : 3;
  const minIntervalMs = isCustomKey ? 500 : 2000; // at least 2 seconds for default key, 500ms pacing for custom key

  while (true) {
    const now = Date.now();
    
    // Filter out timestamps older than 60 seconds
    while (apiCallTimestamps.length > 0 && apiCallTimestamps[0] < now - windowMs) {
      apiCallTimestamps.shift();
    }

    // 1. Enforce minimum interval pacing to avoid concurrent/spike limits
    if (apiCallTimestamps.length > 0) {
      const lastCallTime = apiCallTimestamps[apiCallTimestamps.length - 1];
      const elapsedSinceLast = now - lastCallTime;
      if (elapsedSinceLast < minIntervalMs) {
        const waitTime = minIntervalMs - elapsedSinceLast;
        console.log(`[Rate Limiter] Minimum interval pacing. Sleeping for ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
    }

    // 2. Check if we have an available slot in our sliding window
    if (apiCallTimestamps.length < maxRequestsPerWindow) {
      // Slot acquired! Record current time and return
      apiCallTimestamps.push(now);
      return;
    }

    // Otherwise, we have reached the limit. Calculate how long to wait.
    // The oldest slot in our window is at index 0.
    const oldestTimestamp = apiCallTimestamps[0];
    const waitTime = oldestTimestamp + windowMs - now + 1500; // adding 1.5s buffer for safety
    
    console.log(`[Rate Limiter] Sliding window full (${apiCallTimestamps.length} calls in last 60s). Sleeping for ${waitTime}ms...`);
    await sleep(waitTime);
  }
}

// Queue of pending API calls represented as a promise chain
let activeQueuePromise: Promise<any> = Promise.resolve();

async function runInSequentialQueue<T>(task: () => Promise<T>): Promise<T> {
  const currentPromise = activeQueuePromise;
  
  // Create a new link in the promise chain
  let resolveNext: () => void = () => {};
  activeQueuePromise = new Promise<void>((resolve) => {
    resolveNext = resolve;
  });

  try {
    // Wait for the previous tasks to finish
    await currentPromise;
    
    // Run the actual task sequentially (the task will acquire its rate-limiting slot itself during attempts)
    return await task();
  } finally {
    // Release the next task in the chain
    resolveNext();
  }
}
