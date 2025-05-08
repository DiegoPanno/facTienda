import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Chip,
  Divider,
  useTheme,
} from "@mui/material";
import { formatFirebaseDate } from "../caja/utils/dateUtils"; // Asegúrate que la ruta sea correcta

const ListaMovimientos = ({ movimientos }) => {
  const theme = useTheme();

  const getColorForTipo = (tipo) => {
    return tipo === "ingreso"
      ? theme.palette.success.main
      : theme.palette.error.main;
  };

  if (movimientos.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 2, mt: 3, textAlign: "center" }}>
        <Typography variant="body1" color="textSecondary">
          No hay movimientos registrados
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
        Historial de Movimientos
      </Typography>
      <List dense>
        {movimientos.map((mov, index) => (
          <React.Fragment key={mov.id || index}>
            <ListItem sx={{ py: 1 }}>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body1" component="span">
                      {mov.descripcion || "Movimiento sin descripción"}
                    </Typography>
                    <Chip
                      label={`$${mov.monto.toFixed(2)}`}
                      size="small"
                      sx={{
                        backgroundColor: getColorForTipo(mov.tipo),
                        color: "white",
                        fontWeight: "bold",
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Typography component="span" variant="caption" color="textSecondary">
                    <Box component="span" display="flex" gap={1} alignItems="center" mt={1}>
                      <Chip label={mov.formaPago} size="small" variant="outlined" />
                      <span>
                        {formatFirebaseDate(mov.fecha)} {/* Usando la función importada */}
                      </span>
                    </Box>
                  </Typography>
                }
              />
            </ListItem>
            {index < movimientos.length - 1 && (
              <Divider variant="inset" component="li" />
            )}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default ListaMovimientos;
