import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FactoryService {
  constructor() {
    this.collectionName = 'factories';
  }

  async createFactory(factoryData) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...factoryData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return { id: docRef.id, ...factoryData };
    } catch (error) {
      console.error('Erro ao criar fábrica:', error);
      throw error;
    }
  }

  async getAllFactories() {
    try {
      const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar fábricas:', error);
      throw error;
    }
  }

  async updateFactory(id, factoryData) {
    try {
      const factoryRef = doc(db, this.collectionName, id);
      await updateDoc(factoryRef, {
        ...factoryData,
        updatedAt: new Date()
      });
      return { id, ...factoryData };
    } catch (error) {
      console.error('Erro ao atualizar fábrica:', error);
      throw error;
    }
  }

  async deleteFactory(id) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar fábrica:', error);
      throw error;
    }
  }

  async getFactoryWithProducts(factoryId) {
    try {
      const factory = await this.getFactoryById(factoryId);
      const products = await this.getProductsByFactory(factoryId);
      return { ...factory, products };
    } catch (error) {
      console.error('Erro ao buscar fábrica com produtos:', error);
      throw error;
    }
  }

  async getFactoryById(id) {
    try {
      const factoryRef = doc(db, this.collectionName, id);
      const factoryDoc = await getDoc(factoryRef);
      if (factoryDoc.exists()) {
        return { id: factoryDoc.id, ...factoryDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar fábrica por ID:', error);
      throw error;
    }
  }

  async getProductsByFactory(factoryId) {
    try {
      const q = query(
        collection(db, 'products'), 
        where('factoryId', '==', factoryId)
      );
      const querySnapshot = await getDocs(q);
      const products = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar localmente por data de criação
      return products.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toDate() - a.createdAt.toDate();
        }
        return 0;
      });
    } catch (error) {
      console.error('Erro ao buscar produtos da fábrica:', error);
      throw error;
    }
  }
}

const factoryService = new FactoryService();
export default factoryService;
