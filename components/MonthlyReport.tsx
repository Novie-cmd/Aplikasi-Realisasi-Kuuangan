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

    // Secondary maps for fallback matching if kode_skpd / kode_program differ slightly in SP2D
    const subKegBelanjaMap: Record<string, string> = {};
    const kegiatanMap: Record<string, string> = {};
    const programMap: Record<string, string> = {};
    const bidangMap: Record<string, string> = {};

    // Filter codes lookup for robust dropdown filtering (case-insensitive & code-based)
    const selectedSubKegCodes = new Set<string>();
    const selectedBelanjaCodes = new Set<string>();

    if (selectedSubKegiatan !== 'all') {
      masterData.forEach(m => {
        if (clean(m.sub_kegiatan) === clean(selectedSubKegiatan) && m.kode_sub_kegiatan) {
          selectedSubKegCodes.add(clean(m.kode_sub_kegiatan));
        }
      });
    }

    if (selectedBelanja !== 'all') {
      masterData.forEach(m => {
        if (clean(m.belanja) === clean(selectedBelanja) && m.kode_belanja) {
          selectedBelanjaCodes.add(clean(m.kode_belanja));
        }
      });
    }

    // 1. Iterate master data to build budget structure
    masterData.forEach(m => {
      if (selectedSubKegiatan !== 'all' && clean(m.sub_kegiatan) !== clean(selectedSubKegiatan)) return;
      if (selectedBelanja !== 'all' && clean(m.belanja) !== clean(selectedBelanja)) return;

      let key = '';
      let name = '';
      let kode = '';
      let parentName = '';

      if (level === 'bidang') {
        name = getBidangName(m.program);
        key = `bidang|${name}`;
        kode = 'BIDANG';
        bidangMap[name] = key;
      } else if (level === 'program') {
        key = `${clean(m.kode_skpd)}|${clean(m.kode_program)}`;
        name = m.program;
        kode = m.kode_program;
        programMap[clean(m.kode_program)] = key;
      } else if (level === 'kegiatan') {
        key = `${clean(m.kode_skpd)}|${clean(m.kode_program)}|${clean(m.kode_kegiatan)}`;
        name = m.kegiatan;
        kode = m.kode_kegiatan;
        parentName = m.program;
        kegiatanMap[clean(m.kode_kegiatan)] = key;
      } else {
        key = `${clean(m.kode_skpd)}|${clean(m.kode_program)}|${clean(m.kode_kegiatan)}|${clean(m.kode_sub_kegiatan)}|${clean(m.kode_belanja)}`;
        name = m.belanja;
        kode = m.kode_belanja;
        parentName = m.sub_kegiatan;
        subKegBelanjaMap[`${clean(m.kode_sub_kegiatan)}|${clean(m.kode_belanja)}`] = key;
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
      if (selectedSubKegiatan !== 'all') {
        const matchSub = clean(r.sub_kegiatan) === clean(selectedSubKegiatan) || 
                         (r.kode_sub_kegiatan && selectedSubKegCodes.has(clean(r.kode_sub_kegiatan)));
        if (!matchSub) return;
      }
      if (selectedBelanja !== 'all') {
        const matchBel = clean(r.belanja) === clean(selectedBelanja) || 
                         (r.kode_belanja && selectedBelanjaCodes.has(clean(r.kode_belanja)));
        if (!matchBel) return;
      }

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

      // Cari target key yang cocok: primary check atau fallback
      let matchedKey = aggregated[rKey] ? rKey : '';
      if (!matchedKey) {
        if (level === 'sub_kegiatan') {
          const fallback = `${clean(r.kode_sub_kegiatan)}|${clean(r.kode_belanja)}`;
          if (subKegBelanjaMap[fallback] && aggregated[subKegBelanjaMap[fallback]]) {
            matchedKey = subKegBelanjaMap[fallback];
          }
        } else if (level === 'kegiatan') {
          const fallback = clean(r.kode_kegiatan);
          if (kegiatanMap[fallback] && aggregated[kegiatanMap[fallback]]) {
            matchedKey = kegiatanMap[fallback];
          }
        } else if (level === 'program') {
          const fallback = clean(r.kode_program);
          if (programMap[fallback] && aggregated[programMap[fallback]]) {
            matchedKey = programMap[fallback];
          }
        } else if (level === 'bidang') {
          const bName = getBidangFromRealization(r, masterData);
          if (bidangMap[bName] && aggregated[bidangMap[bName]]) {
            matchedKey = bidangMap[bName];
          }
        }
      }

      if (matchedKey && aggregated[matchedKey]) {
        aggregated[matchedKey].monthlyRealisasi[monthIdx] += val;
        aggregated[matchedKey].totalRealisasi += val;
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

      let targetKey = detailModal.key;
      if (targetKey.startsWith('unmapped|')) {
        targetKey = targetKey.replace('unmapped|', '');
      }

      if (detailModal.level === 'bidang') {
        const rBidang = getBidangFromRealization(r, masterData);
        return `bidang|${rBidang}` === targetKey || `bidang|${getBidangName(r.program || '')}` === targetKey;
      }

      if (detailModal.level === 'program') {
        const rKeyProgram = `${clean(r.kode_skpd)}|${clean(r.kode_program)}`;
        const targetProgramCode = targetKey.split('|').pop();
        return rKeyProgram === targetKey || (targetProgramCode ? clean(r.kode_program) === clean(targetProgramCode) : false);
      }

      if (detailModal.level === 'kegiatan') {
        const rKeyKegiatan = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}`;
        const targetKegCode = targetKey.split('|').pop();
        return rKeyKegiatan === targetKey || (targetKegCode ? clean(r.kode_kegiatan) === clean(targetKegCode) : false);
      }

      // sub_kegiatan
      const rKeySub = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}|${clean(r.kode_sub_kegiatan)}|${clean(r.kode_belanja)}`;
      if (rKeySub === targetKey) return true;

      // Fallback matching by kode_sub_kegiatan + kode_belanja
      const parts = targetKey.split('|');
      if (parts.length >= 2) {
        const targetBelanjaCode = parts[parts.length - 1];
        const targetSubKegCode = parts[parts.length - 2];
        if (clean(r.kode_sub_kegiatan) === clean(targetSubKegCode) && clean(r.kode_belanja) === clean(targetBelanjaCode)) {
          return true;
        }
      }

      return false;
    });
  }, [detailModal, realizationData, selectedYear, masterData]);

  const percentageTotal = totals.anggaran > 0 ? (totals.totalRealisasi / totals.anggaran) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-slate-700 text-slate-200 rounded-xl">
            <CircleDollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Anggaran APBD</p>
            <p className="text-xl font-black text-white">Rp {formatIDR(totals.anggaran)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">SPD: Rp {formatIDR(totals.pagu_spd)}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-[#064e3b] text-emerald-300 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Realisasi Kumulatif</p>
            <p className="text-xl font-black text-emerald-400">Rp {formatIDR(totals.totalRealisasi)}</p>
            <p className="text-[11px] font-bold text-emerald-300 mt-0.5">
              Capaian: {percentageTotal.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-slate-700 text-emerald-400 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bulan Realisasi Tertinggi</p>
            <p className="text-lg font-black text-white">{monthlyStats.highestMonth}</p>
            <p className="text-[11px] font-bold text-emerald-400 mt-0.5">Rp {formatIDR(monthlyStats.highestAmount)}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-slate-700 text-slate-300 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rata-Rata per Bulan</p>
            <p className="text-lg font-black text-white">Rp {formatIDR(monthlyStats.averagePerMonth)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{monthlyStats.activeMonthsCount} bulan bertransaksi</p>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Level Switcher */}
          <div className="flex gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700 overflow-x-auto no-scrollbar">
            {(['bidang', 'program', 'kegiatan', 'sub_kegiatan'] as ReportLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
                  level === l ? 'bg-[#064e3b] text-white shadow-sm border border-emerald-600/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search, Mode, and Export Actions */}
          <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari Nama / Uraian / Kode / SKPD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 text-white placeholder-slate-400 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'matrix' ? 'bg-[#064e3b] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Matriks 12 Bulan
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'single' ? 'bg-[#064e3b] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pilih Bulan
              </button>
            </div>

            {/* Export & Print */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-[#064e3b] text-white rounded-xl font-bold text-xs hover:bg-[#047857] transition-colors shadow-md shadow-emerald-950 border border-emerald-600/40"
            >
              <Download size={16} />
              <span>Excel</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl font-bold text-xs hover:bg-slate-600 transition-colors border border-slate-600"
            >
              <Printer size={16} />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Sub Filters: Tahun, Sub Kegiatan, Jenis Belanja & Single Month Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Tahun Anggaran</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2.5 border border-slate-700 rounded-xl text-xs font-semibold bg-slate-900 text-white outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map(y => (
                <option key={y} value={y}>Tahun {y}</option>
              ))}
            </select>
          </div>

          {viewMode === 'single' && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Pilih Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-700 rounded-xl text-xs font-semibold bg-slate-900 text-white outline-none focus:ring-1 focus:ring-emerald-500"
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
      <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-x-auto overflow-y-auto max-h-[72vh] relative print:max-h-none print:overflow-visible print:shadow-none print:border-none">
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
          <table className="w-full text-left min-w-[1600px] print:min-w-0 print:text-[7.5px] border-collapse">
            <thead className="bg-slate-900 border-b border-slate-700 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 left-0 bg-slate-900 z-30 shadow-sm">SKPD</th>
                {level === 'sub_kegiatan' && (
                  <th className="px-3 py-3.5 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 bg-slate-900 z-20">Kode SubKeg</th>
                )}
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-300 uppercase tracking-widest min-w-[200px] sticky top-0 bg-slate-900 z-20">Uraian / Kode</th>
                <th className="px-3 py-3.5 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right sticky top-0 bg-slate-900 z-20">Pagu Anggaran</th>
                {MONTH_SHORT_NAMES.map((mShort) => (
                  <th key={mShort} className="px-2.5 py-3.5 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right whitespace-nowrap bg-slate-900 sticky top-0 z-20">
                    {mShort}
                  </th>
                ))}
                <th className="px-3 py-3.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest text-right bg-slate-900 sticky top-0 z-20">Total Realisasi</th>
                <th className="px-3 py-3.5 text-[10px] font-black text-rose-400 uppercase tracking-widest text-right sticky top-0 bg-slate-900 z-20">Sisa Anggaran</th>
                <th className="px-3 py-3.5 text-[10px] font-black text-slate-300 uppercase tracking-widest text-center sticky top-0 bg-slate-900 z-20">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-slate-200">
              {monthlyData.map((row, idx) => {
                const sisaAnggaran = row.anggaran - row.totalRealisasi;
                const percent = row.anggaran > 0 ? (row.totalRealisasi / row.anggaran) * 100 : 0;

                return (
                  <tr key={idx} className={`hover:bg-slate-700/50 transition-colors group ${row.isUnmapped ? 'bg-[#4c0519]/30' : ''}`}>
                    <td className="px-4 py-3 text-xs font-bold text-slate-300 sticky left-0 bg-slate-800 group-hover:bg-slate-700/70 z-10 shadow-sm">{row.skpd}</td>
                    {level === 'sub_kegiatan' && (
                      <td className="px-3 py-3 text-[10px] font-mono text-emerald-400 font-bold">{row.kode_sub_kegiatan || '-'}</td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-mono text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-bold">{row.kode}</span>
                          {row.isUnmapped && <span className="bg-[#4c0519] text-rose-300 border border-rose-900 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1"><AlertTriangle size={8} /> Anomali</span>}
                        </div>
                        <p className="text-xs font-bold text-white leading-tight max-w-[220px] truncate" title={row.name}>{row.name}</p>
                        {row.parentName && <p className="text-[8.5px] text-slate-400 uppercase font-medium truncate max-w-[220px]">{row.parentName}</p>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-right text-white">Rp {formatIDR(row.anggaran)}</td>

                    {/* 12 Months Columns */}
                    {row.monthlyRealisasi.map((val, mIdx) => (
                      <td key={mIdx} className="px-2.5 py-3 text-xs text-right font-medium">
                        {val > 0 ? (
                          <button
                            onClick={() => setDetailModal({ key: row.key, name: row.name, level, monthIndex: mIdx, monthName: MONTH_NAMES[mIdx] })}
                            className="text-emerald-400 font-bold hover:underline hover:text-emerald-300 transition-colors"
                            title={`Lihat transaksi ${MONTH_NAMES[mIdx]}`}
                          >
                            {formatIDR(val)}
                          </button>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    ))}

                    <td className="px-3 py-3 text-xs font-bold text-right text-emerald-400">
                      <button
                        onClick={() => setDetailModal({ key: row.key, name: row.name, level, monthIndex: null })}
                        className="hover:underline flex items-center justify-end gap-1 ml-auto group"
                        title="Klik untuk rincian semua bulan"
                      >
                        Rp {formatIDR(row.totalRealisasi)}
                        <Eye size={10} className="opacity-0 group-hover:opacity-100 text-emerald-400" />
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-right text-rose-400">Rp {formatIDR(sisaAnggaran)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black ${
                        percent >= 90 ? 'bg-[#064e3b] text-emerald-200' :
                        percent >= 50 ? 'bg-slate-700 text-slate-200' : 'bg-[#4c0519] text-rose-300'
                      }`}>
                        {percent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}

              {monthlyData.length === 0 && (
                <tr>
                  <td colSpan={17} className="px-6 py-12 text-center text-slate-500 italic">
                    Tidak ada data laporan bulanan yang sesuai kriteria.
                  </td>
                </tr>
              )}

              {/* Total Footer Row */}
              <tr className="bg-slate-900 text-white font-black sticky bottom-0 z-20 shadow-md">
                <td className="px-4 py-4 text-xs uppercase tracking-wider sticky bottom-0 left-0 bg-slate-900 z-30 shadow-md" colSpan={level === 'sub_kegiatan' ? 3 : 2}>
                  Total Seluruhnya
                </td>
                <td className="px-3 py-4 text-xs text-right sticky bottom-0 bg-slate-900">Rp {formatIDR(totals.anggaran)}</td>
                {totals.monthlyRealisasi.map((sumVal, mIdx) => (
                  <td key={mIdx} className="px-2.5 py-4 text-xs text-right text-slate-300 font-mono sticky bottom-0 bg-slate-900">
                    {sumVal > 0 ? formatIDR(sumVal) : '-'}
                  </td>
                ))}
                <td className="px-3 py-4 text-xs text-right text-emerald-400 sticky bottom-0 bg-slate-900">Rp {formatIDR(totals.totalRealisasi)}</td>
                <td className="px-3 py-4 text-xs text-right text-rose-400 sticky bottom-0 bg-slate-900">Rp {formatIDR(totals.anggaran - totals.totalRealisasi)}</td>
                <td className="px-3 py-4 text-center text-xs sticky bottom-0 bg-slate-900">
                  <span className="text-emerald-300">
                    {totals.anggaran > 0 ? ((totals.totalRealisasi / totals.anggaran) * 100).toFixed(1) : 0}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          /* Single Month Focus View */
          <table className="w-full text-left min-w-[1100px] print:min-w-0 print:text-[8px] border-collapse">
            <thead className="bg-slate-900 border-b border-slate-700 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 left-0 bg-slate-900 z-30 shadow-sm">SKPD</th>
                {level === 'sub_kegiatan' && (
                  <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 bg-slate-900 z-20">Kode SubKeg</th>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 bg-slate-900 z-20">Uraian / Kode</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right sticky top-0 bg-slate-900 z-20">Anggaran</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right sticky top-0 bg-slate-900 z-20">Pagu SPD</th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-400 uppercase tracking-widest text-right bg-slate-900 sticky top-0 z-20">
                  Realisasi {MONTH_NAMES[selectedMonth]}
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-400 uppercase tracking-widest text-right bg-slate-900 sticky top-0 z-20">
                  Realisasi Kumulatif
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-rose-400 uppercase tracking-widest text-right sticky top-0 bg-slate-900 z-20">Sisa Anggaran</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-center sticky top-0 bg-slate-900 z-20">% Capaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-slate-200">
              {monthlyData.map((row, idx) => {
                const monthReal = row.monthlyRealisasi[selectedMonth];
                const sisaAnggaran = row.anggaran - row.totalRealisasi;
                const percent = row.anggaran > 0 ? (row.totalRealisasi / row.anggaran) * 100 : 0;

                return (
                  <tr key={idx} className="hover:bg-slate-700/50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-bold text-slate-300 sticky left-0 bg-slate-800 group-hover:bg-slate-700/70 z-10 shadow-sm">{row.skpd}</td>
                    {level === 'sub_kegiatan' && (
                      <td className="px-6 py-4 text-[10px] font-mono text-emerald-400 font-bold">{row.kode_sub_kegiatan || '-'}</td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-mono text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-bold">{row.kode}</span>
                        </div>
                        <p className="text-sm font-bold text-white">{row.name}</p>
                        {row.parentName && <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-medium">{row.parentName}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-white">Rp {formatIDR(row.anggaran)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-emerald-400">Rp {formatIDR(row.pagu_spd)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-emerald-400">
                      <button
                        onClick={() => setDetailModal({ key: row.key, name: row.name, level, monthIndex: selectedMonth, monthName: MONTH_NAMES[selectedMonth] })}
                        className="hover:underline font-bold"
                      >
                        Rp {formatIDR(monthReal)}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-emerald-400">
                      Rp {formatIDR(row.totalRealisasi)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-rose-400">Rp {formatIDR(sisaAnggaran)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-slate-200">{percent.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}

              {/* Single Month Total Row */}
              <tr className="bg-slate-900 text-white font-black sticky bottom-0 z-20 shadow-md">
                <td className="px-6 py-5 text-sm uppercase tracking-widest sticky bottom-0 left-0 bg-slate-900 z-30 shadow-md" colSpan={level === 'sub_kegiatan' ? 3 : 2}>Total Seluruhnya</td>
                <td className="px-6 py-5 text-sm text-right sticky bottom-0 bg-slate-900">Rp {formatIDR(totals.anggaran)}</td>
                <td className="px-6 py-5 text-sm text-right text-emerald-400 sticky bottom-0 bg-slate-900">Rp {formatIDR(totals.pagu_spd)}</td>
                <td className="px-6 py-5 text-sm text-right text-emerald-400 sticky bottom-0 bg-slate-900">Rp {formatIDR(totals.monthlyRealisasi[selectedMonth])}</td>
                <td className="px-6 py-5 text-sm text-right text-emerald-400 sticky bottom-0 bg-slate-900">Rp {formatIDR(totals.totalRealisasi)}</td>
                <td className="px-6 py-5 text-sm text-right text-rose-400 sticky bottom-0 bg-slate-900">Rp {formatIDR(totals.anggaran - totals.totalRealisasi)}</td>
                <td className="px-6 py-5 text-center text-sm font-black sticky bottom-0 bg-slate-900">
                  <span className="text-emerald-300">
                    {totals.anggaran > 0 ? ((totals.totalRealisasi / totals.anggaran) * 100).toFixed(1) : 0}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Drill-down Transaction Detail Modal */}
      <AnimatePresence>
        {detailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <List className="text-emerald-400" size={20} />
                    Rincian Transaksi Realisasi {detailModal.monthName ? `Bulan ${detailModal.monthName}` : 'Semua Bulan'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{detailModal.name}</p>
                </div>
                <button
                  onClick={() => setDetailModal(null)}
                  className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {filteredDetails.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Realisasi</p>
                        <p className="text-xl font-black text-emerald-400">Rp {formatIDR(filteredDetails.reduce((acc, curr) => acc + curr.realisasi, 0))}</p>
                      </div>
                      <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Transaksi</p>
                        <p className="text-xl font-black text-white">{filteredDetails.length} Dokumen</p>
                      </div>
                    </div>

                    <div className="border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead className="bg-slate-800 text-slate-300">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">No</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Dokumen</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Nilai Realisasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {filteredDetails.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-800/60 transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-3 text-xs font-mono text-emerald-400">{item.tanggal || '-'}</td>
                              <td className="px-4 py-3 text-sm font-medium text-slate-200 italic">{item.keterangan_dokumen || '-'}</td>
                              <td className="px-4 py-3 text-sm font-black text-right text-emerald-400">Rp {formatIDR(item.realisasi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <AlertCircle size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Tidak ada transaksi ditemukan pada periode ini.</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end">
                <button
                  onClick={() => setDetailModal(null)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-colors border border-slate-600"
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
