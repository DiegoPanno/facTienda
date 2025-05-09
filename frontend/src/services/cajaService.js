// ///frontend/src/services/cajaService.js
// frontend/src/services/cajaService.js

import { 
  collection, addDoc, getDocs, query, where, 
  orderBy, doc,  updateDoc, serverTimestamp, 
 increment, limit, 
} from 'firebase/firestore';
import { db } from '../firebase.js';
import api from '../api'; 
import crypto from 'crypto';
//import { parseFirebaseTimestamp } from '../components/caja/utils/dateUtils';



// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

const registrarError = async (error, tipo, datosAdicionales = {}) => {
  try {
    await addDoc(collection(db, "erroresSistema"), {
      mensaje: error.message,
      tipo,
      stack: error.stack?.substring(0, 500),
      timestamp: serverTimestamp(),
      ...datosAdicionales,
      entorno: process.env.NODE_ENV || 'development'
    });
  } catch (e) {
    console.error("Error registrando error:", e);
  }
};

const generarHashSeguro = (dato) => {
  return crypto.createHash('sha256')
             .update(dato)
             .digest('hex')
             .substring(0, 16);
};

// ==============================================
// OPERACIONES PRINCIPALES DE CAJA
// ==============================================

export const abrirCaja = async (saldoInicial = 0) => {
    try {
      // Llamada directa al backend sin verificar estado AFIP
      const response = await api.post('/api/afip/abrir-caja', { saldoInicial });
      
      // Crear caja en Firestore con la respuesta del backend
      const nuevaCaja = {
        fechaApertura: new Date(),
        saldoInicial: parseFloat(saldoInicial),
        saldoActual: parseFloat(saldoInicial),
        abierta: true,
        afipStatus: response.data.caja.afipStatus || 'inactivo'
      };
  
      const docRef = await addDoc(collection(db, "caja"), nuevaCaja);
      
      return {
        success: true,
        id: docRef.id,
        ...nuevaCaja
      };
    } catch (error) {
      console.error("Error en abrirCaja:", error);
      return {
        success: false,
        error: error.message
      };
    }
  };

export const cerrarCaja = async (cajaId, { nombre, uid, saldoFinal }) => {
  try {
    if (!nombre || !uid) throw new Error("Usuario no especificado");
    if (isNaN(saldoFinal)) throw new Error("Saldo final inválido");

    // 1. Actualizar el documento principal de caja
    const cajaRef = doc(db, "caja", cajaId);
    await updateDoc(cajaRef, {
      estado: "cerrada", // Asegúrate de tener este campo
      abierta: false,    // Y/O este campo
      fechaCierre: serverTimestamp(),
      saldoFinal: parseFloat(saldoFinal),
      cerradoPor: { nombre, uid }
    });

    // 2. Registrar movimiento de cierre
    const movRef = collection(db, "caja", cajaId, "movimientos");
    await addDoc(movRef, {
      tipo: "cierre",
      descripcion: "Cierre de caja",
      monto: 0,
      fecha: serverTimestamp(),
      usuario: { nombre, uid }
    });

    return { success: true };
  } catch (error) {
    console.error("Error cerrando caja:", error);
    throw error;
  }
};

export const obtenerCajaAbierta = async () => {
  try {
    const cajasRef = collection(db, "caja");
    const q = query(cajasRef, where("abierta", "==", true), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        fechaApertura: data.fechaApertura?.toDate?.() || new Date()
      };
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo caja abierta:", error);
    throw error;
  }
};

export const registrarMovimiento = async (idCaja, movimiento) => {
  try {
    if (!idCaja) throw new Error("ID de caja no proporcionado");
    if (!movimiento?.tipo || !['ingreso', 'egreso', 'sistema'].includes(movimiento.tipo)) {
      throw new Error("Tipo de movimiento inválido");
    }
    if (!movimiento?.usuario) throw new Error("Usuario no especificado");
    if (isNaN(movimiento.monto)) throw new Error("Monto inválido");

    const movimientoRef = collection(db, "caja", idCaja, "movimientos");
    await addDoc(movimientoRef, {
      ...movimiento,
      monto: Number(movimiento.monto),
      fecha: serverTimestamp()
    });

    const cajaRef = doc(db, "caja", idCaja);

    if (movimiento.tipo === "ingreso") {
      await updateDoc(cajaRef, {
        saldoActual: increment(movimiento.monto),
        totalIngresado: increment(movimiento.monto)
      });
    } else if (movimiento.tipo === "egreso") {
      await updateDoc(cajaRef, {
        saldoActual: increment(-movimiento.monto)
      });
    }

    return { success: true };
  } catch (error) {
    await registrarError(error, 'error_registro_movimiento', { idCaja, movimiento });
    console.error("Error al registrar movimiento:", error);
    throw error;
  }
};


