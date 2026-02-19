
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Wallet, TrendingUp, CircleDollarSign, Percent, Sparkles, Loader2 } from 'lucide-react';
import { MasterData, ExpenditureData, RealizationData } from '../types';
import { getFinancialInsights } from '../services/geminiService';

interface Props {
  masterData: MasterData[];
  realizationData: RealizationData[];
  spendingData: ExpenditureData[];
}

const Dashboard: React.FC<Props> = ({ masterData, realizationData, spendingData }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const clean = (val: any) => (val || '').toString().toLowerCase().trim();

  const stats = useMemo(() => {
    // 1. Buat map realisasi per SKPD + Kode Belanja
    const realizationMap: Record<string, number> = {};
    realizationData.forEach(r => {
      const key = `${clean(r.skpd)}|${clean(r.kode_belanja)}`;
      realizationMap[key] = (realizationMap[key] || 0) + (Number(r.realisasi) || 0);
    });

    let totalAnggaran = 0;
    let totalRealisasi = 0;

    // 2. Hitung dari Master (Anggaran) dan tambahkan realisasi yang cocok
    masterData.forEach(m => {
      totalAnggaran += (Number(m.anggaran) || 0);
      const mKey = `${clean(m.skpd)}|${clean(m.kode_belanja)}`;
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
    const persentase = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

    return { totalAnggaran, totalRealisasi, sisa, persentase };
  }, [masterData, realizationData]);

  const chartData = useMemo(() => {
    const groups: Record<string, { name: string; anggaran: number; realisasi: number }> = {};
    
    // Mapping realisasi per kode belanja
    const realizationMap: Record<string, number> = {};
    realizationData.forEach(r => {
      const key = `${clean(r.skpd)}|${clean(r.kode_belanja)}`;
      realizationMap[key] = (realizationMap[key] || 0) + (Number(r.realisasi) || 0);
    });

    masterData.forEach(m => {
      if (!groups[m.skpd]) groups[m.skpd] = { name: m.skpd, anggaran: 0, realisasi: 0 };
      groups[m.skpd].anggaran += Number(m.anggaran) || 0;
      
      const mKey = `${clean(m.skpd)}|${clean(m.kode_belanja)}`;
      if (realizationMap[mKey]) {
        groups[m.skpd].realisasi += realizationMap[mKey];
        delete realizationMap[mKey];
      }
      groups[m.skpd].realisasi += (Number(m.realisasi) || 0);
    });

    // Tambahkan realisasi anomali ke SKPD terkait di chart
    Object.entries(realizationMap).forEach(([key, val]) => {
      const skpdNameRaw = realizationData.find(rd => `${clean(rd.skpd)}|${clean(rd.kode_belanja)}` === key)?.skpd || 'LAINNYA';
      if (!groups[skpdNameRaw]) groups[skpdNameRaw] = { name: skpdNameRaw, anggaran: 0, realisasi: 0 };
      groups[skpdNameRaw].realisasi += val;
    });

    return Object.values(groups);
  }, [masterData, realizationData]);

  const pieData = [
    { name: 'Realisasi', value: stats.totalRealisasi, color: '#10b981' },
    { name: 'Sisa Anggaran', value: Math.max(0, stats.sisa), color: '#e5e7eb' }
  ];

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleFetchInsight = async () => {
    setLoadingAi(true);
    const insight = await getFinancialInsights(masterData, []); 
    setAiInsight(insight || "Gagal memuat analisis.");
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Percent size={24} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Persentase</p>
              <h3 className="text-lg font-bold text-indigo-600">{stats.persentase.toFixed(2)}%</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
              Perbandingan Anggaran vs Realisasi per SKPD
            </h3>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
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
                <Bar dataKey="anggaran" name="Anggaran" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realisasi" name="Realisasi" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                  /* Fix: move cornerRadius from Cell to Pie component */
                  cornerRadius={10}
                >
                  {pieData.map((entry, index) => (
                    /* Fix: remove cornerRadius prop which is not supported on Cell */
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
      </div>

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
