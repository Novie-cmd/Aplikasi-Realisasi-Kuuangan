
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

const BIDANG_MAP: Record<string, string> = {
  "PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH PROVINSI": "Sekretariat",
  "PENUNJANG URUSAN PEMERINTAHAN DAERAH": "Sekretariat",
  "PROGRAM PEMBERDAYAAN DAN PENGAWASAN ORGANISASI KEMASYARAKATAN": "Bidang Poldagri",
  "PROGRAM PEMBINAAN DAN PENGEMBANGAN KETAHANAN EKONOMI, SOSIAL, DAN BUDAYA": "Bidang Wasbang",
  "PEMBINAAN KETAHANAN EKONOMI, SOSIAL, BUDAYA & KEWASPADAAN NASIONAL": "Bidang Wasbang",
  "PROGRAM PENINGKATAN KEWASPADAAN NASIONAL DAN PENINGKATAN KUALITAS DAN FASILITASI PENANGANAN KONFLIK SOSIAL": "Bidang Wasnas",
  "PROGRAM PENGUATAN IDEOLOGI PANCASILA DAN KARAKTER KEBANGSAAN": "Bidang Wasbang",
  "PROGRAM PENINGKATAN PERAN PARTAI POLITIK DAN LEMBAGA PENDIDIKAN MELALUI PENDIDIKAN POLITIK DAN PENGEMBANGAN ETIKA SERTA BUDAYA POLITIK": "Bidang Poldagri",
};

