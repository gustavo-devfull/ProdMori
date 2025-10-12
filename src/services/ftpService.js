import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

class ImageService {
  constructor() {
    this.storageRef = storage;
  }

  async uploadFile(file) {
    try {
      const fileName = this.generateFileName(file.name);
      const imageRef = ref(this.storageRef, `products/${fileName}`);
      
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  }

  async deleteFile(imageUrl) {
    try {
      // Extrair o nome do arquivo da URL
      const fileName = imageUrl.split('/').pop().split('?')[0];
      const imageRef = ref(this.storageRef, `products/${fileName}`);
      
      await deleteObject(imageRef);
      return true;
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      throw error;
    }
  }

  generateFileName(originalName) {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `product_${timestamp}.${extension}`;
  }
}

const imageService = new ImageService();
export default imageService;
