
import { MasterData, RealizationData, ExpenditureData, HibahData } from "../types";
import { db, auth } from "../firebase";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  writeBatch, 
  query, 
  limit, 
  getDocsFromServer,
  deleteDoc
} from "firebase/firestore";

/**
 * Firestore Data Service
 * Menyimpan data ke Google Cloud Firestore untuk sinkronisasi terpusat.
 */

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const DataService = {
  // Test connection
  async testConnection() {
    try {
      await getDocsFromServer(query(collection(db, 'master_data'), limit(1)));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. ");
      }
    }
  },

  // --- MASTER DATA ---
  async getMasterData(): Promise<MasterData[]> {
    const path = 'master_data';
    try {
      // Gunakan getDocsFromServer untuk memastikan data terbaru dari server (menghindari cache)
      const snapshot = await getDocsFromServer(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as MasterData);
    } catch (e) {
      console.warn("Gagal mengambil data dari server, mencoba cache...", e);
      try {
        const snapshot = await getDocs(collection(db, path));
        return snapshot.docs.map(doc => doc.data() as MasterData);
      } catch (err) {
        handleFirestoreError(e, OperationType.GET, path);
        return [];
      }
    }
  },

  async saveMasterData(data: MasterData[]): Promise<void> {
    const path = 'master_data';
    try {
      // Split into chunks of 500 for Firestore batch limits
      const chunks = [];
      for (let i = 0; i < data.length; i += 500) {
        chunks.push(data.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const docRef = doc(db, path, item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  /**
   * Menghapus semua data lama dan menggantinya dengan data baru.
   * Ini mencegah duplikasi data lama yang masih tersimpan di Firestore.
   */
  async syncMasterData(data: MasterData[]): Promise<void> {
    const path = 'master_data';
    try {
      // 1. Ambil semua dokumen yang ada dari server (bukan cache)
      const snapshot = await getDocsFromServer(collection(db, path));
      console.log(`Sync Master: Menghapus ${snapshot.docs.length} dokumen lama...`);
      
      // 2. Hapus semua dokumen lama (chunked)
      const deleteChunks = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        deleteChunks.push(snapshot.docs.slice(i, i + 500));
      }
      
      for (const chunk of deleteChunks) {
        const batch = writeBatch(db);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      // 3. Simpan data baru (chunked)
      await this.saveMasterData(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteMasterData(id: string): Promise<void> {
    const path = 'master_data';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  async clearMasterData(): Promise<void> {
    const path = 'master_data';
    try {
      // Gunakan getDocsFromServer untuk memastikan semua data terdeteksi
      const snapshot = await getDocsFromServer(collection(db, path));
      console.log(`Clear Master: Menghapus ${snapshot.docs.length} dokumen...`);
      
      const chunks = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        chunks.push(snapshot.docs.slice(i, i + 500));
      }
      
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // --- REALIZATION DATA ---
  async getRealizationData(): Promise<RealizationData[]> {
    const path = 'realization_data';
    try {
      const snapshot = await getDocsFromServer(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as RealizationData);
    } catch (e) {
      console.warn("Gagal mengambil data realisasi dari server, mencoba cache...", e);
      try {
        const snapshot = await getDocs(collection(db, path));
        return snapshot.docs.map(doc => doc.data() as RealizationData);
      } catch (err) {
        handleFirestoreError(e, OperationType.GET, path);
        return [];
      }
    }
  },

  async saveRealizationData(data: RealizationData[]): Promise<void> {
    const path = 'realization_data';
    try {
      const chunks = [];
      for (let i = 0; i < data.length; i += 500) {
        chunks.push(data.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const docRef = doc(db, path, item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async syncRealizationData(data: RealizationData[]): Promise<void> {
    const path = 'realization_data';
    try {
      const snapshot = await getDocsFromServer(collection(db, path));
      console.log(`Sync Realization: Menghapus ${snapshot.docs.length} dokumen lama...`);
      
      const deleteChunks = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        deleteChunks.push(snapshot.docs.slice(i, i + 500));
      }
      for (const chunk of deleteChunks) {
        const batch = writeBatch(db);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      await this.saveRealizationData(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteRealizationData(id: string): Promise<void> {
    const path = 'realization_data';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  async clearRealizationData(): Promise<void> {
    const path = 'realization_data';
    try {
      const snapshot = await getDocsFromServer(collection(db, path));
      console.log(`Clear Realization: Menghapus ${snapshot.docs.length} dokumen...`);
      
      const chunks = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        chunks.push(snapshot.docs.slice(i, i + 500));
      }
      
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // --- SPENDING DATA ---
  async getSpendingData(): Promise<ExpenditureData[]> {
    const path = 'spending_data';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as ExpenditureData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async saveSpendingData(data: ExpenditureData[]): Promise<void> {
    const path = 'spending_data';
    try {
      const chunks = [];
      for (let i = 0; i < data.length; i += 500) {
        chunks.push(data.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const docRef = doc(db, path, item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  // --- HIBAH DATA ---
  async getHibahData(): Promise<HibahData[]> {
    const path = 'hibah_data';
    try {
      const snapshot = await getDocsFromServer(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as HibahData);
    } catch (e) {
      console.warn("Gagal mengambil data hibah dari server, mencoba cache...", e);
      try {
        const snapshot = await getDocs(collection(db, path));
        return snapshot.docs.map(doc => doc.data() as HibahData);
      } catch (err) {
        handleFirestoreError(e, OperationType.GET, path);
        return [];
      }
    }
  },

  async saveHibahData(data: HibahData[]): Promise<void> {
    const path = 'hibah_data';
    try {
      const chunks = [];
      for (let i = 0; i < data.length; i += 500) {
        chunks.push(data.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const docRef = doc(db, path, item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async syncHibahData(data: HibahData[]): Promise<void> {
    const path = 'hibah_data';
    try {
      const snapshot = await getDocsFromServer(collection(db, path));
      console.log(`Sync Hibah: Menghapus ${snapshot.docs.length} dokumen lama...`);
      
      const deleteChunks = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        deleteChunks.push(snapshot.docs.slice(i, i + 500));
      }
      for (const chunk of deleteChunks) {
        const batch = writeBatch(db);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      await this.saveHibahData(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteHibahData(id: string): Promise<void> {
    const path = 'hibah_data';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  async clearHibahData(): Promise<void> {
    const path = 'hibah_data';
    try {
      const snapshot = await getDocsFromServer(collection(db, path));
      console.log(`Clear Hibah: Menghapus ${snapshot.docs.length} dokumen...`);
      
      const chunks = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        chunks.push(snapshot.docs.slice(i, i + 500));
      }
      
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }
};
