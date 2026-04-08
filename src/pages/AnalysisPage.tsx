import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendCommand, beep, type BLEData } from "@/lib/ble";
import { cn } from "@/lib/utils";
import type { Patient } from "./ProfilePage";

interface Reading {
  flex1: number;
  flex2: number;
  timestamp_ms: number;
}

interface AnalysisPageProps {
  patient: Patient | null;
  isConnected: boolean;
}

const THRESHOLD = 2780;

export function AnalysisPage({ patient, isConnected }: AnalysisPageProps) {
  const [flex1, setFlex1] = useState(0);
  const [flex2, setFlex2] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [led1, setLed1] = useState(false);
  const [led2, setLed2] = useState(false);
  const readingsRef = useRef<Reading[]>([]);
  const sessionStartRef = useRef<Date | null>(null);
  const t1Ref = useRef(false);
  const t2Ref = useRef(false);

  const handleData = useCallback((data: BLEData) => {
    setFlex1(data.f1);
    setFlex2(data.f2);

    if (data.s === 1) {
      setSessionActive(true);
      if (!sessionStartRef.current) {
        sessionStartRef.current = new Date();
        readingsRef.current = [];
      }

      const elapsed = Date.now() - sessionStartRef.current!.getTime();
      readingsRef.current.push({ flex1: data.f1, flex2: data.f2, timestamp_ms: elapsed });

      if (data.f1 > THRESHOLD) { if (!t1Ref.current) { beep(); t1Ref.current = true; } setLed1(true); }
      else { t1Ref.current = false; setLed1(false); }
      if (data.f2 > THRESHOLD) { if (!t2Ref.current) { beep(); t2Ref.current = true; } setLed2(true); }
      else { t2Ref.current = false; setLed2(false); }
    } else {
      setSessionActive(false);
      setLed1(false);
      setLed2(false);
    }
  }, []);

  // Expose handleData to parent via window for BLE callback
  (window as any).__analysisHandleData = handleData;

  async function startSession() {
    sessionStartRef.current = new Date();
    readingsRef.current = [];
    await sendCommand("start");
  }

  async function stopSession() {
    await sendCommand("end");
    
    if (!patient || !sessionStartRef.current) return;

    const endedAt = new Date();
    const durationSeconds = Math.round((endedAt.getTime() - sessionStartRef.current.getTime()) / 1000);

    const { data: session } = await supabase
      .from("sessions")
      .insert({
        patient_id: patient.id,
        started_at: sessionStartRef.current.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (session && readingsRef.current.length > 0) {
      // Sample readings to max ~500 points for storage
      const readings = readingsRef.current;
      const sampled = readings.length > 500
        ? readings.filter((_, i) => i % Math.ceil(readings.length / 500) === 0)
        : readings;

      await supabase.from("session_readings").insert(
        sampled.map((r) => ({
          session_id: session.id,
          flex1: r.flex1,
          flex2: r.flex2,
          timestamp_ms: r.timestamp_ms,
        }))
      );
    }

    sessionStartRef.current = null;
    readingsRef.current = [];
    setSessionActive(false);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Real-time Analysis</h2>
          <p className="text-muted-foreground text-sm">
            Patient: <span className="text-primary">{patient?.name || "None"}</span>
          </p>
        </div>
        <div className="text-right">
          <span className={cn("font-bold text-xs uppercase block", isConnected ? "text-success" : "text-destructive")}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          <span className={cn("text-xs uppercase block", sessionActive ? "text-success" : "text-muted-foreground")}>
            {sessionActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card p-6 rounded-2xl border border-border relative overflow-hidden">
          <div className={cn(
            "absolute top-4 right-4 w-3 h-3 rounded-full",
            led1 ? "bg-success shadow-[0_0_10px_hsl(var(--success))]" : "bg-muted"
          )} />
          <span className="text-muted-foreground text-sm">Flex Sensor 1</span>
          <div className="text-5xl font-mono font-bold my-2">{flex1}</div>
          <div className="w-full bg-muted h-2 rounded-full">
            <div className="sensor-bar bg-primary h-full rounded-full" style={{ width: `${(flex1 / 4095) * 100}%` }} />
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border relative overflow-hidden">
          <div className={cn(
            "absolute top-4 right-4 w-3 h-3 rounded-full",
            led2 ? "bg-success shadow-[0_0_10px_hsl(var(--success))]" : "bg-muted"
          )} />
          <span className="text-muted-foreground text-sm">Flex Sensor 2</span>
          <div className="text-5xl font-mono font-bold my-2">{flex2}</div>
          <div className="w-full bg-muted h-2 rounded-full">
            <div className="sensor-bar bg-[hsl(270,70%,60%)] h-full rounded-full" style={{ width: `${(flex2 / 4095) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={startSession}
          disabled={!isConnected || sessionActive || !patient}
          className="flex-1 bg-success disabled:opacity-30 py-4 rounded-xl font-bold uppercase text-success-foreground transition"
        >
          Start Session
        </button>
        <button
          onClick={stopSession}
          disabled={!isConnected || !sessionActive}
          className="flex-1 bg-destructive disabled:opacity-30 py-4 rounded-xl font-bold uppercase text-destructive-foreground transition"
        >
          End Session
        </button>
      </div>

      {!patient && (
        <p className="text-center text-muted-foreground mt-4 text-sm">
          Please select a patient from the Profile page first.
        </p>
      )}
    </div>
  );
}
