'use client';

import { useEffect, useState } from 'react';

export default function CreatorDashboard() {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch clips from API
    // Por ahora, simulamos datos
    setTimeout(() => {
      setClips([]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-[var(--primary)]">Dashboard del Creador</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-white/50">Cargando tus videos...</p>
        ) : clips.length === 0 ? (
          <div className="col-span-full text-center py-12 border border-dashed border-white/20 rounded-xl">
            <p className="text-white/50 mb-4">Aún no has subido videos</p>
            <a href="/capture" className="inline-block px-6 py-3 bg-[var(--primary)] text-[var(--page-bg)] rounded-full font-semibold hover:opacity-90">
               Capturar primer video
            </a>
          </div>
        ) : (
          clips.map((clip: any) => (
            <div key={clip.id} className="border border-white/10 rounded-xl p-4 bg-[var(--surface)]">
              <p className="font-semibold">Video #{clip.id.slice(-8)}</p>
              <p className="text-sm text-white/50">Estado: {clip.status}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
