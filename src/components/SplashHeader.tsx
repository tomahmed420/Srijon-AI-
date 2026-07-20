import React from "react";
import { Languages, Moon, Sun, Feather } from "lucide-react";

interface SplashHeaderProps {
  language: "bn" | "en";
  setLanguage: (lang: "bn" | "en") => void;
  darkMode: boolean;
  setDarkMode: (fn: (prev: boolean) => boolean) => void;
}

export default function SplashHeader({
  language,
  setLanguage,
  darkMode,
  setDarkMode,
}: SplashHeaderProps) {
  return (
    <header className="border-b border-amber-900/10 dark:border-amber-100/10 bg-[#fbf9f4]/85 dark:bg-[#1c130a]/90 backdrop-blur-md sticky top-0 z-50 py-2.5 px-4 sm:px-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Poetic Branding */}
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-800/5 dark:bg-amber-100/10 text-amber-800 dark:text-amber-300 flex items-center justify-center">
            <Feather className="w-4.5 h-4.5 text-amber-700 dark:text-amber-400 -rotate-12" />
          </div>
          <div className="text-left">
            <h1 className="text-base sm:text-lg font-serif font-bold tracking-tight text-[#3d2510] dark:text-amber-50 flex items-center flex-wrap gap-1.5">
              <span>{language === "bn" ? "সৃজন" : "Srijon"}</span>
              <span className="text-[10px] tracking-wide px-1.5 py-0.2 rounded bg-amber-700/10 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300 font-bold">AI</span>
              <span className="hidden md:inline-block text-xs text-amber-900/70 dark:text-amber-200/60 font-normal font-sans">
                — {language === "bn" ? "বাংলা কবিতা এআই ও বাংলা লেখা টুলস বাংলাদেশ" : "Bengali Poetry Generator & Bengali AI Writer"}
              </span>
            </h1>
          </div>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-800/5 dark:bg-amber-100/10 hover:bg-amber-800/10 dark:hover:bg-amber-100/20 border border-[#bfa580]/20 dark:border-amber-100/10 text-[#5c3e21] dark:text-amber-300 transition-colors cursor-pointer"
            title={language === "bn" ? (darkMode ? "দিনের আলোয় ফিরুন" : "রাতের আবহে যান") : (darkMode ? "Switch to light" : "Switch to dark")}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sans font-bold bg-amber-800/5 dark:bg-amber-100/10 hover:bg-amber-800/10 dark:hover:bg-amber-100/20 border border-[#bfa580]/20 dark:border-amber-100/10 text-[#5c3e21] dark:text-amber-300 hover:text-[#3d2510] dark:hover:text-amber-100 transition-colors cursor-pointer"
            title={language === "bn" ? "Convert to English" : "বাংলায় পরিবর্তন করুন"}
          >
            <Languages className="w-3.5 h-3.5 text-amber-800/80 dark:text-amber-300/80" />
            <span>{language === "bn" ? "EN" : "বাংলা"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
