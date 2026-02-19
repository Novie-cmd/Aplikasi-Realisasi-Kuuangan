
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, CreditCard, Menu, X, FileText, CircleDollarSign, Loader2, CloudSync, LogOut, Lock, User } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MasterDataPage from './pages/MasterData';
import ExpenditureDataPage from './pages/ExpenditureData';
import ReportsPage from './pages/Reports';
import RealizationDataPage from './pages/RealizationData';
import { MasterData, ExpenditureData, Page, RealizationData } from './types';
import { DataService } from './services/dataService';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{name: string, role: string} | null>(null);
  
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [masterData, setMasterData] = useState<MasterData[]>([]);
  const [spendingData, setSpendingData] = useState<ExpenditureData[]>([]);
  const [realizationData, setRealizationData] = useState<RealizationData[]>([]);

  // Simulasi Login (Nantinya diganti dengan API hit)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      setUser({ name: "Administrator", role: "Super Admin" });
      setIsLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    const initFetch = async () => {
      setIsLoading(true);
      try {
        const [m, r, s] = await Promise.all([
          DataService.getMasterData(),
          DataService.getRealizationData(),
          DataService.getSpendingData()
        ]);
        setMasterData(m);
        setRealizationData(r);
        setSpendingData(s);
      } catch (err) {
        console.error("Gagal memuat data", err);
      } finally {
        setIsLoading(false);
      }
    };
    initFetch();
  }, [isLoggedIn]);

  const updateMasterData = async (newData: MasterData[]) => {
    setIsSyncing(true);
    setMasterData(newData);
    await DataService.saveMasterData(newData);
    setIsSyncing(false);
  };

  const updateRealizationData = async (newData: RealizationData[]) => {
    setIsSyncing(true);
    setRealizationData(newData);
    await DataService.saveRealizationData(newData);
    setIsSyncing(false);
  };

  const updateSpendingData = async (newData: ExpenditureData[]) => {
    setIsSyncing(true);
    setSpendingData(newData);
    await DataService.saveSpendingData(newData);
    setIsSyncing(false);
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
            <p className="text-gray-500 text-sm">Masuk untuk mengakses database terpusat</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Email / Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  defaultValue="admin@keuangan.go.id"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Masukkan email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  defaultValue="password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Masuk Sekarang
            </button>
          </form>
          
          <div className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Sistem Informasi Realisasi Keuangan v3.0
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-indigo-950 text-white transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
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
            <button onClick={() => setActivePage('spending')} className={`w-full flex items-center gap-4 p-3 rounded-lg ${activePage === 'spending' ? 'bg-indigo-600' : 'hover:bg-indigo-900'}`}>
              <CreditCard size={20} /> {isSidebarOpen && <span>Data Belanja</span>}
            </button>
            <button onClick={() => setActivePage('reports')} className={`w-full flex items-center gap-4 p-3 rounded-lg ${activePage === 'reports' ? 'bg-indigo-600' : 'hover:bg-indigo-900'}`}>
              <FileText size={20} /> {isSidebarOpen && <span>Laporan</span>}
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
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <header className="bg-white border-b sticky top-0 z-40 p-4 flex items-center justify-between shadow-sm">
          <h2 className="text-lg font-bold text-gray-700 capitalize">{activePage}</h2>
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block">
               <p className="text-xs font-bold text-gray-900">{user?.name}</p>
               <p className="text-[10px] text-gray-500 uppercase">{user?.role}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200">
               {user?.name.charAt(0)}
             </div>
          </div>
        </header>

        <div className="p-6 md:p-8">
          {activePage === 'dashboard' && <Dashboard masterData={masterData} realizationData={realizationData} spendingData={spendingData} />}
          {activePage === 'master' && <MasterDataPage data={masterData} setData={updateMasterData} />}
          {activePage === 'realization' && <RealizationDataPage data={realizationData} setData={updateRealizationData} />}
          {activePage === 'spending' && <ExpenditureDataPage data={spendingData} setData={updateSpendingData} />}
          {activePage === 'reports' && <ReportsPage masterData={masterData} realizationData={realizationData} />}
        </div>
      </main>
    </div>
  );
};

export default App;
