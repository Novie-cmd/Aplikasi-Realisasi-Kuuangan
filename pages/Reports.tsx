
import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Download, Filter, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterData, RealizationData } from '../types';

interface Props {
  masterData: MasterData[];
  realizationData: RealizationData[];
}

type ReportLevel = 'program' | 'kegiatan' | 'sub_kegiatan';

const ReportsPage: React.FC<Props> = ({ masterData, realizationData }) => {
  const [level, setLevel] = useState<ReportLevel>('program');
  const [selectedSubKeg, setSelectedSubKeg] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // List Sub Kegiatan untuk dropdown (hanya muncul di level sub_kegiatan)
  const subKegList = useMemo(() => {
    const unique = Array.from(new Set(masterData.map(m => m.sub_kegiatan?.trim()))).filter(Boolean);
    return ['All', ...unique];
  }, [masterData]);

  const reportData = useMemo(() => {
    const aggregated: Record<string, { 
      name: string; 
      parentName?: string;
      kode: string;
      anggaran: number; 
      pagu_spd: number;
      realisasi: number;
      skpd: string;
    }> = {};

    // 1. Proses Data Master (Anggaran)
    masterData.forEach(m => {
      const mSubKeg = (m.sub_kegiatan || '').trim();
      if (level === 'sub_kegiatan' && selectedSubKeg !== 'All' && mSubKeg !== selectedSubKeg) return;

      let key = '';
      let name = '';
      let kode = '';
      let parentName = '';
      
      const skpdClean = (m.skpd || '').trim();

      if (level === 'program') {
        key = `${skpdClean}-${(m.program || '').trim()}`;
        name = m.program;
        kode = m.kode_program || ''; 
      } else if (level === 'kegiatan') {
        key = `${skpdClean}-${(m.kode_kegiatan || '').trim()}`;
        name = m.kegiatan;
        kode = m.kode_kegiatan;
        parentName = m.program;
      } else {
        // Level Sub Kegiatan: Tampilan per Belanja
        key = `${skpdClean}-${(m.kode_sub_kegiatan || '').trim()}-${(m.kode_belanja || '').trim()}`;
        name = m.belanja;
        kode = m.kode_belanja;
        parentName = m.sub_kegiatan;
      }

      if (!aggregated[key]) {
        aggregated[key] = { 
          name, 
          kode, 
          parentName,
          anggaran: 0, 
          pagu_spd: 0,
          realisasi: 0,
          skpd: m.skpd 
        };
      }
      aggregated[key].anggaran += Number(m.anggaran) || 0;
      aggregated[key].pagu_spd += Number(m.pagu_spd) || 0;
      // Master data mungkin membawa nilai realisasi awal
      aggregated[key].realisasi += Number(m.realisasi) || 0;
    });

    // 2. Tambahkan/Gabungkan Data Realisasi dari transaksi terpisah
    realizationData.forEach(r => {
      const rSubKeg = (r.sub_kegiatan || '').trim();
      if (level === 'sub_kegiatan' && selectedSubKeg !== 'All' && rSubKeg !== selectedSubKeg) return;

      let key = '';
      const skpdClean = (r.skpd || '').trim();

      if (level === 'program') {
        key = `${skpdClean}-${(r.program || '').trim()}`;
      } else if (level === 'kegiatan') {
        key = `${skpdClean}-${(r.kode_kegiatan || '').trim()}`;
      } else {
        key = `${skpdClean}-${(r.kode_sub_kegiatan || '').trim()}-${(r.kode_belanja || '').trim()}`;
      }

      // Jika kunci sudah ada (ada anggaran), tambahkan realisasinya
      if (aggregated[key]) {
        aggregated[key].realisasi += Number(r.realisasi) || 0;
      } else {
        // Jika realisasi ada tapi data master tidak ditemukan (anomali data), tetap tampilkan sebagai baris baru
        aggregated[key] = {
          name: r.belanja || r.kegiatan || r.program || 'Data Tanpa Master',
          kode: r.kode_belanja || r.kode_kegiatan || r.kode_program || '-',
          parentName: level === 'sub_kegiatan' ? r.sub_kegiatan : (level === 'kegiatan' ? r.program : ''),
          anggaran: 0,
          pagu_spd: 0,
          realisasi: Number(r.realisasi) || 0,
          skpd: r.skpd
        };
      }
    });

    // 3. Filter berdasarkan pencarian
    return Object.values(aggregated).filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.skpd.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [masterData, realizationData, level, selectedSubKeg, searchTerm]);

  const totals = useMemo(() => {
    return reportData.reduce((acc, curr) => {
      acc.anggaran += curr.anggaran;
      acc.pagu_spd += curr.pagu_spd;
      acc.realisasi += curr.realisasi;
      return acc;
    }, { anggaran: 0, pagu_spd: 0, realisasi: 0 });
  }, [reportData]);

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID').format(val);

  const exportToExcel = () => {
    const exportData = reportData.map(d => ({
      'SKPD': d.skpd,
      'Induk': d.parentName || '-',
      'Uraian': d.name,
      'Kode': d.kode,
      'Anggaran': d.anggaran,
      'SPD': d.pagu_spd,
      'Realisasi': d.realisasi,
      'Sisa SPD': d.pagu_spd - d.realisasi,
      'Sisa Anggaran': d.anggaran - d.realisasi,
      'Persentase (%)': d.anggaran > 0 ? ((d.realisasi / d.anggaran) * 100).toFixed(2) : 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    XLSX.writeFile(wb, `Laporan_${level}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => { setLevel('program'); setSelectedSubKeg('All'); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${level === 'program' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Per Program
            </button>
            <button 
              onClick={() => { setLevel('kegiatan'); setSelectedSubKeg('All'); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${level === 'kegiatan' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Per Kegiatan
            </button>
            <button 
              onClick={() => setLevel('sub_kegiatan')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${level === 'sub_kegiatan' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Per Sub Kegiatan
            </button>
          </div>
          <button 
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-bold"
          >
            <Download size={18} />
            Cetak Excel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
          {level === 'sub_kegiatan' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pilih Sub Kegiatan</label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <select 
                  value={selectedSubKeg}
                  onChange={(e) => setSelectedSubKeg(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white text-sm font-medium"
                >
                  {subKegList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className={`${level === 'sub_kegiatan' ? 'md:col-span-2' : 'md:col-span-3'} space-y-1`}>
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cari Nama / Uraian / Kode</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder={`Ketik kata kunci pencarian...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">SKPD</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Kode</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                  {level === 'program' ? 'Program' : level === 'kegiatan' ? 'Kegiatan' : 'Uraian Belanja'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Anggaran</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">SPD</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Realisasi</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Sisa SPD</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Sisa Anggaran</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.length > 0 ? (
                <>
                  {reportData.map((row, idx) => {
                    const sisaAnggaran = row.anggaran - row.realisasi;
                    const sisaSpd = row.pagu_spd - row.realisasi;
                    const percent = row.anggaran > 0 ? (row.realisasi / row.anggaran) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 whitespace-nowrap">{row.skpd}</td>
                        <td className="px-6 py-4 text-sm font-mono text-indigo-600">{row.kode}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            {row.parentName && <span className="text-[10px] text-gray-400 uppercase font-bold truncate max-w-[300px]" title={row.parentName}>{row.parentName}</span>}
                            <span className="text-sm font-bold text-gray-900 leading-tight">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-700 text-right">{formatIDR(row.anggaran)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">{formatIDR(row.pagu_spd)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">{formatIDR(row.realisasi)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-amber-600 text-right">{formatIDR(sisaSpd)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-red-500 text-right">{formatIDR(sisaAnggaran)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold ${percent >= 100 ? 'bg-emerald-100 text-emerald-700' : percent >= 50 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'}`}>
                            {percent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-extrabold border-t-2 border-gray-300">
                    <td className="px-6 py-4 text-sm text-gray-900" colSpan={3}>TOTAL JUMLAH</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatIDR(totals.anggaran)}</td>
                    <td className="px-6 py-4 text-sm text-blue-700 text-right">{formatIDR(totals.pagu_spd)}</td>
                    <td className="px-6 py-4 text-sm text-emerald-700 text-right">{formatIDR(totals.realisasi)}</td>
                    <td className="px-6 py-4 text-sm text-amber-700 text-right">{formatIDR(totals.pagu_spd - totals.realisasi)}</td>
                    <td className="px-6 py-4 text-sm text-red-700 text-right">{formatIDR(totals.anggaran - totals.realisasi)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-gray-900 text-white px-2 py-1 rounded text-[10px]">
                        {totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-24 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet size={64} className="text-gray-200" />
                      <p className="text-lg font-bold">Data tidak ditemukan.</p>
                      <p className="text-sm">Silakan import Data Master dan Data Realisasi terlebih dahulu.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
