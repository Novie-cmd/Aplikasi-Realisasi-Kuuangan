
import React, { useMemo, useState, useEffect } from 'react';
import { FileText, Download, Search, ChevronDown, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterData, RealizationData } from '../types';

interface Props {
  masterData: MasterData[];
  realizationData: RealizationData[];
}

type ReportLevel = 'program' | 'kegiatan' | 'sub_kegiatan' | 'belanja';

const ReportsPage: React.FC<Props> = ({ masterData, realizationData }) => {
  const [level, setLevel] = useState<ReportLevel>('program');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState<string>('all');

  useEffect(() => {
    setSelectedParent('all');
  }, [level]);

  const parentOptions = useMemo(() => {
    if (level === 'kegiatan') return Array.from(new Set(masterData.map(item => item.program).filter(Boolean))).sort();
    if (level === 'sub_kegiatan') return Array.from(new Set(masterData.map(item => item.kegiatan).filter(Boolean))).sort();
    if (level === 'belanja') return Array.from(new Set(masterData.map(item => item.sub_kegiatan).filter(Boolean))).sort();
    return [];
  }, [masterData, level]);

  const reportData = useMemo(() => {
    const groups: Record<string, { 
      name: string; 
      code: string; 
      kode_program: string;
      kode_kegiatan: string;
      kode_sub_kegiatan: string;
      kode_belanja: string;
      parentName?: string;
      anggaran: number; 
      realisasi: number;
      pagu_spd: number;
    }> = {};

    masterData.forEach(item => {
      let key = '';
      let name = '';
      let code = '';
      let parentName = '';
      let shouldInclude = true;

      switch (level) {
        case 'program':
          key = item.kode_program || item.program;
          name = item.program;
          code = item.kode_program;
          break;
        case 'kegiatan':
          if (selectedParent !== 'all' && item.program !== selectedParent) shouldInclude = false;
          key = item.kode_kegiatan || item.kegiatan;
          name = item.kegiatan;
          code = item.kode_kegiatan;
          parentName = item.program;
          break;
        case 'sub_kegiatan':
          if (selectedParent !== 'all' && item.kegiatan !== selectedParent) shouldInclude = false;
          key = item.kode_sub_kegiatan || item.sub_kegiatan;
          name = item.sub_kegiatan;
          code = item.kode_sub_kegiatan;
          parentName = item.kegiatan;
          break;
        case 'belanja':
          if (selectedParent !== 'all' && item.sub_kegiatan !== selectedParent) shouldInclude = false;
          key = item.kode_belanja || item.belanja;
          name = item.belanja; 
          code = item.kode_belanja;
          parentName = item.sub_kegiatan;
          break;
      }

      if (shouldInclude && key) {
        if (!groups[key]) {
          groups[key] = { 
            name, 
            code, 
            kode_program: item.kode_program,
            kode_kegiatan: item.kode_kegiatan,
            kode_sub_kegiatan: item.kode_sub_kegiatan,
            kode_belanja: item.kode_belanja,
            parentName, 
            anggaran: 0, 
            realisasi: 0, 
            pagu_spd: 0 
          };
        }
        groups[key].anggaran += Number(item.anggaran) || 0;
        groups[key].pagu_spd += Number(item.pagu_spd) || 0;
      }
    });

    realizationData.forEach(item => {
      let key = '';
      let shouldInclude = true;

      switch (level) {
        case 'program': key = item.kode_program || item.program; break;
        case 'kegiatan':
          if (selectedParent !== 'all' && item.program !== selectedParent) shouldInclude = false;
          key = item.kode_kegiatan || item.kegiatan;
          break;
        case 'sub_kegiatan':
          if (selectedParent !== 'all' && item.kegiatan !== selectedParent) shouldInclude = false;
          key = item.kode_sub_kegiatan || item.sub_kegiatan;
          break;
        case 'belanja':
          if (selectedParent !== 'all' && item.sub_kegiatan !== selectedParent) shouldInclude = false;
          key = item.kode_belanja || item.belanja;
          break;
      }

      if (shouldInclude && key && groups[key]) {
        groups[key].realisasi += Number(item.realisasi) || 0;
      }
    });

    return Object.values(groups)
      .filter(item => 
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.kode_belanja || '').includes(searchTerm)
      )
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [masterData, realizationData, level, searchTerm, selectedParent]);

  const exportToExcel = () => {
    if (reportData.length === 0) return;
    const exportData = reportData.map(item => ({
      'Kode Program': item.kode_program,
      'Kode Kegiatan': item.kode_kegiatan,
      'Kode Sub': item.kode_sub_kegiatan,
      'Kode Belanja': item.kode_belanja,
      [getLabelName()]: item.name,
      'Anggaran': item.anggaran,
      'Pagu SPD': item.pagu_spd,
      'Realisasi': item.realisasi,
      'Sisa Pagu': item.pagu_spd - item.realisasi,
      'Sisa Anggaran': item.anggaran - item.realisasi,
      'Persentase (%)': item.anggaran > 0 ? ((item.realisasi / item.anggaran) * 100).toFixed(2) : '0'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan ${level}`);
    XLSX.writeFile(workbook, `Laporan_${level}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val);

  function getLabelName() {
    switch (level) {
      case 'program': return 'Program';
      case 'kegiatan': return 'Kegiatan';
      case 'sub_kegiatan': return 'Sub Kegiatan';
      case 'belanja': return 'Belanja';
      default: return 'Nama';
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select 
                value={level}
                onChange={(e) => setLevel(e.target.value as ReportLevel)}
                className="appearance-none bg-indigo-600 text-white px-5 py-2.5 pr-12 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-200 outline-none cursor-pointer transition-all shadow-lg"
              >
                <option value="program">Per Program</option>
                <option value="kegiatan">Per Kegiatan</option>
                <option value="sub_kegiatan">Per Sub Kegiatan</option>
                <option value="belanja">Per Belanja</option>
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
            </div>
            
            <button
              onClick={exportToExcel}
              disabled={reportData.length === 0}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-100 px-5 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition shadow-sm disabled:opacity-50"
            >
              <Download size={18} />
              Export Excel
            </button>
          </div>

          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={`Cari ${getLabelName()} atau Kode...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:border-indigo-500 focus:ring-0 outline-none transition-all"
            />
          </div>
        </div>

        {level !== 'program' && (
          <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
              <Filter size={16} />
              <span>Filter Hirarki:</span>
            </div>
            <select
              value={selectedParent}
              onChange={(e) => setSelectedParent(e.target.value)}
              className="w-full md:w-[450px] bg-white border-2 border-gray-100 rounded-xl px-4 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            >
              <option value="all">-- Semua Data --</option>
              {parentOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">K. Program</th>
                {level !== 'program' && <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">K. Kegiatan</th>}
                {level !== 'program' && level !== 'kegiatan' && <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">K. Sub</th>}
                {level === 'belanja' && <th className="px-4 py-4 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">K. Belanja</th>}
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{getLabelName()}</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Anggaran</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Pagu SPD</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Realisasi</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Sisa Pagu</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Sisa Anggaran</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.length > 0 ? reportData.map((row, idx) => {
                const sisaPagu = row.pagu_spd - row.realisasi;
                const sisaAnggaran = row.anggaran - row.realisasi;
                const percentage = row.anggaran > 0 ? (row.realisasi / row.anggaran) * 100 : 0;
                
                return (
                  <tr key={`${row.code}-${idx}`} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-4 py-5 text-[11px] font-mono text-gray-400">{row.kode_program}</td>
                    {level !== 'program' && <td className="px-4 py-5 text-[11px] font-mono text-gray-400">{row.kode_kegiatan}</td>}
                    {level !== 'program' && level !== 'kegiatan' && <td className="px-4 py-5 text-[11px] font-mono text-gray-400">{row.kode_sub_kegiatan}</td>}
                    {level === 'belanja' && <td className="px-4 py-5 text-[11px] font-mono text-indigo-500 font-bold">{row.kode_belanja}</td>}
                    
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-900 leading-tight mb-1">{row.name || 'N/A'}</div>
                      {row.parentName && (
                        <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider truncate max-w-[200px]" title={row.parentName}>
                          {row.parentName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-700 text-right font-medium">{formatIDR(row.anggaran)}</td>
                    <td className="px-4 py-5 text-sm text-blue-600 text-right font-semibold">{formatIDR(row.pagu_spd)}</td>
                    <td className="px-4 py-5 text-sm text-emerald-600 text-right font-bold">{formatIDR(row.realisasi)}</td>
                    <td className={`px-4 py-5 text-sm text-right font-bold ${sisaPagu < 0 ? 'text-rose-600' : 'text-gray-600'}`}>{formatIDR(sisaPagu)}</td>
                    <td className={`px-4 py-5 text-sm text-right font-bold ${sisaAnggaran < 0 ? 'text-rose-600' : 'text-gray-600'}`}>{formatIDR(sisaAnggaran)}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center gap-1 min-w-[70px]">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${percentage >= 100 ? 'bg-emerald-500' : percentage > 80 ? 'bg-blue-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500">{percentage.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-bold">Data laporan tidak ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
            {reportData.length > 0 && (
              <tfoot className="bg-indigo-900 text-white font-bold sticky bottom-0">
                <tr>
                  <td colSpan={level === 'belanja' ? 5 : level === 'sub_kegiatan' ? 4 : level === 'kegiatan' ? 3 : 2} className="px-6 py-4 text-right text-xs uppercase tracking-widest">Total</td>
                  <td className="px-4 py-4 text-right text-sm">{formatIDR(reportData.reduce((a, b) => a + b.anggaran, 0))}</td>
                  <td className="px-4 py-4 text-right text-sm">{formatIDR(reportData.reduce((a, b) => a + b.pagu_spd, 0))}</td>
                  <td className="px-4 py-4 text-right text-sm text-emerald-300">{formatIDR(reportData.reduce((a, b) => a + b.realisasi, 0))}</td>
                  <td className="px-4 py-4 text-right text-sm">{formatIDR(reportData.reduce((a, b) => a + (b.pagu_spd - b.realisasi), 0))}</td>
                  <td className="px-4 py-4 text-right text-sm">{formatIDR(reportData.reduce((a, b) => a + (b.anggaran - b.realisasi), 0))}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs">
                      {( (reportData.reduce((a, b) => a + b.realisasi, 0) / (reportData.reduce((a, b) => a + b.anggaran, 0) || 1)) * 100 ).toFixed(1)}%
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
