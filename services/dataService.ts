
import { MasterData, RealizationData, ExpenditureData } from "../types";
import { apiRequest } from "./api";

/**
 * Hybrid Data Service
 * Mencoba koneksi ke Server (Cloud), jika gagal atau belum dikonfigurasi, gunakan LocalStorage.
 */

const STORAGE_KEYS = {
  MASTER: 'finrealize_master_data',
  REALIZATION: 'finrealize_realization_data',
  SPENDING: 'finrealize_spending_data'
};

export const DataService = {
  // --- MASTER DATA ---
  async getMasterData(): Promise<MasterData[]> {
    try {
      const remoteData = await apiRequest('/master_data?select=*');
      if (remoteData && Array.isArray(remoteData)) return remoteData;
    } catch (e) {
      console.warn("Gagal mengambil data master dari cloud, mengambil dari lokal.");
    }

    const saved = localStorage.getItem(STORAGE_KEYS.MASTER);
    return saved ? JSON.parse(saved) : [];
  },

  async saveMasterData(data: MasterData[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(data));
    // Percobaan sinkronisasi ke cloud jika API aktif
    await apiRequest('/master_data', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    }).catch(() => null); // Silent fail untuk sinkronisasi cloud
  },

  // --- REALIZATION DATA ---
  async getRealizationData(): Promise<RealizationData[]> {
    try {
      const remoteData = await apiRequest('/realization_data?select=*');
      if (remoteData && Array.isArray(remoteData)) return remoteData;
    } catch (e) {
      console.warn("Gagal mengambil data realisasi dari cloud.");
    }

    const saved = localStorage.getItem(STORAGE_KEYS.REALIZATION);
    return saved ? JSON.parse(saved) : [];
  },

  async saveRealizationData(data: RealizationData[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.REALIZATION, JSON.stringify(data));
    await apiRequest('/realization_data', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    }).catch(() => null);
  },

  // --- SPENDING DATA ---
  async getSpendingData(): Promise<ExpenditureData[]> {
    try {
      const remoteData = await apiRequest('/spending_data?select=*');
      if (remoteData && Array.isArray(remoteData)) return remoteData;
    } catch (e) {
      console.warn("Gagal mengambil data belanja dari cloud.");
    }

    const saved = localStorage.getItem(STORAGE_KEYS.SPENDING);
    return saved ? JSON.parse(saved) : [];
  },

  async saveSpendingData(data: ExpenditureData[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.SPENDING, JSON.stringify(data));
    await apiRequest('/spending_data', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Prefer': 'resolution=merge-duplicates' }
    }).catch(() => null);
  }
};
