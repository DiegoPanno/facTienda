// frontend/src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const checkServerStatus = async () => {
  try {
    const response = await api.get('/');
    return response.data; // Deberías recibir {"status":"Servidor funcionando ✅",...}
  } catch (error) {
    console.error('Error al conectar con el backend:', error);
    throw error;
  }
};

export const emitirFactura = async (facturaData) => {
  return await api.post('/api/facturar', facturaData);
};

export default api; // Esto es lo que falta, exportar `api` como default
