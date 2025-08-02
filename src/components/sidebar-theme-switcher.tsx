import { useTheme } from "@/providers/theme-provider.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Laptop, Moon, Sun } from "lucide-react";

export function SidebarThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex space-x-1">
      <Button
        variant={theme === "light" ? "default" : "outline"}
        size="icon"
        onClick={() => setTheme("light")}
        aria-label="Light theme"
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "outline"}
        size="icon"
        onClick={() => setTheme("dark")}
        aria-label="Dark theme"
      >
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <Button
        variant={theme === "system" ? "default" : "outline"}
        size="icon"
        onClick={() => setTheme("system")}
        aria-label="System theme"
      >
        <Laptop className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    </div>
  );
}
