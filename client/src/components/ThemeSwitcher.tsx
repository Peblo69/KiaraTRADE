import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ThemeSwitcherProps {
  className?: string;
}

export default function ThemeSwitcher({ className = "" }: ThemeSwitcherProps) {
  const themes = [
    { 
      name: "purple",
      primary: { r: 168, g: 85, b: 247 },
      accent: { r: 139, g: 92, b: 246 }
    },
    { 
      name: "green",
      primary: { r: 16, g: 185, b: 129 },
      accent: { r: 5, g: 150, b: 105 }
    },
    { 
      name: "red",
      primary: { r: 239, g: 68, b: 68 },
      accent: { r: 220, g: 38, b: 38 }
    },
  ];

  const rgbToHex = (r: number, g: number, b: number) => {
    return `#${[r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
  };

  const updateThemeColors = (primary: { r: number, g: number, b: number }, accent: { r: number, g: number, b: number }, themeName: string) => {
    // Set RGB values directly
    document.documentElement.style.setProperty(
      '--theme-primary',
      `${primary.r}, ${primary.g}, ${primary.b}`
    );
    document.documentElement.style.setProperty(
      '--theme-accent',
      `${accent.r}, ${accent.g}, ${accent.b}`
    );

    // Update data-theme attribute for theme-specific styles
    document.documentElement.setAttribute('data-theme', themeName);
  };

  // Set initial theme on mount
  useEffect(() => {
    updateThemeColors(themes[0].primary, themes[0].accent, themes[0].name);
  }, []);

  return (
    <div className={`flex gap-2 ${className}`}>
      {themes.map((theme) => (
        <Button
          key={theme.name}
          className="w-8 h-8 rounded-full p-0 relative hover:scale-110 transition-transform duration-200"
          style={{ 
            backgroundColor: rgbToHex(theme.primary.r, theme.primary.g, theme.primary.b),
            boxShadow: `0 0 10px ${rgbToHex(theme.primary.r, theme.primary.g, theme.primary.b)}80`
          }}
          onClick={() => updateThemeColors(theme.primary, theme.accent, theme.name)}
        >
          <span className="sr-only">Switch to {theme.name} theme</span>
        </Button>
      ))}
    </div>
  );
}