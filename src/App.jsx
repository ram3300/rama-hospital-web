import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Konfigurasi Supabase
const SUPABASE_URL = 'https://wmorrdsylilbjkusfqbh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb3JyZHN5bGlsYmprdXNmcWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2Njg2NjIsImV4cCI6MjA5NDI0NDY2Mn0.x3orsx70Ym6AaGtLFmmB2rVz8k_C9VpO5u-My8m0Z0k';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [nomor, setNomor] = useState("A-00");
  const [terlewatList, setTerlewatList] = useState([]); // State array untuk menampung list terlewat
  const [loading, setLoading] = useState(true);

  // Deteksi apakah ini halaman Admin atau halaman Monitor berdasarkan URL
  // Jika buka url biasa (localhost:5173 atau vercel) = Monitor
  // Jika buka url ditambah /admin (localhost:5173/#admin atau lewat parameter) = Admin
  const isAdmin = window.location.hash === '#admin' || window.location.pathname.includes('admin');

  useEffect(() => {
    // 1. Ambil data awal dari Supabase
    const fetchAntrean = async () => {
      try {
        const { data, error } = await supabase
          .from('antrean_rs')
          .select('nomor_sekarang, nomor_terlewat')
          .eq('id', 1)
          .single();

        if (data) {
          setNomor(data.nomor_sekarang || "A-00");
          // Pastikan data terlewat dibaca sebagai array jsonb
          setTerlewatList(Array.isArray(data.nomor_terlewat) ? data.nomor_terlewat : []);
        }
        if (error) throw error;
      } catch (err) {
        console.error("Gagal mengambil data:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAntrean();

    // 2. REALTIME: Pantau perubahan database secara langsung
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'antrean_rs', filter: 'id=eq.1' },
        (payload) => {
          if (payload.new.nomor_sekarang) setNomor(payload.new.nomor_sekarang);
          
          // Sinkronisasi realtime list nomor terlewat
          const listBaru = payload.new.nomor_terlewat;
          setTerlewatList(Array.isArray(listBaru) ? listBaru : []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- FUNGSI LOGIKA UNTUK SISI ADMIN ---
  
  // 1. Tombol PANGGIL BERIKUTNYA
  const handlePanggilBerikutnya = async () => {
    // Mengambil angka dari "A-01" -> 1, lalu ditambah 1 -> 2
    const angkaSekarang = parseInt(nomor.split('-')[1]) || 0;
    const angkaBaru = angkaSekarang + 1;
    const nomorBaru = `A-${String(angkaBaru).padStart(2, '0')}`;

    setNomor(nomorBaru);

    // Update ke Supabase
    await supabase
      .from('antrean_rs')
      .update({ nomor_sekarang: nomorBaru })
      .eq('id', 1);
  };

  // 2. Tombol LEWATI (Kunci Sinkronisasi Array)
  const handleLewati = async () => {
    // Jika nomor sekarang sudah ada di list terlewat, jangan dimasukkan lagi
    if (terlewatList.includes(nomor)) return;

    const listTerlewatTerbaru = [...terlewatList, nomor];
    setTerlewatList(listTerlewatTerbaru);

    // Kirim utuh array baru ke Supabase agar monitor langsung update
    const { error } = await supabase
      .from('antrean_rs')
      .update({ 
        nomor_terlewat: listTerlewatTerbaru 
      })
      .eq('id', 1);

    if (error) console.error("Gagal update nomor terlewat:", error.message);
  };

  // 3. Tombol RESET / BERSIHKAN ANTREAN
  const handleReset = async () => {
    setNomor("A-00");
    setTerlewatList([]);

    await supabase
      .from('antrean_rs')
      .update({ 
        nomor_sekarang: "A-00", 
        nomor_terlewat: [] 
      })
      .eq('id', 1);
  };


  // --- TAMPILAN SISI ADMIN ---
  if (isAdmin) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h2 style={styles.brand}>RAMA<span>HOSPITAL</span> (ADMIN)</h2>
        </header>
        <main style={{...styles.card, maxWidth: '400px'}}>
          <p style={styles.label}>NOMOR SEKARANG</p>
          <h1 style={styles.number}>{nomor}</h1>

          <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px'}}>
            <button onClick={handlePanggilBerikutnya} style={styles.btnNext}>PANGGIL BERIKUTNYA</button>
            <button onClick={handleLewati} style={styles.btnSkip}>LEWATI</button>
          </div>

          <button onClick={handleReset} style={styles.btnReset}>RESET ANTREAN</button>

          <div style={{...styles.terlewatBox, marginTop: '20px', textAlign: 'left'}}>
            <p style={styles.terlewatLabel}>PASIEN TERTUNDA (RE-CALL)</p>
            <div style={styles.badgeContainer}>
              {terlewatList.map((num, idx) => (
                <span key={idx} style={styles.badgeTerlewat}>{num}</span>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- TAMPILAN SISI WEB MONITOR LAYAR UTAMA (HP / PASIEN) ---
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.brand}>RAMA<span>HOSPITAL</span></h2>
        <p style={styles.tagline}>Smart Queue Monitor</p>
      </header>

      <main style={styles.card}>
        <p style={styles.label}>NOMOR SEKARANG</p>
        <h1 style={styles.number}>{loading ? "..." : nomor}</h1>
        
        {/* Box Nomor Terlewat Multi-Badge */}
        <div style={styles.terlewatBox}>
          <p style={styles.terlewatLabel}>TERLEWAT / RE-CALL</p>
          <div style={styles.badgeContainer}>
            {loading ? (
              <p style={styles.terlewatNumber}>...</p>
            ) : terlewatList.length > 0 ? (
              terlewatList.map((num, index) => (
                <span key={index} style={styles.badgeTerlewat}>{num}</span>
              ))
            ) : (
              <span style={{ color: '#f43f5e', fontSize: '14px', opacity: 0.7 }}>- Tidak ada -</span>
            )}
          </div>
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

// STYLING CSS
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
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
    padding: '15px',
    borderRadius: '15px',
    border: '1px dashed #f43f5e',
    marginBottom: '25px'
  },
  terlewatLabel: { fontSize: '12px', fontWeight: 'bold', color: '#f43f5e', margin: '0 0 10px 0', textAlign: 'center' },
  badgeContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '8px'
  },
  badgeTerlewat: {
    backgroundColor: '#f43f5e',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  statusBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  statusText: { fontSize: '12px', color: '#38bdf8', fontWeight: '500' },
  pulse: {
    width: '8px',
    height: '8px',
    backgroundColor: '#38bdf8',
    borderRadius: '50%',
    animation: 'pulse-animation 2s infinite'
  },
  footer: { marginTop: '40px', textAlign: 'center', opacity: 0.7, fontSize: '14px' },
  
  // Tombol Admin Buttons
  btnNext: { backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  btnSkip: { backgroundColor: '#eab308', color: '#0f172a', border: 'none', padding: '10px 15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  btnReset: { backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', marginTop: '10px' }
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