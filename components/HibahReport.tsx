import React, { useMemo, useState } from 'react';
import { Download, Search, Printer, Gift, Eye, X, AlertCircle, FileText, CheckCircle2, Copy, Filter, Sparkles, Database, Layers, ChevronDown, ChevronRight, ListFilter, Table as TableIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterData, RealizationData, HibahData } from '../types';
import SearchableSelect from './SearchableSelect';
import { motion, AnimatePresence } from 'motion/react';
import { clean, formatIDR, formatDateIndo } from './reportUtils';

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

// Helper normalisasi format kode rekening
export const normalizeRekening = (kode?: string): string => {
  if (!kode) return '';
  return kode.trim().replace(/\s+/g, '').replace(/[^\d.]/g, '');
};

// Deteksi apakah sebuah akun / uraian tergolong Belanja Hibah
export const isHibahRekening = (kode?: string, uraian?: string, ket?: string): boolean => {
  const norm = normalizeRekening(kode || '');
  const digits = norm.replace(/\./g, '');
  const text = `${uraian || ''} ${ket || ''}`.toLowerCase();

  if (norm.startsWith('5.1.05') || norm.startsWith('5.1.5.') || digits.startsWith('5105') || digits.startsWith('515')) {
    return true;
  }
  if (norm.includes('5.1.02.01.001.00040') || norm.includes('5.1.02.01.01.0040') || digits.includes('51020100100040') || digits.includes('510201010040')) {
    return true;
  }
  if (text.includes('hibah') || text.includes('dana hibah')) {
    return true;
  }
  return false;
};

// Petakan kode rekening ke salah satu dari 5 target canonical jika cocok
export const getCanonicalHibahCode = (kode?: string, uraian?: string, ket?: string): string => {
  const norm = normalizeRekening(kode || '');
  const digits = norm.replace(/\./g, '');
  const text = `${uraian || ''} ${ket || ''}`.toLowerCase();

  // 1. Hibah Pemerintah (5.1.05.01.001.00001)
  if (norm.startsWith('5.1.05.01') || norm.startsWith('5.1.5.01') || digits.startsWith('510501') || digits.startsWith('51501') || text.includes('pemerintah pusat') || text.includes('pemerintah daerah')) {
    return '5.1.05.01.001.00001';
  }

  // 2. Hibah Ormas spesifik (5.1.05.05.003.00001)
  if (norm.includes('5.1.05.05.003') || norm.includes('5.1.05.05.03') || digits.includes('510505003') || digits.includes('51050503') || (digits.startsWith('510505') && (text.includes('organisasi kemasyarakatan') || text.includes('ormas')) && !text.includes('badan'))) {
    return '5.1.05.05.003.00001';
  }

  // 3. Hibah Badan / Lembaga (5.1.05.05.001.00001) - SATUKAN SEMUA VARIASI 5.1.05.05.001 / 5.1.05.05
  if (norm.startsWith('5.1.05.05') || norm.startsWith('5.1.5.05') || digits.startsWith('510505') || digits.startsWith('51505') || (text.includes('badan') && text.includes('lembaga')) || text.includes('ditetapkan oleh pemerintah')) {
    return '5.1.05.05.001.00001';
  }

  // 4. Hibah Badan / Lembaga / Ormas (5.1.05.07.001.00001)
  if (norm.startsWith('5.1.05.07') || norm.startsWith('5.1.5.07') || digits.startsWith('510507') || digits.startsWith('51507')) {
    return '5.1.05.07.001.00001';
  }

  // 5. Belanja Barang / Jasa diserahkan kepada masyarakat (5.1.02.01.001.00040)
  if (norm.includes('5.1.02.01.001.00040') || norm.includes('5.1.02.01.01.0040') || digits.includes('51020100100040') || digits.includes('510201010040') || (digits.startsWith('510201') && digits.endsWith('40')) || text.includes('diserahkan kepada masyarakat') || text.includes('pihak ketiga')) {
    return '5.1.02.01.001.00040';
  }

  // Fallback jika ada kode 5.1.05 lainnya
  if (norm.startsWith('5.1.05') || digits.startsWith('5105') || text.includes('hibah')) {
    return '5.1.05.05.001.00001';
  }

  return kode || '5.1.05.05.001.00001';
};

// Cek apakah 2 kode rekening cocok (memperhitungkan variasi titik/digit)
export const isMatchingAccount = (codeA?: string, codeB?: string): boolean => {
  if (!codeA || !codeB) return false;
  const aClean = clean(codeA);
  const bClean = clean(codeB);
  if (aClean === bClean) return true;

  const aDigits = normalizeRekening(codeA).replace(/\./g, '');
  const bDigits = normalizeRekening(codeB).replace(/\./g, '');
  if (aDigits && bDigits && aDigits === bDigits) return true;

  // Cek kesamaan canonical account
  const canonA = getCanonicalHibahCode(codeA);
  const canonB = getCanonicalHibahCode(codeB);
  if (canonA && canonB && canonA === canonB) return true;

  return false;
};

