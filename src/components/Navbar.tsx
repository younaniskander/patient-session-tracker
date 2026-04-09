import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";

interface NavbarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isConnected: boolean;
  onConnect: () => void;
}

export function Navbar({ activePage, onNavigate, isConnected, onConnect }: NavbarProps) {
  const pages = ["profile", "analysis", "archive"];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-primary-foreground text-sm">G</div>
          <span className="text-xl font-bold tracking-tight">
            session-tracker <span className="text-primary">PT</span>
          </span>
        </div>
        <div className="hidden md:flex space-x-8">
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onNavigate(p)}
              className={cn(
                "py-4 px-2 text-sm font-medium capitalize transition-colors hover:text-primary",
                activePage === p && "border-b-[3px] border-primary text-primary"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={onConnect}
          className={cn(
            "text-xs font-bold py-2 px-6 rounded-full transition",
            isConnected
              ? "bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isConnected ? "DISCONNECT" : "CONNECT BLE"}
        </button>
      </div>
      {/* Mobile nav */}
      <div className="flex md:hidden justify-around border-t border-border">
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onNavigate(p)}
            className={cn(
              "py-3 px-4 text-xs font-medium capitalize flex-1 text-center transition-colors",
              activePage === p ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </nav>
  );
}
