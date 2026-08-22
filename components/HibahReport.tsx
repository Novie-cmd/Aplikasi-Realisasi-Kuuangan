import React, { useMemo, useState } from 'react';
import { Download, Search, Printer, Gift, Eye, X, List, AlertCircle, AlertTriangle, FileText, CheckCircle2, Copy, Filter, ChevronRight, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterData, RealizationData, HibahData } from '../types';
import SearchableSelect from './SearchableSelect';
import { motion, AnimatePresence } from 'motion/react';
import { clean, formatIDR } from './reportUtils';

interface Props {
  hibahData: HibahData[];
  realizationData: RealizationData[];
  masterData?: MasterData[];
}

export interface StandardHibahAccount {
  kode: string;
  nama: string;
  short: string;
  kategori: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const TARGET_HIBAH_ACCOUNTS: StandardHibahAccount[] = [
  {
    kode: '5.1.05.01.001.00001',
    nama: 'Belanja Hibah kepada Pemerintah Pusat / Daerah / Lembaga',
    short: 'Hibah Pemerintah / Lembaga',
    kategori: 'Pemerintah',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  {
    kode: '5.1.05.07.001.00001',
    nama: 'Belanja Hibah kepada Badan / Lembaga / Organisasi Kemasyarakatan',
    short: 'Hibah Badan / Ormas',
    kategori: 'Ormas & Lembaga',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  {
    kode: '5.1.05.05.001.00001',
    nama: 'Belanja Hibah Uang kepada Badan dan Lembaga yang Ditetapkan oleh Pemerintah',
    short: 'Hibah Uang Badan & Lembaga',
    kategori: 'Badan & Lembaga',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  {
    kode: '5.1.05.05.003.00001',
    nama: 'Belanja Hibah Uang kepada Organisasi Kemasyarakatan',
    short: 'Hibah Uang Ormas',
    kategori: 'Ormas',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
  {
    kode: '5.1.02.01.001.00040',
    nama: 'Belanja Barang / Jasa untuk Diserahkan kepada Masyarakat / Pihak Ketiga',
    short: 'Belanja Barang/Jasa Pihak Ketiga',
    kategori: 'Pihak Ketiga',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    borderColor: 'border-rose-200'
  }
];

export const HibahReport: React.FC<Props> = ({ hibahData = [], realizationData = [], masterData = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRekening, setSelectedRekening] = useState<string>('all');
  const [selectedKegiatan, setSelectedKegiatan] = useState<string>('all');
  const [selectedSubKegiatan, setSelectedSubKegiatan] = useState<string>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Modal preview keterangan belanja
  const [previewModal, setPreviewModal] = useState<{
    item: HibahData;
    realizations: RealizationData[];
  } | null>(null);

  // Helper untuk mencari data realisasi yang cocok dengan item hibah
  const findMatchingRealizations = (hibahItem: HibahData): RealizationData[] => {
    const itemRekening = clean(hibahItem.kode_rekening || '');
    const itemSub = clean(hibahItem.sub_kegiatan || '');
    const itemKodeSub = clean(hibahItem.kode_sub_kegiatan || '');
    const itemPenerima = clean(hibahItem.penerima_hibah || '');
    const itemUraian = clean(hibahItem.uraian || '');

    return realizationData.filter(r => {
      const rBelanja = clean(r.kode_belanja || '');
      const rSub = clean(r.sub_kegiatan || '');
      const rKodeSub = clean(r.kode_sub_kegiatan || '');
      const rKet = clean(r.keterangan_dokumen || '');

      // 1. Rekening cocok dan Sub Kegiatan cocok
      if (itemRekening && rBelanja === itemRekening) {
        if (itemKodeSub && rKodeSub && itemKodeSub === rKodeSub) return true;
        if (itemSub && rSub && itemSub === rSub) return true;
        // Jika tidak ada kode sub kegiatan spesifik, periksa apakah nama penerima atau uraian ada di keterangan
        if (itemPenerima && rKet.includes(itemPenerima)) return true;
        if (itemUraian && rKet.includes(itemUraian)) return true;
        return true;
      }

      // 2. Cocok berdasarkan pencarian teks penerima di keterangan belanja
      if (itemPenerima && itemPenerima.length > 3 && rKet.includes(itemPenerima)) {
        return true;
      }

      return false;
    });
  };

  // Kumpulan unik daftar kegiatan & sub kegiatan & kode rekening
  const kegiatanList = useMemo(() => {
    return Array.from(new Set(hibahData.map(h => h.kegiatan).filter(Boolean))).sort();
  }, [hibahData]);

  const subKegiatanList = useMemo(() => {
    return Array.from(new Set(hibahData.map(h => h.sub_kegiatan).filter(Boolean))).sort();
  }, [hibahData]);

  const allRekeningList = useMemo(() => {
    const map = new Map<string, string>();
    // Tambahkan 5 target accounts dulu
    TARGET_HIBAH_ACCOUNTS.forEach(t => {
      map.set(t.kode, `${t.kode} - ${t.short}`);
    });
    // Tambahkan dari hibahData jika ada
    hibahData.forEach(h => {
      if (h.kode_rekening && !map.has(h.kode_rekening)) {
        map.set(h.kode_rekening, `${h.kode_rekening} ${h.uraian ? `(${h.uraian})` : ''}`);
      }
    });
    return Array.from(map.entries()).map(([kode, label]) => ({
      value: kode,
      label
    }));
  }, [hibahData]);

  // Rekapitulasi per Kode Rekening Target
  const accountSummaries = useMemo(() => {
    return TARGET_HIBAH_ACCOUNTS.map(acc => {
      const matchingItems = hibahData.filter(h => clean(h.kode_rekening || '') === clean(acc.kode));
      const totalAnggaran = matchingItems.reduce((sum, item) => sum + (item.anggaran || 0), 0);
      const totalSpd = matchingItems.reduce((sum, item) => sum + (item.spd || 0), 0);
      const totalRealisasi = matchingItems.reduce((sum, item) => sum + (item.realisasi || 0), 0);
      const percent = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;
      
      // Ambil transaksi realisasi terkait
      const matchedRealizations = realizationData.filter(r => clean(r.kode_belanja || '') === clean(acc.kode));
      const totalRealizationTrans = matchedRealizations.length;

      return {
        ...acc,
        itemCount: matchingItems.length,
        totalAnggaran,
        totalSpd,
        totalRealisasi,
        sisaSpd: totalSpd - totalRealisasi,
        sisaAnggaran: totalAnggaran - totalRealisasi,
        percent,
        transactionCount: totalRealizationTrans
      };
    });
  }, [hibahData, realizationData]);

  // Filter Data Utama
  const filteredData = useMemo(() => {
    return hibahData.filter(item => {
      // Filter Kode Rekening
      if (selectedRekening !== 'all') {
        if (clean(item.kode_rekening || '') !== clean(selectedRekening)) return false;
      }

      // Filter Kegiatan
      if (selectedKegiatan !== 'all' && item.kegiatan !== selectedKegiatan) return false;

      // Filter Sub Kegiatan
      if (selectedSubKegiatan !== 'all' && item.sub_kegiatan !== selectedSubKegiatan) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = clean(searchTerm);
        const matches = clean(item.kegiatan).includes(q) ||
                        clean(item.sub_kegiatan).includes(q) ||
                        clean(item.kode_kegiatan).includes(q) ||
                        clean(item.kode_sub_kegiatan).includes(q) ||
                        clean(item.kode_rekening || '').includes(q) ||
                        clean(item.uraian || '').includes(q) ||
                        clean(item.penerima_hibah || '').includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [hibahData, selectedRekening, selectedKegiatan, selectedSubKegiatan, searchTerm]);

  // Totals
  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      acc.anggaran += curr.anggaran || 0;
      acc.spd += curr.spd || 0;
      acc.realisasi += curr.realisasi || 0;
      acc.sisa_spd += (curr.spd || 0) - (curr.realisasi || 0);
      acc.sisa_realisasi += (curr.anggaran || 0) - (curr.realisasi || 0);
      return acc;
    }, { anggaran: 0, spd: 0, realisasi: 0, sisa_spd: 0, sisa_realisasi: 0 });
  }, [filteredData]);

  const validationAlerts = useMemo(() => {
    const alerts = hibahData.filter(item => (item.realisasi || 0) > (item.spd || 0));
    return {
      count: alerts.length,
      totalOver: alerts.reduce((acc, curr) => acc + ((curr.realisasi || 0) - (curr.spd || 0)), 0)
    };
  }, [hibahData]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const title = `Laporan_Dana_Hibah_Per_Rekening_${selectedRekening !== 'all' ? selectedRekening : 'Semua'}_${new Date().toISOString().substring(0, 10)}`;
    const dataToExport = filteredData.map((row, idx) => {
      const matchReal = findMatchingRealizations(row);
      const previewKet = matchReal.length > 0
        ? matchReal.map(r => `[${r.tanggal || '-'}] ${r.keterangan_dokumen || '-'} (Rp ${formatIDR(r.realisasi)})`).join(' | ')
        : (row.uraian || '-');

      return {
        'No': idx + 1,
        'Kode Rekening': row.kode_rekening || '-',
        'Uraian / Jenis Belanja': row.uraian || '-',
        'Penerima Hibah': row.penerima_hibah || '-',
        'Preview Keterangan Belanja': previewKet,
        'Kode Sub Kegiatan': row.kode_sub_kegiatan || '-',
        'Nama Sub Kegiatan': row.sub_kegiatan || '-',
        'Kode Kegiatan': row.kode_kegiatan || '-',
        'Nama Kegiatan': row.kegiatan || '-',
        'Pagu Anggaran': row.anggaran || 0,
        'Pagu SPD': row.spd || 0,
        'Realisasi': row.realisasi || 0,
        'Sisa SPD': (row.spd || 0) - (row.realisasi || 0),
        'Sisa Anggaran': (row.anggaran || 0) - (row.realisasi || 0),
        '% Capaian': (row.anggaran || 0) > 0 ? (((row.realisasi || 0) / (row.anggaran || 0)) * 100).toFixed(2) + '%' : '0%'
      };
    });

    const totalRow = {
      'No': '',
      'Kode Rekening': 'TOTAL',
      'Uraian / Jenis Belanja': 'TOTAL SELURUHNYA (HIBAH)',
      'Penerima Hibah': '',
      'Preview Keterangan Belanja': '',
      'Kode Sub Kegiatan': '',
      'Nama Sub Kegiatan': '',
      'Kode Kegiatan': '',
      'Nama Kegiatan': '',
      'Pagu Anggaran': totals.anggaran,
      'Pagu SPD': totals.spd,
      'Realisasi': totals.realisasi,
      'Sisa SPD': totals.sisa_spd,
      'Sisa Anggaran': totals.sisa_realisasi,
      '% Capaian': totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(2) + '%' : '0%'
    };
    dataToExport.push(totalRow as any);

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Hibah');
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Gift size={20} /></div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Total Anggaran Hibah</p>
            <p className="text-lg font-black text-gray-800">Rp {formatIDR(totals.anggaran)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Layers size={20} /></div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Total Pagu SPD Hibah</p>
            <p className="text-lg font-black text-blue-600">Rp {formatIDR(totals.spd)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Total Realisasi Hibah</p>
            <p className="text-lg font-black text-emerald-600">
              Rp {formatIDR(totals.realisasi)} 
              <span className="text-xs text-gray-400 font-normal ml-2">
                ({totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(1) : 0}%)
              </span>
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-lg ${validationAlerts.count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
            {validationAlerts.count > 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Status Validasi SPD</p>
            <p className={`text-sm font-bold ${validationAlerts.count > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {validationAlerts.count > 0 ? `${validationAlerts.count} Melebihi SPD` : 'Semua Sesuai Pagu'}
            </p>
          </div>
        </div>
      </div>

      {/* 5 Kode Rekening Target Recap Cards */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Gift className="text-indigo-600" size={20} />
              Rekapitulasi Belanja Hibah Berdasarkan 5 Kode Rekening
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Klik salah satu kode rekening di bawah untuk memfilter data dan melihat preview keterangan belanja langsung.
            </p>
          </div>
          {selectedRekening !== 'all' && (
            <button
              onClick={() => setSelectedRekening('all')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <X size={14} />
              Reset Filter Rekening ({selectedRekening})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {accountSummaries.map((acc) => {
            const isSelected = selectedRekening === acc.kode;
            return (
              <div
                key={acc.kode}
                onClick={() => setSelectedRekening(isSelected ? 'all' : acc.kode)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full shadow-xs border border-indigo-200">
                    <CheckCircle2 size={10} /> Aktif
                  </div>
                )}
                <div>
                  <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${acc.badgeBg} ${acc.badgeText} ${acc.borderColor} mb-1.5`}>
                    {acc.kode}
                  </span>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug" title={acc.nama}>
                    {acc.short}
                  </h4>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100/80 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400 font-medium">Pagu:</span>
                    <span className="font-bold text-gray-800">Rp {formatIDR(acc.totalAnggaran)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400 font-medium">Realisasi:</span>
                    <span className="font-bold text-emerald-600">Rp {formatIDR(acc.totalRealisasi)}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-1">
                    <div
                      className={`h-full ${acc.percent >= 90 ? 'bg-emerald-500' : acc.percent >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, acc.percent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 pt-0.5">
                    <span>{acc.itemCount} Penerima/Item</span>
                    <span className="font-bold text-gray-700">{acc.percent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Action Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-sm font-black text-gray-750 uppercase tracking-widest flex items-center gap-2">
            <Filter size={16} className="text-indigo-600" />
            Filter & Pencarian Laporan Hibah
          </h3>
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text" 
                placeholder="Cari Kode Rekening / Penerima / Uraian / Keterangan Belanja..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              title="Unduh format Excel (.xlsx)"
            >
              <Download size={18} />
              <span>Excel</span>
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              title="Cetak Laporan Format Landscape"
            >
              <Printer size={18} />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Chips for Target Accounts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-2 border-t border-gray-50">
          <span className="text-xs font-bold text-gray-400 whitespace-nowrap mr-1">Kode Rekening:</span>
          <button
            onClick={() => setSelectedRekening('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedRekening === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua Rekening ({hibahData.length})
          </button>
          {TARGET_HIBAH_ACCOUNTS.map(acc => {
            const count = hibahData.filter(h => clean(h.kode_rekening || '') === clean(acc.kode)).length;
            return (
              <button
                key={acc.kode}
                onClick={() => setSelectedRekening(acc.kode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedRekening === acc.kode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="font-mono text-[11px]">{acc.kode}</span>
                <span className="text-[10px] opacity-80">({acc.short})</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${selectedRekening === acc.kode ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Dropdown Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-50">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Filter Kode Rekening Hibah</label>
            <select
              value={selectedRekening}
              onChange={(e) => setSelectedRekening(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Kode Rekening</option>
              {allRekeningList.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <SearchableSelect 
            label="Filter Kegiatan Hibah"
            options={kegiatanList}
            value={selectedKegiatan}
            onChange={setSelectedKegiatan}
            placeholder="Semua Kegiatan..."
          />

          <SearchableSelect 
            label="Filter Sub Kegiatan Hibah"
            options={subKegiatanList}
            value={selectedSubKegiatan}
            onChange={setSelectedSubKegiatan}
            placeholder="Semua Sub Kegiatan..."
          />
        </div>
      </div>

      {/* Main Hibah Data Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden overflow-x-auto print:shadow-none print:border-none print:overflow-visible">
        {/* Printable Header */}
        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight">Laporan Realisasi Dana Hibah</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem Informasi Realisasi Keuangan - Data Hibah Berdasarkan Kode Rekening</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-left text-xs border-y py-3">
            <div>
              <p><b>Filter Rekening:</b> {selectedRekening === 'all' ? 'Semua Kode Rekening' : selectedRekening}</p>
              <p><b>Filter Kegiatan:</b> {selectedKegiatan === 'all' ? 'Semua' : selectedKegiatan}</p>
              <p><b>Filter Sub Kegiatan:</b> {selectedSubKegiatan === 'all' ? 'Semua' : selectedSubKegiatan}</p>
              <p><b>Total Anggaran:</b> Rp {formatIDR(totals.anggaran)}</p>
            </div>
            <div className="text-right">
              <p><b>Total Realisasi:</b> Rp {formatIDR(totals.realisasi)}</p>
              <p><b>Persentase:</b> {totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(1) : 0}%</p>
              <p><b>Tanggal Cetak:</b> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <table className="w-full text-left min-w-[1450px] print:min-w-0 print:text-[8px]">
          <thead className="bg-gray-50/70 border-b">
            <tr>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">No</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Kode Rekening</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Uraian Rekening / Belanja</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Penerima Hibah</th>
              <th className="px-5 py-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest print:px-1 print:py-1.5 print:text-[7.5px] print:text-black min-w-[220px]">Preview Keterangan Belanja</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Sub Kegiatan</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Anggaran</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">SPD</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Realisasi</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Sisa SPD</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Sisa Anggaran</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">%</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((row, idx) => {
              const matchingRealizations = findMatchingRealizations(row);
              const sSpd = (row.spd || 0) - (row.realisasi || 0);
              const sReal = (row.anggaran || 0) - (row.realisasi || 0);
              const percent = (row.anggaran || 0) > 0 ? ((row.realisasi || 0) / (row.anggaran || 0)) * 100 : 0;
              const isOverSpd = (row.realisasi || 0) > (row.spd || 0);

              // Cari info badge akun
              const targetMeta = TARGET_HIBAH_ACCOUNTS.find(a => clean(a.kode) === clean(row.kode_rekening || ''));

              return (
                <tr key={row.id || idx} className={`hover:bg-gray-50 transition-colors ${isOverSpd ? 'bg-orange-50/40' : ''}`}>
                  <td className="px-5 py-4 text-xs font-bold text-gray-400 print:px-1 print:py-1 print:text-[7px]">
                    {idx + 1}
                  </td>
                  
                  {/* Kode Rekening */}
                  <td className="px-5 py-4 print:px-1 print:py-1">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border inline-block w-fit ${
                        targetMeta ? `${targetMeta.badgeBg} ${targetMeta.badgeText} ${targetMeta.borderColor}` : 'bg-gray-100 text-gray-700 border-gray-200'
                      } print:border-none print:p-0 print:text-[7px] print:text-black`}>
                        {row.kode_rekening || '-'}
                      </span>
                      {targetMeta && (
                        <span className="text-[10px] text-gray-400 font-medium print:hidden">
                          {targetMeta.short}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Uraian */}
                  <td className="px-5 py-4 max-w-[240px] print:px-1 print:py-1 print:max-w-none">
                    <p className="text-sm font-bold text-gray-800 leading-tight print:text-[7px] print:text-black" title={row.uraian}>
                      {row.uraian || '-'}
                    </p>
                  </td>

                  {/* Penerima Hibah */}
                  <td className="px-5 py-4 max-w-[200px] print:px-1 print:py-1 print:max-w-none">
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-indigo-950 leading-tight print:text-[7px] print:text-black" title={row.penerima_hibah}>
                        {row.penerima_hibah || '-'}
                      </p>
                    </div>
                  </td>

                  {/* Preview Keterangan Belanja */}
                  <td className="px-5 py-4 max-w-[280px] print:px-1 print:py-1 print:max-w-none">
                    <div className="space-y-1.5">
                      {matchingRealizations.length > 0 ? (
                        <>
                          <div className="bg-indigo-50/70 p-2 rounded-lg border border-indigo-100/80 text-xs text-gray-800 print:bg-transparent print:border-none print:p-0 print:text-[7px]">
                            <p className="font-medium line-clamp-2 leading-relaxed" title={matchingRealizations[0].keterangan_dokumen}>
                              {matchingRealizations[0].keterangan_dokumen}
                            </p>
                            {matchingRealizations[0].tanggal && (
                              <p className="text-[10px] text-indigo-600 font-mono mt-1 font-bold print:hidden">
                                📅 {matchingRealizations[0].tanggal} • Rp {formatIDR(matchingRealizations[0].realisasi)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setPreviewModal({ item: row, realizations: matchingRealizations })}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors shadow-2xs print:hidden"
                          >
                            <Eye size={12} />
                            Lihat Semua ({matchingRealizations.length} Realisasi Dokumen)
                          </button>
                        </>
                      ) : (
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-xs text-gray-500 print:bg-transparent print:border-none print:p-0 print:text-[7px]">
                          <p className="line-clamp-2 italic">
                            {row.uraian || 'Belum ada rincian transaksi belanja SP2D'}
                          </p>
                          <button
                            onClick={() => setPreviewModal({ item: row, realizations: [] })}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-800 mt-1 print:hidden"
                          >
                            <FileText size={10} /> Preview Uraian
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Sub Kegiatan */}
                  <td className="px-5 py-4 max-w-[220px] print:px-1 print:py-1 print:max-w-none">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono font-bold text-amber-600 print:text-[6.5px] print:text-black">
                        {row.kode_sub_kegiatan || '-'}
                      </span>
                      <p className="text-xs text-gray-700 leading-tight line-clamp-2 mt-0.5 print:text-[7px] print:text-black" title={row.sub_kegiatan}>
                        {row.sub_kegiatan}
                      </p>
                    </div>
                  </td>

                  {/* Anggaran */}
                  <td className="px-5 py-4 text-sm font-bold text-right text-gray-700 print:px-1 print:py-1 print:text-[7px] print:text-black">
                    {formatIDR(row.anggaran || 0)}
                  </td>

                  {/* SPD */}
                  <td className="px-5 py-4 text-sm font-bold text-right text-blue-600 print:px-1 print:py-1 print:text-[7px] print:text-black">
                    {formatIDR(row.spd || 0)}
                  </td>

                  {/* Realisasi */}
                  <td className="px-5 py-4 text-sm font-bold text-right text-emerald-600 print:px-1 print:py-1 print:text-[7px] print:text-black">
                    {matchingRealizations.length > 0 ? (
                      <button
                        onClick={() => setPreviewModal({ item: row, realizations: matchingRealizations })}
                        className="hover:underline font-bold text-emerald-600 text-right"
                        title="Klik untuk rincian keterangan realisasi belanja"
                      >
                        {formatIDR(row.realisasi || 0)}
                      </button>
                    ) : (
                      formatIDR(row.realisasi || 0)
                    )}
                  </td>

                  {/* Sisa SPD */}
                  <td className={`px-5 py-4 text-sm font-bold text-right ${sSpd < 0 ? 'text-red-600 bg-red-50' : 'text-amber-600'} print:px-1 print:py-1 print:text-[7px] print:text-black`}>
                    {formatIDR(sSpd)}
                  </td>

                  {/* Sisa Anggaran */}
                  <td className="px-5 py-4 text-sm font-bold text-right text-red-500 print:px-1 print:py-1 print:text-[7px] print:text-black">
                    {formatIDR(sReal)}
                  </td>

                  {/* % Capaian */}
                  <td className="px-5 py-4 text-center print:px-1 print:py-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black select-none print:px-1 print:py-0 print:text-[6.5px] ${
                      percent >= 90 ? 'bg-emerald-50 text-emerald-700' :
                      percent >= 50 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {percent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}

            {filteredData.length === 0 && (
              <tr>
                <td colSpan={12} className="px-6 py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Gift size={32} className="text-gray-300" />
                    <p className="text-sm font-bold">Tidak ada data hibah yang cocok dengan filter yang dipilih.</p>
                    <p className="text-xs text-gray-400">Coba ubah filter kode rekening, kegiatan, atau kata kunci pencarian.</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Total Row */}
            {filteredData.length > 0 && (
              <tr className="bg-gray-900 text-white font-black print:bg-gray-100 print:text-black">
                <td className="px-5 py-5 text-sm uppercase tracking-widest text-[11px] print:px-1 print:py-1.5 print:text-[7.5px]" colSpan={6}>
                  Total Seluruhnya ({filteredData.length} Item Hibah)
                </td>
                <td className="px-5 py-5 text-sm text-right print:px-1 print:py-1.5 print:text-[7.5px]">{formatIDR(totals.anggaran)}</td>
                <td className="px-5 py-5 text-sm text-right text-blue-300 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(totals.spd)}</td>
                <td className="px-5 py-5 text-sm text-right text-emerald-300 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(totals.realisasi)}</td>
                <td className="px-5 py-5 text-sm text-right text-amber-300 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(totals.sisa_spd)}</td>
                <td className="px-5 py-5 text-sm text-right text-red-300 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(totals.sisa_realisasi)}</td>
                <td className="px-5 py-5 text-center print:px-1 print:py-1.5">
                  <span className="text-lg font-black print:text-[7.5px]">
                    {totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(1) : 0}%
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Preview Keterangan Belanja */}
      <AnimatePresence>
        {previewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs print:hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100"
            >
              {/* Modal Header */}
              <div className="p-6 bg-indigo-950 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30 font-bold">
                      {previewModal.item.kode_rekening || 'Rekening Hibah'}
                    </span>
                    <span className="text-xs text-indigo-200">
                      • {previewModal.item.kode_sub_kegiatan || '-'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight">
                    Preview Keterangan Belanja Hibah
                  </h3>
                  <p className="text-xs text-indigo-300 mt-0.5">
                    Penerima: <b>{previewModal.item.penerima_hibah || '-'}</b>
                  </p>
                </div>
                <button 
                  onClick={() => setPreviewModal(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Info Stats */}
              <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50 border-b text-xs">
                <div className="bg-white p-2.5 rounded-lg border">
                  <p className="text-gray-400 font-bold text-[10px] uppercase">Pagu Anggaran</p>
                  <p className="text-sm font-black text-gray-800">Rp {formatIDR(previewModal.item.anggaran || 0)}</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border">
                  <p className="text-gray-400 font-bold text-[10px] uppercase">Pagu SPD</p>
                  <p className="text-sm font-black text-blue-600">Rp {formatIDR(previewModal.item.spd || 0)}</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border">
                  <p className="text-gray-400 font-bold text-[10px] uppercase">Total Realisasi</p>
                  <p className="text-sm font-black text-emerald-600">Rp {formatIDR(previewModal.item.realisasi || 0)}</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border">
                  <p className="text-gray-400 font-bold text-[10px] uppercase">Sisa Anggaran</p>
                  <p className="text-sm font-black text-red-500">Rp {formatIDR((previewModal.item.anggaran || 0) - (previewModal.item.realisasi || 0))}</p>
                </div>
              </div>

              {/* Modal Content / Realization List */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                    Uraian Belanja / Rencana Hibah
                  </h4>
                  <div className="p-3 bg-gray-50 rounded-xl border text-sm text-gray-800 font-medium">
                    {previewModal.item.uraian || 'Tidak ada uraian'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-600" />
                      Rincian Keterangan Dokumen Belanja Realisasi ({previewModal.realizations.length} Transaksi)
                    </h4>
                  </div>

                  {previewModal.realizations.length > 0 ? (
                    <div className="space-y-3">
                      {previewModal.realizations.map((r, rIdx) => (
                        <div key={r.id || rIdx} className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-indigo-200 transition-colors space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                              📅 Tanggal: {r.tanggal || 'N/A'}
                            </span>
                            <span className="font-black text-emerald-600 text-sm">
                              Rp {formatIDR(r.realisasi)}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Keterangan Belanja / SP2D / Keperluan:</p>
                            <p className="text-sm text-gray-800 font-medium mt-0.5 leading-relaxed bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                              {r.keterangan_dokumen || 'Tidak ada rincian keterangan'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                            <span>Sub Kegiatan: {r.sub_kegiatan}</span>
                            <button
                              onClick={() => copyToClipboard(r.keterangan_dokumen || '', rIdx)}
                              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold"
                            >
                              {copiedIndex === rIdx ? (
                                <><CheckCircle2 size={12} className="text-emerald-600" /> Tersalin!</>
                              ) : (
                                <><Copy size={12} /> Salin Keterangan</>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed text-gray-400 space-y-2">
                      <AlertCircle size={28} className="mx-auto text-gray-300" />
                      <p className="text-sm font-bold text-gray-600">Belum Ada Transaksi SP2D Realisasi yang Terhubung</p>
                      <p className="text-xs text-gray-400 max-w-md mx-auto">
                        Nilai realisasi saat ini dicatat sebesar Rp {formatIDR(previewModal.item.realisasi || 0)}. Keterangan belanja utama dapat mengacu pada uraian rencana hibah di atas.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t flex justify-end">
                <button
                  onClick={() => setPreviewModal(null)}
                  className="px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  Tutup Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
