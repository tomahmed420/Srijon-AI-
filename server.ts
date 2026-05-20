import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// Initialize the GoogleGenAI client with the required User-Agent
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } else {
    console.warn("Warning: GEMINI_API_KEY is not defined in the environment.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
}

// Helper to check and get Gemini client or throw safe error
function getAiClient(): GoogleGenAI {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Please add it via the Settings > Secrets menu.");
  }
  return ai;
}

// --- 1. MEMORY-BASED IP RATE LIMITER ---
interface RateLimitInfo {
  count: number;
  resetTime: number;
}
const ipRateLimits = new Map<string, RateLimitInfo>();

const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const limitWindow = 60 * 1000; // 1-minute window
  const maxRequests = 5; // Allow max 5 requests per minute per IP to prevent spam or bot attacks

  const rateInfo = ipRateLimits.get(ip);

  if (!rateInfo || now > rateInfo.resetTime) {
    ipRateLimits.set(ip, {
      count: 1,
      resetTime: now + limitWindow,
    });
    return next();
  }

  if (rateInfo.count >= maxRequests) {
    const timeLeft = Math.ceil((rateInfo.resetTime - now) / 1000);
    return res.status(429).json({
      error: `আপনি খুব দ্রুত অনুরোধ পাঠাচ্ছেন। অনুগ্রহ করে ${timeLeft} সেকেন্ড অপেক্ষা করুন। (Rate limit exceeded. Please wait ${timeLeft}s.)`
    });
  }

  rateInfo.count += 1;
  next();
};

// --- 2. PUBLIC CONCURRENCY CONTROL QUEUE ---
class RequestQueue {
  private activeCount = 0;
  private queue: (() => Promise<void>)[] = [];
  private maxConcurrency = 3; // Process at most 3 AI requests concurrently for optimal free-tier performance

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task = async () => {
        try {
          this.activeCount++;
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeCount--;
          this.next();
        }
      };

      this.queue.push(task);
      this.next();
    });
  }

  private next() {
    if (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        nextTask();
      }
    }
  }
}
const geminiQueue = new RequestQueue();

