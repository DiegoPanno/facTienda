import React from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

  // Aceptar sólo 11 (CUIT), 8 (DNI) o 1 dígito (0 consumidor final)
  if (!['11', '8', '1'].includes(doc.length.toString())) {
    toast.error("❌ El CUIT o DNI debe tener 11 dígitos (CUIT), 8 dígitos (DNI) o 0 (Consumidor Final).", {
      position: "top-center",
      autoClose: 3000,
      theme: "colored",
    });
    return;
  }

  const clienteParaGuardar = {
    ...values,
    cuit: doc,
    documento: doc,
  };

  console.log("Cliente para guardar:", clienteParaGuardar);

  toast.success("✅ Cliente guardado correctamente", {
    position: "top-center",
    autoClose: 2500,
    theme: "colored",
  });

  onClienteCreado(clienteParaGuardar);
};


  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {clienteEdit ? "Editar Cliente" : "Nuevo Cliente"}
      </Typography>

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

        <TextField
          label="CUIT o DNI (solo números)"
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

        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button variant="outlined" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Guardar
          </Button>
        </Box>
      </form>

      <ToastContainer />
    </Paper>
  );
};

export default ClientesForm;
