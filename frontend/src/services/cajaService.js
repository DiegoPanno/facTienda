// ///frontend/src/services/cajaService.js
// frontend/src/services/cajaService.js

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  limit,
} from "firebase/firestore";
import { db } from "../firebase.js";
import api from "../api";
import crypto from "crypto";
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
      entorno: process.env.NODE_ENV || "development",
    });
  } catch (e) {
    console.error("Error registrando error:", e);
  }
};

const generarHashSeguro = (dato) => {
  return crypto
    .createHash("sha256")
    .update(dato)
    .digest("hex")
    .substring(0, 16);
};

// ==============================================
// OPERACIONES PRINCIPALES DE CAJA
// ==============================================

export const abrirCaja = async (saldoInicial = 0) => {
  try {
    // Llamada directa al backend sin verificar estado AFIP
    const response = await api.post("/api/afip/abrir-caja", { saldoInicial });

    // Crear caja en Firestore con la respuesta del backend
    const nuevaCaja = {
      fechaApertura: new Date(),
      saldoInicial: parseFloat(saldoInicial),
      saldoActual: parseFloat(saldoInicial),
      abierta: true,
      afipStatus: response.data.caja.afipStatus || "inactivo",
    };

    const docRef = await addDoc(collection(db, "caja"), nuevaCaja);

    return {
      success: true,
      id: docRef.id,
      ...nuevaCaja,
    };
  } catch (error) {
    console.error("Error en abrirCaja:", error);
    return {
      success: false,
      error: error.message,
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
      abierta: false, // Y/O este campo
      fechaCierre: serverTimestamp(),
      saldoFinal: parseFloat(saldoFinal),
      cerradoPor: { nombre, uid },
    });

    // 2. Registrar movimiento de cierre
    const movRef = collection(db, "caja", cajaId, "movimientos");
    await addDoc(movRef, {
      tipo: "cierre",
      descripcion: "Cierre de caja",
      monto: 0,
      fecha: serverTimestamp(),
      usuario: { nombre, uid },
    });

    return { success: true };
  } catch (error) {
    console.error("Error cerrando caja:", error);
    throw error;
  }
};

export const obtenerCajaAbierta = async () => {
  try {
    const cajasRef = collection(db, "caja"); // ⚠️ ojo, singular, no "cajas"
    const q = query(cajasRef, where("abierta", "==", true), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        fechaApertura: data.fechaApertura?.toDate?.() || new Date(),
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
    if (
      !movimiento?.tipo ||
      !["ingreso", "egreso", "sistema"].includes(movimiento.tipo)
    ) {
      throw new Error("Tipo de movimiento inválido");
    }
    if (isNaN(movimiento.monto)) throw new Error("Monto inválido");

    const movimientoConUsuario = {
      ...movimiento,
      usuario: movimiento.usuario || {
        nombre: "Sistema",
        uid: "system-001",
      },
    };

    const fechaFinal = movimiento.fecha
      ? new Date(movimiento.fecha)
      : serverTimestamp();

    const datosCompletos = {
      ...movimientoConUsuario,
      monto: Number(movimiento.monto),
      fecha: fechaFinal,
    };

    // 1. Guardar en subcolección movimientos de la caja
    const movimientoRef = collection(db, "caja", idCaja, "movimientos");
    const docRef = await addDoc(movimientoRef, datosCompletos);

    // 2. Actualizar saldo en caja
    const cajaRef = doc(db, "caja", idCaja);
    if (movimiento.tipo === "ingreso") {
      await updateDoc(cajaRef, {
        saldoActual: increment(movimiento.monto),
        totalIngresado: increment(movimiento.monto),
      });
    } else if (movimiento.tipo === "egreso") {
      await updateDoc(cajaRef, {
        saldoActual: increment(-movimiento.monto),
      });
    }

    // 3. Guardar en movimientosCaja
    await addDoc(collection(db, "movimientosCaja"), {
      ...datosCompletos,
      idCaja,
    });

    // 4. Guardar en movimientosVenta si tiene productos
    if (
      movimiento.tipo === "ingreso" &&
      movimiento.productos &&
      movimiento.productos.length > 0
    ) {
      await addDoc(collection(db, "movimientosVenta"), {
        ...datosCompletos,
        idCaja,
      });
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    await registrarError(error, "error_registro_movimiento", {
      idCaja,
      movimiento,
    });
    console.error("Error al registrar movimiento:", error);
    throw error;
  }
};




export const obtenerCajaActiva = async () => {
  const cajaRef = collection(db, "caja"); // ✅ singular
  const q = query(cajaRef, where("cerrada", "==", false));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const docData = querySnapshot.docs[0];
    return { id: docData.id, ...docData.data() };
  }
  return null;
};

export const sumarIngresoACaja = async (cajaId, monto) => {
  const cajaRef = doc(db, "caja", cajaId); // ✅ singular
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

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      fecha: doc.data().fecha?.toDate?.() || new Date(),
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
