import React, { useState, useEffect } from "react";
import SplashHeader from "./components/SplashHeader";
import PoetLounge from "./components/PoetLounge";
import { Sparkles, Heart } from "lucide-react";

export default function App() {
  const [language, setLanguage] = useState<"bn" | "en">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const langParam = params.get("lang");
      if (langParam === "en" || langParam === "bn") {
        return langParam;
      }
      const stored = localStorage.getItem("srijon_lang");
      if (stored === "en" || stored === "bn") {
        return stored;
      }
    }
    return "bn";
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("srijon_dark");
      if (stored === "1") return true;
      if (stored === "0") return false;
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    }
    return false;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("srijon_dark", darkMode ? "1" : "0");
  }, [darkMode]);

  const handleSetLanguage = (lang: "bn" | "en") => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("srijon_lang", lang);
      const params = new URLSearchParams(window.location.search);
      params.set("lang", lang);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1ebd9] dark:bg-[#160f08] text-[#3d2712] dark:text-[#f3e9d6] flex flex-col justify-between selection:bg-amber-800/15 selection:text-[#3d2712] transition-colors duration-300">
      
      {/* Dynamic Splash Navigation Header */}
      <SplashHeader
        language={language}
        setLanguage={handleSetLanguage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Tab Dashboard Container */}
      <main className="flex-1">
        <PoetLounge language={language} />
      </main>

      {/* Elegant Footer Details */}
      <footer className="border-t border-amber-900/15 dark:border-amber-100/10 bg-[#e4dac1] dark:bg-[#20160c] py-6 px-4 text-center transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-[#5c4a37] dark:text-amber-200/70 font-serif">
            <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>
              {language === "bn" 
                ? "সৃজন এআই — বাঙালি সাহিত্যিক ঐতিহ্য ও ব্যাকরণ" 
                : "Srijon AI — A Fusion of Bengali Heritage & Modern AI Grammar"}
            </span>
          </div>

          <div className="text-xs text-[#5c4a37] dark:text-amber-200/70 font-serif flex items-center gap-1.5 justify-center">
            <span>{language === "bn" ? "ভালবাসার সাথে নির্মিত" : "Crafted with"}</span>
            <Heart className="w-3 h-3 text-red-700 fill-red-700" />
            <span>{language === "bn" ? "জেমিনি এআই ল্যাবে" : "using Gemini AI Studio"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
