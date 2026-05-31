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
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-12">
          <FileSpreadsheet size={200} />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-emerald-100">
            <Database size={12} /> Google Sheets Database
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Koneksi Spreadsheet</h1>
          <p className="text-emerald-50/90 text-sm leading-relaxed font-medium">
            Jadikan Google Spreadsheet sebagai database utama atau pencadangan real-time Anda. Anda dapat mengimpor atau mengekspor seluruh data kegiatan, realisasi, belanja, dan data hibah langsung dari satu file spreadsheet terpusat.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Status Koneksi */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Status Akun & Spreadsheet */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Settings size={18} /> Status Integrasi
            </h2>

            {isInsideIframe && !googleAccessToken && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-950 leading-relaxed shadow-sm">
                <div className="flex gap-2 font-black items-center text-amber-800 uppercase tracking-wider text-[10px]">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" /> KHUSUS PREVIEW: Otorisasi Google Terblokir Iframe
                </div>
                <p>
                  Aplikasi saat ini berjalan di dalam <b>Iframe (AI Studio Preview)</b>. Demi alasan keamanan, sebagian besar browser memblokir login popup Google OAuth jika dijalankan di dalam Iframe.
                </p>
                <p className="font-bold">
                  Silakan buka aplikasi di tab mandiri agar proses otorisasi berjalan lancar:
                </p>
                <div className="pt-1">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-2 rounded-lg text-xs transition shadow-md shadow-amber-200"
                  >
                    Buka Aplikasi di Tab Baru <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Alert Status Sukses */}
            {sheetSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-950 leading-relaxed shadow-sm animate-fade-in">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 font-black items-center text-emerald-800 uppercase tracking-wider text-[10px]">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> OPERASI BERHASIL
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSheetSuccess(null)}
                    className="text-emerald-600 hover:text-emerald-800 font-extrabold text-[10px] uppercase cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
                <p className="font-medium whitespace-pre-wrap">{sheetSuccess}</p>
              </div>
            )}

            {/* Alert Status Error */}
            {sheetError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-950 leading-relaxed shadow-sm animate-fade-in">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 font-black items-center text-red-800 uppercase tracking-wider text-[10px]">
                    <AlertCircle size={16} className="text-red-650 shrink-0" /> OPERASI GAGAL / LOG INFO
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSheetError(null)}
                    className="text-red-600 hover:text-red-800 font-extrabold text-[10px] uppercase cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
                <p className="font-bold whitespace-pre-wrap">{sheetError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box Status Google */}
              <div className="p-4 rounded-xl border flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Akun Google Sheets</p>
                    <p className="text-sm font-bold mt-1 text-gray-800">
                      {googleAccessToken ? "Terhubung & Aktif" : "Belum Terhubung"}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${googleAccessToken ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                    {googleAccessToken ? <UserCheck size={20} /> : <AlertCircle size={20} />}
                  </div>
                </div>
                {!googleAccessToken ? (
                  <button
                    onClick={connectGoogleSheets}
                    className="w-full bg-emerald-600 text-white py-2 px-4 rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                  >
                    Otorisasi Google Sheets
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                    <CheckCircle2 size={14} /> Berhasil Terkoneksi
                  </div>
                )}
              </div>

              {/* Box status spreadsheet terhubung */}
              <div className="p-4 rounded-xl border flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Spreadsheet Aktif</p>
                    <p className="text-sm font-bold mt-1 text-gray-800 truncate max-w-[180px]" title={spreadsheetId || "Tiada Spreadsheet"}>
                      {spreadsheetId ? "FinRealize Cloud Database" : "Belum Terkoneksi"}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${spreadsheetId ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"}`}>
                    <FileSpreadsheet size={20} />
                  </div>
                </div>
                {spreadsheetId ? (
                  <a
                    href={spreadsheetUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-blue-50 border border-blue-200 text-blue-600 py-2 px-4 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1.5"
                  >
                    Buka Spreadsheet <ExternalLink size={12} />
                  </a>
                ) : (
                  <p className="text-xs text-gray-400 leading-tight">Buat spreadsheet baru atau hubungkan ID yang telah ada di bawah.</p>
                )}
              </div>
            </div>

            {/* Info Penjelasan */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50 flex gap-3 text-xs text-emerald-800 leading-relaxed font-medium">
              <Info className="shrink-0 text-emerald-600" size={18} />
              <div>
                <p className="font-bold mb-1">Pentingnya Otorisasi Google Sheets</p>
                Akses token Google Sheets disimpan dengan aman di memori browser dan akan otomatis terhapus saat Anda keluar (logout) atau memuat ulang halaman. Jika koneksi terputus, cukup klik tombol <b>Otorisasi Google Sheets</b> kembali untuk mengaktifkan sinkronisasi otomatis.
              </div>
            </div>
          </div>

          {/* Card 2: Pengaturan Spreadsheet */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Atur Spreadsheet</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Buat Baru */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900">Buat File Baru di Google Drive</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Gunakan tombol di bawah untuk membuat file spreadsheet baru bernama <b>"FinRealize Cloud Database"</b> secara otomatis lengkap dengan seluruh tab/sheet yang diperlukan.
                </p>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleCreateNewSpreadsheet}
                  className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl text-xs hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-emerald-100"
                >
                  {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Buat Spreadsheet Baru
                </button>
              </div>

              {/* Hubungkan Lama */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900">Gunakan Spreadsheet yang Ada</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Masukkan ID Spreadsheet Google Sheets Anda yang sudah ada untuk dikoneksikan ke dalam sistem ini.
                </p>
                <form onSubmit={handleLinkExisting} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1aBcDeFgHiJkLmNoP..."
                    value={existingId}
                    onChange={(e) => setExistingId(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSyncing || !existingId.trim()}
                    className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-blue-700 transition disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <RefreshCw size={18} /> Sinkronisasi
            </h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-800">Tarik Data (Pull)</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Ambil data dari Google Spreadsheet Anda untuk menimpa database lokal dan Firestore terpusat Anda.
                </p>
                <button
                  onClick={handlePullFromSpreadsheet}
                  disabled={isSyncing || !spreadsheetId}
                  className="w-full bg-amber-500 text-white font-bold py-3.5 px-4 rounded-2xl text-xs hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-100"
                >
                  <Download size={16} /> Tarik Data Dari Spreadsheet
                </button>
              </div>

              <hr className="border-gray-100" />

              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-800">Kirim Data (Push)</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Kirim data lokal/Firestore Anda saat ini untuk menimpa data yang ada di file Google Spreadsheet.
                </p>
                <button
                  onClick={handlePushToSpreadsheet}
                  disabled={isSyncing || !spreadsheetId}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-2xl text-xs hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  <Upload size={16} /> Kirim Data Ke Spreadsheet
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Otomasi */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Otomasi</h2>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="text-xs font-bold text-gray-800">Simpan Otomatis (Auto-Sync)</p>
                <p className="text-[10px] text-gray-400 font-medium">Simpan live perubahan ke Spreadsheet</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoSync}
                  onChange={(e) => handleToggleAutoSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-250 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Card 5: Statistik Data Lokal */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Statistik Data Utama</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-indigo-50/50 rounded-xl text-center">
                <span className="block font-black text-indigo-600 text-lg">{masterCount}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Data Master</span>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-xl text-center">
                <span className="block font-black text-emerald-600 text-lg">{realizationCount}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Realisasi</span>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl text-center">
                <span className="block font-black text-blue-600 text-lg">{spendingCount}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Data Belanja</span>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-xl text-center">
                <span className="block font-black text-amber-600 text-lg">{hibahCount}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Dana Hibah</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetSettings;
