
import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Download, Filter, Search, Database, Info } from 'lucide-react';
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

  const normalize = (val: string) => (val || '').toString().toLowerCase().trim();

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

    // 1. Map Master Data
    masterData.forEach(m => {
      const mSubKeg = normalize(m.sub_kegiatan);
      if (level === 'sub_kegiatan' && selectedSubKeg !== 'All' && mSubKeg !== normalize(selectedSubKeg)) return;

      let key = '';
      let name = m.program;
      let kode = m.kode_program;
      let parentName = '';
      
      const skpdKey = normalize(m.skpd);

      if (level === 'program') {
        key = `${skpdKey}-${normalize(m.program)}`;
      } else if (level === 'kegiatan') {
        key = `${skpdKey}-${normalize(m.kode_kegiatan)}`;
        name = m.kegiatan; kode = m.kode_kegiatan; parentName = m.program;
      } else {
        key = `${skpdKey}-${normalize(m.kode_sub_kegiatan)}-${normalize(m.kode_belanja)}`;
        name = m.belanja; kode = m.kode_belanja; parentName = m.sub_kegiatan;
      }

      if (!aggregated[key]) {
        aggregated[key] = { name, kode, parentName, anggaran: 0, pagu_spd: 0, realisasi: 0, skpd: m.skpd };
      }
      aggregated[key].anggaran += Number(m.anggaran) || 0;
      aggregated[key].pagu_spd += Number(m.pagu_spd) || 0;
    });

    // 2. Map Realization Data
    realizationData.forEach(r => {
      const rSubKeg = normalize(r.sub_kegiatan);
      if (level === 'sub_kegiatan' && selectedSubKeg !== 'All' && rSubKeg !== normalize(selectedSubKeg)) return;

      let key = '';
      const skpdKey = normalize(r.skpd);

      if (level === 'program') {
        key = `${skpdKey}-${normalize(r.program)}`;
      } else if (level === 'kegiatan') {
        key = `${skpdKey}-${normalize(r.kode_kegiatan)}`;
      } else {
        key = `${skpdKey}-${normalize(r.kode_sub_kegiatan)}-${normalize(r.kode_belanja)}`;
      }

      if (aggregated[key]) {
        aggregated[key].realisasi += Number(r.realisasi) || 0;
      } else {
        // Jika tidak ada master tapi ada realisasi
        aggregated[key] = {
          name: r.belanja || r.program || 'Tanpa Master',
          kode: r.kode_belanja || r.kode_program || '-',
          parentName: level === 'sub_kegiatan' ? r.sub_kegiatan : '',
          anggaran: 0, pagu_spd: 0, realisasi: Number(r.realisasi) || 0, skpd: r.skpd
        };
      }
    });

    return Object.values(aggregated).filter(item => 
      normalize(item.name).includes(normalize(searchTerm)) || 
      normalize(item.kode).includes(normalize(searchTerm))
    );
  }, [masterData, realizationData, level, selectedSubKeg, searchTerm]);

  const totals = useMemo(() => {
    return reportData.reduce((acc, curr) => {
      acc.anggaran += curr.anggaran;
      acc.spd += curr.pagu_spd;
      acc.realisasi += curr.realisasi;
      return acc;
    }, { anggaran: 0, spd: 0, realisasi: 0 });
  }, [reportData]);

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3">
          <Database className="text-indigo-600" size={24} />
          <div>
            <p className="text-[10px] font-bold text-indigo-400 uppercase">Data Master Terdeteksi</p>
            <p className="text-lg font-black text-indigo-900">{masterData.length} Baris</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
          <Database className="text-emerald-600" size={24} />
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase">Data Realisasi Terdeteksi</p>
            <p className="text-lg font-black text-emerald-900">{realizationData.length} Baris</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex-1 flex items-center gap-3 min-w-[300px]">
          <Info className="text-blue-600 flex-shrink-0" size={24} />
          <p className="text-xs text-blue-800 italic">
            Tips: Pastikan <b>SKPD</b> dan <b>Kode</b> pada file Realisasi sama persis dengan file Master agar data dapat terhitung otomatis di kolom Realisasi.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {['program', 'kegiatan', 'sub_kegiatan'].map((l) => (
              <button key={l} onClick={() => setLevel(l as any)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${level === l ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {l.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1200px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">SKPD</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Uraian</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Anggaran</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">SPD</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Realisasi</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Sisa SPD</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Sisa Anggaran</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">%</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reportData.map((row, idx) => {
              const sisaSpd = row.pagu_spd - row.realisasi;
              const sisaAnggaran = row.anggaran - row.realisasi;
              const percent = row.anggaran > 0 ? (row.realisasi / row.anggaran) * 100 : 0;
              return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-xs text-gray-500">{row.skpd}</td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] text-gray-400 font-mono">{row.kode}</p>
                    <p className="text-sm font-bold text-gray-800 leading-tight">{row.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right">{formatIDR(row.anggaran)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-blue-600">{formatIDR(row.pagu_spd)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-emerald-600">{formatIDR(row.realisasi)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-amber-600">{formatIDR(sisaSpd)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-red-500">{formatIDR(sisaAnggaran)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-black ${percent >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {percent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-black border-t-2 border-gray-300">
              <td className="px-6 py-4" colSpan={2}>TOTAL JUMLAH</td>
              <td className="px-6 py-4 text-right">{formatIDR(totals.anggaran)}</td>
              <td className="px-6 py-4 text-right text-blue-700">{formatIDR(totals.spd)}</td>
              <td className="px-6 py-4 text-right text-emerald-700">{formatIDR(totals.realisasi)}</td>
              <td className="px-6 py-4 text-right text-amber-700">{formatIDR(totals.spd - totals.realisasi)}</td>
              <td className="px-6 py-4 text-right text-red-700">{formatIDR(totals.anggaran - totals.realisasi)}</td>
              <td className="px-6 py-4 text-center">
                <span className="bg-black text-white px-2 py-1 rounded text-[10px]">
                  {totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(1) : 0}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsPage;
