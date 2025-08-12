import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SheetData, CellData, ChatMessage } from '@/types';

export class FirebaseService {
  private static instance: FirebaseService;
  
  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  async saveSheet(sheetData: SheetData): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'sheets'), {
        ...sheetData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving sheet:', error);
      throw error;
    }
  }

  async updateSheet(sheetId: string, sheetData: Partial<SheetData>): Promise<void> {
    try {
      const docRef = doc(db, 'sheets', sheetId);
      await updateDoc(docRef, {
        ...sheetData,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating sheet:', error);
      throw error;
    }
  }

  async getSheet(sheetId: string): Promise<SheetData | null> {
    try {
      const docRef = doc(db, 'sheets', sheetId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SheetData;
      }
      return null;
    } catch (error) {
      console.error('Error getting sheet:', error);
      throw error;
    }
  }

  async getAllSheets(): Promise<SheetData[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'sheets'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SheetData[];
    } catch (error) {
      console.error('Error getting sheets:', error);
      throw error;
    }
  }

  async deleteSheet(sheetId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'sheets', sheetId));
    } catch (error) {
      console.error('Error deleting sheet:', error);
      throw error;
    }
  }

  async saveCellData(sheetId: string, cells: { [key: string]: CellData }): Promise<void> {
    try {
      const docRef = doc(db, 'sheets', sheetId);
      await updateDoc(docRef, {
        cells,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving cell data:', error);
      throw error;
    }
  }

  async saveChatMessage(sheetId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      const chatRef = collection(db, 'sheets', sheetId, 'chat');
      const docRef = await addDoc(chatRef, {
        ...message,
        timestamp: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving chat message:', error);
      throw error;
    }
  }

  async loadChatHistory(sheetId: string, limitCount: number = 50): Promise<ChatMessage[]> {
    try {
      const chatRef = collection(db, 'sheets', sheetId, 'chat');
      const q = query(chatRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as ChatMessage[];
    } catch (error) {
      console.error('Error loading chat history:', error);
      throw error;
    }
  }
}
