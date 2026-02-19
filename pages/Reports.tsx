
import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Download, Filter, Search, Database, Info, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterData, RealizationData } from '../types';

interface Props {
  masterData: MasterData[];
  realizationData: RealizationData[];
}

type ReportLevel = 'program' | 'kegiatan' | 'sub_kegiatan';

const ReportsPage: React.FC<Props> = ({ masterData, realizationData }) => {
  const [level, setLevel] = useState<ReportLevel>('program');
  const [searchTerm, setSearchTerm] = useState('');

  // Fungsi normalisasi tingkat tinggi untuk membersihkan karakter aneh dari Excel
  const clean = (val: any): string => {
    if (val === null || val === undefined) return '';
    return val.toString()
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // Hapus zero-width & non-breaking spaces
      .replace(/\s+/g, ' ') // Ubah multiple space jadi single space
      .trim()
      .toLowerCase();
  };

  const reportData = useMemo(() => {
    // 1. Buat Mapping Realisasi berdasarkan SKPD + Kode Belanja
    // Ini adalah kunci paling unik untuk mencocokkan realisasi ke budget line
    const realizationMap: Record<string, number> = {};
    realizationData.forEach(r => {
      const rKey = `${clean(r.skpd)}|${clean(r.kode_belanja)}`;
      realizationMap[rKey] = (realizationMap[rKey] || 0) + (Number(r.realisasi) || 0);
    });

    const aggregated: Record<string, { 
      name: string; 
      parentName?: string;
      kode: string;
      anggaran: number; 
      pagu_spd: number;
      realisasi: number;
      skpd: string;
      isUnmapped?: boolean;
    }> = {};

    // 2. Iterasi Master Data untuk membangun struktur laporan
    masterData.forEach(m => {
      let key = '';
      let name = '';
      let kode = '';
      let parentName = '';
      const skpdClean = clean(m.skpd);

      // Tentukan kunci agregasi berdasarkan level yang dipilih
      if (level === 'program') {
        key = `${skpdClean}|${clean(m.program)}`;
        name = m.program;
        kode = m.kode_program;
      } else if (level === 'kegiatan') {
        key = `${skpdClean}|${clean(m.kode_kegiatan)}`;
        name = m.kegiatan;
        kode = m.kode_kegiatan;
        parentName = m.program;
      } else {
        // Level Sub Kegiatan / Rincian Belanja
        key = `${skpdClean}|${clean(m.kode_sub_kegiatan)}|${clean(m.kode_belanja)}`;
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

      // Tambahkan nilai anggaran dari master
      aggregated[key].anggaran += Number(m.anggaran) || 0;
      aggregated[key].pagu_spd += Number(m.pagu_spd) || 0;

      // Cari apakah ada realisasi untuk item master ini
      const mKey = `${clean(m.skpd)}|${clean(m.kode_belanja)}`;
      if (realizationMap[mKey]) {
        aggregated[key].realisasi += realizationMap[mKey];
        // Hapus dari map agar kita tahu data mana yang belum terpetakan di akhir
        delete realizationMap[mKey];
      }
    });

    // 3. Tambahkan data realisasi yang TIDAK ditemukan di Master (Anomali)
    // Jika masih ada sisa di realizationMap, berarti ada transaksi untuk kode belanja yang tidak ada anggarannya
    Object.entries(realizationMap).forEach(([rKey, value]) => {
      const [skpdName] = rKey.split('|');
      const unmappedKey = `unmapped|${rKey}`;
      
      // Cari data asli untuk mendapatkan nama belanja
      const original = realizationData.find(rd => `${clean(rd.skpd)}|${clean(rd.kode_belanja)}` === rKey);

      aggregated[unmappedKey] = {
        name: original?.belanja || 'Kode Belanja Tidak Terdaftar di Master',
        kode: original?.kode_belanja || '?',
        parentName: 'DATA TIDAK TERPETAKAN (ANOMALI)',
        anggaran: 0,
        pagu_spd: 0,
        realisasi: value,
        skpd: original?.skpd || skpdName.toUpperCase(),
        isUnmapped: true
      };
    });

    // 4. Filter berdasarkan pencarian
    return Object.values(aggregated).filter(item => 
      clean(item.name).includes(clean(searchTerm)) || 
      clean(item.kode).includes(clean(searchTerm)) ||
      clean(item.skpd).includes(clean(searchTerm))
    );
  }, [masterData, realizationData, level, searchTerm]);

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
      {/* Header Statistics & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Database size={20} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Master Budget Lines</p>
            <p className="text-xl font-black">{masterData.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Database size={20} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Transaksi Realisasi</p>
            <p className="text-xl font-black">{realizationData.length}</p>
          </div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><Info size={20} /></div>
          <p className="text-[10px] text-amber-800 leading-tight font-medium">
            Sistem mencocokkan data berdasarkan <b>SKPD + Kode Belanja</b>. Pastikan kolom ini sama persis di kedua file.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border">
          {['program', 'kegiatan', 'sub_kegiatan'].map((l) => (
            <button 
              key={l} 
              onClick={() => setLevel(l as any)} 
              className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${level === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {l.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text" 
            placeholder="Cari Nama / Uraian / Kode / SKPD..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1200px]">
          <thead className="bg-gray-50/50 border-b">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKPD</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Uraian / Kode</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Anggaran</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">SPD</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Realisasi</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sisa SPD</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sisa Anggaran</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">%</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reportData.map((row, idx) => {
              const sisaSpd = row.pagu_spd - row.realisasi;
              const sisaAnggaran = row.anggaran - row.realisasi;
              const percent = row.anggaran > 0 ? (row.realisasi / row.anggaran) * 100 : 0;
              
              return (
                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${row.isUnmapped ? 'bg-red-50/30' : ''}`}>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">{row.skpd}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{row.kode}</span>
                        {row.isUnmapped && <span className="bg-red-100 text-red-700 text-[8px] px-1 rounded font-bold uppercase flex items-center gap-1"><AlertTriangle size={8}/> Anomali</span>}
                      </div>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{row.name}</p>
                      {row.parentName && <p className="text-[9px] text-gray-400 mt-1 uppercase font-medium">{row.parentName}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-gray-700">{formatIDR(row.anggaran)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-blue-600">{formatIDR(row.pagu_spd)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-emerald-600">{formatIDR(row.realisasi)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-amber-600">{formatIDR(sisaSpd)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-red-500">{formatIDR(sisaAnggaran)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${percent >= 100 ? 'bg-emerald-500' : percent >= 80 ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                          style={{ width: `${Math.min(100, percent)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-black text-gray-600">{percent.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {/* Table Footer / Total */}
            <tr className="bg-gray-900 text-white font-black">
              <td className="px-6 py-5 text-sm uppercase tracking-widest" colSpan={2}>Total Seluruhnya</td>
              <td className="px-6 py-5 text-sm text-right">{formatIDR(totals.anggaran)}</td>
              <td className="px-6 py-5 text-sm text-right text-blue-300">{formatIDR(totals.spd)}</td>
              <td className="px-6 py-5 text-sm text-right text-emerald-300">{formatIDR(totals.realisasi)}</td>
              <td className="px-6 py-5 text-sm text-right text-amber-300">{formatIDR(totals.spd - totals.realisasi)}</td>
              <td className="px-6 py-5 text-sm text-right text-red-300">{formatIDR(totals.anggaran - totals.realisasi)}</td>
              <td className="px-6 py-5 text-center">
                <span className="text-xl font-black">
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
