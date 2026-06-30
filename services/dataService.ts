import { MasterData, RealizationData, ExpenditureData, HibahData } from "../types";
import { auth } from "../firebase";

/**
 * Local Storage Data Service
 * Menyimpan data ke localStorage web browser lokal per-user untuk menghindari Firestore.
 * Google Spreadsheet digunakan sebagai basis data tunggal (single source of truth).
 */

// Helper untuk mendapatkan key unik per pengguna yang sedang login
const getLocalStorageKey = (slug: string): string => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return `finrealize_anon_${slug}`;
  }
  return `finrealize_${uid}_${slug}`;
};

export const DataService = {
  // Test connection - selalu berhasil secara instan karena menggunakan penyimpanan lokal
  async testConnection() {
    return true;
  },

  // --- MASTER DATA ---
  async getMasterData(): Promise<MasterData[]> {
    try {
      const key = getLocalStorageKey('master_data');
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Gagal mengambil master data dari localStorage", e);
      return [];
    }
  },

  async saveMasterData(data: MasterData[]): Promise<void> {
    try {
      const key = getLocalStorageKey('master_data');
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Gagal menyimpan master data ke localStorage", e);
    }
  },

  async syncMasterData(data: MasterData[]): Promise<void> {
    await this.saveMasterData(data);
  },

  async deleteMasterData(id: string): Promise<void> {
    const data = await this.getMasterData();
    const filtered = data.filter(item => item.id !== id);
    await this.saveMasterData(filtered);
  },

  async clearMasterData(): Promise<void> {
    await this.saveMasterData([]);
  },

  // --- REALIZATION DATA ---
  async getRealizationData(): Promise<RealizationData[]> {
    try {
      const key = getLocalStorageKey('realization_data');
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Gagal mengambil data realisasi dari localStorage", e);
      return [];
    }
  },

  async saveRealizationData(data: RealizationData[]): Promise<void> {
    try {
      const key = getLocalStorageKey('realization_data');
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Gagal menyimpan data realisasi ke localStorage", e);
    }
  },

  async syncRealizationData(data: RealizationData[]): Promise<void> {
    await this.saveRealizationData(data);
  },

  async deleteRealizationData(id: string): Promise<void> {
    const data = await this.getRealizationData();
    const filtered = data.filter(item => item.id !== id);
    await this.saveRealizationData(filtered);
  },

  async clearRealizationData(): Promise<void> {
    await this.saveRealizationData([]);
  },

  // --- SPENDING DATA ---
  async getSpendingData(): Promise<ExpenditureData[]> {
    try {
      const key = getLocalStorageKey('spending_data');
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Gagal mengambil data belanja dari localStorage", e);
      return [];
    }
  },

  async saveSpendingData(data: ExpenditureData[]): Promise<void> {
    try {
      const key = getLocalStorageKey('spending_data');
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Gagal menyimpan data belanja ke localStorage", e);
    }
  },

  // --- HIBAH DATA ---
  async getHibahData(): Promise<HibahData[]> {
    try {
      const key = getLocalStorageKey('hibah_data');
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Gagal mengambil data hibah dari localStorage", e);
      return [];
    }
  },

  async saveHibahData(data: HibahData[]): Promise<void> {
    try {
      const key = getLocalStorageKey('hibah_data');
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Gagal menyimpan data hibah ke localStorage", e);
    }
  },

  async syncHibahData(data: HibahData[]): Promise<void> {
    await this.saveHibahData(data);
  },

  async deleteHibahData(id: string): Promise<void> {
    const data = await this.getHibahData();
    const filtered = data.filter(item => item.id !== id);
    await this.saveHibahData(filtered);
  },

  async clearHibahData(): Promise<void> {
    await this.saveHibahData([]);
  },

  // --- SETTINGS DATA ---
  async getSettings(id: string): Promise<any> {
    try {
      const key = getLocalStorageKey(`settings_${id}`);
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      
      if (id === "google_sheets") {
        if (!parsed || !parsed.spreadsheetId) {
          return {
            spreadsheetId: "1EgFSaxmXYmIYQ0gkufm0p4vdMaGc4ElXnqjE3A4GqIk",
            spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1EgFSaxmXYmIYQ0gkufm0p4vdMaGc4ElXnqjE3A4GqIk/edit",
            isAutoSync: true,
            ...parsed
          };
        }
      }
      return parsed;
    } catch (e) {
      console.error("Gagal mengambil settings dari localStorage:", e);
      return null;
    }
  },

  async saveSettings(id: string, data: any): Promise<void> {
    try {
      const key = getLocalStorageKey(`settings_${id}`);
      const existing = await this.getSettings(id) || {};
      const merged = { ...existing, ...data };
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (e) {
      console.error("Gagal menyimpan settings ke localStorage:", e);
    }
  }
};
