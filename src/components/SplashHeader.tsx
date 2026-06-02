import React from "react";
import { Sparkles, Languages } from "lucide-react";

interface SplashHeaderProps {
  language: "bn" | "en";
  setLanguage: (lang: "bn" | "en") => void;
}

export default function SplashHeader({
  language,
  setLanguage,
}: SplashHeaderProps) {
  return (
    <header className="border-b border-amber-900/10 bg-[#fbf9f4]/85 backdrop-blur-md sticky top-0 z-50 py-2.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Poetic Branding */}
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-805/5 text-amber-800 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-amber-700 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="text-left">
            <h1 className="text-base sm:text-lg font-serif font-bold tracking-tight text-[#3d2510] flex items-center flex-wrap gap-1.5">
              <span>{language === "bn" ? "সৃজন" : "Srijon"}</span>
              <span className="text-[10px] tracking-wide px-1.5 py-0.2 rounded bg-amber-700/10 text-amber-805 font-bold">AI</span>
              <span className="hidden md:inline-block text-xs text-amber-850/70 font-normal font-sans">
                — {language === "bn" ? "বাংলা কবিতা জেনারেটর ও বাংলা AI" : "Bengali Poetry Generator & Bengali AI Writer"}
              </span>
            </h1>
          </div>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sans font-bold bg-amber-800/5 hover:bg-amber-800/10 border border-[#bfa580]/20 text-[#5c3e21] hover:text-[#3d2510] transition-colors cursor-pointer"
            title={language === "bn" ? "Convert to English" : "বাংলায় পরিবর্তন করুন"}
          >
            <Languages className="w-3.5 h-3.5 text-amber-800/80" />
            <span>{language === "bn" ? "EN" : "বাংলা"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
