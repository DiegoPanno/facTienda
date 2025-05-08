import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow,
  Chip,
  useTheme
} from '@mui/material';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CajaReporte = ({ 
  movimientos, 
  saldoInicial, 
  saldoFinal, 
  fechaApertura, 
  fechaCierre,
  onClose 
}) => {
  const theme = useTheme();

  // Función para manejar TODOS los formatos de fecha posibles
  const formatDateForDisplay = (date) => {
    if (!date) return "Fecha no disponible";

    try {
      // 1. Si es Timestamp de Firebase (con método toDate)
      if (typeof date?.toDate === "function") {
        return format(date.toDate(), 'PPPPp', { locale: es });
      }
      
      // 2. Si ya es un objeto Date
      if (date instanceof Date) {
        return format(date, 'PPPPp', { locale: es });
      }
      
      // 3. Si es un string/número (timestamp o ISO)
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, 'PPPPp', { locale: es });
      }
      
      return "Formato inválido";
    } catch (error) {
      console.error("Error al formatear fecha:", error);
      return "Error en fecha";
    }
  };

  const calcularTotales = () => {
    const ingresos = movimientos
      .filter(mov => mov.tipo === 'ingreso')
      .reduce((sum, mov) => sum + mov.monto, 0);
    
    const egresos = movimientos
      .filter(mov => mov.tipo === 'egreso')
      .reduce((sum, mov) => sum + mov.monto, 0);
    
    return { ingresos, egresos };
  };

  const { ingresos, egresos } = calcularTotales();

  const generarPDF = async () => {
    try {
      const element = document.getElementById("reporte-caja");
      if (!element) return;

      const canvas = await html2canvas(element, { 
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: theme.palette.background.default
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm"
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const fileName = `Reporte_Caja_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Error al generar el reporte");
    }
  };

  return (
    <Box id="reporte-caja" sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, backgroundColor: theme.palette.background.paper }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
          Reporte de Caja
        </Typography>
        
        {/* Sección de Fechas y Saldos */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="body1">
              <strong>Fecha apertura:</strong> {formatDateForDisplay(fechaApertura)}
            </Typography>
            <Typography variant="body1">
              <strong>Fecha cierre:</strong> {formatDateForDisplay(fechaCierre)}
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body1">
              <strong>Saldo inicial:</strong> ${saldoInicial?.toFixed(2)}
            </Typography>
            <Typography variant="body1">
              <strong>Saldo final:</strong> ${saldoFinal?.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Resumen */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Resumen</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Paper sx={{ p: 2, flex: 1, backgroundColor: theme.palette.success.light }}>
              <Typography variant="subtitle2">Total Ingresos</Typography>
              <Typography variant="h6">${ingresos.toFixed(2)}</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, backgroundColor: theme.palette.error.light }}>
              <Typography variant="subtitle2">Total Egresos</Typography>
              <Typography variant="h6">${egresos.toFixed(2)}</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="subtitle2">Diferencia</Typography>
              <Typography variant="h6">${(ingresos - egresos).toFixed(2)}</Typography>
            </Paper>
          </Box>
        </Box>

        {/* Tabla de Movimientos */}
        <Typography variant="h6" gutterBottom>Detalle de Movimientos</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha/Hora</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Forma Pago</TableCell>
              <TableCell>Tipo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movimientos.map((mov, index) => (
              <TableRow key={index}>
                <TableCell>
                  {formatDateForDisplay(mov.fecha)}
                </TableCell>
                <TableCell>{mov.descripcion || '-'}</TableCell>
                <TableCell 
                  align="right"
                  sx={{ 
                    color: mov.tipo === 'ingreso' 
                      ? theme.palette.success.main 
                      : theme.palette.error.main,
                    fontWeight: 'bold'
                  }}
                >
                  {mov.tipo === 'ingreso' ? '+' : '-'}${mov.monto?.toFixed(2)}
                </TableCell>
                <TableCell>{mov.formaPago || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={mov.tipo} 
                    size="small"
                    color={mov.tipo === 'ingreso' ? 'success' : 'error'}
                    sx={{ color: 'white' }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Botones */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={onClose}
            sx={{ color: theme.palette.text.primary }}
          >
            Cerrar
          </Button>
          <Button 
            variant="contained" 
            onClick={generarPDF}
            color="primary"
          >
            Descargar PDF
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default CajaReporte;