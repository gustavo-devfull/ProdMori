import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import imageService from './imageService';

class ProductService {
  constructor() {
    this.collectionName = 'products';
  }

  async createProduct(productData) {
    try {
      // Remover campos undefined/vazios
      const cleanData = Object.fromEntries(
        Object.entries(productData).filter(([key, value]) => 
          value !== undefined && value !== null && value !== ''
        )
      );

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...cleanData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return { id: docRef.id, ...cleanData };
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  async getAllProducts() {
    try {
      const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const products = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Converter preço para número se existir
        if (data.price && typeof data.price === 'string') {
          data.price = parseFloat(data.price);
        }
        return {
          id: doc.id,
          ...data
        };
      });
      
      console.log('ProductService - Produtos brutos do Firebase:', products);
      
      // Carregar informações da fábrica para cada produto
      const productsWithFactory = await Promise.all(
        products.map(async (product) => {
          if (product.factoryId) {
            try {
              const factory = await this.getFactoryById(product.factoryId);
              return { ...product, factory };
            } catch (err) {
              console.error(`Erro ao carregar fábrica para produto ${product.name}:`, err);
              return { ...product, factory: null };
            }
          }
          return { ...product, factory: null };
        })
      );
      
      console.log('ProductService - Produtos com fábrica:', productsWithFactory);
      return productsWithFactory;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  }

  async updateProduct(id, productData) {
    try {
      // Remover campos undefined/vazios
      const cleanData = Object.fromEntries(
        Object.entries(productData).filter(([key, value]) => 
          value !== undefined && value !== null && value !== ''
        )
      );

      const productRef = doc(db, this.collectionName, id);
      await updateDoc(productRef, {
        ...cleanData,
        updatedAt: new Date()
      });
      return { id, ...cleanData };
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  async deleteProduct(id) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
  }

  async uploadProductImage(file) {
    try {
      const imageUrl = await imageService.uploadFile(file);
      return imageUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  }

  async getFactoryById(factoryId) {
    try {
      const factoryRef = doc(db, 'factories', factoryId);
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
}

const productService = new ProductService();
export default productService;
