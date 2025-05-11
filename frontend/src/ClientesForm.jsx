import React from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  Alert,
} from "@mui/material";

const ClientesForm = ({
  clienteEdit,
  onClienteCreado,
  onCancel,
  tipoDocumento,
}) => {
  const [values, setValues] = React.useState({
    nombre: "",
    apellido: "",
    cuit: "",
    documento: "",
    direccion: "",
    telefono: "",
    email: "",
  });
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (clienteEdit) {
      setValues({
        nombre: clienteEdit.nombre || "",
        apellido: clienteEdit.apellido || "",
        cuit: tipoDocumento === "Factura C" ? clienteEdit.cuit || "" : "",
        documento:
          tipoDocumento !== "Factura C" ? clienteEdit.documento || "" : "",
        direccion: clienteEdit.direccion || "",
        telefono: clienteEdit.telefono || "",
        email: clienteEdit.email || "",
      });
    }
  }, [clienteEdit, tipoDocumento]);

  const handleSubmit = (e) => {
    e.preventDefault();

    let doc = values.cuit.replace(/\D/g, "");

    if (tipoDocumento === "Factura C") {
      if (doc.length === 0) {
        doc = "30111222";
        values.nombre = values.nombre || "Consumidor Final";
      } else if (doc.length !== 11) {
        alert("El CUIT debe contener exactamente 11 dígitos.");
        return;
      }
    } else {
      if (![8, 1].includes(doc.length)) {
        alert(
          "El DNI debe contener exactamente 8 dígitos o 0 para consumidor final."
        );
        return;
      }
    }

    const clienteParaGuardar = {
      ...values,
      cuit: doc,
    };

    onClienteCreado(clienteParaGuardar);
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {clienteEdit ? "Editar Cliente" : "Nuevo Cliente"}
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          label="Nombre"
          value={values.nombre}
          onChange={(e) => setValues({ ...values, nombre: e.target.value })}
          fullWidth
          margin="normal"
          required
        />

        <TextField
          label="Apellido"
          value={values.apellido}
          onChange={(e) => setValues({ ...values, apellido: e.target.value })}
          fullWidth
          margin="normal"
        />

        {tipoDocumento === "Factura C" ? (
          <TextField
            label="CUIT (Requerido)"
            value={values.cuit}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              let formatted = value;
              if (value.length > 2) {
                formatted = `${value.substr(0, 2)}-${value.substr(2)}`;
              }
              if (value.length > 10) {
                formatted = `${formatted.substr(0, 11)}-${formatted.substr(
                  11
                )}`;
              }
              setValues({ ...values, cuit: formatted });
            }}
            fullWidth
            margin="normal"
            required
            helperText="Formato: XX-XXXXXXXX-X"
          />
        ) : (
          <TextField
            label="CUIT o DNI (sin guiones)"
            value={values.cuit}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setValues({ ...values, cuit: value.slice(0, 11) });
            }}
            fullWidth
            margin="normal"
            required
            helperText="Ingrese 11 dígitos para CUIT, 8 para DNI o 0 para consumidor final"
          />
        )}

        <TextField
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Teléfono"
          value={values.telefono}
          onChange={(e) => setValues({ ...values, telefono: e.target.value })}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Dirección"
          value={values.direccion}
          onChange={(e) => setValues({ ...values, direccion: e.target.value })}
          fullWidth
          margin="normal"
        />

        <Box
          sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}
        >
          <Button variant="outlined" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Guardar
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default ClientesForm;


