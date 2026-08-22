
import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Download, Filter, Search, Database, Info, AlertTriangle, AlertCircle, Printer, X, Eye, List, Gift, CircleDollarSign, Calendar, PieChart } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterData, RealizationData, HibahData } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { MonthlyReport } from '../components/MonthlyReport';
import { QuarterlyReport } from '../components/QuarterlyReport';
import { HibahReport } from '../components/HibahReport';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  masterData: MasterData[];
  realizationData: RealizationData[];
  hibahData?: HibahData[];
}

type ReportLevel = 'bidang' | 'program' | 'kegiatan' | 'sub_kegiatan';

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

const ReportsPage: React.FC<Props> = ({ masterData, realizationData, hibahData = [] }) => {
  const [reportType, setReportType] = useState<'apbd' | 'bulanan' | 'triwulan' | 'hibah'>('apbd');
  const [level, setLevel] = useState<ReportLevel>('bidang');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubKegiatan, setSelectedSubKegiatan] = useState<string>('all');
  const [selectedBelanja, setSelectedBelanja] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const setPresetBulanIni = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
    
    setStartDate(`${year}-${month}-01`);
    setEndDate(`${year}-${month}-${String(lastDay || 30).padStart(2, '0')}`);
  };

  const setPresetTriwulan = (q: number) => {
    const today = new Date();
    const year = today.getFullYear();
    if (q === 1) {
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-03-31`);
    } else if (q === 2) {
      setStartDate(`${year}-04-01`);
      setEndDate(`${year}-06-30`);
    } else if (q === 3) {
      setStartDate(`${year}-07-01`);
      setEndDate(`${year}-09-30`);
    } else if (q === 4) {
      setStartDate(`${year}-10-01`);
      setEndDate(`${year}-12-31`);
    }
  };

  const formatDateIndo = (dateStr: string): string => {
    if (!dateStr) return 'Semua';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const activePreset = useMemo(() => {
    if (!startDate && !endDate) return 'semua';
    
    // Check match for Bulan Ini
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
    
    const bulanIniStart = `${year}-${month}-01`;
    const bulanIniEnd = `${year}-${month}-${String(lastDay || 30).padStart(2, '0')}`;
    
    if (startDate === bulanIniStart && endDate === bulanIniEnd) return 'bulan_ini';
    if (startDate === `${year}-01-01` && endDate === `${year}-03-31`) return 'triwulan_1';
    if (startDate === `${year}-04-01` && endDate === `${year}-06-30`) return 'triwulan_2';
    if (startDate === `${year}-07-01` && endDate === `${year}-09-30`) return 'triwulan_3';
    if (startDate === `${year}-10-01` && endDate === `${year}-12-31`) return 'triwulan_4';
    
    return 'custom';
  }, [startDate, endDate]);
  
  // Hibah specific filter states
  const [selectedHibahKegiatan, setSelectedHibahKegiatan] = useState<string>('all');
  const [selectedHibahSub, setSelectedHibahSub] = useState<string>('all');

  const [detailView, setDetailView] = useState<{
    key: string;
    name: string;
    level: ReportLevel;
  } | null>(null);

  // Ambil daftar unik untuk dropdown Hibah
  const hibahKegiatanList = useMemo(() => {
    return Array.from(new Set(hibahData.map(h => h.kegiatan).filter(Boolean))).sort();
  }, [hibahData]);

  const hibahSubKegiatanList = useMemo(() => {
    return Array.from(new Set(hibahData.map(h => h.sub_kegiatan).filter(Boolean))).sort();
  }, [hibahData]);

  // Ambil daftar unik untuk dropdown
  const subKegiatanList = useMemo(() => {
    const list = Array.from(new Set(masterData.map(m => m.sub_kegiatan))).filter(Boolean).sort();
    return list;
  }, [masterData]);

  const belanjaList = useMemo(() => {
    const list = Array.from(new Set(masterData.map(m => m.belanja))).filter(Boolean).sort();
    return list;
  }, [masterData]);

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

  const reportData = useMemo(() => {
    const aggregated: Record<string, { 
      key: string;
      name: string; 
      parentName?: string;
      kode: string;
      kode_sub_kegiatan?: string;
      anggaran: number; 
      pagu_spd: number;
      realisasi: number;
      skpd: string;
      isUnmapped?: boolean;
    }> = {};

    // 1. Iterasi Master Data untuk membangun struktur anggaran di level yang dipilih
    masterData.forEach(m => {
      // Filter berdasarkan dropdown jika dipilih
      if (selectedSubKegiatan !== 'all' && m.sub_kegiatan !== selectedSubKegiatan) return;
      if (selectedBelanja !== 'all' && m.belanja !== selectedBelanja) return;

      let key = '';
      let name = '';
      let kode = '';
      let parentName = '';

      // Tentukan kunci agregasi berdasarkan level yang dipilih
      if (level === 'bidang') {
        name = getBidangName(m.program);
        key = `bidang|${name}`;
        kode = "BIDANG";
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
        // Level Sub Kegiatan / Rincian Belanja
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
          realisasi: 0, 
          skpd: m.skpd 
        };
      }

      // Tambahkan nilai anggaran dari master
      aggregated[key].anggaran += Number(m.anggaran) || 0;
      aggregated[key].pagu_spd += Number(m.pagu_spd) || 0;
    });

    // 2. Iterasi Realization Data untuk mencocokkan realisasi pada level yang dipilih
    // Kita melacak realisasi yang tidak terpetakan untuk ditayangkan sebagai anomali
    const unmatchedRealizations: Record<string, {
      key: string;
      name: string;
      kode: string;
      kode_sub_kegiatan?: string;
      parentName: string;
      anggaran: number;
      pagu_spd: number;
      realisasi: number;
      skpd: string;
      isUnmapped: boolean;
    }> = {};

    realizationData.forEach(r => {
      // Filter berdasarkan dropdown jika dipilih
      if (selectedSubKegiatan !== 'all' && r.sub_kegiatan !== selectedSubKegiatan) return;
      if (selectedBelanja !== 'all' && r.belanja !== selectedBelanja) return;

      // Filter berdasarkan Periode Tanggal
      if (startDate || endDate) {
        if (!r.tanggal) return;
        if (startDate && r.tanggal < startDate) return;
        if (endDate && r.tanggal > endDate) return;
      }

      let rKey = '';
      if (level === 'bidang') {
        const name = getBidangFromRealization(r);
        rKey = `bidang|${name}`;
      } else if (level === 'program') {
        rKey = `${clean(r.kode_skpd)}|${clean(r.kode_program)}`;
      } else if (level === 'kegiatan') {
        rKey = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}`;
      } else {
        // Level Sub Kegiatan / Rincian Belanja
        rKey = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}|${clean(r.kode_sub_kegiatan)}|${clean(r.kode_belanja)}`;
      }

      const value = Number(r.realisasi) || 0;

      if (aggregated[rKey]) {
        // Terpetakan sempurna di master pada level saat ini!
        aggregated[rKey].realisasi += value;
      } else {
        // Tidak ditemukan di master pada level saat ini (Anomali)
        if (!unmatchedRealizations[rKey]) {
          let name = '';
          let kode = '';
          let parentName = 'DATA TIDAK TERPETAKAN (ANOMALI)';

          if (level === 'bidang') {
            name = getBidangFromRealization(r);
            kode = "BIDANG";
          } else if (level === 'program') {
            name = getCleanProgramName(r.kode_program, r.program) || 'Program Tidak Terdaftar';
            kode = r.kode_program || '?';
          } else if (level === 'kegiatan') {
            const masterMatch = masterData.find(m => clean(m.kode_kegiatan) === clean(r.kode_kegiatan));
            name = masterMatch ? masterMatch.kegiatan : (r.kegiatan || 'Kegiatan Tidak Terdaftar');
            kode = r.kode_kegiatan || '?';
            parentName = getCleanProgramName(r.kode_program, r.program) || 'PROGRAM TIDAK TERDAFTAR';
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
            realisasi: 0,
            skpd: r.skpd || 'LAINNYA',
            isUnmapped: true
          };
        }
        unmatchedRealizations[rKey].realisasi += value;
      }
    });

    // Gabungkan realisasi anomali ke data laporan utama
    Object.values(unmatchedRealizations).forEach(item => {
      aggregated[item.key] = item;
    });

    // 3. Filter berdasarkan pencarian dan pengecualian "LAINNYA" untuk level bidang
    return Object.values(aggregated).filter(item => {
      const matchesSearch = clean(item.name).includes(clean(searchTerm)) || 
                           clean(item.kode).includes(clean(searchTerm)) ||
                           clean(item.skpd).includes(clean(searchTerm));
      
      const isOthersBidang = level === 'bidang' && item.name === 'LAINNYA';
      
      return matchesSearch && !isOthersBidang;
    });
  }, [masterData, realizationData, level, searchTerm, selectedSubKegiatan, selectedBelanja, startDate, endDate]);

  const validationAlerts = useMemo(() => {
    const alerts = reportData.filter(item => item.realisasi > item.pagu_spd);
    return {
      count: alerts.length,
      totalOver: alerts.reduce((acc, curr) => acc + (curr.realisasi - curr.pagu_spd), 0)
    };
  }, [reportData]);

  const totals = useMemo(() => {
    return reportData.reduce((acc, curr) => {
      acc.anggaran += curr.anggaran;
      acc.spd += curr.pagu_spd;
      acc.realisasi += curr.realisasi;
      return acc;
    }, { anggaran: 0, spd: 0, realisasi: 0 });
  }, [reportData]);

  const filteredHibahReportData = useMemo(() => {
    return (hibahData || []).filter(item => {
      if (selectedHibahKegiatan !== 'all' && item.kegiatan !== selectedHibahKegiatan) return false;
      if (selectedHibahSub !== 'all' && item.sub_kegiatan !== selectedHibahSub) return false;
      
      const matchesSearch = clean(item.kegiatan).includes(clean(searchTerm)) || 
                           clean(item.sub_kegiatan).includes(clean(searchTerm)) ||
                           clean(item.kode_kegiatan).includes(clean(searchTerm)) ||
                           clean(item.kode_sub_kegiatan).includes(clean(searchTerm)) ||
                           clean(item.kode_rekening || '').includes(clean(searchTerm)) ||
                           clean(item.uraian || '').includes(clean(searchTerm)) ||
                           clean(item.penerima_hibah || '').includes(clean(searchTerm));
      return matchesSearch;
    });
  }, [hibahData, selectedHibahKegiatan, selectedHibahSub, searchTerm]);

  const hibahTotals = useMemo(() => {
    return filteredHibahReportData.reduce((acc, curr) => {
      acc.anggaran += curr.anggaran;
      acc.spd += curr.spd;
      acc.realisasi += curr.realisasi;
      acc.sisa_spd += curr.sisa_spd;
      acc.sisa_realisasi += curr.sisa_realisasi;
      return acc;
    }, { anggaran: 0, spd: 0, realisasi: 0, sisa_spd: 0, sisa_realisasi: 0 });
  }, [filteredHibahReportData]);

  const hibahValidationAlerts = useMemo(() => {
    const alerts = (hibahData || []).filter(item => item.realisasi > item.spd);
    return {
      count: alerts.length,
      totalOver: alerts.reduce((acc, curr) => acc + (curr.realisasi - curr.spd), 0)
    };
  }, [hibahData]);

  const filteredDetails = useMemo(() => {
    if (!detailView) return [];
    return realizationData.filter(r => {
      // Filter berdasarkan Periode Tanggal
      if (startDate || endDate) {
        if (!r.tanggal) return false;
        if (startDate && r.tanggal < startDate) return false;
        if (endDate && r.tanggal > endDate) return false;
      }

      const rBidang = getBidangFromRealization(r);
      const rKeyBidang = `bidang|${rBidang}`;
      const rKeyProgram = `${clean(r.kode_skpd)}|${clean(r.kode_program)}`;
      const rKeyKegiatan = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}`;
      const rKeySub = `${clean(r.kode_skpd)}|${clean(r.kode_program)}|${clean(r.kode_kegiatan)}|${clean(r.kode_sub_kegiatan)}|${clean(r.kode_belanja)}`;
      
      let targetKey = detailView.key;
      if (targetKey.startsWith('unmapped|')) {
        targetKey = targetKey.replace('unmapped|', '');
        return rKeySub === targetKey;
      }

      if (detailView.level === 'bidang') return rKeyBidang === targetKey;
      if (detailView.level === 'program') return rKeyProgram === targetKey;
      if (detailView.level === 'kegiatan') return rKeyKegiatan === targetKey;
      return rKeySub === targetKey;
    });
  }, [detailView, realizationData, startDate, endDate]);

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  const handlePrint = () => {
    window.print();
  };

  const handleExportApbdExcel = () => {
    const title = `Laporan_Realisasi_APBD_${level}_${new Date().toISOString().substring(0, 10)}`;
    const dataToExport = reportData.map((row, idx) => ({
      'No': idx + 1,
      'SKPD': row.skpd,
      ...(level === 'sub_kegiatan' ? { 'Kode Sub Kegiatan': row.kode_sub_kegiatan || '-' } : {}),
      'Kode': row.kode,
      'Uraian': row.name,
      'Pagu Anggaran': row.anggaran,
      'Pagu SPD': row.pagu_spd,
      'Realisasi': row.realisasi,
      'Sisa SPD': row.pagu_spd - row.realisasi,
      'Sisa Anggaran': row.anggaran - row.realisasi,
      '% Capaian': row.anggaran > 0 ? ((row.realisasi / row.anggaran) * 100).toFixed(2) + '%' : '0%'
    }));

    const totalRow = {
      'No': '',
      'SKPD': 'TOTAL',
      ...(level === 'sub_kegiatan' ? { 'Kode Sub Kegiatan': '' } : {}),
      'Kode': '',
      'Uraian': 'TOTAL SELURUHNYA',
      'Pagu Anggaran': totals.anggaran,
      'Pagu SPD': totals.spd,
      'Realisasi': totals.realisasi,
      'Sisa SPD': totals.spd - totals.realisasi,
      'Sisa Anggaran': totals.anggaran - totals.realisasi,
      '% Capaian': totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(2) + '%' : '0%'
    };
    dataToExport.push(totalRow as any);

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan APBD');
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  const handleExportHibahExcel = () => {
    const title = `Laporan_Dana_Hibah_${new Date().toISOString().substring(0, 10)}`;
    const dataToExport = filteredHibahReportData.map((row, idx) => ({
      'No': idx + 1,
      'Kode Kegiatan': row.kode_kegiatan || '-',
      'Nama Kegiatan': row.kegiatan,
      'Kode Sub Kegiatan': row.kode_sub_kegiatan || '-',
      'Kode Rekening': row.kode_rekening || '-',
      'Uraian': row.uraian || '-',
      'Penerima Hibah': row.penerima_hibah || '-',
      'Nama Sub Kegiatan': row.sub_kegiatan,
      'Pagu Anggaran': row.anggaran,
      'Pagu SPD': row.spd,
      'Realisasi': row.realisasi,
      'Sisa SPD': row.spd - row.realisasi,
      'Sisa Anggaran': row.anggaran - row.realisasi,
      '% Capaian': row.anggaran > 0 ? ((row.realisasi / row.anggaran) * 100).toFixed(2) + '%' : '0%'
    }));

    const totalRow = {
      'No': '',
      'Kode Kegiatan': '',
      'Nama Kegiatan': '',
      'Kode Sub Kegiatan': '',
      'Kode Rekening': '',
      'Uraian': '',
      'Penerima Hibah': '',
      'Nama Sub Kegiatan': 'TOTAL SELURUHNYA (HIBAH)',
      'Pagu Anggaran': hibahTotals.anggaran,
      'Pagu SPD': hibahTotals.spd,
      'Realisasi': hibahTotals.realisasi,
      'Sisa SPD': hibahTotals.sisa_spd,
      'Sisa Anggaran': hibahTotals.sisa_realisasi,
      '% Capaian': hibahTotals.anggaran > 0 ? ((hibahTotals.realisasi / hibahTotals.anggaran) * 100).toFixed(2) + '%' : '0%'
    };
    dataToExport.push(totalRow as any);

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Hibah');
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 8px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide scrollbars during print */
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            table-layout: auto !important;
          }
        }
      `}</style>
      {/* Tab Switcher */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl border w-fit print:hidden overflow-x-auto max-w-full gap-1">
        <button
          onClick={() => setReportType('apbd')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
            reportType === 'apbd'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileSpreadsheet size={16} />
          Laporan APBD Utama
        </button>
        <button
          onClick={() => setReportType('bulanan')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
            reportType === 'bulanan'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Calendar size={16} />
          Realisasi Per Bulan
        </button>
        <button
          onClick={() => setReportType('triwulan')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
            reportType === 'triwulan'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <PieChart size={16} />
          Realisasi Per Triwulan
        </button>
        <button
          onClick={() => setReportType('hibah')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
            reportType === 'hibah'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Gift size={16} />
          Laporan Dana Hibah
        </button>
      </div>

      {/* Render Realisasi Per Bulan Component */}
      {reportType === 'bulanan' && (
        <MonthlyReport masterData={masterData} realizationData={realizationData} />
      )}

      {/* Render Realisasi Per Triwulan Component */}
      {reportType === 'triwulan' && (
        <QuarterlyReport masterData={masterData} realizationData={realizationData} />
      )}

      {/* Render Laporan Hibah Component */}
      {reportType === 'hibah' && (
        <HibahReport hibahData={hibahData} realizationData={realizationData} masterData={masterData} />
      )}

      {/* Header Statistics & Info */}
      {reportType === 'apbd' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
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
              Sistem mencocokkan data berdasarkan <b>Kode SKPD + Kode Program + Kode Kegiatan + Kode Sub Kegiatan + Kode Belanja</b>. Pastikan kolom ini sama persis di kedua file.
            </p>
          </div>
        </div>
      )}

      {reportType === 'apbd' && validationAlerts.count > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm animate-in slide-in-from-top duration-500 print:hidden">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-full">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-red-800 uppercase tracking-tight">Peringatan Validasi Anggaran APBD</h4>
              <p className="text-xs text-red-700 mt-1">
                Ditemukan <b>{validationAlerts.count} item</b> dengan realisasi yang <b>melampaui Pagu SPD</b>. 
                Total kelebihan realisasi: <span className="font-bold underline">{formatIDR(validationAlerts.totalOver)}</span>
              </p>
              <p className="text-[10px] text-red-600 mt-2 italic">* Segera periksa data master atau transaksi realisasi untuk menyesuaikan pagu.</p>
            </div>
          </div>
        </div>
      )}

      {reportType === 'apbd' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border overflow-x-auto no-scrollbar">
              {['bidang', 'program', 'kegiatan', 'sub_kegiatan'].map((l) => (
                <button 
                  key={l} 
                  onClick={() => setLevel(l as any)} 
                  className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${level === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {l.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari Nama / Uraian / Kode / SKPD..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                />
              </div>
              <button 
                onClick={handleExportApbdExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                <Download size={18} />
                <span>Excel</span>
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                <Printer size={18} />
                <span>Cetak</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-50 print:hidden">
            <SearchableSelect 
              label="Sub Kegiatan"
              options={subKegiatanList}
              value={selectedSubKegiatan}
              onChange={setSelectedSubKegiatan}
              placeholder="Cari Sub Kegiatan..."
            />
            <SearchableSelect 
              label="Jenis Belanja"
              options={belanjaList}
              value={selectedBelanja}
              onChange={setSelectedBelanja}
              placeholder="Cari Jenis Belanja..."
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-end gap-4 print:hidden">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Dari Tanggal</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 font-medium text-gray-750"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">S.d Tanggal</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 font-medium text-gray-750"
              />
            </div>
            
            <div className="flex flex-wrap gap-1.5 items-center">
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${activePreset === 'semua' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:text-gray-750 hover:bg-gray-50'}`}
              >
                Semua
              </button>
              <button 
                type="button"
                onClick={setPresetBulanIni}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${activePreset === 'bulan_ini' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:text-gray-750 hover:bg-gray-50'}`}
              >
                Bulan Ini
              </button>
              <button 
                type="button"
                onClick={() => setPresetTriwulan(1)}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${activePreset === 'triwulan_1' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:text-gray-750 hover:bg-gray-50'}`}
              >
                Triwulan I
              </button>
              <button 
                type="button"
                onClick={() => setPresetTriwulan(2)}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${activePreset === 'triwulan_2' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:text-gray-750 hover:bg-gray-50'}`}
              >
                Triwulan II
              </button>
              <button 
                type="button"
                onClick={() => setPresetTriwulan(3)}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${activePreset === 'triwulan_3' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:text-gray-750 hover:bg-gray-50'}`}
              >
                Triwulan III
              </button>
              <button 
                type="button"
                onClick={() => setPresetTriwulan(4)}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${activePreset === 'triwulan_4' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:text-gray-750 hover:bg-gray-50'}`}
              >
                Triwulan IV
              </button>
            </div>
          </div>
        </div>
      )}

      {reportType === 'apbd' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden overflow-x-auto print:shadow-none print:border-none print:overflow-visible">
          <div className="hidden print:block mb-6 text-center">
            <h1 className="text-2xl font-black uppercase tracking-tight">Laporan Realisasi Keuangan</h1>
            <p className="text-sm text-gray-500 mt-1">Level Laporan: {level.replace('_', ' ').toUpperCase()}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-left text-xs border-y py-3">
              <div>
                <p><b>Filter Sub Kegiatan:</b> {selectedSubKegiatan === 'all' ? 'Semua' : selectedSubKegiatan}</p>
                <p><b>Filter Jenis Belanja:</b> {selectedBelanja === 'all' ? 'Semua' : selectedBelanja}</p>
                {(startDate || endDate) && (
                  <p><b>Periode Realisasi:</b> {formatDateIndo(startDate)} s.d {formatDateIndo(endDate)}</p>
                )}
              </div>
              <div className="text-right">
                <p><b>Tanggal Cetak:</b> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
          <table className="w-full text-left min-w-[1200px] print:min-w-0 print:text-[10px]">
            <thead className="bg-gray-50/50 border-b">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKPD</th>
                {level === 'sub_kegiatan' && (
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode SubKeg</th>
                )}
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
                const isOverSpd = row.realisasi > row.pagu_spd;
                const percent = row.anggaran > 0 ? (row.realisasi / row.anggaran) * 100 : 0;
                
                return (
                  <tr key={idx} className={`hover:bg-gray-50 transition-colors ${row.isUnmapped ? 'bg-red-50/30' : isOverSpd ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{row.skpd}</td>
                    {level === 'sub_kegiatan' && (
                      <td className="px-6 py-4 text-[10px] font-mono text-amber-600 font-bold">{row.kode_sub_kegiatan || '-'}</td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{row.kode}</span>
                          {row.isUnmapped && <span className="bg-red-100 text-red-700 text-[8px] px-1 rounded font-bold uppercase flex items-center gap-1"><AlertTriangle size={8}/> Anomali</span>}
                          {isOverSpd && <span className="bg-orange-100 text-orange-700 text-[8px] px-1 rounded font-bold uppercase flex items-center gap-1"><AlertCircle size={8}/> Melampaui SPD</span>}
                        </div>
                        <p className="text-sm font-bold text-gray-800 leading-tight">{row.name}</p>
                        {row.parentName && <p className="text-[9px] text-gray-400 mt-1 uppercase font-medium">{row.parentName}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-700">{formatIDR(row.anggaran)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-blue-600">{formatIDR(row.pagu_spd)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-right">
                      <button 
                        onClick={() => setDetailView({ key: row.key, name: row.name, level })}
                        className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors flex items-center gap-1 ml-auto group"
                        title="Klik untuk lihat rincian"
                      >
                        {formatIDR(row.realisasi)}
                        <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${sisaSpd < 0 ? 'text-red-600 bg-red-50' : 'text-amber-600'}`}>{formatIDR(sisaSpd)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-red-500">{formatIDR(sisaAnggaran)}</td>
                    <td className="px-6 py-4 text-center print:px-2">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden print:hidden">
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
                <td className="px-6 py-5 text-sm uppercase tracking-widest" colSpan={level === 'sub_kegiatan' ? 3 : 2}>Total Seluruhnya</td>
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
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailView && (
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
                    Rincian Transaksi Realisasi
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{detailView.name}</p>
                </div>
                <button 
                  onClick={() => setDetailView(null)}
                  className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {filteredDetails.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Realisasi</p>
                        <p className="text-xl font-black text-emerald-700">{formatIDR(filteredDetails.reduce((acc, curr) => acc + curr.realisasi, 0))}</p>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Jumlah Transaksi</p>
                        <p className="text-xl font-black text-indigo-700">{filteredDetails.length}</p>
                      </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan Dokumen</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Nilai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredDetails.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-700 italic">
                                {item.keterangan_dokumen || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm font-black text-right text-emerald-600">
                                {formatIDR(item.realisasi)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <AlertCircle size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Tidak ada rincian transaksi ditemukan.</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t flex justify-end">
                <button 
                  onClick={() => setDetailView(null)}
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

export default ReportsPage;