export const obtenerCajaActiva = async () => {
  const cajaRef = collection(db, 'caja'); // ✅ singular
  const q = query(cajaRef, where('cerrada', '==', false));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const docData = querySnapshot.docs[0];
    return { id: docData.id, ...docData.data() };
  }
  return null;
};

export const sumarIngresoACaja = async (cajaId, monto) => {
  const cajaRef = doc(db, 'caja', cajaId); // ✅ singular
  await updateDoc(cajaRef, {
    totalIngresado: increment(monto),
  });
};

export const obtenerMovimientosCaja = async (idCaja) => {
  try {
    const q = query(
      collection(db, "caja", idCaja, "movimientos"),
      orderBy("fecha", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fecha: doc.data().fecha?.toDate?.() || new Date()
    }));
  } catch (error) {
    console.error("Error obteniendo movimientos:", error);
    throw error;
  }
};



export default {
  abrirCaja,
  cerrarCaja,
  registrarMovimiento,
  generarHashSeguro,
  obtenerMovimientosCaja,
  obtenerCajaAbierta,
};




// import { 
//   collection, addDoc, getDocs, query, where, 
//   orderBy, doc, setDoc, updateDoc, serverTimestamp, 
//   writeBatch, increment, limit, getDoc 
// } from 'firebase/firestore';
// import { db } from '../firebase.js';
// import api from '../api'; 
// import crypto from 'crypto';
// import { parseFirebaseTimestamp } from '../components/caja/utils/dateUtils.js';

// const API_URL = 'http://localhost:3000/api/afip';

// // ==============================================
// // FUNCIONES AUXILIARES
// // ==============================================

// const registrarError = async (error, tipo, datosAdicionales = {}) => {
//   try {
//     await addDoc(collection(db, "erroresSistema"), {
//       mensaje: error.message,
//       tipo,
//       stack: error.stack?.substring(0, 500),
//       timestamp: serverTimestamp(),
//       ...datosAdicionales,
//       entorno: process.env.NODE_ENV || 'development'
//     });
//   } catch (e) {
//     console.error("Error registrando error:", e);
//   }
// };

// const generarHashSeguro = (dato) => {
//   return crypto.createHash('sha256')
//              .update(dato)
//              .digest('hex')
//              .substring(0, 16);
// };

// // const parseFirebaseTimestamp = (timestamp) => {
// //   if (!timestamp) return null;
// //   if (typeof timestamp.toDate === 'function') return timestamp.toDate();
// //   if (timestamp._methodName === 'serverTimestamp') return new Date();
// //   if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
// //     return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
// //   }
// //   if (typeof timestamp === 'string') return new Date(timestamp);
// //   if (timestamp instanceof Date) return timestamp;
// //   console.error('Formato de fecha no reconocido:', timestamp);
// //   return null;
// // };

// // ==============================================
// // OPERACIONES PRINCIPALES DE CAJA
// // ==============================================

// // frontend/src/services/cajaService.js
// // Actualiza la función abrirCaja para que no falle si AFIP no responde
// export const abrirCaja = async (saldoInicial = 0) => {
//   try {
//     // Llamada directa al backend sin verificar estado AFIP
//     const response = await api.post('/api/afip/abrir-caja', { saldoInicial });
    
//     // Crear caja en Firestore con la respuesta del backend
//     const nuevaCaja = {
//       fechaApertura: new Date(),
//       saldoInicial: parseFloat(saldoInicial),
//       saldoActual: parseFloat(saldoInicial),
//       abierta: true,
//       afipStatus: response.data.caja.afipStatus || 'inactivo'
//     };

//     const docRef = await addDoc(collection(db, "caja"), nuevaCaja);
    
//     return {
//       success: true,
//       id: docRef.id,
//       ...nuevaCaja
//     };
//   } catch (error) {
//     console.error("Error en abrirCaja:", error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// export const cerrarCaja = async (cajaId, usuario) => {
//   if (!usuario) throw new Error("Usuario no especificado");

