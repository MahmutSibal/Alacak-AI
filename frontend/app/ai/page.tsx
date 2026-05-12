"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Chat from "@/components/Chat";

export default function AIPage() {
  return (
    <div className="flex min-h-screen bg-bg grid-bg">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="AI Analiz" subtitle="Veri odaklı tahsilat ve nakit akışı asistanı" />
        <main className="p-6">
          <Chat />
        </main>
      </div>
    </div>
  );
}
