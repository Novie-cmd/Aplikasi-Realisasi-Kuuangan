
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { LayoutDashboard, Database, CreditCard, Menu, X, FileText, CircleDollarSign, Loader2, CloudSync, LogOut, Lock, User, AlertTriangle, Gift, FileSpreadsheet } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MasterDataPage from './pages/MasterData';
import ExpenditureDataPage from './pages/ExpenditureData';
import ReportsPage from './pages/Reports';
import RealizationDataPage from './pages/RealizationData';
import HibahDataPage from './pages/HibahData';
import SpreadsheetSettings from './pages/SpreadsheetSettings';
import { MasterData, ExpenditureData, Page, RealizationData, HibahData } from './types';
import { DataService } from './services/dataService';
import { SheetsService } from './services/sheetsService';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Terjadi kesalahan yang tidak terduga.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.operationType) {
          errorMessage = `Kesalahan Firestore (${parsed.operationType}): ${parsed.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
            <div className="inline-flex p-4 bg-red-100 text-red-600 rounded-full">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Oops! Terjadi Kesalahan</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [masterData, setMasterData] = useState<MasterData[]>([]);
  const [spendingData, setSpendingData] = useState<ExpenditureData[]>([]);
  const [realizationData, setRealizationData] = useState<RealizationData[]>([]);
  const [hibahData, setHibahData] = useState<HibahData[]>([]);

  // Google Sheets integration states
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [isAutoSync, setIsAutoSync] = useState(true);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoggedIn(!!firebaseUser);
      setIsAuthReady(true);
      if (!firebaseUser) {
        setIsLoading(false);
        setMasterData([]);
        setRealizationData([]);
        setSpendingData([]);
        setHibahData([]);
        setSpreadsheetId(null);
        setSpreadsheetUrl(null);
        setGoogleAccessToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Google login handler with scopes
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (err) {
      console.error("Gagal login", err);
      alert("Gagal login dengan Google. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setGoogleAccessToken(null);
    } catch (err) {
      console.error("Gagal logout", err);
    }
  };

  // Google Sheets integration handlers
  const connectGoogleSheets = async (): Promise<string | null> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        alert("Google Sheets berhasil terhubung!");
        return credential.accessToken;
      } else {
        throw new Error("Gagal mengambil token Google Sheets.");
      }
    } catch (err) {
      console.error("Gagal menghubungkan Google Sheets", err);
      alert("Gagal menghubungkan Google Sheets. Pastikan Anda masuk dan menyetujui akses.");
      return null;
    }
  };

  const handleCreateNewSpreadsheet = async () => {
    let token = googleAccessToken;
    if (!token) {
      token = await connectGoogleSheets();
      if (!token) return;
    }

    setIsSyncing(true);
    try {
      const result = await SheetsService.createSpreadsheet(token);
      setSpreadsheetId(result.id);
      setSpreadsheetUrl(result.url);
      
      await DataService.saveSettings("google_sheets", {
        spreadsheetId: result.id,
        spreadsheetUrl: result.url,
        isAutoSync: isAutoSync
      });

      alert(`Spreadsheet baru berhasil dibuat dan dikoneksikan!\nURL: ${result.url}`);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat spreadsheet baru.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectExistingSpreadsheet = async (id: string) => {
    if (!id.trim()) {
      alert("Masukkan ID Spreadsheet yang valid.");
      return;
    }
    let token = googleAccessToken;
    if (!token) {
      token = await connectGoogleSheets();
      if (!token) return;
    }

    setIsSyncing(true);
    try {
      const isValid = await SheetsService.checkSpreadsheet(token, id);
      if (!isValid) {
        alert("ID Spreadsheet tidak valid atau tidak memiliki akses. Pastikan ID benar.");
        return;
      }

      const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
      setSpreadsheetId(id);
      setSpreadsheetUrl(url);

      await DataService.saveSettings("google_sheets", {
        spreadsheetId: id,
        spreadsheetUrl: url,
        isAutoSync: isAutoSync
      });

      alert("ID Spreadsheet berhasil dikoneksikan!");
    } catch (err) {
      console.error(err);
      alert("Gagal mengoneksikan Spreadsheet.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSpreadsheet = async () => {
    if (!spreadsheetId) {
      alert("Silakan hubungkan spreadsheet terlebih dahulu.");
      return;
    }
    let token = googleAccessToken;
    if (!token) {
      token = await connectGoogleSheets();
      if (!token) return;
    }

    const confirmed = window.confirm("Apakah Anda yakin ingin menarik data? Tindakan ini akan menimpa seluruh data lokal & Firestore Anda dengan data dari Spreadsheet.");
    if (!confirmed) return;

    setIsSyncing(true);
    try {
      const result = await SheetsService.pullData(token, spreadsheetId);
      
      setMasterData(result.masterData);
      setRealizationData(result.realizationData);
      setSpendingData(result.spendingData);
      setHibahData(result.hibahData);

      // Save sync results and rewrite Firestore collections
      await Promise.all([
        DataService.syncMasterData(result.masterData),
        DataService.syncRealizationData(result.realizationData),
        DataService.saveSpendingData(result.spendingData),
        DataService.syncHibahData(result.hibahData)
      ]);

      alert("Data berhasil ditarik dari Google Spreadsheet ke Cloud Firestore!");
    } catch (err) {
      console.error(err);
      alert("Gagal menarik data dari spreadsheet.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToSpreadsheet = async () => {
    if (!spreadsheetId) {
      alert("Silakan hubungkan spreadsheet terlebih dahulu.");
      return;
    }
    let token = googleAccessToken;
    if (!token) {
      token = await connectGoogleSheets();
      if (!token) return;
    }

    const confirmed = window.confirm("Apakah Anda yakin ingin mengirim data? Tindakan ini akan menimpa data yang saat ini ada di Google Spreadsheet.");
    if (!confirmed) return;

    setIsSyncing(true);
    try {
      await SheetsService.pushData(token, spreadsheetId, masterData, realizationData, spendingData, hibahData);
      alert("Data berhasil diekspor ke Google Spreadsheet!");
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim data ke spreadsheet.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = async (checked: boolean) => {
    setIsAutoSync(checked);
    if (spreadsheetId) {
      await DataService.saveSettings("google_sheets", {
        isAutoSync: checked
      });
    }
  };

  const triggerAutoPush = async (
    latestMaster = masterData,
    latestRealization = realizationData,
    latestSpending = spendingData,
    latestHibah = hibahData
  ) => {
    if (googleAccessToken && spreadsheetId && isAutoSync) {
      try {
        await SheetsService.pushData(
          googleAccessToken,
          spreadsheetId,
          latestMaster,
          latestRealization,
          latestSpending,
          latestHibah
        );
        console.log("Auto-sync spreadsheet berhasil.");
      } catch (err) {
        console.warn("Auto-sync gagal:", err);
      }
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !isAuthReady) {
      return;
    }

    const initFetch = async () => {
      setIsLoading(true);
      try {
        await DataService.testConnection();
        const [m, r, s, h, settings] = await Promise.all([
          DataService.getMasterData(),
          DataService.getRealizationData(),
          DataService.getSpendingData(),
          DataService.getHibahData(),
          DataService.getSettings("google_sheets")
        ]);
        setMasterData(m);
        setRealizationData(r);
        setSpendingData(s);
        setHibahData(h);
        
        if (settings) {
          setSpreadsheetId(settings.spreadsheetId || null);
          setSpreadsheetUrl(settings.spreadsheetUrl || null);
          setIsAutoSync(settings.isAutoSync ?? true);
        }
      } catch (err) {
        console.error("Gagal memuat data", err);
      } finally {
        setIsLoading(false);
      }
    };
    initFetch();
  }, [isLoggedIn, isAuthReady]);

  const updateMasterData = async (newData: MasterData[]) => {
    setIsSyncing(true);
    setMasterData(newData);
    try {
      await DataService.saveMasterData(newData);
      // Re-fetch to ensure local state matches server exactly
      const freshData = await DataService.getMasterData();
      setMasterData(freshData);
      await triggerAutoPush(freshData, realizationData, spendingData, hibahData);
    } catch (err) {
      console.error("Gagal sinkronisasi data master", err);
      alert("Gagal menyimpan data master ke server. Silakan periksa koneksi internet Anda.");
    } finally {
      setIsSyncing(false);
    }
  };

  const replaceMasterData = async (newData: MasterData[]) => {
    setIsSyncing(true);
    setMasterData(newData);
    try {
      await DataService.syncMasterData(newData);
      const freshData = await DataService.getMasterData();
      setMasterData(freshData);
      await triggerAutoPush(freshData, realizationData, spendingData, hibahData);
    } catch (err) {
      console.error("Gagal sinkronisasi data master (replace)", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteMasterData = async (id: string) => {
    setIsSyncing(true);
    const updated = masterData.filter(item => item.id !== id);
    setMasterData(updated);
    try {
      await DataService.deleteMasterData(id);
      await triggerAutoPush(updated, realizationData, spendingData, hibahData);
    } catch (err) {
      console.error("Gagal menghapus data master", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearMasterData = async () => {
    setIsSyncing(true);
    const backup = [...masterData];
    setMasterData([]);
    try {
      await DataService.clearMasterData();
      await triggerAutoPush([], realizationData, spendingData, hibahData);
      alert("Semua data master berhasil dihapus dari server.");
    } catch (err) {
      console.error("Gagal menghapus semua data master", err);
      setMasterData(backup);
      alert("Gagal menghapus data master dari server. Silakan periksa koneksi internet Anda.");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateRealizationData = async (newData: RealizationData[]) => {
    setIsSyncing(true);
    setRealizationData(newData);
    try {
      await DataService.saveRealizationData(newData);
      const freshData = await DataService.getRealizationData();
      setRealizationData(freshData);
      await triggerAutoPush(masterData, freshData, spendingData, hibahData);
    } catch (err) {
      console.error("Gagal sinkronisasi data realisasi", err);
      alert("Gagal menyimpan data realisasi ke server. Silakan periksa koneksi internet Anda.");
    } finally {
      setIsSyncing(false);
    }
  };

  const replaceRealizationData = async (newData: RealizationData[]) => {
    setIsSyncing(true);
    setRealizationData(newData);
    try {
      await DataService.syncRealizationData(newData);
      const freshData = await DataService.getRealizationData();
      setRealizationData(freshData);
      await triggerAutoPush(masterData, freshData, spendingData, hibahData);
    } catch (err) {
      console.error("Gagal sinkronisasi data realisasi (replace)", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteRealizationData = async (id: string) => {
    setIsSyncing(true);
    const updated = realizationData.filter(item => item.id !== id);
    setRealizationData(updated);
    try {
      await DataService.deleteRealizationData(id);
      await triggerAutoPush(masterData, updated, spendingData, hibahData);
    } catch (err) {
      console.error("Gagal menghapus data realisasi", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearRealizationData = async () => {
    setIsSyncing(true);
    const backup = [...realizationData];
    setRealizationData([]);
    try {
      await DataService.clearRealizationData();
      await triggerAutoPush(masterData, [], spendingData, hibahData);
      alert("Semua data realisasi berhasil dihapus dari server.");
    } catch (err) {
      console.error("Gagal menghapus semua data realisasi", err);
      setRealizationData(backup);
      alert("Gagal menghapus data realisasi dari server. Silakan periksa koneksi internet Anda.");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateSpendingData = async (newData: ExpenditureData[]) => {
    setIsSyncing(true);
    setSpendingData(newData);
    try {
      await DataService.saveSpendingData(newData);
      await triggerAutoPush(masterData, realizationData, newData, hibahData);
    } catch (err) {
      console.error("Gagal sinkronisasi data belanja", err);
      alert("Gagal menyimpan data belanja ke server.");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateHibahData = async (newData: HibahData[]) => {
    setIsSyncing(true);
    setHibahData(newData);
    try {
      await DataService.saveHibahData(newData);
      const freshData = await DataService.getHibahData();
      setHibahData(freshData);
      await triggerAutoPush(masterData, realizationData, spendingData, freshData);
    } catch (err) {
      console.error("Gagal sinkronisasi data hibah", err);
      alert("Gagal menyimpan data hibah ke server. Silakan periksa koneksi internet Anda.");
    } finally {
      setIsSyncing(false);
    }
  };

  const replaceHibahData = async (newData: HibahData[]) => {
    setIsSyncing(true);
    setHibahData(newData);
    try {
      await DataService.syncHibahData(newData);
      const freshData = await DataService.getHibahData();
      setHibahData(freshData);
      await triggerAutoPush(masterData, realizationData, spendingData, freshData);
    } catch (err) {
      console.error("Gagal sinkronisasi data hibah (replace)", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteHibahData = async (id: string) => {
    setIsSyncing(true);
    const updated = hibahData.filter(item => item.id !== id);
    setHibahData(updated);
    try {
      await DataService.deleteHibahData(id);
      await triggerAutoPush(masterData, realizationData, spendingData, updated);
    } catch (err) {
      console.error("Gagal menghapus data hibah", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearHibahData = async () => {
    setIsSyncing(true);
    const backup = [...hibahData];
    setHibahData([]);
    try {
      await DataService.clearHibahData();
      await triggerAutoPush(masterData, realizationData, spendingData, []);
      alert("Semua data hibah berhasil dihapus dari server.");
    } catch (err) {
      console.error("Gagal menghapus semua data hibah", err);
      setHibahData(backup);
      alert("Gagal menghapus data hibah dari server. Silakan periksa koneksi internet Anda.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 text-indigo-600">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold animate-pulse">Memproses...</p>
      </div>
    );
  }

  // Layar Login
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex p-4 bg-indigo-100 rounded-full text-indigo-600 mb-4">
              <CircleDollarSign size={40} />
            </div>
            <h1 className="text-2xl font-black text-gray-900">FinRealize Cloud</h1>
            <p className="text-gray-500 text-sm font-medium">Masuk untuk mengakses database terpusat</p>
          </div>
          
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed font-medium">
                Aplikasi ini sekarang terhubung ke <b>Google Cloud Firestore</b>. Semua data akan tersinkronisasi secara real-time antar pengguna.
              </p>
            </div>

            <button 
              onClick={handleLogin}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-6 h-6 hidden" alt="" />
              <User size={20} />
              Masuk dengan Google
            </button>
          </div>
          
          <div className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Sistem Informasi Realisasi Keuangan v3.0
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 bg-indigo-950 text-white transition-all duration-300 z-50 print:hidden ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
          <div className="flex flex-col h-full">
            <div className="p-6 flex items-center justify-between border-b border-indigo-900">
              {isSidebarOpen && <h1 className="text-xl font-bold tracking-tight">FinRealize <span className="text-[10px] bg-indigo-500 px-1 rounded">CLOUD</span></h1>}
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-indigo-800 rounded">
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
            
            <nav className="flex-1 mt-6 px-4 space-y-2">
              <button onClick={() => setActivePage('dashboard')} className={`w-full flex items-center gap-4 p-3 rounded-lg ${activePage === 'dashboard' ? 'bg-indigo-600' : 'hover:bg-indigo-900'}`}>
                <LayoutDashboard size={20} /> {isSidebarOpen && <span>Dashboard</span>}
              </button>
              <button onClick={() => setActivePage('master')} className={`w-full flex items-center gap-4 p-3 rounded-lg ${activePage === 'master' ? 'bg-indigo-600' : 'hover:bg-indigo-900'}`}>
                <Database size={20} /> {isSidebarOpen && <span>Data Master</span>}
              </button>
              <button onClick={() => setActivePage('realization')} className={`w-full flex items-center gap-4 p-3 rounded-lg ${activePage === 'realization' ? 'bg-indigo-600' : 'hover:bg-indigo-900'}`}>
                <CircleDollarSign size={20} /> {isSidebarOpen && <span>Realisasi</span>}
              </button>
              <button onClick={() => setActivePage('hibah')} className={`w-full flex items-center gap-4 p-3 rounded-lg ${activePage === 'hibah' ? 'bg-indigo-600' : 'hover:bg-indigo-900'}`}>
                <Gift size={20} /> {isSidebarOpen && <span>Hibah</span>}
              </button>
              <button onClick={() => setActivePage('spending')} className={`w-full flex items-center gap-4 p-3 rounded-lg ${activePage === 'spending' ? 'bg-indigo-600' : 'hover:bg-indigo-900'}`}>
                <CreditCard size={20} /> {isSidebarOpen && <span>Data Belanja</span>}
              </button>
              <button onClick={() => setActivePage('reports')} className={`w-full flex items-center gap-4 p-3 rounded-lg ${activePage === 'reports' ? 'bg-indigo-600' : 'hover:bg-indigo-900'}`}>
                <FileText size={20} /> {isSidebarOpen && <span>Laporan</span>}
              </button>
              <button onClick={() => setActivePage('spreadsheet')} className={`w-full flex items-center gap-4 p-3 rounded-lg ${activePage === 'spreadsheet' ? 'bg-indigo-600' : 'hover:bg-indigo-900'}`}>
                <FileSpreadsheet size={20} /> {isSidebarOpen && <span>Spreadsheet</span>}
              </button>
            </nav>
            
            <div className="p-4 border-t border-indigo-900 space-y-4">
              {isSyncing && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold px-2">
                  <CloudSync size={14} className="animate-spin" /> SINKRONISASI...
                </div>
              )}
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={20} />
                {isSidebarOpen && <span>Keluar</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 print:ml-0 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
          <header className="bg-white border-b sticky top-0 z-40 p-4 flex items-center justify-between shadow-sm print:hidden">
            <h2 className="text-lg font-bold text-gray-700 capitalize">{activePage}</h2>
            <div className="flex items-center gap-4">
               <div className="text-right hidden md:block">
                 <p className="text-xs font-bold text-gray-900">{user?.displayName || user?.email}</p>
                 <p className="text-[10px] text-gray-500 uppercase">User Terverifikasi</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200 overflow-hidden">
                 {user?.photoURL ? <img src={user.photoURL} alt="" /> : user?.email?.charAt(0).toUpperCase()}
               </div>
            </div>
          </header>

          <div className="p-6 md:p-8">
            {activePage === 'dashboard' && <Dashboard masterData={masterData} realizationData={realizationData} spendingData={spendingData} />}
            {activePage === 'master' && <MasterDataPage data={masterData} setData={updateMasterData} replaceData={replaceMasterData} deleteRow={deleteMasterData} clearAll={clearMasterData} />}
            {activePage === 'realization' && <RealizationDataPage data={realizationData} setData={updateRealizationData} replaceData={replaceRealizationData} deleteRow={deleteRealizationData} clearAll={clearRealizationData} masterData={masterData} />}
            {activePage === 'hibah' && <HibahDataPage data={hibahData} setData={updateHibahData} replaceData={replaceHibahData} deleteRow={deleteHibahData} clearAll={clearHibahData} masterData={masterData} />}
            {activePage === 'spending' && <ExpenditureDataPage data={spendingData} setData={updateSpendingData} />}
            {activePage === 'reports' && <ReportsPage masterData={masterData} realizationData={realizationData} hibahData={hibahData} />}
            {activePage === 'spreadsheet' && (
              <SpreadsheetSettings
                googleAccessToken={googleAccessToken}
                spreadsheetId={spreadsheetId}
                spreadsheetUrl={spreadsheetUrl}
                isAutoSync={isAutoSync}
                isSyncing={isSyncing}
                connectGoogleSheets={connectGoogleSheets}
                handleCreateNewSpreadsheet={handleCreateNewSpreadsheet}
                handleConnectExistingSpreadsheet={handleConnectExistingSpreadsheet}
                handlePullFromSpreadsheet={handlePullFromSpreadsheet}
                handlePushToSpreadsheet={handlePushToSpreadsheet}
                handleToggleAutoSync={handleToggleAutoSync}
                masterCount={masterData.length}
                realizationCount={realizationData.length}
                spendingCount={spendingData.length}
                hibahCount={hibahData.length}
              />
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
