import { useState, useRef, useCallback, useEffect } from "react";
import { CheckCircle2, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendCommand, beep, type BLEData } from "@/lib/ble";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CircularGauge } from "@/components/CircularGauge";
import { SessionSetup } from "@/components/SessionSetup";
import type { Patient } from "./ProfilePage";

interface Reading {
  flex1: number;
  flex2: number;
  timestamp_ms: number;
}

interface AnalysisPageProps {
  patient: Patient | null;
  isConnected: boolean;
  liveData: BLEData;
  registerHandler: (handler: (data: BLEData) => void) => void;
}

// Independent calibration ranges for each sensor
const SENSOR_1_RAW_MIN = 2950;
const SENSOR_1_RAW_MAX = 3150;
const SENSOR_2_RAW_MIN = 360;
const SENSOR_2_RAW_MAX = 420;

function rawToPercent(raw: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, raw));
  return ((clamped - min) / (max - min)) * 100;
}

export function AnalysisPage({ patient, isConnected, liveData, registerHandler }: AnalysisPageProps) {
  const [flex1, setFlex1] = useState(liveData.f1);
  const [flex2, setFlex2] = useState(liveData.f2);
  const [threshold1, setThreshold1] = useState<number | null>(null);
  const [threshold2, setThreshold2] = useState<number | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [reached1, setReached1] = useState(false);
  const [reached2, setReached2] = useState(false);
  const readingsRef = useRef<Reading[]>([]);
  const sessionStartRef = useRef<Date | null>(null);
  const t1Ref = useRef(false);
  const t2Ref = useRef(false);

  const handleData = useCallback(
    (data: BLEData) => {
      setFlex1(data.f1);
      setFlex2(data.f2);

      if (data.s === 1) {
        if (!sessionStartRef.current) {
          sessionStartRef.current = new Date();
          readingsRef.current = [];
        }

        const elapsed = Date.now() - sessionStartRef.current!.getTime();
        readingsRef.current.push({
          flex1: data.f1,
          flex2: data.f2,
          timestamp_ms: elapsed,
        });

        const p1 = rawToPercent(data.f1, SENSOR_1_RAW_MIN, SENSOR_1_RAW_MAX);
        const p2 = rawToPercent(data.f2, SENSOR_2_RAW_MIN, SENSOR_2_RAW_MAX);

        if (threshold1 != null && p1 >= threshold1) {
          if (!t1Ref.current) {
            beep();
            t1Ref.current = true;
          }
          setReached1(true);
        } else {
          t1Ref.current = false;
          setReached1(false);
        }

        if (threshold2 != null && p2 >= threshold2) {
          if (!t2Ref.current) {
            beep();
            t2Ref.current = true;
          }
          setReached2(true);
        } else {
          t2Ref.current = false;
          setReached2(false);
        }
      } else {
        setReached1(false);
        setReached2(false);
      }
    },
    [threshold1, threshold2]
  );

  // Register the handler with the parent so live BLE data flows in
  useEffect(() => {
    registerHandler(handleData);
  }, [handleData, registerHandler]);

  // Always reflect latest live data even before a session starts
  useEffect(() => {
    setFlex1(liveData.f1);
    setFlex2(liveData.f2);
  }, [liveData]);

  async function startSession(t1: number, t2: number) {
    setThreshold1(t1);
    setThreshold2(t2);
    sessionStartRef.current = new Date();
    readingsRef.current = [];
    setSessionActive(true);
    await sendCommand("start");
  }

  async function stopSession() {
    await sendCommand("end");

    if (patient && sessionStartRef.current) {
      const endedAt = new Date();
      const durationSeconds = Math.round(
        (endedAt.getTime() - sessionStartRef.current.getTime()) / 1000
      );

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
        const readings = readingsRef.current;
        const sampled =
          readings.length > 500
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
    }

    sessionStartRef.current = null;
    readingsRef.current = [];
    setSessionActive(false);
    setReached1(false);
    setReached2(false);
    setThreshold1(null);
    setThreshold2(null);
  }

  // Setup view — before session starts
  if (!sessionActive) {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">Real-time Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure thresholds, then start a live monitoring session.
          </p>
        </div>
        <SessionSetup
          patientName={patient?.name ?? null}
          isConnected={isConnected}
          onStart={startSession}
        />
      </div>
    );
  }

  // Live monitoring view
  const p1 = rawToPercent(flex1, SENSOR_1_RAW_MIN, SENSOR_1_RAW_MAX);
  const p2 = rawToPercent(flex2, SENSOR_2_RAW_MIN, SENSOR_2_RAW_MAX);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-success">
              Live Session
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight mt-1">
            {patient?.name || "—"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right text-xs">
            <div
              className={cn(
                "font-semibold uppercase tracking-wider",
                isConnected ? "text-success" : "text-destructive"
              )}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </div>
            <div className="text-muted-foreground">Device status</div>
          </div>
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SensorCard
          label="Sensor 1"
          percent={p1}
          rawValue={flex1}
          threshold={threshold1}
          reached={reached1}
          colorClass="text-primary"
        />
        <SensorCard
          label="Sensor 2"
          percent={p2}
          rawValue={flex2}
          threshold={threshold2}
          reached={reached2}
          colorClass="text-[hsl(270,70%,60%)]"
        />
      </div>

      {/* End session */}
      <Button
        onClick={stopSession}
        disabled={!isConnected}
        variant="destructive"
        size="lg"
        className="w-full h-12 text-sm uppercase tracking-wider font-semibold"
      >
        <Square className="w-4 h-4 mr-2 fill-current" />
        End Session
      </Button>
    </div>
  );
}

interface SensorCardProps {
  label: string;
  percent: number;
  rawValue: number;
  threshold: number | null;
  reached: boolean;
  colorClass: string;
}

function SensorCard({
  label,
  percent,
  rawValue,
  threshold,
  reached,
  colorClass,
}: SensorCardProps) {
  return (
    <div
      className={cn(
        "relative bg-card border rounded-2xl p-6 transition-colors",
        reached ? "border-success" : "border-border"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </div>
          <div className="text-xs text-muted-foreground/70 mt-0.5">
            Target: <span className="text-foreground font-mono">{threshold}%</span>
          </div>
        </div>
        {reached && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 text-success text-xs font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Reached
          </div>
        )}
      </div>

      <div className="flex justify-center py-2">
        <CircularGauge
          value={percent}
          threshold={threshold}
          reached={reached}
          label="Current"
          sublabel={`raw: ${rawValue}`}
          colorClass={colorClass}
        />
      </div>
    </div>
  );
}
