"use client";

import { useEffect, useState } from "react";

export default function LanguageToggle() {
  const [language, setLanguage] = useState("en");

  const changeLanguage = (lang) => {
    setLanguage(lang);

    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event("change"));
    }
  };

  return (
    <div className="fixed top-4 right-6 z-[9999] bg-white shadow-lg rounded-full px-4 py-2 flex gap-3 text-sm font-medium">
      <button
        onClick={() => changeLanguage("en")}
        className={language === "en" ? "text-blue-600" : "text-gray-600"}
      >
        EN
      </button>
      <span>|</span>
      <button
        onClick={() => changeLanguage("hi")}
        className={language === "hi" ? "text-blue-600" : "text-gray-600"}
      >
        हिंदी
      </button>
    </div>
  );
}