//   const movimientoCierre = {
//     tipo: "cierre",
//     fecha: new Date(),
//     saldoFinal: totalCaja,
//     usuario // ← ahora es un objeto con nombre y uid
//   };

//   await addDoc(collection(db, `cajas/${cajaId}/movimientos`), movimientoCierre);
// };

// // export const cerrarCaja = async (idCaja, saldoFinal, usuario) => {
// //   try {
// //     if (!idCaja) throw new Error("ID de caja no proporcionado");
// //     if (!usuario) throw new Error("Usuario no especificado");
// //     if (isNaN(saldoFinal)) throw new Error("Saldo final inválido");

// //     const cajaRef = doc(db, "caja", idCaja);
// //     const cajaSnap = await getDoc(cajaRef);

// //     if (!cajaSnap.exists()) throw new Error("Caja no encontrada");
// //     if (cajaSnap.data().estado === "cerrada") {
// //       throw new Error("La caja ya está cerrada");
// //     }

// //     const movimientos = await obtenerMovimientosCaja(idCaja);
// //     const { ingresos, egresos } = movimientos.reduce((acc, mov) => {
// //       const monto = Number(mov.monto) || 0;
// //       mov.tipo === 'ingreso' ? acc.ingresos += monto : acc.egresos += monto;
// //       return acc;
// //     }, { ingresos: 0, egresos: 0 });

// //     const saldoInicial = Number(cajaSnap.data().saldoInicial) || 0;
// //     const saldoCalculado = saldoInicial + ingresos - egresos;
// //     const diferencia = Number(saldoFinal) - saldoCalculado;

// //     const fechaActual = new Date();
// //     const updateData = {
// //       estado: "cerrada",
// //       fechaCierre: serverTimestamp(),
// //       saldoFinal: Number(saldoFinal),
// //       totalVentas: ingresos,
// //       totalEgresos: egresos,
// //       diferencia: parseFloat(diferencia.toFixed(2)),
// //       cierrePor: usuario,
// //       configAFIP: {
// //         ...cajaSnap.data().configAFIP,
// //         cierre: fechaActual.toISOString()
// //       },
// //       metadata: {
// //         ...(cajaSnap.data().metadata || {}),
// //         fechaCierre: fechaActual.toISOString()
// //       }
// //     };

// //     const batch = writeBatch(db);
// //     batch.update(cajaRef, updateData);

// //     const movimientoRef = doc(collection(db, "caja", idCaja, "movimientos"));
// //     batch.set(movimientoRef, {
// //       tipo: 'sistema',
// //       monto: 0,
// //       descripcion: `Cierre de caja - Diferencia: $${diferencia.toFixed(2)}`,
// //       categoria: 'administrativo',
// //       usuario,
// //       fecha: serverTimestamp(),
// //       detalles: {
// //         saldoFinal: Number(saldoFinal),
// //         diferencia: parseFloat(diferencia.toFixed(2))
// //       }
// //     });

// //     await batch.commit();
// //     console.log(`✅ Caja cerrada (ID: ${idCaja})`);

// //     return {
// //       success: true,
// //       idCaja,
// //       diferencia,
// //       ...updateData,
// //       fechaCierre: fechaActual
// //     };
// //   } catch (error) {
// //     await registrarError(error, 'error_cierre_caja', { idCaja, usuario });
// //     console.error("Error al cerrar caja:", error);
// //     throw error;
// //   }
// // };

// export const obtenerCajaAbierta = async () => {
//   try {
//     const cajasRef = collection(db, "caja");
//     const q = query(cajasRef, where("abierta", "==", true), limit(1));
//     const querySnapshot = await getDocs(q);

//     if (!querySnapshot.empty) {
//       const doc = querySnapshot.docs[0];
//       const data = doc.data();
      
//       return {
//         id: doc.id,
//         ...data,
//         fechaApertura: data.fechaApertura?.toDate?.() || new Date()
//       };
//     }
//     return null;
//   } catch (error) {
//     console.error("Error obteniendo caja abierta:", error);
//     throw error;
//   }
// };



// export const registrarMovimiento = async (idCaja, movimiento) => {
//   try {
//     if (!idCaja) throw new Error("ID de caja no proporcionado");
//     if (!movimiento?.tipo || !['ingreso', 'egreso', 'sistema'].includes(movimiento.tipo)) {
//       throw new Error("Tipo de movimiento inválido");
//     }
//     if (!movimiento?.usuario) throw new Error("Usuario no especificado");
//     if (isNaN(movimiento.monto)) throw new Error("Monto inválido");