// Ekstrak nama calon penerima hibah dari teks uraian atau keterangan transaksi
export const extractPenerimaName = (uraian?: string, keterangan?: string): string => {
  const text = `${keterangan || ''} ${uraian || ''}`.trim();
  if (!text) return '-';

  const matchKepada = text.match(/(?:kepada|untuk|bagi|an\.|a\.n\.|penerima)\s+([A-Za-z0-9\s.,/\-&'()]+?)(?:\s*(?:tahap|termin|tahun|anggaran|periode|berdasarkan|sp2d|nphd|nomor|no\.|\d{4}|$))/i);
  if (matchKepada && matchKepada[1] && matchKepada[1].trim().length > 2) {
    return matchKepada[1].trim();
  }

  const cleanedPrefix = (uraian || keterangan || '')
    .replace(/^Belanja\s+Hibah\s+(?:Uang\s+)?(?:Barang\s+)?(?:kepada\s+)?/i, '')
    .replace(/^Pencairan\s+(?:Dana\s+)?Hibah\s+/i, '')
    .trim();

  if (cleanedPrefix && cleanedPrefix.length > 2 && !cleanedPrefix.toLowerCase().startsWith('belanja')) {
    return cleanedPrefix;
  }

  return uraian || '-';
};

export const HibahReport: React.FC<Props> = ({ hibahData = [], realizationData = [], masterData = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRekening, setSelectedRekening] = useState<string>('all');
  const [selectedKegiatan, setSelectedKegiatan] = useState<string>('all');
  const [selectedSubKegiatan, setSelectedSubKegiatan] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'auto' | 'manual'>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'rekening' | 'rincian'>('rekening');
  const [expandedRekening, setExpandedRekening] = useState<Record<string, boolean>>({});

  const toggleExpand = (kode: string) => {
    setExpandedRekening(prev => ({ ...prev, [kode]: !prev[kode] }));
  };

  // Modal preview keterangan belanja
  const [previewModal, setPreviewModal] = useState<{
    item: HibahData;
    realizations: RealizationData[];
  } | null>(null);

  // --- AUTOMATIC DATA SYNTHESIS & MERGING ---
  // Menggabungkan data dari masterData (APBD), realizationData (SP2D), dan hibahData secara otomatis
  const combinedHibahData = useMemo(() => {
    const result: HibahData[] = [];
    const processedKeys = new Set<string>();

    // 1. Masukkan data input spesifik dari menu Dana Hibah
    hibahData.forEach((h, index) => {
      // Hitung realisasi aktual dari realizationData
      const matchedReals = realizationData.filter(r => {
        const isRekMatch = clean(r.kode_belanja || '') === clean(h.kode_rekening || '') || 
                           isMatchingAccount(r.kode_belanja, h.kode_rekening);
        const isSubMatch = (h.kode_sub_kegiatan && clean(r.kode_sub_kegiatan) === clean(h.kode_sub_kegiatan)) ||
                           (h.sub_kegiatan && clean(r.sub_kegiatan) === clean(h.sub_kegiatan));
        return isRekMatch && (isSubMatch || !h.kode_sub_kegiatan);
      });

      const calculatedReal = matchedReals.reduce((sum, r) => sum + (r.realisasi || 0), 0);
      const finalReal = (h.realisasi && h.realisasi > 0) ? h.realisasi : calculatedReal;

      const key = `${clean(h.kode_rekening)}_${clean(h.kode_sub_kegiatan || h.sub_kegiatan)}_${clean(h.penerima_hibah || h.uraian)}`;
      processedKeys.add(key);

      result.push({
        ...h,
        id: h.id || `hibah_manual_${index}`,
        realisasi: finalReal,
        sisa_spd: (h.spd || 0) - finalReal,
        sisa_realisasi: (h.anggaran || 0) - finalReal,
        isAutoGenerated: false,
        sourceType: 'manual'
      });
    });

    // 2. OTOMATIS: Ekstrak semua baris dari masterData (APBD) yang sesuai kode rekening Hibah / Belanja Hibah
    masterData.forEach((m, mIndex) => {
      if (isHibahRekening(m.kode_belanja, m.belanja)) {
        const canonicalCode = getCanonicalHibahCode(m.kode_belanja, m.belanja);
        const key = `${clean(m.kode_belanja)}_${clean(m.kode_sub_kegiatan || m.sub_kegiatan)}_${clean(m.belanja)}`;

        // Periksa apakah sudah ada di hibahData manual yang persis sama
        const alreadyExists = result.some(item => 
          (clean(item.kode_rekening) === clean(m.kode_belanja) || isMatchingAccount(item.kode_rekening, m.kode_belanja)) &&
          ((m.kode_sub_kegiatan && clean(item.kode_sub_kegiatan) === clean(m.kode_sub_kegiatan)) ||
           (m.sub_kegiatan && clean(item.sub_kegiatan) === clean(m.sub_kegiatan)))
        );

        if (!alreadyExists && !processedKeys.has(key)) {
          processedKeys.add(key);

          // Cari transaksi realisasi SP2D yang cocok
          const matchedReals = realizationData.filter(r => {
            const isRekMatch = clean(r.kode_belanja || '') === clean(m.kode_belanja || '') ||
                               isMatchingAccount(r.kode_belanja, m.kode_belanja) ||
                               clean(r.kode_belanja || '') === clean(canonicalCode);
            const isSubMatch = (m.kode_sub_kegiatan && clean(r.kode_sub_kegiatan) === clean(m.kode_sub_kegiatan)) ||
                               (m.sub_kegiatan && clean(r.sub_kegiatan) === clean(m.sub_kegiatan));
            return isRekMatch && (isSubMatch || !m.kode_sub_kegiatan);
          });

          const calculatedReal = matchedReals.reduce((sum, r) => sum + (r.realisasi || 0), 0);
          const finalReal = m.realisasi && m.realisasi > 0 ? m.realisasi : calculatedReal;
          const extractedPenerima = extractPenerimaName(m.belanja, matchedReals[0]?.keterangan_dokumen);

          result.push({
            id: `auto_master_${m.id || mIndex}`,
            kegiatan: m.kegiatan || '',
            kode_kegiatan: m.kode_kegiatan || '',
            sub_kegiatan: m.sub_kegiatan || '',
            kode_sub_kegiatan: m.kode_sub_kegiatan || '',
            kode_rekening: m.kode_belanja || canonicalCode,
            uraian: m.belanja || '',
            penerima_hibah: extractedPenerima,
            anggaran: m.anggaran || 0,
            spd: m.pagu_spd || 0,
            realisasi: finalReal,
            sisa_spd: (m.pagu_spd || 0) - finalReal,
            sisa_realisasi: (m.anggaran || 0) - finalReal,
            isAutoGenerated: true,
            sourceType: 'auto_apbd'
          });
        }
      }
    });

    // 3. OTOMATIS: Ekstrak dari realizationData (SP2D) jika ada transaksi hibah yang belum tercakup di master/hibah
    realizationData.forEach((r, rIndex) => {
      if (isHibahRekening(r.kode_belanja, '', r.keterangan_dokumen)) {
        const canonicalCode = getCanonicalHibahCode(r.kode_belanja, r.keterangan_dokumen);
        
        const alreadyCovered = result.some(item => 
          (clean(item.kode_rekening) === clean(r.kode_belanja) || isMatchingAccount(item.kode_rekening, r.kode_belanja)) &&
          ((r.kode_sub_kegiatan && clean(item.kode_sub_kegiatan) === clean(r.kode_sub_kegiatan)) ||
           (r.sub_kegiatan && clean(item.sub_kegiatan) === clean(r.sub_kegiatan)))
        );

        if (!alreadyCovered) {
          result.push({
            id: `auto_real_${r.id || rIndex}`,
            kegiatan: r.kegiatan || 'Realisasi Belanja Hibah',
            kode_kegiatan: r.kode_kegiatan || '',
            sub_kegiatan: r.sub_kegiatan || 'Sub Kegiatan Hibah',
            kode_sub_kegiatan: r.kode_sub_kegiatan || '',
            kode_rekening: r.kode_belanja || canonicalCode,
            uraian: r.keterangan_dokumen || 'Realisasi Belanja Hibah SP2D',
            penerima_hibah: extractPenerimaName('', r.keterangan_dokumen),
            anggaran: 0,
            spd: 0,
            realisasi: r.realisasi || 0,
            sisa_spd: -(r.realisasi || 0),
            sisa_realisasi: -(r.realisasi || 0),
            isAutoGenerated: true,
            sourceType: 'auto_sp2d'
          });
        }
      }
    });

    return result;
  }, [hibahData, masterData, realizationData]);

  // Helper untuk mencari data realisasi SP2D yang cocok dengan item hibah
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
      if (itemRekening && (rBelanja === itemRekening || isMatchingAccount(r.kode_belanja, hibahItem.kode_rekening))) {
        if (itemKodeSub && rKodeSub && itemKodeSub === rKodeSub) return true;
        if (itemSub && rSub && itemSub === rSub) return true;
        if (itemPenerima && itemPenerima !== '-' && rKet.includes(itemPenerima)) return true;
        if (itemUraian && rKet.includes(itemUraian)) return true;
        return true;
      }

      // 2. Cocok berdasarkan pencarian nama penerima di keterangan belanja
      if (itemPenerima && itemPenerima.length > 3 && itemPenerima !== '-' && rKet.includes(itemPenerima)) {
        return true;
      }

      return false;
    });
  };

  // Kumpulan unik daftar kegiatan, sub kegiatan & kode rekening
  const kegiatanList = useMemo(() => {
    return Array.from(new Set(combinedHibahData.map(h => h.kegiatan).filter(Boolean))).sort();
  }, [combinedHibahData]);

  const subKegiatanList = useMemo(() => {
    return Array.from(new Set(combinedHibahData.map(h => h.sub_kegiatan).filter(Boolean))).sort();
  }, [combinedHibahData]);

  const allRekeningList = useMemo(() => {
    const map = new Map<string, string>();
    TARGET_HIBAH_ACCOUNTS.forEach(t => {
      map.set(t.kode, `${t.kode} - ${t.short}`);
    });
    combinedHibahData.forEach(h => {
      if (h.kode_rekening && !map.has(h.kode_rekening)) {
        map.set(h.kode_rekening, `${h.kode_rekening} ${h.uraian ? `(${h.uraian})` : ''}`);
      }
    });
    return Array.from(map.entries()).map(([kode, label]) => ({
      value: kode,
      label
    }));
  }, [combinedHibahData]);

  // Rekapitulasi per Kode Rekening Target
  const accountSummaries = useMemo(() => {
    return TARGET_HIBAH_ACCOUNTS.map(acc => {
      const matchingItems = combinedHibahData.filter(h => {
        const c = clean(h.kode_rekening || '');
        const targetC = clean(acc.kode);
        return c === targetC || isMatchingAccount(h.kode_rekening, acc.kode);
      });

      const totalAnggaran = matchingItems.reduce((sum, item) => sum + (item.anggaran || 0), 0);
      const totalSpd = matchingItems.reduce((sum, item) => sum + (item.spd || 0), 0);
      const totalRealisasi = matchingItems.reduce((sum, item) => sum + (item.realisasi || 0), 0);
      const percent = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;
      
      // Ambil transaksi realisasi terkait
      const matchedRealizations = realizationData.filter(r => 
        clean(r.kode_belanja || '') === clean(acc.kode) || isMatchingAccount(r.kode_belanja, acc.kode)
      );

      return {
        ...acc,
        itemCount: matchingItems.length,
        totalAnggaran,
        totalSpd,
        totalRealisasi,
        sisaSpd: totalSpd - totalRealisasi,
        sisaAnggaran: totalAnggaran - totalRealisasi,
        percent,
        transactionCount: matchedRealizations.length
      };
    });
  }, [combinedHibahData, realizationData]);

  // --- KONSOLIDASI DATA BERDASARKAN KODE REKENING (MENYATUKAN ANGGARAN & REALISASI) ---
  const consolidatedAccountData = useMemo(() => {
    const canonicalMap = new Map<string, {
      kode_rekening: string;
      nama: string;
      short: string;
      kategori: string;
      badgeBg: string;
      badgeText: string;
      borderColor: string;
      subKegiatanList: HibahData[];
      sp2dTransactions: RealizationData[];
      totalAnggaran: number;
      totalSpd: number;
      totalRealisasi: number;
      sisaSpd: number;
      sisaAnggaran: number;
      percent: number;
    }>();

    // 1. Inisialisasi dari TARGET_HIBAH_ACCOUNTS
    TARGET_HIBAH_ACCOUNTS.forEach(acc => {
      canonicalMap.set(acc.kode, {
        kode_rekening: acc.kode,
        nama: acc.nama,
        short: acc.short,
        kategori: acc.kategori,
        badgeBg: acc.badgeBg,
        badgeText: acc.badgeText,
        borderColor: acc.borderColor,
        subKegiatanList: [],
        sp2dTransactions: [],
        totalAnggaran: 0,
        totalSpd: 0,
        totalRealisasi: 0,
        sisaSpd: 0,
        sisaAnggaran: 0,
        percent: 0
      });
    });

    // 2. Kelompokkan item dari combinedHibahData
    combinedHibahData.forEach(item => {
      const canonicalCode = getCanonicalHibahCode(item.kode_rekening, item.uraian);
      let entry = canonicalMap.get(canonicalCode);
      if (!entry) {
        entry = {
          kode_rekening: item.kode_rekening || canonicalCode,
          nama: item.uraian || 'Belanja Hibah',
          short: 'Hibah',
          kategori: 'Lainnya',
          badgeBg: 'bg-gray-50',
          badgeText: 'text-gray-700',
          borderColor: 'border-gray-200',
          subKegiatanList: [],
          sp2dTransactions: [],
          totalAnggaran: 0,
          totalSpd: 0,
          totalRealisasi: 0,
          sisaSpd: 0,
          sisaAnggaran: 0,
          percent: 0
        };
        canonicalMap.set(canonicalCode, entry);
      }
      entry.subKegiatanList.push(item);
      entry.totalAnggaran += item.anggaran || 0;
      entry.totalSpd += item.spd || 0;
      entry.totalRealisasi += item.realisasi || 0;
    });

    // 3. Masukkan transaksi SP2D yang cocok ke masing-masing rekening
    realizationData.forEach(r => {
      if (isHibahRekening(r.kode_belanja, '', r.keterangan_dokumen)) {
        const canonicalCode = getCanonicalHibahCode(r.kode_belanja, r.keterangan_dokumen);
        const entry = canonicalMap.get(canonicalCode);
        if (entry) {
          // Cek duplikasi transaksi
          const exists = entry.sp2dTransactions.some(ex => (ex.nomor_sp2d && ex.nomor_sp2d === r.nomor_sp2d) || (ex.id && ex.id === r.id));
          if (!exists) {
            entry.sp2dTransactions.push(r);
          }
        }
      }
    });

    // 4. Hitung sisa dan persentase
    return Array.from(canonicalMap.values())
      .filter(item => item.totalAnggaran > 0 || item.totalRealisasi > 0 || item.subKegiatanList.length > 0 || item.sp2dTransactions.length > 0)
      .map(item => {
        const sisaSpd = item.totalSpd - item.totalRealisasi;
        const sisaAnggaran = item.totalAnggaran - item.totalRealisasi;
        const percent = item.totalAnggaran > 0 ? (item.totalRealisasi / item.totalAnggaran) * 100 : 0;
        return {
          ...item,
          sisaSpd,
          sisaAnggaran,
          percent
        };
      });
  }, [combinedHibahData, realizationData]);

  // Filter Data Rekapitulasi Kode Rekening
  const filteredConsolidatedData = useMemo(() => {
    return consolidatedAccountData.filter(acc => {
      // Filter Kode Rekening
      if (selectedRekening !== 'all') {
        const isMatch = clean(acc.kode_rekening) === clean(selectedRekening) || isMatchingAccount(acc.kode_rekening, selectedRekening);
        if (!isMatch) return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = clean(searchTerm);
        const matchAcc = clean(acc.kode_rekening).includes(q) || clean(acc.nama).includes(q) || clean(acc.short).includes(q);
        const matchSub = acc.subKegiatanList.some(s => 
          clean(s.kegiatan).includes(q) || clean(s.sub_kegiatan).includes(q) || clean(s.uraian || '').includes(q) || clean(s.penerima_hibah || '').includes(q)
        );
        const matchSp2d = acc.sp2dTransactions.some(r => clean(r.keterangan_dokumen || '').includes(q) || clean(r.nomor_sp2d || '').includes(q));
        if (!matchAcc && !matchSub && !matchSp2d) return false;
      }
      return true;
    });
  }, [consolidatedAccountData, selectedRekening, searchTerm]);

  // Totals untuk Tabel Konsolidasi Kode Rekening
  const consolidatedTotals = useMemo(() => {
    return filteredConsolidatedData.reduce((acc, curr) => {
      acc.anggaran += curr.totalAnggaran;
      acc.spd += curr.totalSpd;
      acc.realisasi += curr.totalRealisasi;
      acc.sisa_spd += curr.sisaSpd;
      acc.sisa_realisasi += curr.sisaAnggaran;
      return acc;
    }, { anggaran: 0, spd: 0, realisasi: 0, sisa_spd: 0, sisa_realisasi: 0 });
  }, [filteredConsolidatedData]);

  // Filter Data Utama
  const filteredData = useMemo(() => {
    return combinedHibahData.filter(item => {
      // Filter Sumber Data
      if (sourceFilter === 'auto' && !item.isAutoGenerated) return false;
      if (sourceFilter === 'manual' && item.isAutoGenerated) return false;

      // Filter Kode Rekening
      if (selectedRekening !== 'all') {
        const isMatch = clean(item.kode_rekening || '') === clean(selectedRekening) || 
                        isMatchingAccount(item.kode_rekening, selectedRekening);
        if (!isMatch) return false;
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
  }, [combinedHibahData, selectedRekening, selectedKegiatan, selectedSubKegiatan, sourceFilter, searchTerm]);

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
    const alerts = combinedHibahData.filter(item => (item.realisasi || 0) > (item.spd || 0));
    return {
      count: alerts.length,
      totalOver: alerts.reduce((acc, curr) => acc + ((curr.realisasi || 0) - (curr.spd || 0)), 0)
    };
  }, [combinedHibahData]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (viewMode === 'rekening') {
      const title = `Laporan_Hibah_Rekap_Kode_Rekening_${new Date().toISOString().substring(0, 10)}`;
      const dataToExport = filteredConsolidatedData.map((row, idx) => {
        const previewKet = row.sp2dTransactions.length > 0
          ? row.sp2dTransactions.map(r => `[${r.tanggal || '-'}] ${r.keterangan_dokumen || '-'} (Rp ${formatIDR(r.realisasi)})`).join(' | ')
          : (row.nama || '-');

        const subKegiatanNames = row.subKegiatanList.map(s => `${s.kode_sub_kegiatan || ''} ${s.sub_kegiatan}`).filter(Boolean).join('; ');

        return {
          'No': idx + 1,
          'Kode Rekening': row.kode_rekening,
          'Uraian Rekening': row.nama,
          'Jumlah Sub Kegiatan': row.subKegiatanList.length,
          'Daftar Sub Kegiatan': subKegiatanNames || '-',
          'Jumlah SP2D': row.sp2dTransactions.length,
          'Preview Keterangan Belanja (SP2D)': previewKet,
          'Pagu Anggaran': row.totalAnggaran,
          'Pagu SPD': row.totalSpd,
          'Realisasi': row.totalRealisasi,
          'Sisa SPD': row.sisaSpd,
          'Sisa Anggaran': row.sisaAnggaran,
          '% Capaian': row.percent.toFixed(2) + '%'
        };
      });

      const totalRow = {
        'No': '',
        'Kode Rekening': 'TOTAL',
        'Uraian Rekening': 'TOTAL SELURUH REKENING HIBAH',
        'Jumlah Sub Kegiatan': '',
        'Daftar Sub Kegiatan': '',
        'Jumlah SP2D': '',
        'Preview Keterangan Belanja (SP2D)': '',
        'Pagu Anggaran': consolidatedTotals.anggaran,
        'Pagu SPD': consolidatedTotals.spd,
        'Realisasi': consolidatedTotals.realisasi,
        'Sisa SPD': consolidatedTotals.sisa_spd,
        'Sisa Anggaran': consolidatedTotals.sisa_realisasi,
        '% Capaian': consolidatedTotals.anggaran > 0 ? ((consolidatedTotals.realisasi / consolidatedTotals.anggaran) * 100).toFixed(2) + '%' : '0%'
      };
      dataToExport.push(totalRow as any);

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kode Rekening');
      XLSX.writeFile(wb, `${title}.xlsx`);
    } else {
      const title = `Laporan_Dana_Hibah_Rincian_${selectedRekening !== 'all' ? selectedRekening : 'Semua'}_${new Date().toISOString().substring(0, 10)}`;
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
          '% Capaian': (row.anggaran || 0) > 0 ? (((row.realisasi || 0) / (row.anggaran || 0)) * 100).toFixed(2) + '%' : '0%',
          'Sumber Data': row.isAutoGenerated ? 'Otomatis (APBD & SP2D)' : 'Input Manual'
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
        '% Capaian': totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(2) + '%' : '0%',
        'Sumber Data': ''
      };
      dataToExport.push(totalRow as any);

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rincian Sub Kegiatan');
      XLSX.writeFile(wb, `${title}.xlsx`);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const autoCount = combinedHibahData.filter(h => h.isAutoGenerated).length;
  const manualCount = combinedHibahData.filter(h => !h.isAutoGenerated).length;

  return (
    <div className="space-y-6">
      {/* Information Banner on Auto Sync */}
      <div className="bg-linear-to-r from-indigo-50 via-blue-50 to-emerald-50 border border-indigo-100 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-indigo-950 flex items-center gap-2">
              Laporan Hibah Otomatis Berbasis 5 Kode Rekening APBD & SP2D
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Sistem Aktif
              </span>
            </h4>
            <p className="text-xs text-indigo-900/80 mt-0.5">
              Data dikumpulkan secara otomatis dari <b>{masterData.length} baris Master Data APBD</b> dan <b>{realizationData.length} transaksi SP2D</b> yang sesuai dengan 5 Kode Rekening Belanja Hibah.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="bg-white/80 backdrop-blur-xs text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-2xs flex items-center gap-1.5">
            <Database size={14} /> Total {combinedHibahData.length} Baris Hibah ({autoCount} Otomatis, {manualCount} Manual)
          </span>
        </div>
      </div>

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
              Rekapitulasi Belanja Hibah Berdasarkan 5 Kode Rekening Target
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Klik salah satu kode rekening di bawah untuk memfilter data dan melihat preview rincian keterangan belanja SP2D.
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
                    <span>{acc.itemCount} Item ({acc.transactionCount} SP2D)</span>
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

        {/* Source & Account Quick Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-50">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs font-bold text-gray-400 whitespace-nowrap mr-1">Kode Rekening:</span>
            <button
              onClick={() => setSelectedRekening('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedRekening === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semua Rekening ({combinedHibahData.length})
            </button>
            {TARGET_HIBAH_ACCOUNTS.map(acc => {
              const count = combinedHibahData.filter(h => clean(h.kode_rekening || '') === clean(acc.kode) || isMatchingAccount(h.kode_rekening, acc.kode)).length;
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

          {/* Filter Sumber Data */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${sourceFilter === 'all' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Semua Sumber ({combinedHibahData.length})
            </button>
            <button
              onClick={() => setSourceFilter('auto')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${sourceFilter === 'auto' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              ⚡ Otomatis APBD ({autoCount})
            </button>
            <button
              onClick={() => setSourceFilter('manual')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${sourceFilter === 'manual' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Input Manual ({manualCount})
            </button>
          </div>
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

      {/* View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-2xl shadow-sm border border-gray-200 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider px-2">Mode Tampilan Tabel:</span>
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setViewMode('rekening')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'rekening'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <TableIcon size={15} />
              <span>Rekap Berdasarkan Kode Rekening (Satukan Anggaran & Realisasi)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                viewMode === 'rekening' ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {filteredConsolidatedData.length} Rekening
              </span>
            </button>

            <button
              onClick={() => setViewMode('rincian')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'rincian'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <ListFilter size={15} />
              <span>Rincian Per Sub Kegiatan & Penerima</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                viewMode === 'rincian' ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {filteredData.length} Item
              </span>
            </button>
          </div>
        </div>

        {viewMode === 'rekening' && (
          <p className="text-xs text-gray-500 font-medium">
            💡 Klik baris atau tombol <span className="font-bold text-indigo-600">Rincian</span> untuk melihat sub kegiatan & SP2D di bawah kode rekening.
          </p>
        )}
      </div>

      {/* Main Hibah Data Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-x-auto overflow-y-auto max-h-[72vh] relative print:max-h-none print:overflow-visible print:shadow-none print:border-none">
        {/* Printable Header */}
        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight">Laporan Realisasi Dana Hibah</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sistem Informasi Realisasi Keuangan - Data Hibah Berdasarkan Kode Rekening ({viewMode === 'rekening' ? 'Rekap Kode Rekening' : 'Rincian Sub Kegiatan'})
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-left text-xs border-y py-3">
            <div>
              <p><b>Mode Tampilan:</b> {viewMode === 'rekening' ? 'Rekapitulasi Kode Rekening' : 'Rincian Sub Kegiatan & Penerima'}</p>
              <p><b>Filter Rekening:</b> {selectedRekening === 'all' ? 'Semua Kode Rekening' : selectedRekening}</p>
              <p><b>Total Anggaran:</b> Rp {formatIDR(viewMode === 'rekening' ? consolidatedTotals.anggaran : totals.anggaran)}</p>
            </div>
            <div className="text-right">
              <p><b>Total Realisasi:</b> Rp {formatIDR(viewMode === 'rekening' ? consolidatedTotals.realisasi : totals.realisasi)}</p>
              <p><b>Persentase:</b> {((viewMode === 'rekening' ? consolidatedTotals.anggaran : totals.anggaran) > 0 ? (((viewMode === 'rekening' ? consolidatedTotals.realisasi : totals.realisasi) / (viewMode === 'rekening' ? consolidatedTotals.anggaran : totals.anggaran)) * 100).toFixed(1) : 0)}%</p>
              <p><b>Tanggal Cetak:</b> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {viewMode === 'rekening' ? (
          /* TABEL 1: KONSOLIDASI BERDASARKAN KODE REKENING */
          <table className="w-full text-left min-w-[1400px] print:min-w-0 print:text-[8px] border-collapse">
            <thead className="bg-gray-50/95 backdrop-blur-xs border-b border-gray-200 sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="px-4 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 left-0 bg-gray-100 z-30 shadow-xs print:px-1 print:py-1.5 print:text-[7.5px] print:text-black w-14 text-center">No</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black min-w-[200px]">Kode Rekening</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black min-w-[260px]">Uraian Rekening Hibah</th>
                <th className="px-5 py-4 text-[10px] font-black text-indigo-700 uppercase tracking-widest sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black min-w-[240px]">Sub Kegiatan & Transaksi SP2D</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Pagu Anggaran</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Pagu SPD</th>
                <th className="px-5 py-4 text-[10px] font-black text-emerald-700 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Realisasi (SP2D)</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Sisa SPD</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Sisa Anggaran</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">%</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center sticky top-0 bg-gray-50 z-20 print:hidden w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredConsolidatedData.map((acc, idx) => {
                const isExpanded = !!expandedRekening[acc.kode_rekening];
                const isOverSpd = acc.totalRealisasi > acc.totalSpd;

                return (
                  <React.Fragment key={acc.kode_rekening}>
                    <tr 
                      className={`hover:bg-indigo-50/30 transition-colors group cursor-pointer ${
                        isExpanded ? 'bg-indigo-50/40' : ''
                      } ${isOverSpd ? 'bg-orange-50/40' : ''}`}
                      onClick={() => toggleExpand(acc.kode_rekening)}
                    >
                      <td className="px-4 py-4 text-xs font-bold text-gray-500 sticky left-0 bg-white group-hover:bg-indigo-50/30 z-10 shadow-xs text-center print:px-1 print:py-1 print:text-[7px]">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(acc.kode_rekening);
                            }}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-gray-100 print:hidden"
                          >
                            {isExpanded ? <ChevronDown size={14} className="text-indigo-600 font-black" /> : <ChevronRight size={14} />}
                          </button>
                          <span>{idx + 1}</span>
                        </div>
                      </td>

                      {/* Kode Rekening */}
                      <td className="px-5 py-4 print:px-1 print:py-1">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border inline-block ${acc.badgeBg} ${acc.badgeText} ${acc.borderColor} print:border-none print:p-0 print:text-[7px] print:text-black`}>
                              {acc.kode_rekening}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-gray-500 print:hidden">
                            {acc.short}
                          </span>
                        </div>
                      </td>

                      {/* Uraian */}
                      <td className="px-5 py-4 max-w-[280px] print:px-1 print:py-1 print:max-w-none">
                        <p className="text-sm font-bold text-gray-900 leading-snug print:text-[7px] print:text-black">
                          {acc.nama}
                        </p>
                      </td>

                      {/* Ringkasan Sub Kegiatan & SP2D */}
                      <td className="px-5 py-4 max-w-[260px] print:px-1 print:py-1 print:max-w-none">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200 print:hidden">
                              📁 {acc.subKegiatanList.length} Sub Kegiatan
                            </span>
                            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 print:hidden">
                              📄 {acc.sp2dTransactions.length} Transaksi SP2D
                            </span>
                          </div>
                          {acc.sp2dTransactions.length > 0 ? (
                            <p className="text-xs text-gray-600 line-clamp-1 leading-relaxed bg-indigo-50/50 p-1.5 rounded border border-indigo-100/60 print:text-[7px]">
                              {acc.sp2dTransactions[0].keterangan_dokumen}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Belum ada transaksi realisasi</p>
                          )}
                        </div>
                      </td>

                      {/* Anggaran */}
                      <td className="px-5 py-4 text-sm font-bold text-right text-gray-800 print:px-1 print:py-1 print:text-[7px] print:text-black">
                        {formatIDR(acc.totalAnggaran)}
                      </td>

                      {/* SPD */}
                      <td className="px-5 py-4 text-sm font-bold text-right text-blue-600 print:px-1 print:py-1 print:text-[7px] print:text-black">
                        {formatIDR(acc.totalSpd)}
                      </td>

                      {/* Realisasi */}
                      <td className="px-5 py-4 text-sm font-bold text-right text-emerald-600 print:px-1 print:py-1 print:text-[7px] print:text-black">
                        {acc.sp2dTransactions.length > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewModal({
                                item: acc.subKegiatanList[0] || {
                                  id: `acc-${acc.kode_rekening}`,
                                  kegiatan: 'Belanja Hibah',
                                  kode_kegiatan: '',
                                  sub_kegiatan: `${acc.short} (${acc.kode_rekening})`,
                                  kode_sub_kegiatan: '',
                                  kode_rekening: acc.kode_rekening,
                                  uraian: acc.nama,
                                  penerima_hibah: acc.short,
                                  anggaran: acc.totalAnggaran,
                                  spd: acc.totalSpd,
                                  realisasi: acc.totalRealisasi,
                                  sisa_spd: acc.sisaSpd,
                                  sisa_realisasi: acc.sisaAnggaran,
                                  isAutoGenerated: true
                                },
                                realizations: acc.sp2dTransactions
                              });
                            }}
                            className="hover:underline font-bold text-emerald-600 text-right inline-flex items-center gap-1"
                            title="Klik untuk melihat preview semua transaksi realisasi belanja"
                          >
                            <span>{formatIDR(acc.totalRealisasi)}</span>
                            <Eye size={12} className="text-emerald-500 print:hidden" />
                          </button>
                        ) : (
                          formatIDR(acc.totalRealisasi)
                        )}
                      </td>

                      {/* Sisa SPD */}
                      <td className={`px-5 py-4 text-sm font-bold text-right ${acc.sisaSpd < 0 ? 'text-red-600 bg-red-50' : 'text-amber-600'} print:px-1 print:py-1 print:text-[7px] print:text-black`}>
                        {formatIDR(acc.sisaSpd)}
                      </td>

                      {/* Sisa Anggaran */}
                      <td className="px-5 py-4 text-sm font-bold text-right text-red-500 print:px-1 print:py-1 print:text-[7px] print:text-black">
                        {formatIDR(acc.sisaAnggaran)}
                      </td>

                      {/* % Capaian */}
                      <td className="px-5 py-4 text-center print:px-1 print:py-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black select-none print:px-1 print:py-0 print:text-[6.5px] ${
                          acc.percent >= 90 ? 'bg-emerald-100 text-emerald-800' :
                          acc.percent >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {acc.percent.toFixed(1)}%
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-4 text-center print:hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(acc.kode_rekening);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${
                            isExpanded 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                        >
                          {isExpanded ? 'Tutup' : 'Rincian'}
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED ACCORDION: Sub Kegiatan & Transaksi SP2D Detail */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-y border-indigo-100 print:table-row">
                        <td colSpan={11} className="p-4 sm:p-6 space-y-4">
                          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                              <h5 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                                <span>📁 Rincian Sub Kegiatan Pada Akun:</span>
                                <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">{acc.kode_rekening}</span>
                              </h5>
                              <span className="text-xs text-gray-500 font-medium">
                                Total {acc.subKegiatanList.length} Baris Sub Kegiatan APBD & {acc.sp2dTransactions.length} Transaksi SP2D
                              </span>
                            </div>

                            {/* Daftar Sub Kegiatan */}
                            {acc.subKegiatanList.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
                                  <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-[10px]">
                                    <tr>
                                      <th className="p-2.5">Kode & Nama Sub Kegiatan</th>
                                      <th className="p-2.5">Uraian / Penerima Rencana</th>
                                      <th className="p-2.5 text-right">Anggaran</th>
                                      <th className="p-2.5 text-right">SPD</th>
                                      <th className="p-2.5 text-right">Realisasi</th>
                                      <th className="p-2.5 text-right">Sisa Anggaran</th>
                                      <th className="p-2.5 text-center">Sumber</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 bg-white">
                                    {acc.subKegiatanList.map((sub, sIdx) => (
                                      <tr key={sub.id || sIdx} className="hover:bg-indigo-50/30">
                                        <td className="p-2.5">
                                          <span className="font-mono font-bold text-amber-700 text-[11px] block">{sub.kode_sub_kegiatan || '-'}</span>
                                          <span className="text-gray-800 font-semibold">{sub.sub_kegiatan || '-'}</span>
                                        </td>
                                        <td className="p-2.5">
                                          <p className="font-medium text-gray-800">{sub.uraian || '-'}</p>
                                          {sub.penerima_hibah && sub.penerima_hibah !== '-' && (
                                            <p className="text-[11px] text-indigo-600 font-bold mt-0.5">Penerima: {sub.penerima_hibah}</p>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-bold text-gray-700">{formatIDR(sub.anggaran || 0)}</td>
                                        <td className="p-2.5 text-right font-bold text-blue-600">{formatIDR(sub.spd || 0)}</td>
                                        <td className="p-2.5 text-right font-bold text-emerald-600">{formatIDR(sub.realisasi || 0)}</td>
                                        <td className="p-2.5 text-right font-bold text-red-500">{formatIDR((sub.anggaran || 0) - (sub.realisasi || 0))}</td>
                                        <td className="p-2.5 text-center">
                                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">
                                            {sub.isAutoGenerated ? '⚡ Master APBD' : 'Input Manual'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Tidak ada rincian sub kegiatan terdaftar pada kode rekening ini.</p>
                            )}

                            {/* Daftar Transaksi SP2D Realisasi */}
                            <div className="pt-2">
                              <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <FileText size={13} className="text-indigo-600" />
                                <span>Rincian Transaksi Dokumen Realisasi SP2D ({acc.sp2dTransactions.length} Transaksi)</span>
                              </h5>

                              {acc.sp2dTransactions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {acc.sp2dTransactions.map((tx, txIdx) => (
                                    <div key={tx.id || txIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono bg-white text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-bold text-[10px]">
                                          📅 {formatDateIndo(tx.tanggal)} • {tx.nomor_sp2d || 'SP2D'}
                                        </span>
                                        <span className="font-bold text-emerald-600 text-xs">
                                          Rp {formatIDR(tx.realisasi)}
                                        </span>
                                      </div>
                                      <p className="text-gray-800 font-medium leading-relaxed bg-white p-2 rounded border border-gray-100">
                                        {tx.keterangan_dokumen || 'Tidak ada uraian'}
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                                        <span className="truncate max-w-[200px]">Sub: {tx.sub_kegiatan}</span>
                                        <button
                                          onClick={() => copyToClipboard(tx.keterangan_dokumen || '', txIdx)}
                                          className="text-indigo-600 hover:text-indigo-800 font-bold"
                                        >
                                          {copiedIndex === txIdx ? 'Tersalin!' : 'Salin'}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border text-center">
                                  Belum ada transaksi realisasi SP2D yang tercatat untuk rekening ini.
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredConsolidatedData.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Gift size={32} className="text-gray-300" />
                      <p className="text-sm font-bold">Tidak ada data rekening hibah yang sesuai dengan filter.</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Total Row Konsolidasi */}
              {filteredConsolidatedData.length > 0 && (
                <tr className="bg-gray-900 text-white font-black sticky bottom-0 z-20 shadow-md print:bg-gray-100 print:text-black">
                  <td className="px-5 py-5 text-sm uppercase tracking-widest text-[11px] sticky bottom-0 left-0 bg-gray-900 z-30 shadow-md print:px-1 print:py-1.5 print:text-[7.5px]" colSpan={4}>
                    Total Seluruh Rekening Hibah ({filteredConsolidatedData.length} Kode Rekening)
                  </td>
                  <td className="px-5 py-5 text-sm text-right sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px]">{formatIDR(consolidatedTotals.anggaran)}</td>
                  <td className="px-5 py-5 text-sm text-right text-blue-300 sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(consolidatedTotals.spd)}</td>
                  <td className="px-5 py-5 text-sm text-right text-emerald-300 sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(consolidatedTotals.realisasi)}</td>
                  <td className="px-5 py-5 text-sm text-right text-amber-300 sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(consolidatedTotals.sisa_spd)}</td>
                  <td className="px-5 py-5 text-sm text-right text-red-300 sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(consolidatedTotals.sisa_realisasi)}</td>
                  <td className="px-5 py-5 text-center sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5">
                    <span className="text-lg font-black print:text-[7.5px]">
                      {consolidatedTotals.anggaran > 0 ? ((consolidatedTotals.realisasi / consolidatedTotals.anggaran) * 100).toFixed(1) : 0}%
                    </span>
                  </td>
                  <td className="px-4 py-5 sticky bottom-0 bg-gray-900 print:hidden"></td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* TABEL 2: RINCIAN PER SUB KEGIATAN & PENERIMA */
          <table className="w-full text-left min-w-[1500px] print:min-w-0 print:text-[8px] border-collapse">
            <thead className="bg-gray-50/95 backdrop-blur-xs border-b border-gray-200 sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 left-0 bg-gray-100 z-30 shadow-xs print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">No</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Kode Rekening</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Uraian Rekening / Belanja</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Penerima Hibah</th>
                <th className="px-5 py-4 text-[10px] font-black text-indigo-700 uppercase tracking-widest sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black min-w-[220px]">Preview Keterangan Belanja (SP2D)</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Sub Kegiatan</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Anggaran</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">SPD</th>
                <th className="px-5 py-4 text-[10px] font-black text-emerald-700 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Realisasi</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Sisa SPD</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">Sisa Anggaran</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center sticky top-0 bg-gray-50 z-20 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.map((row, idx) => {
                const matchingRealizations = findMatchingRealizations(row);
                const sSpd = (row.spd || 0) - (row.realisasi || 0);
                const sReal = (row.anggaran || 0) - (row.realisasi || 0);
                const percent = (row.anggaran || 0) > 0 ? ((row.realisasi || 0) / (row.anggaran || 0)) * 100 : 0;
                const isOverSpd = (row.realisasi || 0) > (row.spd || 0);

                // Cari info badge akun target
                const targetMeta = TARGET_HIBAH_ACCOUNTS.find(a => 
                  clean(a.kode) === clean(row.kode_rekening || '') || isMatchingAccount(a.kode, row.kode_rekening)
                );

                return (
                  <tr key={row.id || idx} className={`hover:bg-gray-50 transition-colors group ${isOverSpd ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-5 py-4 text-xs font-bold text-gray-500 sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-xs print:px-1 print:py-1 print:text-[7px]">
                      {idx + 1}
                    </td>
                    
                    {/* Kode Rekening */}
                    <td className="px-5 py-4 print:px-1 print:py-1">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border inline-block w-fit ${
                            targetMeta ? `${targetMeta.badgeBg} ${targetMeta.badgeText} ${targetMeta.borderColor}` : 'bg-gray-100 text-gray-700 border-gray-200'
                          } print:border-none print:p-0 print:text-[7px] print:text-black`}>
                            {row.kode_rekening || '-'}
                          </span>
                          {row.isAutoGenerated && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-1.5 py-0.2 rounded print:hidden" title="Otomatis diambil dari Master APBD & Realisasi SP2D">
                              ⚡ Auto
                            </span>
                          )}
                        </div>
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

                    {/* Preview Keterangan Belanja (SP2D) */}
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
                      <p className="text-xs text-gray-400">
                        Pastikan Master Data APBD atau Realisasi SP2D memuat kode rekening hibah (5.1.05... / 5.1.02.01.001.00040) atau tambah data di menu Dana Hibah.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Total Row */}
              {filteredData.length > 0 && (
                <tr className="bg-gray-900 text-white font-black sticky bottom-0 z-20 shadow-md print:bg-gray-100 print:text-black">
                  <td className="px-5 py-5 text-sm uppercase tracking-widest text-[11px] sticky bottom-0 left-0 bg-gray-900 z-30 shadow-md print:px-1 print:py-1.5 print:text-[7.5px]" colSpan={6}>
                    Total Seluruhnya ({filteredData.length} Item Hibah)
                  </td>
                  <td className="px-5 py-5 text-sm text-right sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px]">{formatIDR(totals.anggaran)}</td>
                  <td className="px-5 py-5 text-sm text-right text-blue-300 sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(totals.spd)}</td>
                  <td className="px-5 py-5 text-sm text-right text-emerald-300 sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(totals.realisasi)}</td>
                  <td className="px-5 py-5 text-sm text-right text-amber-300 sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(totals.sisa_spd)}</td>
                  <td className="px-5 py-5 text-sm text-right text-red-300 sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5 print:text-[7.5px] print:text-black">{formatIDR(totals.sisa_realisasi)}</td>
                  <td className="px-5 py-5 text-center sticky bottom-0 bg-gray-900 print:px-1 print:py-1.5">
                    <span className="text-lg font-black print:text-[7.5px]">
                      {totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(1) : 0}%
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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
                    {previewModal.item.isAutoGenerated && (
                      <span className="text-[10px] bg-indigo-600/60 text-indigo-100 px-2 py-0.5 rounded-full font-bold">
                        ⚡ Auto Sync APBD & SP2D
                      </span>
                    )}
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
                      Rincian Keterangan Dokumen Belanja Realisasi ({previewModal.realizations.length} Transaksi SP2D)
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
