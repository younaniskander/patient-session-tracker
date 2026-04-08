import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Patient {
  id: string;
  name: string;
  weight: number | null;
}

interface ProfilePageProps {
  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onNavigate: (page: string) => void;
}

export function ProfilePage({ selectedPatient, onSelectPatient, onNavigate }: ProfilePageProps) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    if (data) setPatients(data as Patient[]);
  }

  async function savePatient() {
    if (!name.trim()) return;
    const { data, error } = await supabase
      .from("patients")
      .insert({ name: name.trim(), weight: weight ? parseFloat(weight) : null })
      .select()
      .single();
    if (!error && data) {
      onSelectPatient(data as Patient);
      setName("");
      setWeight("");
      loadPatients();
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Patient Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border">
          <h3 className="text-lg font-semibold mb-4 text-primary">Add New Patient</h3>
          <div className="space-y-4">
            <Input
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Weight (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <Button onClick={savePatient} className="w-full">Save Patient</Button>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col justify-center items-center text-center">
          <p className="text-muted-foreground uppercase text-xs tracking-widest mb-2">Currently Selected</p>
          <h2 className="text-3xl font-bold">{selectedPatient?.name || "No Patient Selected"}</h2>
          <p className="text-primary mt-1">{selectedPatient?.weight ? `${selectedPatient.weight} kg` : "-- kg"}</p>
          <button onClick={() => onNavigate("analysis")} className="mt-6 text-sm text-primary underline hover:text-primary/80">
            Proceed to Analysis →
          </button>
        </div>
      </div>

      {patients.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Existing Patients</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectPatient(p)}
                className={`bg-card p-4 rounded-xl border text-left transition-all ${
                  selectedPatient?.id === p.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.weight ? `${p.weight} kg` : "No weight"}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
