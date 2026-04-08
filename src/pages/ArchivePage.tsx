import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Session {
  id: string;
  patient_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  patients?: { name: string; weight: number | null };
}

interface Reading {
  flex1: number;
  flex2: number;
  timestamp_ms: number;
}

export function ArchivePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const { data } = await supabase
      .from("sessions")
      .select("*, patients(name, weight)")
      .order("created_at", { ascending: false });
    if (data) setSessions(data as unknown as Session[]);
  }

  async function viewSession(session: Session) {
    setSelectedSession(session);
    const { data } = await supabase
      .from("session_readings")
      .select("flex1, flex2, timestamp_ms")
      .eq("session_id", session.id)
      .order("timestamp_ms", { ascending: true });
    if (data) setReadings(data);
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Session Archive</h2>

      {selectedSession ? (
        <div>
          <button
            onClick={() => { setSelectedSession(null); setReadings([]); }}
            className="text-sm text-primary hover:underline mb-4 inline-block"
          >
            ← Back to sessions
          </button>

          <div className="bg-card p-6 rounded-2xl border border-border mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Patient</p>
                <p className="text-lg font-semibold">{selectedSession.patients?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Weight</p>
                <p className="text-lg font-semibold">{selectedSession.patients?.weight ? `${selectedSession.patients.weight} kg` : "--"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Duration</p>
                <p className="text-lg font-semibold">{formatDuration(selectedSession.duration_seconds)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Date</p>
                <p className="text-lg font-semibold">{new Date(selectedSession.started_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {readings.length > 0 ? (
            <div className="bg-card p-6 rounded-2xl border border-border">
              <h3 className="text-lg font-semibold mb-4">Sensor Readings</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 25%)" />
                  <XAxis
                    dataKey="timestamp_ms"
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}s`}
                    stroke="hsl(215, 20%, 65%)"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(217, 33%, 17%)", border: "1px solid hsl(217, 33%, 25%)", borderRadius: "8px" }}
                    labelFormatter={(v) => `${(Number(v) / 1000).toFixed(2)}s`}
                  />
                  <Line type="monotone" dataKey="flex1" stroke="hsl(217, 91%, 60%)" dot={false} name="Flex 1" strokeWidth={2} />
                  <Line type="monotone" dataKey="flex2" stroke="hsl(270, 70%, 60%)" dot={false} name="Flex 2" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center">No readings recorded for this session.</p>
          )}
        </div>
      ) : (
        <>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No sessions recorded yet. Start an analysis session first.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => viewSession(s)}
                  className="w-full bg-card p-4 rounded-xl border border-border hover:border-primary/50 transition text-left flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{s.patients?.name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(s.started_at).toLocaleDateString()} • {formatDuration(s.duration_seconds)}
                    </p>
                  </div>
                  <span className="text-primary text-sm">View →</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
