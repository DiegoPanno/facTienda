import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  useTheme,
  Grid,
  Chip,
} from "@mui/material";
import {
  abrirCaja,
  cerrarCaja,
  registrarMovimiento,
  obtenerCajaAbierta,
  obtenerMovimientosCaja,
} from "../../services/cajaService";
import MovimientoForm from "./MovimientoForm";
import ListaMovimientos from "./ListaMovimientos";
import CajaReporte from "./CajaReporte";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatearMoneda } from '../../components/caja/utils/cajaUtils';

const CajaPanel = () => {
  const theme = useTheme();
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [totalCaja, setTotalCaja] = useState(0);
  const [caja, setCaja] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [saldoInicial, setSaldoInicial] = useState(() => {
    return localStorage.getItem("saldoInicial") || "";
  });
  const [afipStatus, setAfipStatus] = useState({
    message: "",
    status: "inactive", // inactive, loading, success, error
    details: null,
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setAfipStatus({
          message: "🔵 AFIP Configuración pendiente",
          status: "info",
          details: "La conexión con AFIP se establecerá al abrir la caja",
        });

        const cajaAbierta = await obtenerCajaAbierta();
        


        if (cajaAbierta) {
          setCaja({
            ...cajaAbierta,
            fechaApertura: cajaAbierta.fechaApertura?.toDate?.() || new Date(),
            fechaFormateada: format(new Date(), "PPPpp", { locale: es }),
          });
          const movs = await obtenerMovimientosCaja(cajaAbierta.id);
          setMovimientos(movs);
          setCajaAbierta(cajaAbierta);
          if (cajaAbierta.afipStatus) {
            setAfipStatus({
              message:
                cajaAbierta.afipStatus === "activo"
                  ? "✅ AFIP Conectado"
                  : "⚠️ AFIP No disponible",
              status:
                cajaAbierta.afipStatus === "activo" ? "success" : "warning",
              details: cajaAbierta.configAFIP || {},
            });
          }
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);


  useEffect(() => {
    const total = movimientos.reduce((acc, movimiento) => {
      return movimiento.tipo === "ingreso"
        ? acc + movimiento.monto
        : acc - movimiento.monto;
    }, 0);
    setTotalCaja(total);
  }, [movimientos]);

  useEffect(() => {
    if (saldoInicial) {
      localStorage.setItem("saldoInicial", saldoInicial);
    }
  }, [saldoInicial]);

  const handleAbrirCaja = async () => {
    try {
      const resultado = await abrirCaja(saldoInicial);
      if (resultado.success) {
        setCaja({
          ...resultado,
          fechaFormateada: format(new Date(), "PPPpp", { locale: es }),
        });
       
        setCajaAbierta(resultado);
        
        setAfipStatus({
          message:
            resultado.afipStatus === "activo"
              ? "✅ AFIP Conectado"
              : "⚠️ AFIP No disponible",
          status: resultado.afipStatus === "activo" ? "success" : "warning",
          details: resultado.configAFIP || {},
        });
        
        const movimientos = await obtenerMovimientosCaja(resultado.id);
        const total = movimientos.reduce((acc, movimiento) => {
          return movimiento.tipo === "ingreso"
            ? acc + movimiento.monto
            : acc - movimiento.monto;
        }, 0);
        setTotalCaja(total);
        setSuccess(`✅ Caja abierta correctamente. Total: $${total.toFixed(2)}`);
        localStorage.removeItem("saldoInicial");
      }
    } catch (error) {
      console.error("Error al abrir caja:", error);
    }
  };

  const handleCerrarCaja = async () => {
    try {
      const saldoFinal = prompt("Ingrese saldo final:");
      if (!saldoFinal || isNaN(saldoFinal)) throw new Error("Monto inválido");
  
      // Usamos formatearMoneda de cajaUtils.js
      const confirmacion = confirm(`¿Cerrar caja con saldo ${formatearMoneda(saldoFinal)}?`);
      if (!confirmacion) return;
  
      await cerrarCaja(caja.id, {
        nombre: "Admin",
        uid: "local",
        saldoFinal: parseFloat(saldoFinal)
      });
  
      // Fuerza recarga con tus funciones
      const [nuevaCaja, nuevosMovimientos] = await Promise.all([
        obtenerCajaAbierta(),
        obtenerMovimientosCaja(caja.id)
      ]);
  
      setCaja(nuevaCaja); // Debería ser null si se cerró correctamente
      setMovimientos(nuevosMovimientos);
      setSuccess("Caja cerrada correctamente");
    } catch (error) {
      setError(`Error: ${error.message}`);
    }
  };

  const handleAgregarMovimiento = async (movimiento) => {
    try {
      setLoading(true);
      await registrarMovimiento(caja.id, movimiento);
      const movs = await obtenerMovimientosCaja(caja.id);
      setMovimientos(movs);
      setSuccess("Movimiento registrado correctamente");
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto", ml: "200px"}}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: "bold",
          mb: 3,
          pb: 1,
          borderBottom: `2px solid ${theme.palette.primary.main}`,
        }}
      >
        Panel de Caja
      </Typography>

      {/* Estado AFIP */}
      <Box sx={{ mb: 2 }}>
        <Chip
          label={afipStatus.message}
          color={
            afipStatus.status === "success"
              ? "success"
              : afipStatus.status === "error"
              ? "error"
              : afipStatus.status === "loading"
              ? "info"
              : "default"
          }
          variant="outlined"
          sx={{ fontWeight: "bold" }}
        />
        {afipStatus.details && (
          <Typography variant="caption" sx={{ ml: 1 }}>
            {afipStatus.details.mensaje || ""}
          </Typography>
        )}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Cargando datos de caja...
          </Typography>
        </Box>
      ) : !caja ? (
        <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Apertura de Caja
          </Typography>
          <TextField
            type="number"
            label="Saldo inicial"
            variant="outlined"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            sx={{ mb: 2, width: "100%", maxWidth: 300 }}
            InputProps={{ inputProps: { min: 0 } }}
          />
          <Button
            onClick={handleAbrirCaja}
            disabled={loading || !saldoInicial}
            variant="contained"
            color={afipStatus.status === "error" ? "warning" : "primary"}
          >
            {loading ? (
              <CircularProgress size={20} sx={{ ml: 1 }} />
            ) : (
              "Abrir Caja"
            )}
          </Button>
        </Paper>
      ) : (
        <>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
            <Grid xs={12} md={6} sm={4}>
                <Typography variant="body1">
                  <strong>Fecha apertura:</strong> {caja.fechaFormateada}
                </Typography>
              </Grid>
              <Grid xs={12} md={4}>
                <Typography variant="body1">
                  <strong>Saldo inicial:</strong> $
                  {caja.saldoInicial?.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography
                  variant="body1"
                  sx={{
                    color:
                      caja.saldoActual >= caja.saldoInicial
                        ? "success.main"
                        : "error.main",
                    fontWeight: "bold",
                  }}
                >
                  <strong>Saldo actual:</strong> ${caja.saldoActual?.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <MovimientoForm
            onAgregarMovimiento={handleAgregarMovimiento}
            loading={loading}
          />

          <ListaMovimientos movimientos={movimientos} />

          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}
          >
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setMostrarReporte(true)}
              disabled={loading}
            >
              Ver Reporte
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCerrarCaja}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Cerrar Caja"}
            </Button>
          </Box>
        </>
      )}

      {mostrarReporte && caja && (
        <CajaReporte
          movimientos={movimientos}
          saldoInicial={caja.saldoInicial}
          saldoFinal={caja.saldoActual}
          fechaApertura={caja.fechaApertura}
          fechaCierre={new Date()}
          onClose={() => setMostrarReporte(false)}
        />
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert severity="error" onClose={handleCloseAlert}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert severity="success" onClose={handleCloseAlert}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CajaPanel;
