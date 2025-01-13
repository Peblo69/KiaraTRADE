import { Button } from "@/components/ui/button";

interface ThemeSwitcherProps {
  className?: string;
}

export default function ThemeSwitcher({ className = "" }: ThemeSwitcherProps) {
  const themes = [
    { name: "purple", color: "#8b5cf6" },
    { name: "green", color: "#10b981" },
    { name: "red", color: "#ef4444" },
  ];

  const setTheme = (color: string) => {
    document.documentElement.style.setProperty("--primary", color);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {themes.map((theme) => (
        <Button
          key={theme.name}
          className="w-8 h-8 rounded-full p-0 relative"
          style={{ backgroundColor: theme.color }}
          onClick={() => setTheme(theme.color)}
        >
          <span className="sr-only">Switch to {theme.name} theme</span>
        </Button>
      ))}
    </div>
  );
}
