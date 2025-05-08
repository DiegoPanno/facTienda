// frontend/src/services/afipService.js
// import api from '../api';


// export const emitirFacturaAFIP = async (facturaData) => {
//   try {
//     // Transforma los datos al formato que espera tu backend
//     const payload = {
//       cliente: {
//         cuit: facturaData.cuit,
//         tipo: facturaData.tipoFactura // 'A' o 'B'
//       },
//       items: facturaData.items.map(item => ({
//         id: item.id,
//         descripcion: item.nombre,
//         cantidad: 1, // O toma del carrito
//         precioUnitario: item.precio
//       }))
//     };

//     const response = await api.post('/api/facturar', payload);
    
//     // Puedes transformar la respuesta aquí si es necesario
//     return {
//       ...response.data,
//       fechaEmision: new Date(response.data.fechaEmision)
//     };
    
//   } catch (error) {
//     // Manejo específico de errores AFIP
//     if (error.response?.data?.error === 'token_expirado') {
//       throw new Error('Sesión expirada, por favor recargue la página');
//     }
//     throw error;
//   }
// };

// // Otras funciones específicas de AFIP
// export const obtenerTiposFactura = async () => {
//   const response = await api.get('/api/afip/tipos-factura');
//   return response.data;
// };

// export const verificarEstadoAFIP = async () => {
//   const estado = {
//     tokenValido: !!this.credenciales.token,
//     puntoVenta: this.config.afip.ptoVta,
//     ultimaVerificacion: new Date().toISOString(),
//     ultimaRenovacion: this.credenciales.expiration,
//     conexionAFIP: false,
//     detalles: {
//       tokenLength: this.credenciales.token?.length || 0,
//       signLength: this.credenciales.sign?.length || 0
//     }
//   };

//   estado.conexionAFIP = estado.tokenValido && estado.detalles.signLength > 0;
//   return estado;
// };