// components/CajaDiaria.js
import { useEffect, useState } from "react";
import { obtenerMovimientosDelDia, obtenerEstadoCaja } from "../../services/cajaService";

const CajaDiaria = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [estadoCaja, setEstadoCaja] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const [movs, caja] = await Promise.all([
          obtenerMovimientosDelDia(),
          obtenerEstadoCaja()
        ]);
        setMovimientos(movs);
        setEstadoCaja(caja);
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, []);

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="caja-container">
      <h2>Estado de Caja</h2>
      {estadoCaja ? (
        <div className="estado-caja">
          <p>Estado: {estadoCaja.estado === "abierta" ? "✅ Abierta" : "❌ Cerrada"}</p>
          <p>Saldo inicial: ${estadoCaja.saldoInicial}</p>
          <p>Saldo actual: ${estadoCaja.saldoActual}</p>
          <p>Última apertura: {estadoCaja.fechaApertura?.toLocaleString()}</p>
        </div>
      ) : (
        <p>No hay caja abierta</p>
      )}

      <h2>Movimientos del Día</h2>
      <table className="movimientos-table">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Forma Pago</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((mov) => (
            <tr key={mov.id}>
              <td>{mov.fecha?.toLocaleTimeString()}</td>
              <td>{mov.tipo === "ingreso" ? "Ingreso" : "Egreso"}</td>
              <td>{mov.descripcion}</td>
              <td>${mov.monto.toFixed(2)}</td>
              <td>{mov.formaPago}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CajaDiaria;