//     const movimientoRef = collection(db, "caja", idCaja, "movimientos");
//     await addDoc(movimientoRef, {
//       ...movimiento,
//       monto: Number(movimiento.monto),
//       fecha: serverTimestamp()
//     });

//     return { success: true };
//   } catch (error) {
//     await registrarError(error, 'error_registro_movimiento', { idCaja, movimiento });
//     console.error("Error al registrar movimiento:", error);
//     throw error;
//   }
// };

// export const obtenerCajaActiva = async () => {
//   const cajaRef = collection(db, 'caja'); // ✅ singular
//   const q = query(cajaRef, where('cerrada', '==', false));
//   const querySnapshot = await getDocs(q);
//   if (!querySnapshot.empty) {
//     const docData = querySnapshot.docs[0];
//     return { id: docData.id, ...docData.data() };
//   }
//   return null;
// };

// export const sumarIngresoACaja = async (cajaId, monto) => {
//   const cajaRef = doc(db, 'caja', cajaId); // ✅ singular
//   await updateDoc(cajaRef, {
//     totalIngresado: increment(monto),
//   });
// };

// export const obtenerMovimientosCaja = async (idCaja) => {
//   try {
//     if (!idCaja) throw new Error("ID de caja no proporcionado");

//     const q = query(
//       collection(db, "caja", idCaja, "movimientos"),
//       orderBy("fecha", "desc")
//     );

//     const querySnapshot = await getDocs(q);
//     return querySnapshot.docs.map(doc => {
//       const data = doc.data();
//       return {
//         id: doc.id,
//         ...data,
//         fecha: parseFirebaseTimestamp(data.fecha),
//         monto: Number(data.monto) || 0,
//         saldoAnterior: Number(data.saldoAnterior) || 0,
//         saldoPosterior: Number(data.saldoPosterior) || 0
//       };
//     });
//   } catch (error) {
//     await registrarError(error, 'error_consulta_movimientos', { idCaja });
//     console.error("Error obteniendo movimientos:", error);
//     throw error;
//   }
// };

// // export const verificarCredencialesAFIP = async (idCaja) => {
// //   try {
// //     if (!idCaja) throw new Error("ID de caja no proporcionado");
    
// //     const cajaRef = doc(db, "caja", idCaja);
// //     const cajaSnap = await getDoc(cajaRef);
    
// //     if (!cajaSnap.exists()) throw new Error("Caja no encontrada");
    
// //     const { configAFIP } = cajaSnap.data();
    
// //     if (!configAFIP?.token || !configAFIP?.sign) {
// //       return { valido: false, motivo: "No hay credenciales AFIP registradas" };
// //     }
    
// //     const ahora = new Date();
// //     const vencimiento = new Date(configAFIP.vencimiento);
    
// //     if (vencimiento < ahora) {
// //       return { 
// //         valido: false, 
// //         motivo: `Credenciales vencidas (vencieron el ${vencimiento.toLocaleString()})` 
// //       };
// //     }
    
// //     // Verificación adicional probando el servicio
// //     try {
// //       const prueba = await AfipService.emitirFacturaTest();
// //       return { 
// //         valido: true,
// //         vencimiento: configAFIP.vencimiento,
// //         puntoVenta: configAFIP.puntoVenta,
// //         pruebaServicio: prueba.success
// //       };
// //     } catch (error) {
// //       return {
// //         valido: false,
// //         motivo: "Error al probar servicio AFIP",
// //         detalle: error.message
// //       };
// //     }
// //   } catch (error) {
// //     await registrarError(error, 'error_verificacion_afip', { idCaja });
// //     throw error;
// //   }
// // };

// // export const verificarEstadoAFIP = async () => {
// //   try {
// //     const response = await api.get(`${API_URL}/verificar-estado`);
// //     return response.data;
// //   } catch (error) {
// //     console.error("Error verificando estado AFIP:", error);
// //     throw error;
// //   }
// // };


// export default {
//   abrirCaja,
//   cerrarCaja,
//   registrarMovimiento,
//   generarHashSeguro,
//   obtenerMovimientosCaja,
//   obtenerCajaAbierta,
// };
