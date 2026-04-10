
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Wallet, TrendingUp, CircleDollarSign, Percent, Sparkles, Loader2, Coins, Table, BarChart3, ListFilter, Search } from 'lucide-react';
import { MasterData, ExpenditureData, RealizationData } from '../types';
import { getFinancialInsights } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  masterData: MasterData[];
  realizationData: RealizationData[];
  spendingData: ExpenditureData[];
}

const Dashboard: React.FC<Props> = ({ masterData, realizationData, spendingData }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'table_skpd' | 'table_belanja'>('visual');
  const [detailSearch, setDetailSearch] = useState('');

  // Fungsi normalisasi tingkat tinggi untuk membersihkan karakter aneh dari Excel
  const clean = (val: any): string => {
    if (val === null || val === undefined) return '';
    return val.toString()
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // Hapus zero-width & non-breaking spaces
      .replace(/\s+/g, ' ') // Ubah multiple space jadi single space
      .trim()
      .toLowerCase();
  };

  const stats = useMemo(() => {
    // 1. Buat map realisasi per SKPD + Kode Program + Kode Kegiatan + Kode Sub Kegiatan + Kode Belanja
    const realizationMap: Record<string, number> = {};
    realizationData.forEach(r => {
      const key = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}|${clean(r.kode_sub_kegiatan)}|${clean(r.kode_belanja)}`;
      realizationMap[key] = (realizationMap[key] || 0) + (Number(r.realisasi) || 0);
    });

    let totalAnggaran = 0;
    let totalRealisasi = 0;
    let totalPaguSpd = 0;

    // 2. Hitung dari Master (Anggaran) dan tambahkan realisasi yang cocok
    masterData.forEach(m => {
      totalAnggaran += (Number(m.anggaran) || 0);
      totalPaguSpd += (Number(m.pagu_spd) || 0);
      const mKey = `${clean(m.kode_skpd)}|${clean(m.kode_program)}|${clean(m.kode_kegiatan)}|${clean(m.kode_sub_kegiatan)}|${clean(m.kode_belanja)}`;
      if (realizationMap[mKey]) {
        totalRealisasi += realizationMap[mKey];
        delete realizationMap[mKey]; // Tandai sudah terhitung
      }
      // Tambahkan realisasi statis yang ada di master jika ada
      totalRealisasi += (Number(m.realisasi) || 0);
    });

    // 3. Tambahkan sisa realisasi yang tidak terpetakan di master (Anomali)
    Object.values(realizationMap).forEach(val => {
      totalRealisasi += val;
    });

    const sisa = totalAnggaran - totalRealisasi;
    const sisaSpd = totalPaguSpd - totalRealisasi;
    const persentase = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

    return { totalAnggaran, totalRealisasi, sisa, sisaSpd, totalPaguSpd, persentase };
  }, [masterData, realizationData]);

  const chartData = useMemo(() => {
    const groups: Record<string, { name: string; anggaran: number; realisasi: number }> = {};
    
    // Mapping realisasi per kode belanja
    const realizationMap: Record<string, number> = {};
    realizationData.forEach(r => {
      const key = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}|${clean(r.kode_sub_kegiatan)}|${clean(r.kode_belanja)}`;
      realizationMap[key] = (realizationMap[key] || 0) + (Number(r.realisasi) || 0);
    });

    masterData.forEach(m => {
      if (!groups[m.skpd]) groups[m.skpd] = { name: m.skpd, anggaran: 0, realisasi: 0 };
      groups[m.skpd].anggaran += Number(m.anggaran) || 0;
      
      const mKey = `${clean(m.kode_skpd)}|${clean(m.kode_program)}|${clean(m.kode_kegiatan)}|${clean(m.kode_sub_kegiatan)}|${clean(m.kode_belanja)}`;
      if (realizationMap[mKey]) {
        groups[m.skpd].realisasi += realizationMap[mKey];
        delete realizationMap[mKey];
      }
      groups[m.skpd].realisasi += (Number(m.realisasi) || 0);
    });

    // Tambahkan realisasi anomali ke SKPD terkait di chart
    Object.entries(realizationMap).forEach(([key, val]) => {
      const original = realizationData.find(rd => `${clean(rd.kode_skpd)}|${clean(rd.kode_program)}|${clean(rd.kode_kegiatan)}|${clean(rd.kode_sub_kegiatan)}|${clean(rd.kode_belanja)}` === key);
      const skpdNameRaw = original?.skpd || 'LAINNYA';
      if (!groups[skpdNameRaw]) groups[skpdNameRaw] = { name: skpdNameRaw, anggaran: 0, realisasi: 0 };
      groups[skpdNameRaw].realisasi += val;
    });

    return Object.values(groups);
  }, [masterData, realizationData]);

  const pieData = [
    { name: 'Realisasi', value: stats.totalRealisasi, color: '#34d399' },
    { name: 'Sisa Anggaran', value: Math.max(0, stats.sisa), color: '#fbbf24' }
  ];

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleFetchInsight = async () => {
    setLoadingAi(true);
    const insight = await getFinancialInsights(masterData, []); 
    setAiInsight(insight || "Gagal memuat analisis.");
    setLoadingAi(false);
  };

  const filteredSkpdData = useMemo(() => {
    return chartData.filter(item => 
      item.name.toLowerCase().includes(detailSearch.toLowerCase())
    ).sort((a, b) => b.anggaran - a.anggaran);
  }, [chartData, detailSearch]);

  const belanjaStats = useMemo(() => {
    const groups: Record<string, { name: string; kode: string; anggaran: number; realisasi: number }> = {};
    
    // Mapping realisasi per kode belanja
    const realizationMap: Record<string, number> = {};
    realizationData.forEach(r => {
      const key = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}|${clean(r.kode_sub_kegiatan)}|${clean(r.kode_belanja)}`;
      realizationMap[key] = (realizationMap[key] || 0) + (Number(r.realisasi) || 0);
    });

    masterData.forEach(m => {
      const key = m.belanja;
      if (!groups[key]) groups[key] = { name: m.belanja, kode: m.kode_belanja, anggaran: 0, realisasi: 0 };
      groups[key].anggaran += Number(m.anggaran) || 0;
      
      const mKey = `${clean(m.kode_skpd)}|${clean(m.kode_program)}|${clean(m.kode_kegiatan)}|${clean(m.kode_sub_kegiatan)}|${clean(m.kode_belanja)}`;
      if (realizationMap[mKey]) {
        groups[key].realisasi += realizationMap[mKey];
        // We don't delete here because multiple master lines can point to same belanja name
      }
      groups[key].realisasi += (Number(m.realisasi) || 0);
    });

    return Object.values(groups).filter(item => 
      item.name.toLowerCase().includes(detailSearch.toLowerCase()) ||
      item.kode.includes(detailSearch)
    ).sort((a, b) => b.anggaran - a.anggaran);
  }, [masterData, realizationData, detailSearch]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Wallet size={24} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Anggaran</p>
              <h3 className="text-lg font-bold text-gray-900">{formatIDR(stats.totalAnggaran)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={24} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Realisasi</p>
              <h3 className="text-lg font-bold text-emerald-600">{formatIDR(stats.totalRealisasi)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><CircleDollarSign size={24} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sisa Anggaran</p>
              <h3 className="text-lg font-bold text-gray-900">{formatIDR(stats.sisa)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Coins size={24} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">SPD Tersedia</p>
              <h3 className="text-lg font-bold text-rose-600">{formatIDR(stats.sisaSpd)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Percent size={24} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Persentase</p>
              <h3 className="text-lg font-bold text-indigo-600">{stats.persentase.toFixed(2)}%</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart3 size={16} /> Visualisasi
          </button>
          <button 
            onClick={() => setActiveTab('table_skpd')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'table_skpd' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Table size={16} /> Rincian SKPD
          </button>
          <button 
            onClick={() => setActiveTab('table_belanja')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'table_belanja' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ListFilter size={16} /> Rincian Belanja
          </button>
        </div>

        {activeTab !== 'visual' && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari data..." 
              value={detailSearch}
              onChange={(e) => setDetailSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'visual' && (
          <motion.div 
            key="visual"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                  Perbandingan Anggaran vs Realisasi per SKPD
                </h3>
                <span className="text-[10px] font-bold text-gray-400 italic">Geser horizontal jika data banyak →</span>
              </div>
              <div className="h-[400px] overflow-x-auto no-scrollbar">
                <div style={{ minWidth: Math.max(100, chartData.length * 5) + '%' }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} fontSize={10} interval={0} stroke="#9ca3af" />
                      <YAxis tickFormatter={(val) => `${(val / 1e6).toFixed(0)}M`} fontSize={10} stroke="#9ca3af" />
                      <Tooltip 
                        cursor={{fill: '#f9fafb'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        formatter={(value: number) => [formatIDR(value), '']}
                      />
                      <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                      <Bar dataKey="anggaran" name="Anggaran" fill="#818cf8" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="realisasi" name="Realisasi" fill="#34d399" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 self-start">Proporsi Realisasi</h3>
              <div className="relative w-full aspect-square max-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius="70%"
                      outerRadius="90%"
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={10}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatIDR(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-5xl font-black text-gray-900 leading-none">{stats.persentase.toFixed(0)}%</span>
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Realisasi</span>
                </div>
              </div>
              
              <div className="w-full space-y-3 mt-4">
                 <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Realisasi</span>
                    <span className="text-sm font-black text-emerald-800">{formatIDR(stats.totalRealisasi)}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Sisa</span>
                    <span className="text-sm font-black text-gray-700">{formatIDR(stats.sisa)}</span>
                 </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'table_skpd' && (
          <motion.div 
            key="table_skpd"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama SKPD</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Anggaran</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Realisasi</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Persentase</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sisa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSkpdData.map((item, idx) => {
                    const pct = item.anggaran > 0 ? (item.realisasi / item.anggaran) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-600 text-right">{formatIDR(item.anggaran)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">{formatIDR(item.realisasi)}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, pct)}%` }}></div>
                            </div>
                            <span className="text-xs font-black text-indigo-600 w-10">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-rose-600 text-right">{formatIDR(item.anggaran - item.realisasi)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'table_belanja' && (
          <motion.div 
            key="table_belanja"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode</th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Uraian Belanja</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Anggaran</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Realisasi</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {belanjaStats.map((item, idx) => {
                    const pct = item.anggaran > 0 ? (item.realisasi / item.anggaran) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-gray-400">{item.kode}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-600 text-right">{formatIDR(item.anggaran)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-indigo-600 text-right">{formatIDR(item.realisasi)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black ${pct > 90 ? 'bg-emerald-100 text-emerald-700' : pct > 50 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-indigo-600 p-8 rounded-3xl shadow-xl shadow-indigo-200 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <Sparkles size={160} />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-black flex items-center gap-3">
                <Sparkles /> AI Financial Insights
              </h3>
              <p className="text-indigo-100 text-sm">Analisis otomatis performa realisasi anggaran menggunakan Gemini AI.</p>
            </div>
            <button 
              onClick={handleFetchInsight}
              disabled={loadingAi}
              className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              {loadingAi ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              Mulai Analisis
            </button>
          </div>
          
          {aiInsight && (
            <div className="bg-indigo-700/50 backdrop-blur-md p-6 rounded-2xl border border-indigo-400/30 text-indigo-50 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-4">
              <div className="whitespace-pre-wrap">{aiInsight}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
