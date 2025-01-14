import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ThemeSwitcherProps {
  className?: string;
}

export default function ThemeSwitcher({ className = "" }: ThemeSwitcherProps) {
  const themes = [
    { name: "purple", primaryColor: "#a855f7", accentColor: "#8b5cf6" },
    { name: "green", primaryColor: "#10b981", accentColor: "#059669" },
    { name: "red", primaryColor: "#ef4444", accentColor: "#dc2626" },
  ];

  const updateThemeColors = (primaryColor: string, accentColor: string) => {
    document.documentElement.style.setProperty("--theme-primary", primaryColor);
    document.documentElement.style.setProperty("--theme-accent", accentColor);

    // Update all color variables
    document.documentElement.style.setProperty("--primary", `hsl(${getHslValues(primaryColor)})`);
    document.documentElement.style.setProperty("--primary-foreground", "hsl(0 0% 100%)");

    // Update card and border colors
    document.documentElement.style.setProperty("--card-border", `hsl(${getHslValues(accentColor)} / 0.2)`);
    document.documentElement.style.setProperty("--border-color", `hsl(${getHslValues(accentColor)} / 0.2)`);
  };

  // Convert hex to HSL values
  const getHslValues = (hex: string): string => {
    // Remove the hash if it exists
    hex = hex.replace("#", "");

    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }

      h *= 60;
    }

    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Set initial theme on mount
  useEffect(() => {
    updateThemeColors(themes[0].primaryColor, themes[0].accentColor);
  }, []);

  return (
    <div className={`flex gap-2 ${className}`}>
      {themes.map((theme) => (
        <Button
          key={theme.name}
          className="w-8 h-8 rounded-full p-0 relative hover:scale-110 transition-transform duration-200"
          style={{ 
            backgroundColor: theme.primaryColor,
            boxShadow: `0 0 10px ${theme.primaryColor}80`
          }}
          onClick={() => updateThemeColors(theme.primaryColor, theme.accentColor)}
        >
          <span className="sr-only">Switch to {theme.name} theme</span>
        </Button>
      ))}
    </div>
  );
}