
/**
 * Generic API Wrapper - Cloud Ready
 * Menangani komunikasi dengan Supabase atau Backend lainnya secara aman.
 */

// GANTI dengan URL dan Anon Key dari Dashboard Supabase Anda (Opsional)
// Fix: Added explicit string type to prevent TypeScript from narrowing empty constants to the 'never' type
const BASE_URL: string = ''; 
const SUPABASE_ANON_KEY: string = ''; 

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  // 1. Validasi URL: Jangan lakukan fetch jika URL kosong atau tidak valid
  // Fix: Explicit string typing ensures startsWith is available even if the constant is initially empty
  if (!BASE_URL || !BASE_URL.startsWith('http')) {
    // Berjalan dalam mode lokal sepenuhnya jika API tidak dikonfigurasi
    return null;
  }

  // Supabase biasanya menggunakan prefix /rest/v1/ untuk tabel
  // Fix: Explicit string typing ensures replace is available even if the constant is initially empty
  const fullUrl = `${BASE_URL.replace(/\/$/, '')}/rest/v1${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Endpoint ${endpoint} tidak ditemukan. Menggunakan database lokal.`);
        return null;
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    // Tangkap error 'Failed to fetch' di sini agar tidak memunculkan alert merah di UI
    console.warn("Koneksi Cloud gagal atau diblokir. Aplikasi beralih ke MODE LOKAL.");
    return null; 
  }
};
