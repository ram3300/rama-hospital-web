import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Konfigurasi Supabase
const SUPABASE_URL = 'https://wmorrdsylilbjkusfqbh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb3JyZHN5bGlsYmprdXNmcWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2Njg2NjIsImV4cCI6MjA5NDI0NDY2Mn0.x3orsx70Ym6AaGtLFmmB2rVz8k_C9VpO5u-My8m0Z0k';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [nomor, setNomor] = useState("A-00");
  const [terlewat, setTerlewat] = useState("-"); // State baru untuk nomor terlewat
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Ambil data awal (termasuk kolom nomor_terlewat)
    const fetchAntrean = async () => {
  try {
    let { data, error } = await supabase
      .from('antrean_rs')
      .select('*') 
      .eq('id', 1)
      .single();
    
    if (data) {
      console.log("Data utuh dari Supabase:", data); // Cek di console log f12
      setNomor(data.nomor_sekarang); 
      // Paksa ambil nama kolom sesuai di image_85711a.png
      setTerlewat(data["nomor_terlewat"] || "-"); 
    }
    if (error) {
      console.error("Error fetching detail:", error);
    }
  } finally {
    setLoading(false);
  }
};

    fetchAntrean();

    // 2. REALTIME: Pantau perubahan pada kolom nomor_sekarang dan nomor_terlewat
  const channel = supabase
  .channel('realtime-hp')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'antrean_rs', filter: 'id=eq.1' }, 
    (payload) => {
      console.log("Payload diterima:", payload.new);
      setNomor(payload.new.nomor_sekarang);
      // Menggunakan cara akses array untuk memastikan kolom terbaca
      setTerlewat(payload.new["nomor_terlewat"] || "-"); 
    }
  )
  .subscribe();

    return () => supabase.removeChannel(channel);
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
        
        {/* Tampilan Nomor Terlewat */}
        <div style={styles.terlewatBox}>
          <p style={styles.terlewatLabel}>TERLEWAT</p>
          <p style={styles.terlewatNumber}>{loading ? "..." : terlewat}</p>
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
  
  // Gaya untuk Box Nomor Terlewat
  terlewatBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)', // Merah transparan
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