
import { MasterData, RealizationData, ExpenditureData } from "../types";
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
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as MasterData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async saveMasterData(data: MasterData[]): Promise<void> {
    const path = 'master_data';
    try {
      const batch = writeBatch(db);
      data.forEach(item => {
        const docRef = doc(db, path, item.id);
        batch.set(docRef, item);
      });
      await batch.commit();
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
      const snapshot = await getDocs(collection(db, path));
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // --- REALIZATION DATA ---
  async getRealizationData(): Promise<RealizationData[]> {
    const path = 'realization_data';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as RealizationData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async saveRealizationData(data: RealizationData[]): Promise<void> {
    const path = 'realization_data';
    try {
      const batch = writeBatch(db);
      data.forEach(item => {
        const docRef = doc(db, path, item.id);
        batch.set(docRef, item);
      });
      await batch.commit();
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
      const snapshot = await getDocs(collection(db, path));
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
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
      const batch = writeBatch(db);
      data.forEach(item => {
        const docRef = doc(db, path, item.id);
        batch.set(docRef, item);
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
};
