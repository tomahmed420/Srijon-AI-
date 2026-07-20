import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sprout, User, Search, Volume2, Bookmark, Download, Share2, 
  ChevronUp, ChevronDown, Feather, Trash2, Languages, Sparkles, 
  HelpCircle, Check, Loader2, Sparkle, RefreshCw, BookOpen, Clock,
  PenTool, Eye, Layout, Sliders, AlertCircle
} from "lucide-react";

interface SavedPoem {
  id: string;
  title: string;
  style: string;
  mood: string;
  content: string;
  author: string;
  timestamp: string;
}

export default function PoetLounge({ language }: { language: "bn" | "en" }) {
  // --- States ---
  const [prompt, setPrompt] = useState("");
  
  // Custom manual inputs (outside the dropdown triggers)
  const [customStyle, setCustomStyle] = useState("");
  const [customMood, setCustomMood] = useState("");

  // Grid items selected inside the dropdown triggers
  const [selectedStyle, setSelectedStyle] = useState("rabindrik");
  const [selectedMood, setSelectedMood] = useState("borsha");
  
  // Accordion/Dropdown dropdown toggle states
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [isMoodDropdownOpen, setIsMoodDropdownOpen] = useState(false);
  
  // Default values
  const defaultPoemBn = `“তোমার রূপের স্নিগ্ধ ছায়ায়,
ভেসে বেড়ায় আমার মন...
নীরব রাতে তারার আলোয়,
খুঁজে পাই তোমাকে, সারা ক্ষণ।”`;

  const defaultPoemEn = `"In the gentle shadow of your grace,
My silent heart finds its resting place...
Under the quiet moonlight's guide,
I find you always by my side."`;

  const [poemText, setPoemText] = useState(defaultPoemBn);
  const [authorName, setAuthorName] = useState("রবীন্দ্রনাথ ঠাকুর");
  const [loading, setLoading] = useState(false);
  const [savedPoems, setSavedPoems] = useState<SavedPoem[]>([]);
  const [copied, setCopied] = useState(false);
  const [bookmarkSuccess, setBookmarkSuccess] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [rateLimitResetIn, setRateLimitResetIn] = useState<number>(0);

  // Ticks the rate-limit cooldown display down to zero every second
  useEffect(() => {
    if (rateLimitResetIn <= 0) return;
    const timer = window.setTimeout(() => setRateLimitResetIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [rateLimitResetIn]);

  // Typewriter-style progressive reveal so a freshly generated poem feels like it's being written live.
  // When the poem streams in live from the API, we skip this simulated reveal (the real stream IS the reveal).
  const [displayText, setDisplayText] = useState(poemText);
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimerRef = useRef<number | null>(null);
  const skipTypewriterRef = useRef(false);

  useEffect(() => {
    if (skipTypewriterRef.current) {
      // Poem text was already revealed live via streaming — just sync, don't replay the animation
      skipTypewriterRef.current = false;
      setDisplayText(poemText);
      setIsRevealing(false);
      return;
    }

    if (revealTimerRef.current) window.clearInterval(revealTimerRef.current);

    const characters = Array.from(poemText);
    let index = 0;
    setDisplayText("");
    setIsRevealing(true);

    revealTimerRef.current = window.setInterval(() => {
      index += 2; // reveal a couple of characters per tick for a natural writing pace
      setDisplayText(characters.slice(0, index).join(""));
      if (index >= characters.length) {
        if (revealTimerRef.current) window.clearInterval(revealTimerRef.current);
        setIsRevealing(false);
      }
    }, 16);

    return () => {
      if (revealTimerRef.current) window.clearInterval(revealTimerRef.current);
    };
  }, [poemText]);

  // Responsive active view state (for mobile, preserving draft perfectly)
  const [activeMobileTab, setActiveMobileTab] = useState<"write" | "preview">("write");

  // Typography Size
  const [fontSize, setFontSize] = useState<number>(20);

  // Audio Recital Module States
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(0.85); // elegant slow romance
  const [supportedVoices, setSupportedVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [canvasGenerating, setCanvasGenerating] = useState(false);

  // Natural, human-like recitation via Gemini TTS (falls back to the browser's built-in voice if this fails)
  const [geminiVoice, setGeminiVoice] = useState<"Kore" | "Charon">("Kore");
  const [audioLoading, setAudioLoading] = useState(false);
  const [usingFallbackVoice, setUsingFallbackVoice] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);


  // Sync state variables depending on selected language
  useEffect(() => {
    setSelectedStyle(language === "bn" ? "rabindrik" : "romantic");
    setCustomStyle("");
    setCustomMood("");
    if (language === "en") {
      setPoemText(defaultPoemEn);
      setAuthorName("Srijon Poet");
    } else {
      setPoemText(defaultPoemBn);
      setAuthorName("রবীন্দ্রনাথ ঠাকুর");
    }
  }, [language]);

  // Load Saved Notebook archives & Audio Synthesis APIs
  useEffect(() => {
    try {
      const stored = localStorage.getItem("srijon_saved_poems_v2");
      if (stored) {
        setSavedPoems(JSON.parse(stored));
      } else {
        // Fallback backward-compatibility support
        const legacyStored = localStorage.getItem("srijon_saved_poems");
        if (legacyStored) {
          setSavedPoems(JSON.parse(legacyStored));
        }
      }
    } catch (e) {
      console.error("Error loading saved catalog:", e);
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setSupportedVoices(voices);
        
        const langCode = language === "bn" ? "bn" : "en";
        const matched = voices.find(v => v.lang.toLowerCase().startsWith(langCode));
        if (matched) {
          setSelectedVoiceName(matched.name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [language]);

  // --- Dynamic SEO Engine (Part 4) ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if the current poem is default
    const isDefault = poemText === defaultPoemBn || poemText === defaultPoemEn;
    
    let dynamicTitle = "";
    let dynamicDesc = "";

    if (language === "bn") {
      if (isDefault) {
        dynamicTitle = "সৃজন AI — বাংলা কবিতা জেনারেটর বাংলাদেশ";
        dynamicDesc = "সৃজন AI দিয়ে রবীন্দ্রনাথ, নজরুল, জীবনানন্দসহ প্রিয় কবিদের ধাঁচে কয়েক সেকেন্ডে নিজের কবিতা তৈরি করুন, আবৃত্তি শুনুন আর ক্যানভাস কার্ড বানিয়ে শেয়ার করুন।"
      } else {
        const topic = prompt.trim() ? `"${prompt.trim().substring(0, 18)}..."` : "কবিতা";
        dynamicTitle = `সৃজন এআই বাংলাদেশ — ${topic} — বাংলা কবিতা এআই`;
        const fragment = poemText.replace(/[\n\r“”""'']/g, " ").trim().substring(0, 100);
        dynamicDesc = `সৃজন AI (সৃজন এআই বাংলাদেশ: বাংলা কবিতা এআই ও বাংলা লেখা টুলস) অ্যাপের মাধ্যমে ${authorName}-এর শৈলীতে রেন্ডারকৃত অনন্য কাব্য: "${fragment}..."`;
      }
    } else {
      if (isDefault) {
        dynamicTitle = "Srijon AI — Bengali Poetry Generator";
        dynamicDesc = "Generate a Bengali poem in the style of Rabindranath, Nazrul, Jibanananda, and more in seconds, listen to it recited aloud, and share it as a beautiful canvas card — all free.";
      } else {
        const topic = prompt.trim() ? `"${prompt.trim().substring(0, 18)}..."` : "Poetic Verses";
        dynamicTitle = `Srijon AI — ${topic} — Bengali Poetry Generator`;
        const fragment = poemText.replace(/[\n\r“”""'']/g, " ").trim().substring(0, 100);
        dynamicDesc = `A beautiful creation curated via Srijon AI (Bengali Poetry Generator & Bengali AI Writer) in the style of ${authorName}: "${fragment}..."`;
      }
    }

    // Apply main title
    document.title = dynamicTitle;

    // Helper to safely update or insert meta tags
    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      let meta = document.querySelector(selector);
      if (meta) {
        meta.setAttribute(attribute, value);
      } else {
        // Fallback: create if missing
        const head = document.getElementsByTagName("head")[0];
        if (head) {
          meta = document.createElement("meta");
          if (selector.startsWith("meta[property")) {
            const prop = selector.match(/property="([^"]+)"/)?.[1];
            if (prop) meta.setAttribute("property", prop);
          } else if (selector.startsWith("meta[name")) {
            const name = selector.match(/name="([^"]+)"/)?.[1];
            if (name) meta.setAttribute("name", name);
          }
          meta.setAttribute(attribute, value);
          head.appendChild(meta);
        }
      }
    };

    // Update standard description
    updateMetaTag('meta[name="description"]', 'content', dynamicDesc);

    // Update Facebook/WhatsApp Open Graph
    updateMetaTag('meta[property="og:title"]', 'content', dynamicTitle);
    updateMetaTag('meta[property="og:description"]', 'content', dynamicDesc);

    // Update Twitter Cards
    updateMetaTag('meta[name="twitter:title"]', 'content', dynamicTitle);
    updateMetaTag('meta[name="twitter:description"]', 'content', dynamicDesc);

  }, [poemText, prompt, authorName, language, defaultPoemBn, defaultPoemEn]);

  const saveToLocal = (newCollection: SavedPoem[]) => {
    setSavedPoems(newCollection);
    localStorage.setItem("srijon_saved_poems_v2", JSON.stringify(newCollection));
  };

  // --- Poetry Presets Lists ---
  const presetPoetsBn = [
    { id: "rabindrik", label: "রবীন্দ্রনাথ ঠাকুর", subtitle: "রবীন্দ্র ধ্রুপদী সুর ও ভক্তি আভা" },
    { id: "nazrulian", label: "কাজী নজরুল ইসলাম", subtitle: "বিদ্রোহী অগ্নিগর্ভ আবেগ ও সুর" },
    { id: "surrealist", label: "জীবনানন্দ দাশ", subtitle: "রূপসী বাংলা ও কুয়াশাঘেরা পরাবাস্তবতা" },
    { id: "sukanta", label: "সুকান্ত ভট্টাচার্য", subtitle: "যৌবন, দ্রোহ ও রাজপথের মেহনতি সুর" },
    { id: "helal", label: "হেলাল হাফিজ", subtitle: "তীব্র প্রেমের বেদনা ও কষ্টের উস্কানি" },
    { id: "shamsur", label: "শামসুর রাহমান", subtitle: "নাগরিক মধ্যবিত্ত ও আধুনিক রূপান্তর" },
    { id: "sunil", label: "সুনীল গঙ্গোপাধ্যায়", subtitle: "বোহেমিয়ান প্রেমিক ও বাঁধনহারা নীরা" },
    { id: "mahadev", label: "মহাদেব সাহা", subtitle: "আকুল প্রেম ও ঘরোয়া পরম মমতা" },
    { id: "rudra", label: "রুদ্র মুহম্মদ শহীদুল্লাহ", subtitle: "প্রেমের দীর্ঘশ্বাস ও আপসহীন বিদ্রোহ" },
    { id: "humayun", label: "হুমায়ূন আহমেদ", subtitle: "সহজ মায়াবী জোছনা ও বৃষ্টি বিলাস" },
    { id: "farrukh", label: "ফররুখ আহমদ", subtitle: "দূর সমুদ্রের মহাকাব্যিক ঐতিহ্যবাহী সুর" },
    { id: "lalon", label: "লালন শাহ লোকসাধক", subtitle: "বাউল তত্ত্ব ও খাঁচার ভেতর অচিন পাখি" },
    { id: "abstract", label: "বিমূর্ত আধুনিকতা", subtitle: "পরাবাস্তব মনস্তাত্ত্বিক জটিল রূপক" }
  ];

  const presetPoetsEn = [
    { id: "romantic", label: "Romantic Keats", subtitle: "Classic rhyming meter & fluid romanticism" },
    { id: "modern", label: "Contemporary Modern", subtitle: "Urban free verse and emotional depth" },
    { id: "ghazal", label: "Devotional Ghazal", subtitle: "Soulful couplets of mystic love & separation" }
  ];

  const presetMoodsBn = [
    { id: "borsha", label: "বর্ষা সিক্ত", hex: "#12427a", desc: "Monsoon rains" },
    { id: "boshonto", label: "বসন্ত রাঙা", hex: "#875a13", desc: "Golden Spring" },
    { id: "sheet", label: "শীত কুয়াশা", hex: "#2c266d", desc: "Quiet Winter" },
    { id: "shorot", label: "শরতের নীল", hex: "#06533c", desc: "Azure Autumn" },
    { id: "godhuli", label: "গোধূলি বেলা", hex: "#821665", desc: "Twilight sunset" },
    { id: "jochna", label: "জোছনা রাত", hex: "#252b75", desc: "Moonlit glow" },
    { id: "nostalgia", label: "নস্টালজিয়া", hex: "#5c401e", desc: "Retro nostalgia" },
    { id: "mystic", label: "সুফি মরমী", hex: "#704107", desc: "Sufi mystic" },
    { id: "droho", label: "দ্রোহী সুর", hex: "#8f1414", desc: "Rebel uprising" }
  ];

  const presetMoodsEn = [
    { id: "borsha", label: "Rainy Monsoon", hex: "#12427a", desc: "Raindrops melody" },
    { id: "boshonto", label: "Golden Spring", hex: "#875a13", desc: "Blooming flower scent" },
    { id: "sheet", label: "Solitary Winter", hex: "#2c266d", desc: "Cold misty mornings" },
    { id: "shorot", label: "Autumn Sky", hex: "#06533c", desc: "White clouds floating" },
    { id: "godhuli", label: "Twilight Sunset", hex: "#821665", desc: "Crimson orange sunset" },
    { id: "jochna", label: "Moonlit Midnight", hex: "#252b75", desc: "Mysterious moonlight" }
  ];

  // Helper matching titles & system names
  const activePresets = language === "bn" ? presetPoetsBn : presetPoetsEn;
  const activeMoodsList = language === "bn" ? presetMoodsBn : presetMoodsEn;

  // --- Seasonal Mood Themes Catalog for Canvas Visual Board ---
  const moodThemes: Record<string, {
    bg: string;
    text: string;
    hex: string;
    labelBn: string; 
    labelEn: string;
    gradient: string;
  }> = {
    borsha: {
      bg: "bg-[#e5effb]",
      text: "text-sky-950",
      hex: "#12427a",
      labelBn: "বর্ষা (Rainy Monsoon)",
      labelEn: "Borsha (Rainy Monsoon)",
      gradient: "from-[#e5effb] to-[#f4f7fc]"
    },
    boshonto: {
      bg: "bg-[#faf0df]",
      text: "text-amber-950",
      hex: "#875a13",
      labelBn: "বসন্ত (Golden Spring)",
      labelEn: "Boshonto (Golden Spring)",
      gradient: "from-[#faf0df] to-[#fcfcf6]"
    },
    sheet: {
      bg: "bg-[#eae9f3]",
      text: "text-indigo-950",
      hex: "#2c266d",
      labelBn: "শীত (Solitary Winter)",
      labelEn: "Sheet (Quiet Winter)",
      gradient: "from-[#eae9f3] to-[#f5f5f9]"
    },
    shorot: {
      bg: "bg-[#e2f5f1]",
      text: "text-emerald-950",
      hex: "#06533c",
      labelBn: "শরৎ (Azure Autumn)",
      labelEn: "Shorot (Azure Autumn)",
      gradient: "from-[#e2f5f1] to-[#f8fdfc]"
    },
    godhuli: {
      bg: "bg-[#fae7f5]",
      text: "text-pink-950",
      hex: "#821665",
      labelBn: "গোধূলি বেলা (Twilight Sunset)",
      labelEn: "Godhuli (Twilight Sunset)",
      gradient: "from-[#fae7f5] to-[#fdfafb]"
    },
    jochna: {
      bg: "bg-[#eaeefc]",
      text: "text-blue-950",
      hex: "#252b75",
      labelBn: "জোছনা রাত (Moonlit Glow)",
      labelEn: "Jochna (Moonlit Glow)",
      gradient: "from-[#eaeefc] to-[#f4f6fc]"
    },
    nostalgia: {
      bg: "bg-[#ebdcc7]",
      text: "text-stone-950",
      hex: "#5c401e",
      labelBn: "নস্টালজিয়া (Retro Memories)",
      labelEn: "Nostalgia (Vintage Memories)",
      gradient: "from-[#ebdcc7] to-[#faf6f1]"
    },
    mystic: {
      bg: "bg-[#fdf1e1]",
      text: "text-amber-950",
      hex: "#704107",
      labelBn: "আধ্যাত্মিক মরমীবাদ (Sufi Mystic)",
      labelEn: "Mystic Aura (Baul Lore)",
      gradient: "from-[#fdf1e1] to-[#fcfbf7]"
    },
    droho: {
      bg: "bg-[#fae5e6]",
      text: "text-red-950",
      hex: "#8f1414",
      labelBn: "বিদ্রোহী দ্রোহ (Rebel Surge)",
      labelEn: "Droho (Rebel Surge)",
      gradient: "from-[#fae5e6] to-[#fffbfc]"
    }
  };

  const getActiveMoodHex = () => {
    if (customMood.trim()) return "#6d523b"; // custom warm clay tone
    const match = moodThemes[selectedMood];
    return match ? match.hex : "#875a13";
  };

  const currentTheme = moodThemes[selectedMood] || moodThemes.borsha;

  // --- Idea Prompts: shown when the writer has no idea where to start ---
  const examplePromptsBn = [
    "বর্ষার নিঝুম রাতে ছাদে বসে চা খাওয়ার স্মৃতি",
    "ছোটবেলার নদীর ঘাটে কাটানো বিকেলগুলো",
    "প্রথম প্রেমের চিঠি যেটা কখনো পাঠানো হয়নি",
    "মায়ের হাতের রান্নার গন্ধ মনে পড়ে যাওয়া",
    "শহরের ব্যস্ত রাস্তায় হঠাৎ থমকে যাওয়া মুহূর্ত",
    "দূরে চলে যাওয়া বন্ধুর জন্য অপেক্ষা",
    "শীতের সকালে কুয়াশা মোড়া গ্রামের পথ",
    "হারিয়ে যাওয়া দিনলিপির পাতায় লেখা কথা",
  ];
  const examplePromptsEn = [
    "The smell of rain on a tin roof at midnight",
    "An afternoon by the river as a child",
    "A love letter that was never sent",
    "The taste of a home-cooked meal after years away",
    "A quiet pause in the middle of a busy city street",
    "Waiting for a friend who moved far away",
    "A foggy village road on a winter morning",
    "Words found in an old, forgotten diary",
  ];

  const handleSuggestIdea = () => {
    const list = language === "bn" ? examplePromptsBn : examplePromptsEn;
    const remaining = list.filter((item) => item !== prompt);
    const pool = remaining.length > 0 ? remaining : list;
    const idea = pool[Math.floor(Math.random() * pool.length)];
    setPrompt(idea);
  };

  // --- Poetry Request Dispatcher (consumes the live SSE stream from the server) ---
  const handleGeneratePoetry = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorStatus(null);
    stopRecitation();

    try {
      // Determine style payload: Either use custom text or selected preset
      const stylePayload = customStyle.trim() ? customStyle.trim() : selectedStyle;
      const moodPayload = customMood.trim() ? customMood.trim() : selectedMood;

      const response = await fetch("/api/generate-poetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: stylePayload,
          mood: moodPayload,
          language,
        }),
      });

      // Surface how many requests are left in this minute, whatever the outcome
      const remainingHeader = response.headers.get("X-RateLimit-Remaining");
      const resetHeader = response.headers.get("X-RateLimit-Reset");
      if (remainingHeader !== null) setRateLimitRemaining(parseInt(remainingHeader, 10));
      if (resetHeader !== null) {
        const secondsLeft = Math.max(0, Math.ceil((parseInt(resetHeader, 10) - Date.now()) / 1000));
        setRateLimitResetIn(secondsLeft);
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({} as any));
        throw new Error(errData.error || "Failed to communicate with AI.");
      }

      if (!response.body) {
        throw new Error("Streaming is not supported in this environment.");
      }

      // Read the SSE stream and reveal the poem live as it is written, token by token
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let liveText = "";
      let firstChunkArrived = false;

      setDisplayText("");
      setIsRevealing(true);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          let payload: any;
          try {
            payload = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (payload.error) {
            throw new Error(payload.error);
          }

          if (payload.delta) {
            if (!firstChunkArrived) {
              firstChunkArrived = true;
              setLoading(false); // hide the shimmer the instant real words start arriving
            }
            liveText += payload.delta;
            setDisplayText(liveText);
          }

          if (payload.done) {
            liveText = payload.text || liveText;
          }
        }
      }

      setIsRevealing(false);
      skipTypewriterRef.current = true; // text is already revealed live, don't replay the animation
      setPoemText(liveText);

      // Compute author name
      let labelAuthorName = "";
      if (customStyle.trim()) {
        labelAuthorName = customStyle.trim();
      } else {
        const mat = activePresets.find(p => p.id === selectedStyle);
        labelAuthorName = mat ? mat.label : (language === "bn" ? "সৃজন কবি" : "Srijon Poet");
      }
      setAuthorName(labelAuthorName);

      // Successfully generated: Slide to view the gorgeous canvassed outcome on mobile/tablet natively!
      setActiveMobileTab("preview");
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || (language === "bn" ? "সংযোগ করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।" : "Something went wrong on our end. Let's try that again."));
      setIsRevealing(false);
    } finally {
      setLoading(false);
    }
  };

  // --- Recitation Engines ---
  // Primary path: Gemini's native TTS for warm, natural-sounding recitation.
  // Fallback path: the browser's built-in speechSynthesis, used only if the Gemini call fails
  // (e.g. offline, quota exhausted) so recitation never breaks entirely.
  const startRecitationFallback = (textToRead: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert(language === "bn" ? "দুঃখিত, আবৃত্তি সমর্থনটি এই ব্রাউজারে উপলব্ধ নয়।" : "Speech synthesis is not supported on this browser.");
      return;
    }

    setUsingFallbackVoice(true);
    window.speechSynthesis.cancel();
    const cleanSpeechText = textToRead
      .replace(/[*#_~`\[\]]/g, " ")
      .replace(/[-]{2,}/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const matched = voices.find(v => v.name === selectedVoiceName);
    if (matched) {
      utterance.voice = matched;
    } else {
      const langCode = language === "bn" ? "bn" : "en";
      const fall = voices.find(v => v.lang.toLowerCase().startsWith(langCode));
      if (fall) utterance.voice = fall;
    }

    utterance.rate = playbackRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlayingAudio(true);
      setIsAudioPaused(false);
      setAudioLoading(false);
    };
    utterance.onend = () => {
      setIsPlayingAudio(false);
      setIsAudioPaused(false);
    };
    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setIsAudioPaused(false);
      setAudioLoading(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const startRecitation = async (textToRead: string) => {
    if (!textToRead) return;
    setUsingFallbackVoice(false);
    setAudioLoading(true);

    try {
      const res = await fetch("/api/recite-poetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToRead, language, voice: geminiVoice }),
      });

      if (!res.ok) {
        throw new Error("Recitation service unavailable");
      }

      const blob = await res.blob();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      if (!audioElRef.current) {
        audioElRef.current = new Audio();
      }
      const audioEl = audioElRef.current;
      audioEl.src = url;
      audioEl.playbackRate = playbackRate;

      audioEl.onplay = () => {
        setIsPlayingAudio(true);
        setIsAudioPaused(false);
        setAudioLoading(false);
      };
      audioEl.onended = () => {
        setIsPlayingAudio(false);
        setIsAudioPaused(false);
      };
      audioEl.onerror = () => {
        setIsPlayingAudio(false);
        setIsAudioPaused(false);
        setAudioLoading(false);
      };

      await audioEl.play();
    } catch (err) {
      console.warn("Gemini recitation failed, falling back to browser voice:", err);
      setAudioLoading(false);
      startRecitationFallback(textToRead);
    }
  };

  const pauseRecitation = () => {
    if (usingFallbackVoice) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (isPlayingAudio && !isAudioPaused) {
          window.speechSynthesis.pause();
          setIsAudioPaused(true);
        } else if (isPlayingAudio && isAudioPaused) {
          window.speechSynthesis.resume();
          setIsAudioPaused(false);
        }
      }
      return;
    }

    const audioEl = audioElRef.current;
    if (!audioEl) return;
    if (isPlayingAudio && !isAudioPaused) {
      audioEl.pause();
      setIsAudioPaused(true);
    } else if (isPlayingAudio && isAudioPaused) {
      audioEl.play();
      setIsAudioPaused(false);
    }
  };

  const stopRecitation = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
    setIsAudioPaused(false);
    setAudioLoading(false);
  };

  // --- Copy, Save and Export High-Resolution Calligraphy Graphics Canvas ---
  const handleCopy = () => {
    if (!poemText) return;
    navigator.clipboard.writeText(poemText + `\n\n— ${authorName}\n${language === "bn" ? "সৃজন এআই থেকে সংগৃহীত" : "Generated via Srijon AI"}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePoem = () => {
    if (!poemText) return;
    const cleanTitle = prompt.trim().substring(0, 30) + (prompt.trim().length > 30 ? "..." : "");
    const generatedTitle = cleanTitle || (language === "bn" ? "অনামা কাব্য" : "Untitled Verses");
    
    if (savedPoems.some(p => p.content === poemText)) {
      setBookmarkSuccess(true);
      setTimeout(() => setBookmarkSuccess(false), 2000);
      return;
    }

    const newPoem: SavedPoem = {
      id: Math.random().toString(36).substring(2, 9),
      title: generatedTitle,
      style: customStyle.trim() ? customStyle.trim() : selectedStyle,
      mood: customMood.trim() ? customMood.trim() : selectedMood,
      content: poemText,
      author: authorName,
      timestamp: new Date().toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
    };
    saveToLocal([newPoem, ...savedPoems]);
    setBookmarkSuccess(true);
    setTimeout(() => setBookmarkSuccess(false), 2000);
  };

  const deleteSavedPoem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveToLocal(savedPoems.filter((p) => p.id !== id));
  };

  // Canvas Image Rendering
  const generateImageCard = async () => {
    setCanvasGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw high resolution elegant paper texture
      ctx.fillStyle = "#FCFAF2";
      ctx.fillRect(0, 0, 1200, 1200);

      // Double nested golden thin boundaries
      ctx.strokeStyle = "rgba(135, 90, 19, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(60, 60, 1080, 1080);

      ctx.strokeStyle = getActiveMoodHex();
      ctx.lineWidth = 1;
      ctx.strokeRect(75, 75, 1050, 1050);

      // Artistic calligraphic head crown layout
      ctx.fillStyle = "#3d2510";
      ctx.font = "italic 30px 'Georgia', serif";
      ctx.textAlign = "center";
      ctx.fillText("❦", 600, 150);

      // Title
      ctx.font = "bold 34px 'Playfair Display', 'Hind Siliguri', 'Georgia', serif";
      ctx.fillText(language === "bn" ? "সৃজন ক্যানভাস" : "Srijon Calligraphy Card", 600, 205);

      // Split poem text lines
      const poemLines = poemText.split("\n").map(line => line.trim()).filter(Boolean);
      let calculatedFontSize = Math.max(fontSize * 1.5, 24);
      let rowHeight = 1.75;

      // Ensure text content bounds safely
      const totalLineCount = poemLines.length;
      const totalHeightLimit = 600;
      const currentHeightNeeded = totalLineCount * (calculatedFontSize * rowHeight);
      if (currentHeightNeeded > totalHeightLimit) {
        calculatedFontSize = Math.floor(totalHeightLimit / (Math.max(totalLineCount, 1) * rowHeight));
        calculatedFontSize = Math.max(calculatedFontSize, 20);
      }

      ctx.font = `500 ${calculatedFontSize}px 'Playfair Display', 'Hind Siliguri', 'Georgia', serif`;
      ctx.fillStyle = "#221105";

      const totalPlotHeight = totalLineCount * (calculatedFontSize * rowHeight);
      const startYCoordinate = 360 + (600 - totalPlotHeight) / 2 + (calculatedFontSize * 0.5);

      poemLines.forEach((line, index) => {
        const py = startYCoordinate + index * (calculatedFontSize * rowHeight);
        ctx.fillText(line, 600, py);
      });

      // Separation line
      ctx.strokeStyle = "rgba(135, 90, 19, 0.08)";
      ctx.beginPath();
      ctx.moveTo(420, 1000);
      ctx.lineTo(780, 1000);
      ctx.stroke();

      // Signature Author
      ctx.fillStyle = "#5c3c1e";
      ctx.font = "italic bold 28px 'Georgia', serif font-serif";
      ctx.fillText(`— ${authorName}`, 600, 1045);

      // Stamp foot tag
      ctx.fillStyle = "rgba(61, 37, 16, 0.45)";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.fillText(`CRAFTED AT SRIJON.AI / ${new Date().getFullYear()}`, 600, 1090);

      const downloadInstance = document.createElement("a");
      downloadInstance.href = canvas.toDataURL("image/png");
      downloadInstance.download = `Srijon_Calligraphy_${authorName.replace(/\s+/g, "_")}.png`;
      downloadInstance.click();
    } catch (err) {
      console.error("Error creating download graphic canvas:", err);
    } finally {
      setCanvasGenerating(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-120px)] w-full py-6 px-4 md:py-10 md:px-8 bg-[#faf7f0] dark:bg-[#120c06] relative overflow-hidden transition-colors duration-500">
      
      {/* Exquisite Natural Ambient Backdrop Glow corresponding to chosen mood of selection */}
      <div 
        className="absolute top-1/4 left-1/3 w-[300px] h-[300px] md:w-[650px] md:h-[650px] rounded-full filter blur-[140px] pointer-events-none transition-all duration-1000 ease-in-out z-0"
        style={{ 
          backgroundColor: getActiveMoodHex(),
          opacity: 0.07 
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Responsive view switcher bar on mobile ONLY */}
        <div className="flex sm:hidden bg-[#eae3d0] dark:bg-[#1c130a] p-1 rounded-xl w-full max-w-sm mx-auto mb-6 relative">
          <button
            onClick={() => setActiveMobileTab("write")}
            className={`flex-1 py-2 text-xs font-serif font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMobileTab === "write" 
                ? "bg-[#faf7f0] dark:bg-[#241a10] text-amber-950 dark:text-amber-100 shadow-sm" 
                : "text-[#5e4b37] dark:text-amber-200/50 hover:text-[#3d2510] dark:hover:text-amber-100"
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-amber-900" />
            <span>{language === "bn" ? "শব্দকুঞ্জ লেখনী" : "Writing Desk"}</span>
          </button>
          <button
            onClick={() => setActiveMobileTab("preview")}
            className={`flex-1 py-2 text-xs font-serif font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMobileTab === "preview" 
                ? "bg-[#faf7f0] dark:bg-[#241a10] text-amber-950 dark:text-amber-100 shadow-sm" 
                : "text-[#5e4b37] dark:text-amber-200/50 hover:text-[#3d2510] dark:hover:text-amber-100"
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-amber-900" />
            <span>{language === "bn" ? "কাব্যের ক্যানভাস" : "Poem Card"}</span>
          </button>
        </div>

        {/* Dynamic Dual split panels layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= LEFT COLUMN: WRITING RETREAT DESK ================= */}
          <div className={`lg:col-span-5 bg-[#FCFAF5] dark:bg-[#1c130a] rounded-3xl border border-[#decbad]/60 dark:border-amber-100/10 p-5 md:p-7 shadow-sm space-y-6 {
            activeMobileTab === "preview" ? "hidden sm:block" : "block"
          }`}>
            
            {/* Box Header */}
            <div className="flex items-center space-x-3 pb-3.5 border-b border-[#eae1ca]/80 dark:border-amber-100/10">
              <div className="p-2 rounded-xl bg-amber-800/10 text-amber-800">
                <Feather className="w-4.5 h-4.5 text-amber-700 font-bold" />
              </div>
              <div className="text-left">
                <h2 className="text-base font-serif font-bold text-[#3d2510] dark:text-amber-50">
                  {language === "bn" ? "সৃজন এআই বাংলাদেশ — বাংলা লেখা টুলস" : "Srijon Creative Desk — Bengali AI Writer"}
                </h2>
                <span className="text-[11px] text-[#4a3419] dark:text-amber-200/80 font-serif block">
                  {language === "bn" ? "মনের কথাগুলো কবিতা করে দাও" : "Turn your feelings into a poem"}
                </span>
              </div>
            </div>

            {/* Input Prompt Block */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wide font-bold text-[#4a3419] dark:text-amber-200/80 block font-serif">
                  {language === "bn" ? "তোমার কবিতার বিষয়" : "What's the poem about?"}
                </label>
                <button
                  type="button"
                  onClick={handleSuggestIdea}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 transition-colors cursor-pointer"
                >
                  <Sparkle className="w-3 h-3" />
                  {language === "bn" ? "আইডিয়া দাও" : "Give me an idea"}
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={language === "bn" ? "বর্ষার নিঝুম রাতে কফি, মেঘ ছুঁয়ে যাওয়া কোনো স্মৃতি, ফেলে আসা চিঠি..." : "Write a theme like rain over misty train tracks, late nights over hot tea, fading memories..."}
                maxLength={200}
                rows={4}
                className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-[#241a10] border border-[#cfc0a9] dark:border-amber-100/15 text-[#2c1a0c] dark:text-amber-50 px-3.5 py-3 focus:outline-none focus:border-amber-800 focus:ring-1 focus:ring-amber-200 transition-all resize-none leading-relaxed font-serif"
              />
              <div className="flex items-center justify-between text-[11px] text-[#6b5233] dark:text-amber-200/60">
                <span className="flex items-center gap-1">
                  <Sparkle className="w-3 h-3 text-amber-700 animate-pulse" />
                  {language === "bn" ? "জেমিনি ক্রিয়েটিভ ইঞ্জিন" : "Powered by Gemini AI"}
                </span>
                <span>{prompt.length}/200</span>
              </div>
            </div>

            {/* --- 1. ABHOH / SEASONAL AMBIANCE (আবহ ও সুর) --- */}
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between flex-wrap gap-y-1">
                <label className="text-xs uppercase tracking-wide font-bold text-[#4a3419] dark:text-amber-200/80 font-serif">
                  {language === "bn" ? "কবিতার আবহ" : "Mood of the poem"}
                </label>
                <span className="text-[11px] text-[#6b5233] dark:text-amber-200/60 font-serif">{language === "bn" ? "নিজে লিখো, অথবা নিচ থেকে বেছে নাও" : "Type your own, or pick one below"}</span>
              </div>

              {/* Outside manual writing input box */}
              <input
                type="text"
                value={customMood}
                onChange={(e) => {
                  setCustomMood(e.target.value);
                  stopRecitation();
                }}
                placeholder={language === "bn" ? "কাস্টম আবহ লিখুন (যেমন: একাকী বিষণ্ণতা, চায়ের সুবাস...)" : "Or describe any custom mood here manually..."}
                className="w-full text-xs rounded-xl bg-white dark:bg-[#241a10] border border-[#cfc0a9] dark:border-amber-100/15 text-[#2c1a0c] dark:text-amber-50 px-3 py-2.5 focus:outline-none focus:border-amber-800 focus:ring-1 focus:ring-amber-200 transition-all font-serif"
              />

              {/* Accordion Toggle containing presets */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMoodDropdownOpen(!isMoodDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-800/5 dark:bg-amber-100/5 hover:bg-amber-900/10 dark:hover:bg-amber-100/10 border border-[#decbad] dark:border-amber-100/10 rounded-xl text-xs font-serif text-[#4e361d] dark:text-amber-200 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                      style={{ backgroundColor: getActiveMoodHex() }}
                    />
                    <span className="font-semibold">
                      {language === "bn" ? "একটা মুড বেছে নাও" : "Pick a mood"}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 text-[#6b5233] dark:text-amber-200/60">
                    <span className="text-[10px] italic">
                      ({customMood.trim() ? (language === "bn" ? "কাস্টম সক্রিয়" : "manual active") : (language === "bn" ? moodThemes[selectedMood]?.labelBn.split(" ")[0] : moodThemes[selectedMood]?.labelEn.split(" ")[0])})
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform text-[#4e361d] ${isMoodDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isMoodDropdownOpen && (
                  <div className="mt-1.5 p-3 bg-white dark:bg-[#241a10] border border-[#decbad] dark:border-amber-100/10 rounded-xl shadow-lg space-y-1 z-30 relative max-h-[220px] overflow-y-auto">
                    <span className="text-[10px] font-bold tracking-widest text-[#8a6a42] dark:text-amber-200/50 uppercase block px-1 pb-1 border-b border-[#faf5ea]">
                      {language === "bn" ? "ঋতুভিত্তিক মুড" : "Seasonal moods"}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1.5">
                      {activeMoodsList.map((item) => {
                        const isChosen = selectedMood === item.id && !customMood.trim();
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedMood(item.id);
                              setCustomMood(""); // selecting preset clears custom mood to prevent confusion
                              setIsMoodDropdownOpen(false);
                              stopRecitation();
                            }}
                            className={`p-2 rounded-lg border text-left text-[11px] font-serif transition-all flex flex-col gap-1 cursor-pointer ${
                              isChosen
                                ? "bg-amber-50 border-amber-800 text-amber-950 font-bold"
                                : "bg-[#faf9f4] border-[#e6dec9]/80 text-[#5e4b37] hover:bg-amber-50/50"
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.hex }} />
                              <span className="font-semibold">{item.label}</span>
                            </span>
                            <span className="text-[10px] text-[#6b5233] dark:text-amber-200/60 truncate block font-sans">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- 2. PEN Aura / POETS INFLUENCE --- */}
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between flex-wrap gap-y-1">
                <label className="text-xs uppercase tracking-wide font-bold text-[#4a3419] dark:text-amber-200/80 font-serif">
                  {language === "bn" ? "কার লেখার ধরনে চাও?" : "Whose style should it write in?"}
                </label>
                <span className="text-[11px] text-[#6b5233] dark:text-amber-200/60 font-serif">{language === "bn" ? "নিজে লিখো, অথবা নিচ থেকে বেছে নাও" : "Type your own, or pick one below"}</span>
              </div>

              {/* Outside manual writing input box */}
              <input
                type="text"
                value={customStyle}
                onChange={(e) => {
                  setCustomStyle(e.target.value);
                  stopRecitation();
                }}
                placeholder={language === "bn" ? "কাস্টম স্টাইল বা নিজের নাম লিখুন (যেমন: কঙ্কাবতী, আধুনিক মুক্তক...)" : "Or describe any custom style / author name directly..."}
                className="w-full text-xs rounded-xl bg-white dark:bg-[#241a10] border border-[#cfc0a9] dark:border-amber-100/15 text-[#2c1a0c] dark:text-amber-50 px-3 py-2.5 focus:outline-none focus:border-amber-800 focus:ring-1 focus:ring-amber-200 transition-all font-serif"
              />

              {/* Accordion toggle containing presets */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-800/5 dark:bg-amber-100/5 hover:bg-amber-900/10 dark:hover:bg-amber-100/10 border border-[#decbad] dark:border-amber-100/10 rounded-xl text-xs font-serif text-[#4e361d] dark:text-amber-200 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Feather className="w-3.5 h-3.5 text-amber-800" />
                    <span className="font-semibold">
                      {language === "bn" ? "একজন কবি বেছে নাও" : "Pick a poet"}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 text-[#6b5233] dark:text-amber-200/60">
                    <span className="text-[10px] italic">
                      ({customStyle.trim() ? (language === "bn" ? "কাস্টম সক্রিয়" : "manual active") : (language === "bn" ? activePresets.find(p => p.id === selectedStyle)?.label.split(" ")[0] : activePresets.find(p => p.id === selectedStyle)?.label)})
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform text-[#4e361d] ${isStyleDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isStyleDropdownOpen && (
                  <div className="mt-1.5 p-3.5 bg-white dark:bg-[#241a10] border border-[#decbad] dark:border-amber-100/10 rounded-xl shadow-lg space-y-2 z-30 relative max-h-[300px] overflow-y-auto">
                    <span className="text-[10px] font-bold tracking-widest text-[#8a6a42] dark:text-amber-200/50 uppercase block pb-1 border-b border-[#faf5ea]">
                      {language === "bn" ? "জনপ্রিয় বাংলা কবিরা" : "Popular Bengali poets"}
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {activePresets.map((poet) => {
                        const isChosen = selectedStyle === poet.id && !customStyle.trim();
                        return (
                          <button
                            key={poet.id}
                            type="button"
                            onClick={() => {
                              setSelectedStyle(poet.id);
                              setCustomStyle(""); // clear manual to highlight preset choice
                              setIsStyleDropdownOpen(false);
                              stopRecitation();
                            }}
                            className={`p-2 rounded-lg border text-left text-xs font-serif transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${
                              isChosen
                                ? "bg-amber-50 border-amber-800 text-amber-950 font-bold"
                                : "bg-[#faf9f4] border-[#e6dec9]/80 text-[#5e4b37] hover:bg-amber-50/50"
                            }`}
                          >
                            <span className="font-semibold">{poet.label}</span>
                            <span className="text-[10px] text-[#6b5233] dark:text-amber-200/60 italic block font-sans">{poet.subtitle}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Run Poetry generator button */}
            <button
              onClick={handleGeneratePoetry}
              disabled={loading || !prompt.trim() || (rateLimitResetIn > 0 && rateLimitRemaining === 0)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#784820] hover:bg-[#593212] disabled:bg-[#d0c5af] disabled:cursor-not-allowed text-white font-serif font-bold text-sm tracking-wide rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-200 fill-amber-200" />
              )}
              <span>
                {rateLimitResetIn > 0 && rateLimitRemaining === 0
                  ? (language === "bn" ? `${rateLimitResetIn} সেকেন্ড অপেক্ষা করো` : `Wait ${rateLimitResetIn}s`)
                  : loading 
                    ? (language === "bn" ? "কাব্য সাধনা চলছে..." : "Composing Lines...") 
                    : (language === "bn" ? "কবিতা তৈরি করুন" : "Generate Poetry")}
              </span>
            </button>

            {/* Gentle heads-up when only a couple of requests remain this minute */}
            {rateLimitRemaining !== null && rateLimitRemaining > 0 && rateLimitRemaining <= 2 && (
              <p className="text-[11px] text-amber-800/70 dark:text-amber-300/60 text-center -mt-3 font-serif">
                {language === "bn"
                  ? `এই মিনিটে আর ${rateLimitRemaining}টা কবিতা লেখা যাবে`
                  : `${rateLimitRemaining} generation${rateLimitRemaining > 1 ? "s" : ""} left this minute`}
              </p>
            )}

            {/* Prompt validation or feedback alerts */}
            {errorStatus && (
              <div className="p-3 rounded-xl bg-red-100/40 dark:bg-red-950/20 border border-red-300 dark:border-red-900/40 text-red-950 dark:text-red-200 text-xs flex items-start gap-2 text-left font-serif">
                <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                  <span>{errorStatus}</span>
                  <button
                    onClick={handleGeneratePoetry}
                    disabled={loading || !prompt.trim() || (rateLimitResetIn > 0 && rateLimitRemaining === 0)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-700/10 hover:bg-red-700/20 disabled:opacity-40 disabled:cursor-not-allowed text-red-800 dark:text-red-300 font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {language === "bn" ? "আবার চেষ্টা করো" : "Try again"}
                  </button>
                </div>
              </div>
            )}

            {/* Notebook Saved Archive Collections within Writing Desk */}
            {savedPoems.length > 0 && (
              <div className="border-t border-[#eae1ca] dark:border-amber-100/10 pt-5 space-y-3 font-serif text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#3d2510] dark:text-amber-100">
                    <BookOpen className="w-4 h-4 text-amber-800" />
                    <h3 className="text-xs font-bold font-serif">
                      {language === "bn" ? "ব্যক্তিগত কবিতা খাতা" : "My Poetry Notebook"}
                    </h3>
                  </div>
                  <span className="text-[10px] font-sans px-2 py-0.2 rounded-full bg-amber-700/10 border border-amber-800/10 text-amber-900">
                    {savedPoems.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {savedPoems.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setPoemText(p.content);
                        setAuthorName(p.author);
                        
                        // Parse backward mood configuration safely
                        if (moodThemes[p.mood] || presetMoodsBn.some(pm => pm.id === p.mood)) {
                          setSelectedMood(p.mood);
                          setCustomMood("");
                        } else {
                          setCustomMood(p.mood);
                        }

                        // Parse author styles safely
                        if (presetPoetsBn.some(pp => pp.id === p.style) || presetPoetsEn.some(pe => pe.id === p.style)) {
                          setSelectedStyle(p.style);
                          setCustomStyle("");
                        } else {
                          setCustomStyle(p.style);
                        }

                        stopRecitation();
                        setActiveMobileTab("preview");
                      }}
                      className="p-3 rounded-xl border border-[#e6dec9]/80 bg-white/50 hover:bg-[#faf6ee] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#3d2510] dark:text-amber-100 group-hover:text-amber-800 dark:group-hover:text-amber-400 truncate">
                          {p.title}
                        </h4>
                        <div className="text-[10px] text-[#6b5233] dark:text-amber-200/60 font-sans flex items-center gap-1.5 mt-0.5">
                          <span className="text-amber-800 font-bold capitalize truncate max-w-[120px]">
                            {presetPoetsBn.find(pp=>pp.id === p.style)?.label || p.style}
                          </span>
                          <span>•</span>
                          <span>{p.timestamp}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteSavedPoem(p.id, e)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-700 hover:bg-red-50/70 transition-colors"
                        title={language === "bn" ? "মুছে ফেলুন" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ================= RIGHT COLUMN: EXQUISITE FULL-SIZE APPLE WORKSPACE PREVIEW ================= */}
          <div className={`lg:col-span-7 flex flex-col items-center justify-center w-full min-h-[500px] transition-all ${
            activeMobileTab === "write" ? "hidden sm:flex" : "flex"
          }`}>
            
            {/* NO ARTIFICIAL IPHONE BODY OVERLAYS! NATURE DESK CANVAS EMBLEMS */}
            <div className="w-full max-w-2xl bg-[#FCFAF5] dark:bg-[#1c130a] sm:bg-[#faf7ee]/30 dark:sm:bg-[#1c130a]/50 sm:border border-[#e6dec9]/40 dark:border-amber-100/10 sm:p-6 rounded-[36px] flex flex-col relative">
              
              {/* Parchment Vellum Styled Poetry Sheet */}
              <div className="w-full bg-[#fdfaf2] dark:bg-[#20160c] border border-[#e3d1b8] dark:border-amber-100/10 rounded-2xl p-6 sm:p-10 shadow-lg relative leading-relaxed tracking-wide transition-colors min-h-[380px] flex flex-col justify-between overflow-hidden">

                {/* Shimmer overlay while the poem is being composed */}
                {loading && (
                  <div className="absolute inset-0 z-20 bg-[#fdfaf2]/90 dark:bg-[#20160c]/90 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 px-10">
                    <div className="w-full max-w-xs space-y-3">
                      {[80, 60, 90, 45].map((widthPct, i) => (
                        <div
                          key={i}
                          className="h-3 rounded-full bg-gradient-to-r from-amber-900/5 via-amber-800/15 to-amber-900/5 bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]"
                          style={{ width: `${widthPct}%`, marginLeft: i % 2 === 0 ? 0 : "auto", marginRight: i % 2 === 0 ? "auto" : 0 }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-serif italic text-amber-900/60 pt-2">
                      {language === "bn" ? "কলম চলছে, একটু অপেক্ষা করুন..." : "The pen is moving, one line at a time..."}
                    </span>
                  </div>
                )}
                
                {/* Vintage Corner Embellishments */}
                <span className="absolute top-4 left-4 text-xs opacity-15 select-none text-amber-900 font-serif">❦</span>
                <span className="absolute top-4 right-4 text-xs opacity-15 select-none text-amber-900 font-serif">❦</span>
                <span className="absolute bottom-4 left-4 text-xs opacity-15 select-none text-amber-900 font-serif">❦</span>
                <span className="absolute bottom-4 right-4 text-xs opacity-15 select-none text-amber-900 font-serif">❦</span>

                {/* Main Poem Verses Centered and Framed */}
                <div className="text-center font-serif flex flex-col justify-center items-center py-6 flex-1">
                  
                  {/* Real-time ambient status line */}
                  <div className="flex items-center gap-1 text-[10px] text-amber-800/40 select-none pb-4 font-sans uppercase tracking-widest leading-none">
                    <span>❦</span>
                    <span>
                      {customMood.trim() ? customMood : (language === "bn" ? currentTheme.labelBn.split(" ")[0] : currentTheme.labelEn.split(" ")[0])}
                    </span>
                    <span>❦</span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={poemText}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="text-amber-950 dark:text-amber-50 whitespace-pre-wrap leading-relaxed tracking-wide antialiased select-text font-medium text-center focus:outline-none w-full max-w-lg"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {displayText}
                      {isRevealing && <span className="inline-block w-[2px] h-[1em] -mb-0.5 bg-amber-800/60 animate-pulse ml-0.5" />}
                    </motion.p>
                  </AnimatePresence>
                  
                  {/* Dynamic Signature of Author */}
                  <div className="w-full max-w-xs mt-8 pt-4 border-t border-amber-900/10 text-right select-none pr-4">
                    <p className="text-xs sm:text-sm italic text-amber-900 font-bold font-serif block">
                      — {authorName}
                    </p>
                  </div>

                </div>

                {/* Elegant Text Sizing controls widget */}
                <div className="pt-4 border-t border-amber-900/10 flex items-center justify-between text-[11px] font-sans font-semibold text-[#8c7a65] select-none">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-amber-800" />
                    <span>{language === "bn" ? "হরফের আকার (Text)" : "Font size"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]">A-</span>
                    <input
                      type="range"
                      min="14"
                      max="32"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="accent-[#875a13] h-1 w-24 sm:w-32 rounded bg-[#eae3d0] dark:bg-[#1c130a] cursor-pointer"
                    />
                    <span className="text-[10px]">A+</span>
                    <span className="bg-amber-800/10 px-1.5 py-0.5 rounded text-[10px] text-amber-900">{fontSize}pt</span>
                  </div>
                </div>

              </div>

              {/* FLOATING ACTION GLASS CONSOLE DIRECTLY BELOW CANVAS */}
              <div className="w-full mt-6 bg-[#FCFAF5] dark:bg-[#1c130a] sm:bg-white/80 dark:sm:bg-[#1c130a]/80 border border-[#decbad] dark:border-amber-100/10 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-around shadow-md select-none">
                
                {/* 1. Recitation Voice Switch */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      if (isPlayingAudio) {
                        pauseRecitation();
                      } else {
                        startRecitation(poemText);
                      }
                    }}
                    disabled={audioLoading}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
                      isPlayingAudio && !isAudioPaused
                        ? "bg-[#C45E20] text-white animate-pulse"
                        : "bg-[#FAF5EA] dark:bg-amber-100/10 hover:bg-[#f3ead3] dark:hover:bg-amber-100/20 text-[#7A4B24] dark:text-amber-300 border border-[#DECBAD] dark:border-amber-100/10"
                    }`}
                    title={language === "bn" ? "কবিতা আবৃত্তি" : "Listen to your poem"}
                  >
                    {audioLoading ? (
                      <Loader2 className="w-4 sm:w-4.5 h-4 sm:h-4.5 animate-spin" />
                    ) : (
                      <Volume2 className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
                    )}
                  </button>
                  <div className="text-left hidden sm:block">
                    <span className="text-[10px] font-serif font-bold text-amber-900 dark:text-amber-100 block leading-tight">
                      {audioLoading
                        ? (language === "bn" ? "প্রস্তুত হচ্ছে..." : "Preparing...")
                        : isPlayingAudio && !isAudioPaused
                          ? (language === "bn" ? "আবৃত্তি বন্ধ" : "Pause Audio")
                          : (language === "bn" ? "আবৃত্তি শুনুন" : "Listen")}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPlayingAudio) stopRecitation();
                        setGeminiVoice((v) => (v === "Kore" ? "Charon" : "Kore"));
                      }}
                      className="text-[10px] text-[#6b5233] dark:text-amber-200/60 hover:text-amber-800 dark:hover:text-amber-300 block shrink max-w-[90px] truncate leading-none cursor-pointer underline decoration-dotted"
                      title={language === "bn" ? "কণ্ঠস্বর পাল্টাও" : "Switch voice"}
                    >
                      {usingFallbackVoice
                        ? (language === "bn" ? "ডিভাইস কণ্ঠস্বর" : "Device voice")
                        : geminiVoice === "Kore"
                          ? (language === "bn" ? "কোরে (কোমল)" : "Kore (warm)")
                          : (language === "bn" ? "কেরন (গম্ভীর)" : "Charon (deep)")}
                    </button>
                  </div>
                </div>

                {/* 2. Bookmark save icon */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={handleSavePoem}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      bookmarkSuccess 
                        ? "bg-green-700 text-white" 
                        : "bg-[#FAF5EA] hover:bg-[#f3ead3] text-[#7A4B24] border border-[#DECBAD]"
                    }`}
                    title={language === "bn" ? "কবিতা খাতায় রাখুন" : "Save in notebook collections"}
                  >
                    {bookmarkSuccess ? (
                      <Check className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
                    ) : (
                      <Bookmark className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
                    )}
                  </button>
                  <div className="text-left hidden sm:block">
                    <span className="text-[10px] font-serif font-bold text-amber-900 block leading-tight">
                      {bookmarkSuccess ? (language === "bn" ? "রাখা হয়েছে" : "Saved!") : (language === "bn" ? "সংরক্ষণ" : "Save Draft")}
                    </span>
                    <span className="text-[10px] text-[#6b5233] dark:text-amber-200/60 block leading-none">
                      {language === "bn" ? "লোকাল খাতা" : "In your notebook"}
                    </span>
                  </div>
                </div>

                {/* 3. High Resolution Image Card Downloader */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={generateImageCard}
                    disabled={canvasGenerating}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-[#FAF5EA] hover:bg-[#f3ead3] text-[#7A4B24] border border-[#DECBAD] transition-all cursor-pointer disabled:opacity-45"
                    title={language === "bn" ? "ক্যানভাস কার্ড ডাউনলোড করুন" : "Export calligraphy picture"}
                  >
                    {canvasGenerating ? (
                      <Loader2 className="w-4 sm:w-4.5 h-4 sm:h-4.5 animate-spin" />
                    ) : (
                      <Download className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
                    )}
                  </button>
                  <div className="text-left hidden sm:block">
                    <span className="text-[10px] font-serif font-bold text-amber-900 block leading-tight">
                      {language === "bn" ? "ডাউনলোড" : "Download"}
                    </span>
                    <span className="text-[10px] text-[#6b5233] dark:text-amber-200/60 block leading-none">
                      {language === "bn" ? "১১০০px কার্ড" : "1100px PNG card"}
                    </span>
                  </div>
                </div>

                {/* 4. Clipboard copy paste mechanism */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={handleCopy}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      copied 
                        ? "bg-amber-900 text-white" 
                        : "bg-[#FAF5EA] hover:bg-[#f3ead3] text-[#7A4B24] border border-[#DECBAD]"
                    }`}
                    title={language === "bn" ? "কপি ও শেয়ার" : "Copy & share"}
                  >
                    {copied ? (
                      <Check className="w-4 sm:w-4.5 h-4 sm:h-4.5 text-white" />
                    ) : (
                      <Share2 className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
                    )}
                  </button>
                  <div className="text-left hidden sm:block">
                    <span className="text-[10px] font-serif font-bold text-amber-900 block leading-tight">
                      {copied ? (language === "bn" ? "অনুলিপি" : "Copied!") : (language === "bn" ? "শেয়ার" : "Copy Shared")}
                    </span>
                    <span className="text-[10px] text-[#6b5233] dark:text-amber-200/60 block leading-none">
                      {language === "bn" ? "ক্লিপবোর্ড" : "Ready to paste"}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Micro active feedback if music speech Synthesis is active */}
            {isPlayingAudio && !isAudioPaused && (
              <div className="mt-4 flex items-center space-x-2 bg-amber-900/10 border border-amber-800/15 p-2 px-4 rounded-full select-none font-serif animate-bounce">
                <span className="w-2 h-2 rounded-full bg-amber-700 animate-ping" />
                <span className="text-[10px] text-amber-900 font-bold">
                  {language === "bn" ? "আবৃত্তি মডিউল আবহে চমৎকার স্বর বেজে উঠছে..." : "Reciting your poem softly..."}
                </span>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
