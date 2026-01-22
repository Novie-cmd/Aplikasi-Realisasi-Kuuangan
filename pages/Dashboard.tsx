
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

  const stats = useMemo(() => {
    const totalAnggaran = masterData.reduce((acc, curr) => acc + (Number(curr.anggaran) || 0), 0);
    
    // Gabungkan realisasi dari master data dan data realisasi terpisah
    const realisasiMaster = masterData.reduce((acc, curr) => acc + (Number(curr.realisasi) || 0), 0);
    const realisasiTerpisah = realizationData.reduce((acc, curr) => acc + (Number(curr.realisasi) || 0), 0);
    
    const totalRealisasi = realisasiMaster + realisasiTerpisah;
    const sisa = totalAnggaran - totalRealisasi;
    const persentase = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

    return { totalAnggaran, totalRealisasi, sisa, persentase };
  }, [masterData, realizationData]);

  const chartData = useMemo(() => {
    const groups: Record<string, { name: string; anggaran: number; realisasi: number }> = {};
    
    // Ambil anggaran dari master data
    masterData.forEach(m => {
      if (!groups[m.skpd]) groups[m.skpd] = { name: m.skpd, anggaran: 0, realisasi: 0 };
      groups[m.skpd].anggaran += Number(m.anggaran) || 0;
      groups[m.skpd].realisasi += Number(m.realisasi) || 0;
    });

    // Tambahkan realisasi dari data realisasi terpisah
    realizationData.forEach(r => {
      if (!groups[r.skpd]) groups[r.skpd] = { name: r.skpd, anggaran: 0, realisasi: 0 };
      groups[r.skpd].realisasi += Number(r.realisasi) || 0;
    });

    return Object.values(groups);
  }, [masterData, realizationData]);

  const pieData = [
    { name: 'Realisasi', value: stats.totalRealisasi, color: '#4f46e5' },
    { name: 'Sisa Anggaran', value: Math.max(0, stats.sisa), color: '#e5e7eb' }
  ];

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleFetchInsight = async () => {
    setLoadingAi(true);
    // Masukkan data master ke AI, tapi realisasi sudah termasuk kalkulasi total di backend/service jika perlu
    // Namun di sini kita kirim masterData yang merepresentasikan struktur dasar
    const insight = await getFinancialInsights(masterData, []); 
    setAiInsight(insight || "Gagal memuat analisis.");
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Wallet size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Anggaran</p>
              <h3 className="text-xl font-bold">{formatIDR(stats.totalAnggaran)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Realisasi</p>
              <h3 className="text-xl font-bold text-emerald-600">{formatIDR(stats.totalRealisasi)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><CircleDollarSign size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Sisa Anggaran</p>
              <h3 className="text-xl font-bold">{formatIDR(stats.sisa)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><Percent size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Persentase</p>
              <h3 className="text-xl font-bold">{stats.persentase.toFixed(2)}%</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            Grafik Anggaran vs Realisasi per SKPD
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} interval={0} />
                <YAxis tickFormatter={(val) => `Rp${(val / 1e6).toFixed(0)}M`} fontSize={12} />
                <Tooltip formatter={(value: number) => formatIDR(value)} />
                <Legend verticalAlign="top" height={36}/>
                <Bar dataKey="anggaran" name="Anggaran" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realisasi" name="Realisasi" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold mb-6">Proporsi Realisasi</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatIDR(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
               <span className="text-4xl font-extrabold text-indigo-600">{stats.persentase.toFixed(1)}%</span>
               <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider font-semibold">Tercapai</p>
            </div>
          </div>
          
          <div className="mt-8 space-y-4">
             <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600"></div> Realisasi</span>
                <span className="font-semibold">{formatIDR(stats.totalRealisasi)}</span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200"></div> Sisa</span>
                <span className="font-semibold text-gray-500">{formatIDR(stats.sisa)}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={120} className="text-indigo-600" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <Sparkles className="text-indigo-500" size={20} />
              AI Financial Insights
            </h3>
            <button 
              onClick={handleFetchInsight}
              disabled={loadingAi}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-md"
            >
              {loadingAi ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              Generate Insight
            </button>
          </div>
          
          {aiInsight ? (
            <div className="prose prose-indigo max-w-none text-indigo-800 bg-white/50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed border border-indigo-200 shadow-inner">
              {aiInsight}
            </div>
          ) : (
            <p className="text-indigo-600 italic text-sm">
              Klik tombol di atas untuk mendapatkan analisis cerdas berdasarkan data anggaran dan realisasi saat ini.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
