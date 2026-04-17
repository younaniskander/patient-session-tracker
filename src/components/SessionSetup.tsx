import { useState } from "react";
import { Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SessionSetupProps {
  patientName?: string | null;
  isConnected: boolean;
  onStart: (t1: number, t2: number) => void;
}

export function SessionSetup({ patientName, isConnected, onStart }: SessionSetupProps) {
  const [t1, setT1] = useState<string>("");
  const [t2, setT2] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function validate(v: string): number | null {
    if (v.trim() === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1 || n > 100) return null;
    return n;
  }

  function handleStart() {
    const v1 = validate(t1);
    const v2 = validate(t2);
    if (v1 == null || v2 == null) {
      setError("Please enter a target threshold (1–100%) for both sensors.");
      return;
    }
    if (!isConnected) {
      setError("Device is not connected.");
      return;
    }
    setError(null);
    onStart(v1, v2);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Session Setup</h2>
          <p className="text-sm text-muted-foreground">
            Configure target thresholds before starting the live session.
          </p>
        </div>
      </div>

      <div className="my-6 h-px bg-border" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="t1" className="text-sm">
            Sensor 1 — Target Threshold
          </Label>
          <div className="relative">
            <Input
              id="t1"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              placeholder="e.g. 50"
              value={t1}
              onChange={(e) => setT1(e.target.value)}
              className="pr-10 h-11 text-base"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="t2" className="text-sm">
            Sensor 2 — Target Threshold
          </Label>
          <div className="relative">
            <Input
              id="t2"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              placeholder="e.g. 50"
              value={t2}
              onChange={(e) => setT2(e.target.value)}
              className="pr-10 h-11 text-base"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Patient:{" "}
            <span className="text-foreground font-medium">
              {patientName || "Not selected"}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-success" : "bg-destructive"
              }`}
            />
            {isConnected ? "Device connected" : "Device disconnected"}
          </span>
        </div>

        <Button
          onClick={handleStart}
          disabled={!isConnected || !patientName}
          size="lg"
          className="w-full h-12 text-sm uppercase tracking-wider font-semibold"
        >
          Start Session
        </Button>
        {!patientName && (
          <p className="text-center text-xs text-muted-foreground">
            Please select a patient from the Profile page first.
          </p>
        )}
      </div>
    </div>
  );
}
