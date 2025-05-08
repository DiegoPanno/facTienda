// src/utils/dateUtils.js
// dateUtils.js - Versión mejorada
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const parseFirebaseTimestamp = (timestamp) => {
  if (!timestamp) return null;

  // 1. Si es un Timestamp de Firebase v9 (con seconds y nanoseconds)
  if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  }

  // 2. Si es un Timestamp de Firebase v8 (con método toDate)
  if (typeof timestamp?.toDate === 'function') {
    return timestamp.toDate();
  }

  // 3. Si es un string ISO
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  // 4. Si ya es un objeto Date
  if (timestamp instanceof Date) {
    return timestamp;
  }

  console.error('Formato de fecha no reconocido:', timestamp);
  return null;
};

export const formatFirebaseDate = (date, pattern = 'dd/MM/yyyy HH:mm') => {
  const parsedDate = parseFirebaseTimestamp(date);
  return parsedDate ? format(parsedDate, pattern, { locale: es }) : 'Fecha no disponible';
};