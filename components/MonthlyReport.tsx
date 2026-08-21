import React, { useMemo, useState } from 'react';
import { Download, Search, Printer, Calendar, TrendingUp, CircleDollarSign, Eye, X, List, AlertCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterData, RealizationData } from '../types';
import SearchableSelect from './SearchableSelect';
import { motion, AnimatePresence } from 'motion/react';
import {
  clean,
  formatIDR,
  getBidangName,
  getBidangFromRealization,
  getCleanProgramName,
  MONTH_NAMES,
  MONTH_SHORT_NAMES,
  parseDateInfo
} from './reportUtils';

interface Props {
  masterData: MasterData[];
  realizationData: RealizationData[];
}

type ReportLevel = 'bidang' | 'program' | 'kegiatan' | 'sub_kegiatan';

export const MonthlyReport: React.FC<Props> = ({ masterData, realizationData }) => {
  const [level, setLevel] = useState<ReportLevel>('bidang');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubKegiatan, setSelectedSubKegiatan] = useState<string>('all');
  const [selectedBelanja, setSelectedBelanja] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'matrix' | 'single'>('matrix');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const [detailModal, setDetailModal] = useState<{
    key: string;
    name: string;
    level: ReportLevel;
    monthIndex: number | null; // null means all months
    monthName?: string;
  } | null>(null);

  // Available Years from realization data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    realizationData.forEach(r => {
      const { year } = parseDateInfo(r.tanggal);
      if (year) years.add(String(year));
    });
    const sorted = Array.from(years).sort().reverse();
    return sorted;
  }, [realizationData]);

  // Dropdown lists
  const subKegiatanList = useMemo(() => {
    return Array.from(new Set(masterData.map(m => m.sub_kegiatan))).filter(Boolean).sort();
  }, [masterData]);

  const belanjaList = useMemo(() => {
    return Array.from(new Set(masterData.map(m => m.belanja))).filter(Boolean).sort();
  }, [masterData]);

  // Process data per month (0 to 11)
  const monthlyData = useMemo(() => {
    const aggregated: Record<string, {
      key: string;
      name: string;
      parentName?: string;
      kode: string;
      kode_sub_kegiatan?: string;
      anggaran: number;
      pagu_spd: number;
      monthlyRealisasi: number[]; // 12 elements for 12 months
      totalRealisasi: number;
      skpd: string;
      isUnmapped?: boolean;
    }> = {};

    // 1. Iterate master data to build budget structure
    masterData.forEach(m => {
      if (selectedSubKegiatan !== 'all' && m.sub_kegiatan !== selectedSubKegiatan) return;
      if (selectedBelanja !== 'all' && m.belanja !== selectedBelanja) return;

      let key = '';
      let name = '';
      let kode = '';
      let parentName = '';

      if (level === 'bidang') {
        name = getBidangName(m.program);
        key = `bidang|${name}`;
        kode = 'BIDANG';
      } else if (level === 'program') {
        key = `${clean(m.kode_skpd)}|${clean(m.kode_program)}`;
        name = m.program;
        kode = m.kode_program;
      } else if (level === 'kegiatan') {
        key = `${clean(m.kode_skpd)}|${clean(m.kode_program)}|${clean(m.kode_kegiatan)}`;
        name = m.kegiatan;
        kode = m.kode_kegiatan;
        parentName = m.program;
      } else {
        key = `${clean(m.kode_skpd)}|${clean(m.kode_program)}|${clean(m.kode_kegiatan)}|${clean(m.kode_sub_kegiatan)}|${clean(m.kode_belanja)}`;
        name = m.belanja;
        kode = m.kode_belanja;
        parentName = m.sub_kegiatan;
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          key,
          name,
          kode,
          kode_sub_kegiatan: m.kode_sub_kegiatan,
          parentName,
          anggaran: 0,
          pagu_spd: 0,
          monthlyRealisasi: Array(12).fill(0),
          totalRealisasi: 0,
          skpd: m.skpd || '-'
        };
      }

      aggregated[key].anggaran += Number(m.anggaran) || 0;
      aggregated[key].pagu_spd += Number(m.pagu_spd) || 0;
    });

    // 2. Iterate realization data and distribute into monthly buckets
    const unmatchedRealizations: Record<string, {
      key: string;
      name: string;
      kode: string;
      kode_sub_kegiatan?: string;
      parentName: string;
      anggaran: number;
      pagu_spd: number;
      monthlyRealisasi: number[];
      totalRealisasi: number;
      skpd: string;
      isUnmapped: boolean;
    }> = {};

    realizationData.forEach(r => {
      if (selectedSubKegiatan !== 'all' && r.sub_kegiatan !== selectedSubKegiatan) return;
      if (selectedBelanja !== 'all' && r.belanja !== selectedBelanja) return;

      const dateInfo = parseDateInfo(r.tanggal);
      if (selectedYear !== 'all' && dateInfo.year && String(dateInfo.year) !== selectedYear) {
        return;
      }

      let rKey = '';
      if (level === 'bidang') {
        const name = getBidangFromRealization(r, masterData);
        rKey = `bidang|${name}`;
      } else if (level === 'program') {
        rKey = `${clean(r.kode_skpd)}|${clean(r.kode_program)}`;
      } else if (level === 'kegiatan') {
        rKey = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}`;
      } else {
        rKey = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}|${clean(r.kode_sub_kegiatan)}|${clean(r.kode_belanja)}`;
      }

      const val = Number(r.realisasi) || 0;
      const monthIdx = (dateInfo.month !== null && dateInfo.month >= 0 && dateInfo.month <= 11)
        ? dateInfo.month
        : 0;

      if (aggregated[rKey]) {
        aggregated[rKey].monthlyRealisasi[monthIdx] += val;
        aggregated[rKey].totalRealisasi += val;
      } else {
        if (!unmatchedRealizations[rKey]) {
          let name = '';
          let kode = '';
          let parentName = 'DATA TIDAK TERPETAKAN (ANOMALI)';

          if (level === 'bidang') {
            name = getBidangFromRealization(r, masterData);
            kode = 'BIDANG';
          } else if (level === 'program') {
            name = getCleanProgramName(r.kode_program, r.program, masterData) || 'Program Tidak Terdaftar';
            kode = r.kode_program || '?';
          } else if (level === 'kegiatan') {
            const masterMatch = masterData.find(m => clean(m.kode_kegiatan) === clean(r.kode_kegiatan));
            name = masterMatch ? masterMatch.kegiatan : (r.kegiatan || 'Kegiatan Tidak Terdaftar');
            kode = r.kode_kegiatan || '?';
            parentName = getCleanProgramName(r.kode_program, r.program, masterData) || 'PROGRAM TIDAK TERDAFTAR';
          } else {
            const masterMatch = masterData.find(m => clean(m.kode_belanja) === clean(r.kode_belanja) && clean(m.kode_sub_kegiatan) === clean(r.kode_sub_kegiatan));
            const subMatch = masterMatch || masterData.find(m => clean(m.kode_sub_kegiatan) === clean(r.kode_sub_kegiatan));
            name = masterMatch ? masterMatch.belanja : (r.belanja || 'Kode Belanja Tidak Terdaftar di Master');
            kode = r.kode_belanja || '?';
            parentName = subMatch ? subMatch.sub_kegiatan : (r.sub_kegiatan || 'SUB KEGIATAN TIDAK TERDAFTAR');
          }

          unmatchedRealizations[rKey] = {
            key: `unmapped|${rKey}`,
            name,
            kode,
            kode_sub_kegiatan: r.kode_sub_kegiatan,
            parentName,
            anggaran: 0,
            pagu_spd: 0,
            monthlyRealisasi: Array(12).fill(0),
            totalRealisasi: 0,
            skpd: r.skpd || 'LAINNYA',
            isUnmapped: true
          };
        }

        unmatchedRealizations[rKey].monthlyRealisasi[monthIdx] += val;
        unmatchedRealizations[rKey].totalRealisasi += val;
      }
    });

    Object.values(unmatchedRealizations).forEach(item => {
      aggregated[item.key] = item;
    });

    return Object.values(aggregated).filter(item => {
      const matchesSearch = clean(item.name).includes(clean(searchTerm)) ||
                            clean(item.kode).includes(clean(searchTerm)) ||
                            clean(item.skpd).includes(clean(searchTerm));
      const isOthersBidang = level === 'bidang' && item.name === 'LAINNYA';
      return matchesSearch && !isOthersBidang;
    });
  }, [masterData, realizationData, level, searchTerm, selectedSubKegiatan, selectedBelanja, selectedYear]);

  // Totals calculations
  const totals = useMemo(() => {
    const result = {
      anggaran: 0,
      pagu_spd: 0,
      monthlyRealisasi: Array(12).fill(0),
      totalRealisasi: 0
    };

    monthlyData.forEach(row => {
      result.anggaran += row.anggaran;
      result.pagu_spd += row.pagu_spd;
      row.monthlyRealisasi.forEach((val, idx) => {
        result.monthlyRealisasi[idx] += val;
      });
      result.totalRealisasi += row.totalRealisasi;
    });

    return result;
  }, [monthlyData]);

  // Statistics for cards
  const monthlyStats = useMemo(() => {
    let highestMonthIdx = 0;
    let highestAmount = 0;
    let lowestMonthIdx = 0;
    let lowestAmount = Infinity;
    let activeMonthsCount = 0;

    totals.monthlyRealisasi.forEach((amount, idx) => {
      if (amount > highestAmount) {
        highestAmount = amount;
        highestMonthIdx = idx;
      }
      if (amount > 0 && amount < lowestAmount) {
        lowestAmount = amount;
        lowestMonthIdx = idx;
      }
      if (amount > 0) activeMonthsCount++;
    });

    const averagePerMonth = activeMonthsCount > 0 ? totals.totalRealisasi / activeMonthsCount : 0;

    return {
      highestMonth: MONTH_NAMES[highestMonthIdx],
      highestAmount,
      lowestMonth: lowestAmount < Infinity ? MONTH_NAMES[lowestMonthIdx] : '-',
      lowestAmount: lowestAmount < Infinity ? lowestAmount : 0,
      averagePerMonth,
      activeMonthsCount
    };
  }, [totals]);

  // Export to Excel
  const handleExportExcel = () => {
    const currentYearStr = selectedYear === 'all' ? 'Semua Tahun' : selectedYear;
    const title = `Laporan_Realisasi_Per_Bulan_${level}_${currentYearStr}`;

    let excelData: any[] = [];

    if (viewMode === 'matrix') {
      excelData = monthlyData.map((item, idx) => {
        const sisaAnggaran = item.anggaran - item.totalRealisasi;
        const persen = item.anggaran > 0 ? ((item.totalRealisasi / item.anggaran) * 100).toFixed(2) + '%' : '0%';

        const rowObj: any = {
          'No': idx + 1,
          'SKPD': item.skpd,
          'Kode': item.kode,
          'Uraian / Nama': item.name,
          'Pagu Anggaran': item.anggaran,
          'Pagu SPD': item.pagu_spd,
        };

        MONTH_NAMES.forEach((mName, mIdx) => {
          rowObj[`Realisasi ${mName}`] = item.monthlyRealisasi[mIdx];
        });

        rowObj['Total Realisasi'] = item.totalRealisasi;
        rowObj['Sisa Anggaran'] = sisaAnggaran;
        rowObj['% Capaian'] = persen;

        return rowObj;
      });

      // Add Total Row
      const totalRow: any = {
        'No': '',
        'SKPD': 'TOTAL',
        'Kode': '',
        'Uraian / Nama': 'TOTAL SELURUHNYA',
        'Pagu Anggaran': totals.anggaran,
        'Pagu SPD': totals.pagu_spd,
      };
      MONTH_NAMES.forEach((mName, mIdx) => {
        totalRow[`Realisasi ${mName}`] = totals.monthlyRealisasi[mIdx];
      });
      totalRow['Total Realisasi'] = totals.totalRealisasi;
      totalRow['Sisa Anggaran'] = totals.anggaran - totals.totalRealisasi;
      totalRow['% Capaian'] = totals.anggaran > 0 ? ((totals.totalRealisasi / totals.anggaran) * 100).toFixed(2) + '%' : '0%';
      excelData.push(totalRow);
    } else {
      // Single month view export
      const monthName = MONTH_NAMES[selectedMonth];
      excelData = monthlyData.map((item, idx) => {
        const monthReal = item.monthlyRealisasi[selectedMonth];
        const sisaAnggaran = item.anggaran - item.totalRealisasi;
        const persen = item.anggaran > 0 ? ((item.totalRealisasi / item.anggaran) * 100).toFixed(2) + '%' : '0%';

        return {
          'No': idx + 1,
          'SKPD': item.skpd,
          'Kode': item.kode,
          'Uraian / Nama': item.name,
          'Pagu Anggaran': item.anggaran,
          'Pagu SPD': item.pagu_spd,
          [`Realisasi ${monthName}`]: monthReal,
          'Total Realisasi (sd Bulan Ini)': item.totalRealisasi,
          'Sisa Anggaran': sisaAnggaran,
          '% Capaian': persen
        };
      });

      const totalRow: any = {
        'No': '',
        'SKPD': 'TOTAL',
        'Kode': '',
        'Uraian / Nama': 'TOTAL SELURUHNYA',
        'Pagu Anggaran': totals.anggaran,
        'Pagu SPD': totals.pagu_spd,
      };
      totalRow[`Realisasi ${MONTH_NAMES[selectedMonth]}`] = totals.monthlyRealisasi[selectedMonth];
      totalRow['Total Realisasi (sd Bulan Ini)'] = totals.totalRealisasi;
      totalRow['Sisa Anggaran'] = totals.anggaran - totals.totalRealisasi;
      totalRow['% Capaian'] = totals.anggaran > 0 ? ((totals.totalRealisasi / totals.anggaran) * 100).toFixed(2) + '%' : '0%';
      excelData.push(totalRow);
    }

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Realisasi Per Bulan');
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  // Filtered transactions for drill-down modal
  const filteredDetails = useMemo(() => {
    if (!detailModal) return [];
    return realizationData.filter(r => {
      const dateInfo = parseDateInfo(r.tanggal);
      if (selectedYear !== 'all' && dateInfo.year && String(dateInfo.year) !== selectedYear) {
        return false;
      }
      if (detailModal.monthIndex !== null && dateInfo.month !== detailModal.monthIndex) {
        return false;
      }

      const rBidang = getBidangFromRealization(r, masterData);
      const rKeyBidang = `bidang|${rBidang}`;
      const rKeyProgram = `${clean(r.kode_skpd)}|${clean(r.kode_program)}`;
      const rKeyKegiatan = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}`;
      const rKeySub = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}|${clean(r.kode_sub_kegiatan)}|${clean(r.kode_belanja)}`;

      let targetKey = detailModal.key;
      if (targetKey.startsWith('unmapped|')) {
        targetKey = targetKey.replace('unmapped|', '');
        return rKeySub === targetKey;
      }

      if (detailModal.level === 'bidang') return rKeyBidang === targetKey;
      if (detailModal.level === 'program') return rKeyProgram === targetKey;
      if (detailModal.level === 'kegiatan') return rKeyKegiatan === targetKey;
      return rKeySub === targetKey;
    });
  }, [detailModal, realizationData, selectedYear, masterData]);

  const percentageTotal = totals.anggaran > 0 ? (totals.totalRealisasi / totals.anggaran) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <CircleDollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Anggaran APBD</p>
            <p className="text-xl font-black text-gray-800">Rp {formatIDR(totals.anggaran)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">SPD: Rp {formatIDR(totals.pagu_spd)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Realisasi Kumulatif</p>
            <p className="text-xl font-black text-emerald-600">Rp {formatIDR(totals.totalRealisasi)}</p>
            <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
              Capaian: {percentageTotal.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Bulan Realisasi Tertinggi</p>
            <p className="text-lg font-black text-gray-800">{monthlyStats.highestMonth}</p>
            <p className="text-[11px] font-bold text-blue-600 mt-0.5">Rp {formatIDR(monthlyStats.highestAmount)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Rata-Rata per Bulan</p>
            <p className="text-lg font-black text-purple-700">Rp {formatIDR(monthlyStats.averagePerMonth)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{monthlyStats.activeMonthsCount} bulan bertransaksi</p>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Level Switcher */}
          <div className="flex gap-1.5 p-1 bg-gray-50 rounded-xl border overflow-x-auto no-scrollbar">
            {(['bidang', 'program', 'kegiatan', 'sub_kegiatan'] as ReportLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
                  level === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {l.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search, Mode, and Export Actions */}
          <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input
                type="text"
                placeholder="Cari Nama / Uraian / Kode / SKPD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl border text-xs font-bold">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'matrix' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Matriks 12 Bulan
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Pilih Bulan
              </button>
            </div>

            {/* Export & Print */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100"
            >
              <Download size={16} />
              <span>Excel</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
            >
              <Printer size={16} />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Sub Filters: Tahun, Sub Kegiatan, Jenis Belanja & Single Month Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Tahun Anggaran</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2.5 border rounded-xl text-xs font-semibold bg-gray-50/50 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map(y => (
                <option key={y} value={y}>Tahun {y}</option>
              ))}
            </select>
          </div>

          {viewMode === 'single' && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Pilih Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl text-xs font-semibold bg-indigo-50/50 text-indigo-900 border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>Bulan {name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={viewMode === 'single' ? 'md:col-span-1' : 'md:col-span-2'}>
            <SearchableSelect
              label="Sub Kegiatan"
              options={subKegiatanList}
              value={selectedSubKegiatan}
              onChange={setSelectedSubKegiatan}
              placeholder="Semua Sub Kegiatan..."
            />
          </div>

          <div>
            <SearchableSelect
              label="Jenis Belanja"
              options={belanjaList}
              value={selectedBelanja}
              onChange={setSelectedBelanja}
              placeholder="Semua Jenis Belanja..."
            />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden overflow-x-auto print:shadow-none print:border-none print:overflow-visible">
        {/* Printable Header */}
        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight">Laporan Realisasi Keuangan Per Bulan</h1>
          <p className="text-xs text-gray-500 mt-1">Level: {level.replace('_', ' ').toUpperCase()} | Tahun: {selectedYear === 'all' ? 'Semua' : selectedYear} {viewMode === 'single' ? `| Bulan: ${MONTH_NAMES[selectedMonth]}` : ''}</p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-left text-[9px] border-y py-2">
            <div>
              <p><b>Filter Sub Kegiatan:</b> {selectedSubKegiatan === 'all' ? 'Semua' : selectedSubKegiatan}</p>
              <p><b>Filter Belanja:</b> {selectedBelanja === 'all' ? 'Semua' : selectedBelanja}</p>
            </div>
            <div className="text-right">
              <p><b>Tanggal Cetak:</b> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {viewMode === 'matrix' ? (
          /* Matrix 12 Months Table */
          <table className="w-full text-left min-w-[1500px] print:min-w-0 print:text-[7.5px] border-collapse">
            <thead className="bg-gray-50/75 border-b">
              <tr>
                <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10">SKPD</th>
                {level === 'sub_kegiatan' && (
                  <th className="px-3 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode SubKeg</th>
                )}
                <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[200px]">Uraian / Kode</th>
                <th className="px-3 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Pagu Anggaran</th>
                {MONTH_SHORT_NAMES.map((mShort) => (
                  <th key={mShort} className="px-2.5 py-3.5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right whitespace-nowrap bg-indigo-50/30">
                    {mShort}
                  </th>
                ))}
                <th className="px-3 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right bg-emerald-50/40">Total Realisasi</th>
                <th className="px-3 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sisa Anggaran</th>
                <th className="px-3 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {monthlyData.map((row, idx) => {
                const sisaAnggaran = row.anggaran - row.totalRealisasi;
                const percent = row.anggaran > 0 ? (row.totalRealisasi / row.anggaran) * 100 : 0;

                return (
                  <tr key={idx} className={`hover:bg-gray-50/70 transition-colors ${row.isUnmapped ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 text-xs font-bold text-gray-500 sticky left-0 bg-white group-hover:bg-gray-50">{row.skpd}</td>
                    {level === 'sub_kegiatan' && (
                      <td className="px-3 py-3 text-[10px] font-mono text-amber-600 font-bold">{row.kode_sub_kegiatan || '-'}</td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{row.kode}</span>
                          {row.isUnmapped && <span className="bg-red-100 text-red-700 text-[8px] px-1 rounded font-bold uppercase flex items-center gap-1"><AlertTriangle size={8} /> Anomali</span>}
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight max-w-[220px] truncate" title={row.name}>{row.name}</p>
                        {row.parentName && <p className="text-[8.5px] text-gray-400 uppercase font-medium truncate max-w-[220px]">{row.parentName}</p>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-right text-gray-700">{formatIDR(row.anggaran)}</td>

                    {/* 12 Months Columns */}
                    {row.monthlyRealisasi.map((val, mIdx) => (
                      <td key={mIdx} className="px-2.5 py-3 text-xs text-right font-medium">
                        {val > 0 ? (
                          <button
                            onClick={() => setDetailModal({ key: row.key, name: row.name, level, monthIndex: mIdx, monthName: MONTH_NAMES[mIdx] })}
                            className="text-indigo-700 font-bold hover:underline hover:text-indigo-900 transition-colors"
                            title={`Lihat transaksi ${MONTH_NAMES[mIdx]}`}
                          >
                            {formatIDR(val)}
                          </button>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    ))}

                    <td className="px-3 py-3 text-xs font-bold text-right text-emerald-600 bg-emerald-50/20">
                      <button
                        onClick={() => setDetailModal({ key: row.key, name: row.name, level, monthIndex: null })}
                        className="hover:underline flex items-center justify-end gap-1 ml-auto group"
                        title="Klik untuk rincian semua bulan"
                      >
                        {formatIDR(row.totalRealisasi)}
                        <Eye size={10} className="opacity-0 group-hover:opacity-100 text-emerald-600" />
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-right text-red-500">{formatIDR(sisaAnggaran)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black ${
                        percent >= 90 ? 'bg-emerald-50 text-emerald-700' :
                        percent >= 50 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {percent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}

              {monthlyData.length === 0 && (
                <tr>
                  <td colSpan={17} className="px-6 py-12 text-center text-gray-400 italic">
                    Tidak ada data laporan bulanan yang sesuai kriteria.
                  </td>
                </tr>
              )}

              {/* Total Footer Row */}
              <tr className="bg-gray-900 text-white font-black print:bg-gray-200 print:text-black">
                <td className="px-4 py-4 text-xs uppercase tracking-wider sticky left-0 bg-gray-900 print:bg-gray-200" colSpan={level === 'sub_kegiatan' ? 3 : 2}>
                  Total Seluruhnya
                </td>
                <td className="px-3 py-4 text-xs text-right">{formatIDR(totals.anggaran)}</td>
                {totals.monthlyRealisasi.map((sumVal, mIdx) => (
                  <td key={mIdx} className="px-2.5 py-4 text-xs text-right text-indigo-300 print:text-black font-mono">
                    {sumVal > 0 ? formatIDR(sumVal) : '-'}
                  </td>
                ))}
                <td className="px-3 py-4 text-xs text-right text-emerald-300 print:text-black">{formatIDR(totals.totalRealisasi)}</td>
                <td className="px-3 py-4 text-xs text-right text-red-300 print:text-black">{formatIDR(totals.anggaran - totals.totalRealisasi)}</td>
                <td className="px-3 py-4 text-center text-xs">
                  {totals.anggaran > 0 ? ((totals.totalRealisasi / totals.anggaran) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          /* Single Month Focus View */
          <table className="w-full text-left min-w-[1000px] print:min-w-0 print:text-[8px] border-collapse">
            <thead className="bg-gray-50/75 border-b">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKPD</th>
                {level === 'sub_kegiatan' && (
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode SubKeg</th>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Uraian / Kode</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Anggaran</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Pagu SPD</th>
                <th className="px-6 py-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-right bg-indigo-50/30">
                  Realisasi {MONTH_NAMES[selectedMonth]}
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-50/30">
                  Realisasi Kumulatif
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sisa Anggaran</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">% Capaian</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {monthlyData.map((row, idx) => {
                const monthReal = row.monthlyRealisasi[selectedMonth];
                const sisaAnggaran = row.anggaran - row.totalRealisasi;
                const percent = row.anggaran > 0 ? (row.totalRealisasi / row.anggaran) * 100 : 0;

                return (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{row.skpd}</td>
                    {level === 'sub_kegiatan' && (
                      <td className="px-6 py-4 text-[10px] font-mono text-amber-600 font-bold">{row.kode_sub_kegiatan || '-'}</td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{row.kode}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{row.name}</p>
                        {row.parentName && <p className="text-[9px] text-gray-400 mt-0.5 uppercase font-medium">{row.parentName}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-700">{formatIDR(row.anggaran)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-blue-600">{formatIDR(row.pagu_spd)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-indigo-700 bg-indigo-50/20">
                      <button
                        onClick={() => setDetailModal({ key: row.key, name: row.name, level, monthIndex: selectedMonth, monthName: MONTH_NAMES[selectedMonth] })}
                        className="hover:underline"
                      >
                        {formatIDR(monthReal)}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-emerald-600 bg-emerald-50/20">
                      {formatIDR(row.totalRealisasi)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-red-500">{formatIDR(sisaAnggaran)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-gray-700">{percent.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}

              {/* Single Month Total Row */}
              <tr className="bg-gray-900 text-white font-black">
                <td className="px-6 py-5 text-sm uppercase tracking-widest" colSpan={level === 'sub_kegiatan' ? 3 : 2}>Total Seluruhnya</td>
                <td className="px-6 py-5 text-sm text-right">{formatIDR(totals.anggaran)}</td>
                <td className="px-6 py-5 text-sm text-right text-blue-300">{formatIDR(totals.pagu_spd)}</td>
                <td className="px-6 py-5 text-sm text-right text-indigo-300">{formatIDR(totals.monthlyRealisasi[selectedMonth])}</td>
                <td className="px-6 py-5 text-sm text-right text-emerald-300">{formatIDR(totals.totalRealisasi)}</td>
                <td className="px-6 py-5 text-sm text-right text-red-300">{formatIDR(totals.anggaran - totals.totalRealisasi)}</td>
                <td className="px-6 py-5 text-center text-sm font-black">
                  {totals.anggaran > 0 ? ((totals.totalRealisasi / totals.anggaran) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Drill-down Transaction Detail Modal */}
      <AnimatePresence>
        {detailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <List className="text-indigo-600" size={20} />
                    Rincian Transaksi Realisasi {detailModal.monthName ? `Bulan ${detailModal.monthName}` : 'Semua Bulan'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{detailModal.name}</p>
                </div>
                <button
                  onClick={() => setDetailModal(null)}
                  className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {filteredDetails.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Realisasi</p>
                        <p className="text-xl font-black text-emerald-700">Rp {formatIDR(filteredDetails.reduce((acc, curr) => acc + curr.realisasi, 0))}</p>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Jumlah Transaksi</p>
                        <p className="text-xl font-black text-indigo-700">{filteredDetails.length} Dokumen</p>
                      </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan Dokumen</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Nilai Realisasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredDetails.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-3 text-xs font-mono text-gray-600">{item.tanggal || '-'}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-700 italic">{item.keterangan_dokumen || '-'}</td>
                              <td className="px-4 py-3 text-sm font-black text-right text-emerald-600">Rp {formatIDR(item.realisasi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <AlertCircle size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Tidak ada transaksi ditemukan pada periode ini.</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t flex justify-end">
                <button
                  onClick={() => setDetailModal(null)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MonthlyReport;