// --- 3. POETRY GENERATION ROUTE ---
app.post("/api/generate-poetry", rateLimitMiddleware, async (req, res) => {
  try {
    const { prompt, style, mood, language } = req.body;
    const client = getAiClient();

    // Construct evocative system instruction based on style and language
    let styleDescription = "";
    if (language === "bn") {
      if (style === "rabindrik") {
        styleDescription = "রবীন্দ্রনাথ ঠাকুরের মতো শান্ত, গভীর, আধ্যাত্মিক এবং রোমান্টিক সুর সমৃদ্ধ। ছন্দোবদ্ধ, ধ্রুপদী ও শ্রুতিমধুর ভাষা ব্যবহার করবে।";
      } else if (style === "nazrulian") {
        styleDescription = "কাজী নজরুল ইসলামের মতো বিদ্রোহী, অগ্নিগর্ভ, তেজস্বী, সাম্যবাদী এবং অত্যন্ত আবেগপূর্ণ সুর। যৌবন, প্রতিবাদ ও শক্তির প্রতীক।";
      } else if (style === "surrealist") {
        styleDescription = "জীবনানন্দ দাশের মতো রূপকধর্মী, বিষণ্ণ, পরাবাস্তব, কুয়াশায় মোড়া ট্রামলাইন এবং বাংলার প্রকৃতির নানা অনুষঙ্গে ভরা এক মায়াময় রূপসী ক্যানভাস।";
      } else if (style === "sukanta") {
        styleDescription = "সুকান্ত ভট্টাচার্যের মতো সমাজতান্ত্রিক, বঞ্চিত ও মেহনতি মানুষের বিপ্লব, তারুণ্যের দ্রোহ, রাজপথের সংগ্রাম এবং গণমুখী প্রতিবাদের সুর।";
      } else if (style === "helal") {
        styleDescription = "হেলাল হাফিজের মতো দ্রোহ ও প্রেমের এক অনন্য নিবিড় সংমিশ্রণ, তীব্র হাহাকার, বুক পকেটে কষ্টের উস্কানি ও গভীরতম আধুনিক আবেগ।";
      } else if (style === "shamsur") {
        styleDescription = "শামসুর রাহমানের মতো নাগরিক জীবনের আধুনিক অন্তর্দাহ, শহুরে কোলাহল, স্বাধীনতা, দেশপ্রেম ও প্রাত্যহিক মধ্যবিত্ত জীবনের সচিত্র রূপায়ন।";
      } else if (style === "sunil") {
        styleDescription = "সুনীল গঙ্গোপাধ্যায়ের মতো আধুনিক রোমান্টিক, বাঁধনহারা বোহেমিয়ান, তারুণ্যের নিবিড় স্পন্দন, নীরাকে লেখা প্রেমের চিঠি ও তীব্র কামনার কথকতা।";
      } else if (style === "mahadev") {
        styleDescription = "মহাদেব সাহার মতো অত্যন্ত সহজ-সরল মনোগ্রাহী প্রকাশভঙ্গি, গভীর ও আকুল রোমান্টিক প্রেম, মায়াময় ঘরোয়া অনুভূতি ও ভালোবাসার একমুখী সমর্পণ।";
      } else if (style === "rudra") {
        styleDescription = "রুদ্র মুহম্মদ শহীদুল্লাহর মতো একই সাথে তীব্র প্রেমিক এবং আপসহীন বিপ্লবী রাজপথের দ্রোহী কণ্ঠস্বর, একগুচ্ছ বাতাস ও সোনালী ডানার দীর্ঘশ্বাস।";
      } else if (style === "humayun") {
        styleDescription = "হুমায়ূন আহমেদের মতো সহজ-সরল ঝরঝরে মায়াময় মায়াবী আধুনিকতা, জোছনা ও বৃষ্টির প্রতি তীব্র অনুরাগ, একাকীত্ব এবং মন ছুঁয়ে যাওয়া হালকা আবেগের কথ্য রূপ।";
      } else if (style === "farrukh") {
        styleDescription = "ফররুখ আহমদের মতো রেনেসাঁ মন্ডিত মহাকাব্যিক ঢং, আরবি-ফারসি শব্দসমৃদ্ধ ক্লাসিক্যাল উপমা ও দূর সমুদ্রযাত্রার রূপকথা ঘেঁষা মুসলিম ঐতিহ্যবাহী সুর।";
      } else if (style === "lalon") {
        styleDescription = "লালন শাহ বা লোকজ সাধকদের মতো বাউল তত্ত্ব, খাঁচার ভেতর অচিন পাখি, আধ্যাত্মিক দেহতত্ত্ব, জাতপাতহীন লোকজ অতীন্দ্রিয় প্রেম ও লোকগাথার মরমী সাধন সংগীত।";
      } else if (style === "abstract") {
        styleDescription = "আধুনিক বিমূর্ত কবিতা। গভীর রূপক, জীবনের চরম জটিলতা এবং আধুনিক মনস্তাত্ত্বিক দর্শন সমৃদ্ধ।";
      } else if (style && style.trim().length > 0) {
        styleDescription = `একটি কাস্টম সাহিত্যিক ও কবি ব্যক্তিত্বের ঘরানা: "${style}". এই কবির মূল আবেগ, লিখন শৈলী এবং দর্শন ফুটিয়ে তুলবে।`;
      } else {
        styleDescription = "সহজ, রোমান্টিক এবং হৃদয়স্পর্শী আধুনিক কবিতা।";
      }
    } else {
      if (style === "romantic") {
        styleDescription = "In the style of Romantic poets like Keats, Wordsworth, or Byron. Fluid, nature-infused, evocative, and classic rhyming/meter.";
      } else if (style === "modern") {
        styleDescription = "Contemporary modern free verse. Atmospheric, conversational but rich with imagery, exploring urban landscapes or emotional depth.";
      } else if (style === "ghazal") {
        styleDescription = "In the style of a Ghazal or lyrical couplets. Soul-stirring, focusing on love, separation, and philosophical devotion with rhythmic couplets.";
      } else if (style && style.trim().length > 0) {
        styleDescription = `A custom poet or writer genre described as: "${style}". Replicate this precise writing language, mood tone, and rhythm.`;
      } else {
        styleDescription = "An expressive poetry standard. Rich in descriptive imagery and rhythm.";
      }
    }

    // Add a highly randomized element dynamically inside system instructions to force Gemini
    // to bypass internal caching, ensuring unique composition each time!
    const randomSalt = Math.random().toString(36).substring(7);

    const systemInstruction = `You are a master poet and lyricist fluent in both Bengali and English. 
Your goal is to write a highly beautiful, structured, and evocative poem based on the user's topic, mood, and selected artistic style.
Format the output with standard line breaks (stanza blocks). Avoid markdown headers or titles in the body, just write the poem itself.
Make sure to compose a completely unique and original poem every time. Do not reuse old structures. Express with infinite variations, avoiding cache and repetitive patterns.

Style instructions: ${styleDescription}
Mood of the poem: ${mood}.
The language must be strictly: ${language === "bn" ? "Bengali (বাংলা)" : "English"}.
Tracking seed: ${randomSalt}`;

    // Processing poetry request securely inside the concurrency Queue
    const poemResult = await geminiQueue.add(async () => {
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Compose an entirely original, fresh poem or lyrical lines about: "${prompt || "Untitled Essence"}".
Dynamic variation parameter: ${randomSalt}`,
        config: {
          systemInstruction,
          temperature: 1.0, // Maximum dynamic variation without deterministic presets
        },
      });
      return response;
    });

    res.json({ text: poemResult.text });
  } catch (error: any) {
    console.error("Poetry Generation Error:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating poetry." });
  }
});

// Static server startup and setup Vite Dev Server / Static Hosting for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Srijon Server] running securely on host 0.0.0.0 and port ${PORT}`);
  });
}

startServer();