const Dashboard: React.FC<Props> = ({ masterData, realizationData, spendingData }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'table_bidang' | 'table_belanja'>('visual');
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

  const getCleanProgramName = (kode_program: string, programFallback: string): string => {
    const masterMatch = masterData.find(m => clean(m.kode_program) === clean(kode_program));
    return masterMatch ? masterMatch.program : (programFallback || '');
  };

  const getBidangName = (programName: string): string => {
    const cleaned = (programName || '')
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    return BIDANG_MAP[cleaned] || "LAINNYA";
  };

  const getBidangFromRealization = (r: RealizationData): string => {
    const programName = getCleanProgramName(r.kode_program, r.program);
    return getBidangName(programName);
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
      const bidangName = getBidangName(m.program);
      if (!groups[bidangName]) groups[bidangName] = { name: bidangName, anggaran: 0, realisasi: 0 };
      groups[bidangName].anggaran += Number(m.anggaran) || 0;
      
      const mKey = `${clean(m.kode_skpd)}|${clean(m.kode_program)}|${clean(m.kode_kegiatan)}|${clean(m.kode_sub_kegiatan)}|${clean(m.kode_belanja)}`;
      if (realizationMap[mKey]) {
        groups[bidangName].realisasi += realizationMap[mKey];
        delete realizationMap[mKey];
      }
      groups[bidangName].realisasi += (Number(m.realisasi) || 0);
    });

    // Tambahkan realisasi anomali ke bidang terkait di chart
    Object.entries(realizationMap).forEach(([key, val]) => {
      const original = realizationData.find(rd => `${clean(rd.kode_skpd)}|${clean(rd.kode_program)}|${clean(rd.kode_kegiatan)}|${clean(rd.kode_sub_kegiatan)}|${clean(rd.kode_belanja)}` === key);
      const bidangName = original ? getBidangFromRealization(original) : 'LAINNYA';
      if (!groups[bidangName]) groups[bidangName] = { name: bidangName, anggaran: 0, realisasi: 0 };
      groups[bidangName].realisasi += val;
    });

    // Filter "LAINNYA" out if it's empty or requested (keeping it consistent with reports)
    return Object.values(groups).filter(g => g.name !== 'LAINNYA' || g.anggaran > 0 || g.realisasi > 0);
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

  const filteredBidangData = useMemo(() => {
    return chartData.filter(item => 
      item.name.toLowerCase().includes(detailSearch.toLowerCase())
    ).sort((a, b) => b.anggaran - a.anggaran);
  }, [chartData, detailSearch]);

  const filteredBidangTotals = useMemo(() => {
    return filteredBidangData.reduce((acc, curr) => ({
      anggaran: acc.anggaran + curr.anggaran,
      realisasi: acc.realisasi + curr.realisasi,
      sisa: acc.sisa + (curr.anggaran - curr.realisasi)
    }), { anggaran: 0, realisasi: 0, sisa: 0 });
  }, [filteredBidangData]);

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

  const belanjaTotals = useMemo(() => {
    return belanjaStats.reduce((acc, curr) => ({
      anggaran: acc.anggaran + curr.anggaran,
      realisasi: acc.realisasi + curr.realisasi,
    }), { anggaran: 0, realisasi: 0 });
  }, [belanjaStats]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-700 transition-all hover:border-slate-600">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-700/80 text-white rounded-xl"><Wallet size={24} /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Anggaran</p>
              <h3 className="text-lg font-bold text-white">{formatIDR(stats.totalAnggaran)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-700 transition-all hover:border-emerald-700/60">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#064e3b] text-emerald-300 rounded-xl border border-emerald-600/30"><TrendingUp size={24} /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Realisasi</p>
              <h3 className="text-lg font-bold text-emerald-400">{formatIDR(stats.totalRealisasi)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-700 transition-all hover:border-rose-800/60">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#4c0519] text-rose-300 rounded-xl border border-[#881337]/50"><CircleDollarSign size={24} /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Sisa Anggaran</p>
              <h3 className="text-lg font-bold text-rose-300">{formatIDR(stats.sisa)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-700 transition-all hover:border-rose-800/60">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#4c0519] text-rose-300 rounded-xl border border-[#881337]/50"><Coins size={24} /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">SPD Tersedia</p>
              <h3 className="text-lg font-bold text-rose-300">{formatIDR(stats.sisaSpd)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-700 transition-all hover:border-emerald-700/60">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#064e3b] text-emerald-300 rounded-xl border border-emerald-600/30"><Percent size={24} /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Persentase</p>
              <h3 className="text-lg font-bold text-emerald-400">{stats.persentase.toFixed(2)}%</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-800 p-2.5 rounded-2xl shadow-sm border border-slate-700">
        <div className="flex p-1 bg-slate-900/80 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar border border-slate-750">
          <button 
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'visual' ? 'bg-[#064e3b] text-emerald-100 shadow-md border border-emerald-600/40' : 'text-slate-400 hover:text-white'}`}
          >
            <BarChart3 size={16} /> Visualisasi
          </button>
          <button 
            onClick={() => setActiveTab('table_bidang')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'table_bidang' ? 'bg-[#064e3b] text-emerald-100 shadow-md border border-emerald-600/40' : 'text-slate-400 hover:text-white'}`}
          >
            <Table size={16} /> Rincian Bidang
          </button>
          <button 
            onClick={() => setActiveTab('table_belanja')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'table_belanja' ? 'bg-[#064e3b] text-emerald-100 shadow-md border border-emerald-600/40' : 'text-slate-400 hover:text-white'}`}
          >
            <ListFilter size={16} /> Rincian Belanja
          </button>
        </div>

        {activeTab !== 'visual' && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari data..." 
              value={detailSearch}
              onChange={(e) => setDetailSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
            <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                  <h4 className="font-bold text-white text-sm">Grafik Perbandingan Anggaran vs Realisasi</h4>
                </div>
                <span className="text-[10px] font-bold text-slate-400 italic">Geser horizontal jika data banyak →</span>
              </div>
              <div className="h-[400px] overflow-x-auto no-scrollbar">
                <div style={{ minWidth: Math.max(100, chartData.length * 5) + '%' }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} fontSize={10} interval={0} stroke="#94a3b8" />
                      <YAxis tickFormatter={(val) => `${(val / 1e6).toFixed(0)}M`} fontSize={10} stroke="#94a3b8" />
                      <Tooltip 
                        cursor={{fill: '#1e293b'}}
                        contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)'}}
                        formatter={(value: number) => [formatIDR(value), '']}
                      />
                      <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ color: '#f8fafc' }} />
                      <Bar dataKey="anggaran" name="Anggaran" fill="#64748b" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="realisasi" name="Realisasi" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-700 flex flex-col items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 self-start">Proporsi Realisasi</h3>
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
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#be123c'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatIDR(value)}
                      contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-5xl font-black text-white leading-none">{stats.persentase.toFixed(0)}%</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Realisasi</span>
                </div>
              </div>
              
              <div className="w-full space-y-3 mt-4">
                 <div className="flex justify-between items-center p-3 bg-[#064e3b]/50 rounded-xl border border-emerald-700/50">
                    <span className="text-[10px] font-bold text-emerald-300 uppercase">Realisasi</span>
                    <span className="text-sm font-black text-emerald-200">{formatIDR(stats.totalRealisasi)}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-[#4c0519]/50 rounded-xl border border-[#881337]/50">
                    <span className="text-[10px] font-bold text-rose-300 uppercase">Sisa Anggaran</span>
                    <span className="text-sm font-black text-rose-200">{formatIDR(stats.sisa)}</span>
                 </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'table_bidang' && (
          <motion.div 
            key="table_bidang"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Nama Bidang</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">Anggaran</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">Realisasi</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">Persentase</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">Sisa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-slate-200">
                  {filteredBidangData.map((item, idx) => {
                    const pct = item.anggaran > 0 ? (item.realisasi / item.anggaran) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-white">{item.name}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-300 text-right">{formatIDR(item.anggaran)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-400 text-right">{formatIDR(item.realisasi)}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }}></div>
                            </div>
                            <span className="text-xs font-black text-emerald-400 w-10">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-rose-400 text-right">{formatIDR(item.anggaran - item.realisasi)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900 border-t border-slate-700">
                  <tr className="font-black text-white">
                    <td className="px-6 py-4 text-sm uppercase tracking-widest">Total Keseluruhan</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-200">{formatIDR(filteredBidangTotals.anggaran)}</td>
                    <td className="px-6 py-4 text-sm text-right text-emerald-400">{formatIDR(filteredBidangTotals.realisasi)}</td>
                    <td className="px-6 py-4 text-center text-xs text-emerald-400">
                      {filteredBidangTotals.anggaran > 0 
                        ? ((filteredBidangTotals.realisasi / filteredBidangTotals.anggaran) * 100).toFixed(1) 
                        : '0.0'}%
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-rose-400">{formatIDR(filteredBidangTotals.sisa)}</td>
                  </tr>
                </tfoot>
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
            className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Kode</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Uraian Belanja</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">Anggaran</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">Realisasi</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-slate-200">
                  {belanjaStats.map((item, idx) => {
                    const pct = item.anggaran > 0 ? (item.realisasi / item.anggaran) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-slate-400">{item.kode}</td>
                        <td className="px-4 py-4 text-sm font-bold text-white">{item.name}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-300 text-right">{formatIDR(item.anggaran)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-400 text-right">{formatIDR(item.realisasi)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${pct > 90 ? 'bg-[#064e3b] text-emerald-200 border-emerald-600' : pct > 50 ? 'bg-slate-700 text-slate-100 border-slate-600' : 'bg-[#4c0519] text-rose-200 border-[#881337]'}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900 border-t border-slate-700">
                  <tr className="font-black text-white">
                    <td colSpan={2} className="px-6 py-4 text-sm uppercase tracking-widest">Sub Total</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-200">{formatIDR(belanjaTotals.anggaran)}</td>
                    <td className="px-6 py-4 text-sm text-right text-emerald-400">{formatIDR(belanjaTotals.realisasi)}</td>
                    <td className="px-6 py-4 text-center text-xs text-emerald-400">
                      {belanjaTotals.anggaran > 0 
                        ? ((belanjaTotals.realisasi / belanjaTotals.anggaran) * 100).toFixed(1) 
                        : '0.0'}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#064e3b] p-8 rounded-3xl shadow-xl border border-emerald-600/40 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles size={160} />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-black flex items-center gap-3">
                <Sparkles /> AI Financial Insights
              </h3>
              <p className="text-emerald-100 text-sm">Analisis otomatis performa realisasi anggaran menggunakan Gemini AI.</p>
            </div>
            <button 
              onClick={handleFetchInsight}
              disabled={loadingAi}
              className="px-6 py-3 bg-white text-[#064e3b] rounded-2xl font-bold hover:bg-slate-100 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              {loadingAi ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              Mulai Analisis
            </button>
          </div>
          
          {aiInsight && (
            <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-emerald-500/30 text-slate-100 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-4">
              <div className="whitespace-pre-wrap">{aiInsight}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
