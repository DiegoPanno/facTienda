
// utils/cajaUtils.js
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatFirebaseDate } from './dateUtils';
/**
 * Calcula los totales agrupados por forma de pago
 * @param {Array} movimientos - Array de movimientos de caja
 * @returns {Object} Objeto con totales por forma de pago
 */
export const calcularTotalesPorFormaPago = (movimientos) => {
  if (!movimientos || !Array.isArray(movimientos)) return {};
  
  return movimientos.reduce((acc, mov) => {
    if (!mov || typeof mov !== 'object') return acc;
    
    const formaPago = mov.formaPago?.trim() || 'sin_especificar';
    const monto = parseFloat(mov.monto) || 0;
    const tipo = mov.tipo === 'ingreso' ? 1 : -1;

    if (!acc[formaPago]) {
      acc[formaPago] = 0;
    }
    
    acc[formaPago] += monto * tipo;
    return acc;
  }, {});
};

/**
 * Calcula estadísticas de productos vendidos
 * @param {Array} movimientos - Array de movimientos de caja
 * @returns {Object} Objeto con estadísticas por producto
 */
export const calcularEstadisticasProductos = (movimientos) => {
  if (!movimientos || !Array.isArray(movimientos)) return {};
  
  return movimientos.reduce((acc, mov) => {
    // Verificamos que sea una venta y tenga productos
    if (mov.tipo !== 'ingreso' || !Array.isArray(mov.productos)) return acc;
    
    mov.productos.forEach(producto => {
      // Validamos la estructura mínima del producto
      if (!producto?.id || !producto?.nombre) return;
      
      const cantidad = parseInt(producto.cantidad, 10) || 0;
      const precio = parseFloat(producto.precio) || 0;
      const total = precio * cantidad;
      
      if (!acc[producto.id]) {
        acc[producto.id] = {
          id: producto.id,
          nombre: producto.nombre,
          cantidad: 0,
          total: 0,
          precioPromedio: 0
        };
      }
      
      acc[producto.id].cantidad += cantidad;
      acc[producto.id].total += total;
      acc[producto.id].precioPromedio = acc[producto.id].total / acc[producto.id].cantidad;
    });
    
    return acc;
  }, {});
};

/**
 * Formatea un valor como moneda
 * @param {Number|String} valor - Valor a formatear
 * @param {String} moneda - Código de moneda (default: 'ARS')
 * @returns {String} Valor formateado como moneda
 */
export const formatearMoneda = (valor, moneda = 'ARS') => {
  const valorNumerico = Number(valor) || 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valorNumerico);
};

/**
 * Formatea una fecha de Firebase
 * @param {Date|Timestamp|String} fecha - Fecha a formatear
 * @param {String} formato - Formato deseado (default: 'dd/MM/yyyy HH:mm')
 * @returns {String} Fecha formateada
 */
export const formatearFechaFirebase = (fecha, formato = 'dd/MM/yyyy HH:mm') => {
  if (!fecha) return 'Fecha no disponible';
  
  try {
    let fechaObj;
    
    // Si es un Timestamp de Firebase
    if (typeof fecha?.toDate === 'function') {
      fechaObj = fecha.toDate();
    } 
    // Si ya es un objeto Date
    else if (fecha instanceof Date) {
      fechaObj = fecha;
    } 
    // Si es un string ISO
    else if (typeof fecha === 'string') {
      fechaObj = new Date(fecha);
    }
    // Si es un objeto serverTimestamp no resuelto
    else if (fecha?._methodName === 'serverTimestamp') {
      return 'En proceso...';
    }
    
    // Verificar que la fecha es válida
    if (!fechaObj || isNaN(fechaObj.getTime())) {
      return 'Fecha inválida';
    }
    
    return format(fechaObj, formato, { locale: es });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Error en fecha';
  }
};

/**
 * Calcula el resumen general de la caja
 * @param {Array} movimientos - Array de movimientos
 * @param {Number} saldoInicial - Saldo inicial de la caja
 * @returns {Object} Resumen con ingresos, egresos y saldo
 */
export const calcularResumenCaja = (movimientos, saldoInicial = 0) => {
  if (!Array.isArray(movimientos)) return {};
  
  const resumen = {
    ingresos: 0,
    egresos: 0,
    saldoInicial: parseFloat(saldoInicial) || 0,
    saldoActual: parseFloat(saldoInicial) || 0
  };
  
  movimientos.forEach(mov => {
    const monto = parseFloat(mov.monto) || 0;
    
    if (mov.tipo === 'ingreso') {
      resumen.ingresos += monto;
    } else {
      resumen.egresos += monto;
    }
  });
  
  resumen.saldoActual = resumen.saldoInicial + resumen.ingresos - resumen.egresos;
  
  return resumen;
};

/**
 * Filtra movimientos por rango de fechas
 * @param {Array} movimientos - Array de movimientos
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @returns {Array} Movimientos filtrados
 */

export const filtrarMovimientosPorFecha = (movimientos, fechaInicio, fechaFin) => {
  if (!Array.isArray(movimientos)) return [];
  
  return movimientos.filter(mov => {
    try {
      const fechaMov = parseFirebaseTimestamp(mov.fecha);
      if (!fechaMov || isNaN(fechaMov.getTime())) return false;
      
      return fechaMov >= fechaInicio && fechaMov <= fechaFin;
    } catch (error) {
      console.error('Error filtrando movimiento:', error);
      return false;
    }
  });
};