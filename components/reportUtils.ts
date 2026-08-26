import { MasterData, RealizationData } from '../types';

export const BIDANG_MAP: Record<string, string> = {
  "PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH PROVINSI": "Sekretariat",
  "PENUNJANG URUSAN PEMERINTAHAN DAERAH": "Sekretariat",
  "PROGRAM PEMBERDAYAAN DAN PENGAWASAN ORGANISASI KEMASYARAKATAN": "Bidang Poldagri",
  "PROGRAM PEMBINAAN DAN PENGEMBANGAN KETAHANAN EKONOMI, SOSIAL, DAN BUDAYA": "Bidang Wasbang",
  "PEMBINAAN KETAHANAN EKONOMI, SOSIAL, BUDAYA & KEWASPADAAN NASIONAL": "Bidang Wasbang",
  "PROGRAM PENINGKATAN KEWASPADAAN NASIONAL DAN PENINGKATAN KUALITAS DAN FASILITASI PENANGANAN KONFLIK SOSIAL": "Bidang Wasnas",
  "PROGRAM PENGUATAN IDEOLOGI PANCASILA DAN KARAKTER KEBANGSAAN": "Bidang Wasbang",
  "PROGRAM PENINGKATAN PERAN PARTAI POLITIK DAN LEMBAGA PENDIDIKAN MELALUI PENDIDIKAN POLITIK DAN PENGEMBANGAN ETIKA SERTA BUDAYA POLITIK": "Bidang Poldagri",
};

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
];

export const clean = (val: any): string => {
  if (val === null || val === undefined) return '';
  return val.toString()
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

export const formatIDR = (val: number): string => {
  return new Intl.NumberFormat('id-ID').format(val || 0);
};

export const getCleanProgramName = (kode_program: string, programFallback: string, masterData: MasterData[]): string => {
  const masterMatch = masterData.find(m => clean(m.kode_program) === clean(kode_program));
  return masterMatch ? masterMatch.program : (programFallback || '');
};

export const getBidangName = (programName: string): string => {
  const cleaned = (programName || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return BIDANG_MAP[cleaned] || "LAINNYA";
};

export const getBidangFromRealization = (r: RealizationData, masterData: MasterData[]): string => {
  const programName = getCleanProgramName(r.kode_program, r.program, masterData);
  return getBidangName(programName);
};

/**
 * Robust date parser that handles:
 * - YYYY-MM-DD or YYYY/MM/DD (without timezone distortion)
 * - DD/MM/YYYY or DD-MM-YYYY
 * - Excel Serial Numbers (e.g. 45000+)
 * - Standard ISO strings and Date objects
 */
export const parseDateSafe = (dateVal?: any): {
  year: number | null;
  month: number | null; // 0 to 11
  day: number | null; // 1 to 31
  quarter: number | null; // 1 to 4
  iso: string; // YYYY-MM-DD
} => {
  if (dateVal === null || dateVal === undefined || dateVal === '') {
    return { year: null, month: null, day: null, quarter: null, iso: '' };
  }

  // 1. Excel Serial Number
  if (typeof dateVal === 'number') {
    const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const day = d.getUTCDate();
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { year, month, day, quarter: Math.floor(month / 3) + 1, iso };
    }
  }

  // 2. Date Object
  if (dateVal instanceof Date) {
    if (!isNaN(dateVal.getTime())) {
      const year = dateVal.getFullYear();
      const month = dateVal.getMonth();
      const day = dateVal.getDate();
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { year, month, day, quarter: Math.floor(month / 3) + 1, iso };
    }
  }

  const str = String(dateVal).trim();
  if (!str) return { year: null, month: null, day: null, quarter: null, iso: '' };

  // 3. Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1; // 0-11
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { year, month, day, quarter: Math.floor(month / 3) + 1, iso };
    }
  }

  // 4. Match DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10) - 1; // 0-11
    const year = parseInt(dmyMatch[3], 10);
    // Jika formatnya MM/DD/YYYY dan day > 12:
    if (month > 11 && day <= 12) {
      const temp = day;
      day = month + 1;
      month = temp - 1;
    }
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { year, month, day, quarter: Math.floor(month / 3) + 1, iso };
    }
  }

  // 5. Fallback Date.parse
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = parsed.getMonth();
      const day = parsed.getDate();
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { year, month, day, quarter: Math.floor(month / 3) + 1, iso };
    }
  } catch (e) {
    // ignore
  }

  return { year: null, month: null, day: null, quarter: null, iso: str };
};

export const parseDateInfo = (dateStr?: any) => {
  const { year, month, quarter } = parseDateSafe(dateStr);
  return { year, month, quarter };
};

export const formatDateIndo = (dateStr?: any): string => {
  if (!dateStr) return '-';
  const { year, month, day } = parseDateSafe(dateStr);
  if (year === null || month === null || day === null) {
    return String(dateStr || '-');
  }
  const monthName = MONTH_SHORT_NAMES[month] || MONTH_NAMES[month] || '';
  return `${day} ${monthName} ${year}`;
};

export const formatDateIndoLong = (dateStr?: any): string => {
  if (!dateStr) return 'Semua Periode';
  const { year, month, day } = parseDateSafe(dateStr);
  if (year === null || month === null || day === null) {
    return String(dateStr || '-');
  }
  const monthName = MONTH_NAMES[month] || '';
  return `${day} ${monthName} ${year}`;
};

