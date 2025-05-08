//services/productService.js
import { db } from "../firebase";
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  getDoc,
  onSnapshot // Añade esta importación
} from "firebase/firestore";

// Función para obtener productos (una sola vez)
export const obtenerProductos = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "productos"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener productos:", error);
    throw error;
  }
};

// Función para suscribirse a cambios en tiempo real
export const suscribirProductos = (callback) => {
  const unsubscribe = onSnapshot(collection(db, "productos"), (snapshot) => {
    const productos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(productos);
  }, (error) => {
    console.error("Error en suscripción:", error);
  });

  return unsubscribe;
};
// Función para agregar producto
export const agregarProducto = async (producto) => {
  try {
    if (!producto.titulo || !producto.precioBase) {
      throw new Error("Nombre y precio son campos requeridos");
    }

    if (!producto.id) {
      const docRef = await addDoc(collection(db, "productos"), {
        ...producto,
        fechaCreacion: new Date().toISOString()
      });
      return { id: docRef.id, ...producto };
    } else {
      await setDoc(doc(db, "productos", producto.id), {
        ...producto,
        fechaCreacion: new Date().toISOString()
      });
      return producto;
    }
  } catch (error) {
    console.error("Error agregando producto:", error);
    throw error;
  }
};


// Función para actualizar producto
export const actualizarProducto = async (id, data) => {
  try {
    if (!id) throw new Error("ID de producto no proporcionado");
    
    const productoRef = doc(db, "productos", id);
    const docSnapshot = await getDoc(productoRef);
    
    if (!docSnapshot.exists()) {
      await setDoc(productoRef, {
        ...data,
        fechaCreacion: new Date().toISOString()
      });
      return { created: true };
    } else {
      await updateDoc(productoRef, {
        ...data,
        ultimaActualizacion: new Date().toISOString()
      });
      return { updated: true };
    }
  } catch (error) {
    console.error("Error en actualizarProducto:", error);
    throw error;
  }
};

// Función para eliminar producto
export const eliminarProducto = async (productoId) => {
  try {
    if (!productoId) throw new Error("ID de producto no proporcionado");
    
    const docRef = doc(db, "productos", productoId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar el producto:", error);
    throw error;
  }
};