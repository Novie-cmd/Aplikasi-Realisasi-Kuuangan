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

export const parseDateInfo = (dateStr?: string) => {
  if (!dateStr) return { year: null, month: null, quarter: null };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // try YYYY-MM-DD splitting
    const parts = String(dateStr).split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
        return {
          year,
          month,
          quarter: Math.floor(month / 3) + 1
        };
      }
    }
    return { year: null, month: null, quarter: null };
  }
  const year = d.getFullYear();
  const month = d.getMonth();
  return {
    year,
    month,
    quarter: Math.floor(month / 3) + 1
  };
};
