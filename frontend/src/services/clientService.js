// services/clienteService.js
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

// Función para guardar un cliente
export const guardarCliente = async (cliente, esFacturaC = false) => {
  try {
    // 1. Validación de campos requeridos
    if (!cliente.nombre) {
      throw new Error("El nombre es un campo requerido");
    }

    // 2. Manejo de documento según tipo de comprobante
    if (esFacturaC) {
      // Validación para Factura C (CUIT)
      if (!cliente.cuit) {
        throw new Error("El CUIT es un campo requerido para Factura C");
      }
      
      // Limpieza del CUIT
      cliente.cuit = cliente.cuit.toString().replace(/[^\d]/g, '');
      
      // Validar formato básico de CUIT (11 dígitos)
      if (cliente.cuit.length !== 11) {
        throw new Error("El CUIT debe contener exactamente 11 dígitos");
      }
      
      // Validar prefijos válidos para CUIT
      const prefijosValidos = ['20', '23', '24', '27', '30', '33', '34'];
      const prefijo = cliente.cuit.substring(0, 2);
      
      if (!prefijosValidos.includes(prefijo)) {
        throw new Error("El prefijo del CUIT no es válido");
      }
    } else {
      // Validación para otros comprobantes (DNI)
      if (!cliente.documento) {
        // Permitir consumidor final con documento '0'
        cliente.documento = '0';
      } else {
        // Limpieza del DNI
        cliente.documento = cliente.documento.toString().replace(/[^\d]/g, '');
        
        // Validar DNI (8 dígitos o 0 para consumidor final)
        if (cliente.documento !== '0' && cliente.documento.length !== 8) {
          throw new Error("El DNI debe contener exactamente 8 dígitos (o 0 para consumidor final)");
        }
      }
    }

    // 3. Preparar datos para Firebase
    const clienteParaGuardar = {
      ...cliente,
      // Campos adicionales para búsqueda eficiente
      nombre_lowercase: cliente.nombre.toLowerCase(),
      documento_search: esFacturaC ? cliente.cuit : cliente.documento,
      esFacturaC, // Guardamos el tipo de cliente
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 4. Guardar en Firestore
    const docRef = await addDoc(collection(db, "clientes"), clienteParaGuardar);
    
    return { 
      id: docRef.id, 
      ...clienteParaGuardar,
      // No devolver campos internos de búsqueda
      nombre_lowercase: undefined,
      documento_search: undefined
    };

  } catch (error) {
    console.error("Error al guardar cliente:", error);
    
    // Mejorar mensajes de error para el usuario
    let mensajeError = `No se pudo guardar el cliente: ${error.message}`;
    
    if (error.message.includes("CUIT")) {
      mensajeError = `Error en CUIT: ${error.message}`;
    } else if (error.message.includes("DNI")) {
      mensajeError = `Error en DNI: ${error.message}`;
    }
    
    throw new Error(mensajeError);
  }
};



