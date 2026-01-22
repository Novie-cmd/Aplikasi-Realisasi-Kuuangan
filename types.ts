
export interface MasterData {
  id: string;
  skpd: string;
  kode_skpd: string;
  program: string;
  kode_program: string;
  kegiatan: string;
  kode_kegiatan: string;
  sub_kegiatan: string;
  kode_sub_kegiatan: string;
  belanja: string;
  kode_belanja: string;
  anggaran: number;
  realisasi: number;
  pagu_spd: number;
}

export interface RealizationData {
  id: string;
  skpd: string;
  kode_skpd: string;
  program: string;
  kode_program: string;
  kegiatan: string;
  kode_kegiatan: string;
  sub_kegiatan: string;
  kode_sub_kegiatan: string;
  belanja: string;
  kode_belanja: string;
  realisasi: number;
}

export interface ExpenditureData {
  id: string;
  kode_belanja: string;
  belanja: string;
}

export interface FinancialSummary {
  totalAnggaran: number;
  totalRealisasi: number;
  sisaAnggaran: number;
  persentase: number;
}

export type Page = 'dashboard' | 'master' | 'spending' | 'reports' | 'realization';
