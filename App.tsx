
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, CreditCard, Menu, X, FileText, CircleDollarSign, MonitorSmartphone, DownloadCloud } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MasterDataPage from './pages/MasterData';
import ExpenditureDataPage from './pages/ExpenditureData';
import ReportsPage from './pages/Reports';
import RealizationDataPage from './pages/RealizationData';
import { MasterData, ExpenditureData, Page, RealizationData } from './types';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  // Persistence using LocalStorage
  const [masterData, setMasterData] = useState<MasterData[]>(() => {
    const saved = localStorage.getItem('finrealize_master');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [spendingData, setSpendingData] = useState<ExpenditureData[]>(() => {
    const saved = localStorage.getItem('finrealize_spending');
    return saved ? JSON.parse(saved) : [];
  });

  const [realizationData, setRealizationData] = useState<RealizationData[]>(() => {
    const saved = localStorage.getItem('finrealize_realization');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('finrealize_master', JSON.stringify(masterData));
  }, [masterData]);

  useEffect(() => {
    localStorage.setItem('finrealize_spending', JSON.stringify(spendingData));
  }, [spendingData]);

  useEffect(() => {
    localStorage.setItem('finrealize_realization', JSON.stringify(realizationData));
  }, [realizationData]);

  // PWA Install Logic
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-indigo-900 text-white transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between border-b border-indigo-800">
            {isSidebarOpen && <h1 className="text-xl font-bold tracking-tight">FinRealize</h1>}
            <button onClick={toggleSidebar} className="p-1 hover:bg-indigo-800 rounded">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          
          <nav className="flex-1 mt-6 px-4 space-y-2">
            <button 
              onClick={() => setActivePage('dashboard')}
              className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors ${activePage === 'dashboard' ? 'bg-indigo-700 text-white' : 'text-indigo-300 hover:bg-indigo-800'}`}
            >
              <LayoutDashboard size={20} />
              {isSidebarOpen && <span>Dashboard</span>}
            </button>
            <button 
              onClick={() => setActivePage('master')}
              className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors ${activePage === 'master' ? 'bg-indigo-700 text-white' : 'text-indigo-300 hover:bg-indigo-800'}`}
            >
              <Database size={20} />
              {isSidebarOpen && <span>Data Master</span>}
            </button>
            <button 
              onClick={() => setActivePage('realization')}
              className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors ${activePage === 'realization' ? 'bg-indigo-700 text-white' : 'text-indigo-300 hover:bg-indigo-800'}`}
            >
              <CircleDollarSign size={20} />
              {isSidebarOpen && <span>Realisasi</span>}
            </button>
            <button 
              onClick={() => setActivePage('spending')}
              className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors ${activePage === 'spending' ? 'bg-indigo-700 text-white' : 'text-indigo-300 hover:bg-indigo-800'}`}
            >
              <CreditCard size={20} />
              {isSidebarOpen && <span>Data Belanja</span>}
            </button>
            <button 
              onClick={() => setActivePage('reports')}
              className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors ${activePage === 'reports' ? 'bg-indigo-700 text-white' : 'text-indigo-300 hover:bg-indigo-800'}`}
            >
              <FileText size={20} />
              {isSidebarOpen && <span>Laporan</span>}
            </button>
          </nav>
          
          <div className="p-4 border-t border-indigo-800">
            {showInstallBanner && deferredPrompt && (
              <div className="bg-indigo-800/50 p-3 rounded-xl border border-indigo-700 mb-4 animate-in fade-in zoom-in-95">
                <p className="text-[10px] text-indigo-300 mb-2 font-medium">Aplikasi ini tersedia untuk Desktop</p>
                <button 
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-2 bg-white text-indigo-900 py-2 rounded-lg text-xs font-bold transition-all hover:bg-indigo-50 shadow-lg"
                >
                  <DownloadCloud size={14} />
                  Pasang Sekarang
                </button>
              </div>
            )}
            {isSidebarOpen && (
              <div className="text-xs text-indigo-400 text-center font-medium">
                © 2024 FinRealize v1.1
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <header className="bg-white border-b sticky top-0 z-40 p-4 flex items-center justify-between shadow-sm">
          <h2 className="text-lg font-semibold capitalize text-gray-700">
            {activePage === 'dashboard' ? 'Dashboard Ringkasan' : 
             activePage === 'master' ? 'Pengelolaan Data Master' : 
             activePage === 'realization' ? 'Data Realisasi Keuangan' :
             activePage === 'spending' ? 'Catatan Belanja' : 'Laporan Keuangan'}
          </h2>
          <div className="flex items-center gap-4">
             <div className="text-sm text-gray-500 hidden sm:block font-medium">Admin Keuangan</div>
             <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">A</div>
          </div>
        </header>

        <div className="p-6 md:p-8">
          {activePage === 'dashboard' && <Dashboard masterData={masterData} realizationData={realizationData} spendingData={spendingData} />}
          {activePage === 'master' && <MasterDataPage data={masterData} setData={setMasterData} />}
          {activePage === 'realization' && <RealizationDataPage data={realizationData} setData={setRealizationData} />}
          {activePage === 'spending' && <ExpenditureDataPage data={spendingData} setData={setSpendingData} />}
          {activePage === 'reports' && <ReportsPage masterData={masterData} realizationData={realizationData} />}
        </div>
      </main>
    </div>
  );
};

export default App;
