"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import "../../_styles/queen-theme.css";
import "../../_styles/status-pills.css";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let t: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try {
      const s = localStorage.getItem("qs-theme");
      if (s === "dark" || s === "light") t = s;
    } catch {}
    setTheme(t);
    document.documentElement.dataset.theme = t;
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("qs-theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
      title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
      style={{
        display: "grid",
        placeItems: "center",
        width: 40,
        height: 40,
        borderRadius: 10,
        border: "1px solid var(--c-line-strong, #DDD5C5)",
        background: "var(--c-surface, #fff)",
        color: "var(--c-text, #17140F)",
        cursor: "pointer",
      }}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
