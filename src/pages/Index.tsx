import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import bgImage from "@/assets/bg.png";
import { ProfilePage, type Patient } from "./ProfilePage";
import { AnalysisPage } from "./AnalysisPage";
import { ArchivePage } from "./ArchivePage";
import { connectBLE, disconnectBLE, type BLEData } from "@/lib/ble";

const Index = () => {
  const [page, setPage] = useState("profile");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = useCallback(async () => {
    if (isConnected) {
      disconnectBLE();
      setIsConnected(false);
      return;
    }
    try {
      await connectBLE(
        (data: BLEData) => {
          const handler = (window as any).__analysisHandleData;
          if (handler) handler(data);
        },
        () => setIsConnected(false)
      );
      setIsConnected(true);
    } catch (e) {
      console.error("BLE connection failed:", e);
    }
  }, [isConnected]);

  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="fixed inset-0 z-0 bg-background/85 backdrop-blur-sm" />
      <div className="relative z-10">
        <Navbar
          activePage={page}
          onNavigate={setPage}
          isConnected={isConnected}
          onConnect={handleConnect}
        />
        <main className="max-w-6xl mx-auto p-6">
        {page === "profile" && (
          <ProfilePage
            selectedPatient={patient}
            onSelectPatient={setPatient}
            onNavigate={setPage}
          />
        )}
        {page === "analysis" && (
          <AnalysisPage patient={patient} isConnected={isConnected} />
        )}
        {page === "archive" && <ArchivePage />}
      </main>
    </div>
  );
};

export default Index;
