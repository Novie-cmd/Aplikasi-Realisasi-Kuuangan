import React, { useState } from "react";
import { 
  Database, 
  FileSpreadsheet, 
  UserCheck, 
  RefreshCw, 
  Download, 
  Upload, 
  ExternalLink, 
  Plus, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Link,
  Loader2
} from "lucide-react";

interface Props {
  googleAccessToken: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  isAutoSync: boolean;
  isSyncing: boolean;
  sheetError: string | null;
  sheetSuccess: string | null;
  setSheetError: (err: string | null) => void;
  setSheetSuccess: (s: string | null) => void;
  connectGoogleSheets: () => Promise<string | null>;
  handleCreateNewSpreadsheet: () => Promise<void>;
  handleConnectExistingSpreadsheet: (id: string) => Promise<void>;
  handlePullFromSpreadsheet: () => Promise<void>;
  handlePushToSpreadsheet: () => Promise<void>;
  handleToggleAutoSync: (checked: boolean) => Promise<void>;
  masterCount: number;
  realizationCount: number;
  spendingCount: number;
  hibahCount: number;
}

const SpreadsheetSettings: React.FC<Props> = ({
  googleAccessToken,
  spreadsheetId,
  spreadsheetUrl,
  isAutoSync,
  isSyncing,
  sheetError,
  sheetSuccess,
  setSheetError,
  setSheetSuccess,
  connectGoogleSheets,
  handleCreateNewSpreadsheet,
  handleConnectExistingSpreadsheet,
  handlePullFromSpreadsheet,
  handlePushToSpreadsheet,
  handleToggleAutoSync,
  masterCount,
  realizationCount,
  spendingCount,
  hibahCount
}) => {
  const [existingId, setExistingId] = useState("");
  const isInsideIframe = typeof window !== "undefined" && window.self !== window.top;

  const handleLinkExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingId.trim()) return;
    handleConnectExistingSpreadsheet(existingId.trim());
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#064e3b] to-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden border border-emerald-900/50">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-12 text-emerald-400">
          <FileSpreadsheet size={200} />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-900/60 border border-emerald-700/50 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-emerald-200">
            <Database size={12} /> Google Sheets Database
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">Koneksi Spreadsheet</h1>
          <p className="text-slate-200 text-sm leading-relaxed font-medium">
            Jadikan Google Spreadsheet sebagai database utama atau pencadangan real-time Anda. Anda dapat mengimpor atau mengekspor seluruh data master DPA/APBD dan data realisasi SP2D langsung dari satu file spreadsheet terpusat.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Status Koneksi */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Status Akun & Spreadsheet */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Settings size={18} /> Status Integrasi
            </h2>

            {isInsideIframe && !googleAccessToken && (
              <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2 text-xs text-amber-200 leading-relaxed shadow-sm">
                <div className="flex gap-2 font-black items-center text-amber-400 uppercase tracking-wider text-[10px]">
                  <AlertCircle size={16} className="text-amber-400 shrink-0" /> KHUSUS PREVIEW: Otorisasi Google Terblokir Iframe
                </div>
                <p>
                  Aplikasi saat ini berjalan di dalam <b>Iframe (AI Studio Preview)</b>. Demi alasan keamanan, sebagian besar browser memblokir login popup Google OAuth jika dijalankan di dalam Iframe.
                </p>
                <p className="font-bold text-amber-100">
                  Silakan buka aplikasi di tab mandiri agar proses otorisasi berjalan lancar:
                </p>
                <div className="pt-1">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 text-white font-extrabold px-3.5 py-2 rounded-lg text-xs transition shadow-md"
                  >
                    Buka Aplikasi di Tab Baru <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Alert Status Sukses */}
            {sheetSuccess && (
              <div className="p-4 bg-[#064e3b]/50 border border-emerald-700/60 rounded-xl space-y-1 text-xs text-emerald-200 leading-relaxed shadow-sm animate-fade-in">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 font-black items-center text-emerald-300 uppercase tracking-wider text-[10px]">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> OPERASI BERHASIL
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSheetSuccess(null)}
                    className="text-emerald-300 hover:text-white font-extrabold text-[10px] uppercase cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
                <p className="font-medium whitespace-pre-wrap text-emerald-100">{sheetSuccess}</p>
              </div>
            )}

            {/* Alert Status Error */}
            {sheetError && (
              <div className="p-4 bg-[#4c0519]/60 border border-[#881337]/70 rounded-xl space-y-1 text-xs text-rose-200 leading-relaxed shadow-sm animate-fade-in">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 font-black items-center text-rose-300 uppercase tracking-wider text-[10px]">
                    <AlertCircle size={16} className="text-rose-400 shrink-0" /> OPERASI GAGAL / LOG INFO
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSheetError(null)}
                    className="text-rose-300 hover:text-white font-extrabold text-[10px] uppercase cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
                <p className="font-bold whitespace-pre-wrap text-rose-100">{sheetError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box Status Google */}
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/60 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Akun Google Sheets</p>
                    <p className="text-sm font-bold mt-1 text-white">
                      {googleAccessToken ? "Terhubung & Aktif" : "Belum Terhubung"}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${googleAccessToken ? "bg-[#064e3b] text-emerald-300 border border-emerald-700" : "bg-[#4c0519] text-rose-300 border border-rose-900"}`}>
                    {googleAccessToken ? <UserCheck size={20} /> : <AlertCircle size={20} />}
                  </div>
                </div>
                {!googleAccessToken ? (
                  <button
                    onClick={connectGoogleSheets}
                    className="w-full bg-[#064e3b] hover:bg-[#047857] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition border border-emerald-600/40"
                  >
                    Otorisasi Google Sheets
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <CheckCircle2 size={14} /> Berhasil Terkoneksi
                  </div>
                )}
              </div>

              {/* Box status spreadsheet terhubung */}
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/60 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Spreadsheet Aktif</p>
                    <p className="text-sm font-bold mt-1 text-white truncate max-w-[180px]" title={spreadsheetId || "Tiada Spreadsheet"}>
                      {spreadsheetId ? "FinRealize Cloud Database" : "Belum Terkoneksi"}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${spreadsheetId ? "bg-[#064e3b] text-emerald-300 border border-emerald-700" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>
                    <FileSpreadsheet size={20} />
                  </div>
                </div>
                {spreadsheetId ? (
                  <a
                    href={spreadsheetUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-slate-800 border border-slate-600 text-emerald-300 py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    Buka Spreadsheet <ExternalLink size={12} />
                  </a>
                ) : (
                  <p className="text-xs text-slate-400 leading-tight">Buat spreadsheet baru atau hubungkan ID yang telah ada di bawah.</p>
                )}
              </div>
            </div>

            {/* Info Penjelasan */}
            <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-700 flex gap-3 text-xs text-slate-300 leading-relaxed font-medium">
              <Info className="shrink-0 text-emerald-400" size={18} />
              <div>
                <p className="font-bold mb-1 text-white">Pentingnya Otorisasi Google Sheets</p>
                Akses token Google Sheets disimpan dengan aman di memori browser dan akan otomatis terhapus saat Anda keluar (logout) atau memuat ulang halaman. Jika koneksi terputus, cukup klik tombol <b className="text-emerald-300">Otorisasi Google Sheets</b> kembali untuk mengaktifkan sinkronisasi otomatis.
              </div>
            </div>
          </div>

          {/* Card 2: Pengaturan Spreadsheet */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Atur Spreadsheet</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Buat Baru */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white">Buat File Baru di Google Drive</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gunakan tombol di bawah untuk membuat file spreadsheet baru bernama <b className="text-slate-200">"FinRealize Cloud Database"</b> secara otomatis lengkap dengan seluruh tab/sheet yang diperlukan.
                </p>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleCreateNewSpreadsheet}
                  className="w-full bg-[#064e3b] hover:bg-[#047857] text-white font-bold py-3 px-4 rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 border border-emerald-600/40"
                >
                  {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Buat Spreadsheet Baru
                </button>
              </div>

              {/* Hubungkan Lama */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white">Gunakan Spreadsheet yang Ada</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Masukkan ID Spreadsheet Google Sheets Anda yang sudah ada untuk dikoneksikan ke dalam sistem ini.
                </p>
                <form onSubmit={handleLinkExisting} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1aBcDeFgHiJkLmNoP..."
                    value={existingId}
                    onChange={(e) => setExistingId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isSyncing || !existingId.trim()}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0 border border-slate-600"
                  >
                    Hubungkan
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Sinkronisasi & Statistik */}
        <div className="space-y-6">
          {/* Card 3: Sinkronisasi Manual */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <RefreshCw size={18} /> Sinkronisasi
            </h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white">Tarik Data (Pull)</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Ambil data dari Google Spreadsheet Anda untuk menimpa penyimpanan lokal aplikasi Anda.
                </p>
                <button
                  onClick={handlePullFromSpreadsheet}
                  disabled={isSyncing || !spreadsheetId}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 border border-slate-600"
                >
                  <Download size={16} /> Tarik Data Dari Spreadsheet
                </button>
              </div>

              <hr className="border-slate-700" />

              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white">Kirim Data (Push)</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Kirim data penyimpanan lokal aplikasi Anda saat ini untuk menimpa data yang ada di file Google Spreadsheet.
                </p>
                <button
                  onClick={handlePushToSpreadsheet}
                  disabled={isSyncing || !spreadsheetId}
                  className="w-full bg-[#064e3b] hover:bg-[#047857] text-white font-bold py-3 px-4 rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 border border-emerald-600/40"
                >
                  <Upload size={16} /> Kirim Data Ke Spreadsheet
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Otomasi */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Otomasi</h2>
            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700">
              <div>
                <p className="text-xs font-bold text-white">Simpan Otomatis (Auto-Sync)</p>
                <p className="text-[10px] text-slate-400 font-medium">Simpan live perubahan ke Spreadsheet</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoSync}
                  onChange={(e) => handleToggleAutoSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-400 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#064e3b]"></div>
              </label>
            </div>
          </div>

          {/* Card 5: Statistik Data Lokal */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Statistik Data Utama</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-4 bg-slate-900/60 rounded-xl text-center border border-slate-700">
                <span className="block font-black text-white text-2xl">{masterCount}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Data Master APBD</span>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-xl text-center border border-slate-700">
                <span className="block font-black text-emerald-400 text-2xl">{realizationCount}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Data Realisasi SP2D</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetSettings;
