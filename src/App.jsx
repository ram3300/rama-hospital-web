import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Konfigurasi Supabase
const SUPABASE_URL = 'https://wmorrdsylilbjkusfqbh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb3JyZHN5bGlsYmprdXNmcWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2Njg2NjIsImV4cCI6MjA5NDI0NDY2Mn0.x3orsx70Ym6AaGtLFmmB2rVz8k_C9VpO5u-My8m0Z0k';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [nomor, setNomor] = useState("A-00");
  const [terlewat, setTerlewat] = useState("-");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fungsi ambil data awal
    const fetchAntrean = async () => {
      try {
        const { data, error } = await supabase
          .from('antrean_rs')
          .select('nomor_sekarang, nomor_terlewat')
          .eq('id', 1)
          .single();

        if (data) {
          console.log("Data awal berhasil ditarik:", data);
          setNomor(data.nomor_sekarang || "A-00");
          // Gunakan fallback "-" jika datanya NULL
          setTerlewat(data.nomor_terlewat || "-");
        }
        if (error) throw error;
      } catch (err) {
        console.error("Gagal mengambil data:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAntrean();

    // 2. Setup Realtime Channel
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'antrean_rs',
          filter: 'id=eq.1',
        },
        (payload) => {
          console.log("Update Terdeteksi:", payload.new);
          // Pastikan state diupdate sesuai kolom baru
          if (payload.new.nomor_sekarang) setNomor(payload.new.nomor_sekarang);
          
          // Logika khusus untuk nomor_terlewat
          const valTerlewat = payload.new.nomor_terlewat;
          setTerlewat(valTerlewat && valTerlewat !== "" ? valTerlewat : "-");
        }
      )
      .subscribe((status) => {
        console.log("Status Realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.brand}>RAMA<span>HOSPITAL</span></h2>
        <p style={styles.tagline}>Smart Queue Monitor</p>
      </header>

      <main style={styles.card}>
        <p style={styles.label}>NOMOR SEKARANG</p>
        <h1 style={styles.number}>{loading ? "..." : nomor}</h1>
        
        {/* Box Nomor Terlewat */}
        <div style={styles.terlewatBox}>
          <p style={styles.terlewatLabel}>TERLEWAT</p>
          <p style={styles.terlewatNumber}>
            {loading ? "..." : terlewat}
          </p>
        </div>

        <div style={styles.statusBox}>
          <div style={styles.pulse}></div>
          <span style={styles.statusText}>Live Update Aktif</span>
        </div>
      </main>

      <footer style={styles.footer}>
        <p>Silakan menunggu di area nyaman Anda.</p>
        <p style={{fontSize: '10px', marginTop: '10px', opacity: 0.5}}>© 2026 Rama System</p>
      </footer>
    </div>
  );
}

// Styles tetap sama seperti sebelumnya karena sudah bagus
const styles = {
  container: {
    backgroundColor: '#0f172a',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontFamily: 'system-ui, sans-serif',
    padding: '20px'
  },
  header: { textAlign: 'center', marginBottom: '40px' },
  brand: { fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px', margin: 0 },
  tagline: { fontSize: '12px', opacity: 0.6, marginTop: '5px' },
  card: {
    backgroundColor: '#1e293b',
    width: '100%',
    maxWidth: '320px',
    padding: '40px 20px',
    borderRadius: '30px',
    border: '1px solid #334155',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  },
  label: { fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '5px' },
  number: { fontSize: '80px', fontWeight: '900', margin: '0 0 10px 0', color: '#38bdf8' },
  terlewatBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    padding: '15px',
    borderRadius: '15px',
    border: '1px dashed #f43f5e',
    marginBottom: '25px'
  },
  terlewatLabel: { fontSize: '12px', fontWeight: 'bold', color: '#f43f5e', margin: '0 0 5px 0' },
  terlewatNumber: { fontSize: '24px', fontWeight: '800', color: '#f43f5e', margin: 0 },
  statusBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  statusText: { fontSize: '12px', color: '#38bdf8', fontWeight: '500' },
  pulse: {
    width: '8px',
    height: '8px',
    backgroundColor: '#38bdf8',
    borderRadius: '50%',
    animation: 'pulse-animation 2s infinite'
  },
  footer: { marginTop: '40px', textAlign: 'center', opacity: 0.7, fontSize: '14px' }
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes pulse-animation {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(56, 189, 248, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
    }
    h2 span { color: #38bdf8; }
  `;
  document.head.appendChild(styleSheet);
}

export default App;