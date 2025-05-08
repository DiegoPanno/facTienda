import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ClientesForm from "../ClientesForm";
import {
  ListItem,
  ListItemText,
  Button,
  TextField,
  Box,
  Typography,
  Paper,
  List,
  Alert,
} from "@mui/material";

const ClientesPanel = ({ onSelect, tipoDocumento }) => {
  // Añade tipoDocumento como prop
  const [clientes, setClientes] = useState([]);
  const [nombreBusqueda, setNombreBusqueda] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEdit, setClienteEdit] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const snapshot = await getDocs(collection(db, "clientes"));
        const listaClientes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          cuit: doc.data().cuit?.toString().replace(/[^\d]/g, "") || "",
        }));
        setClientes(listaClientes);
      } catch (err) {
        console.error("Error al cargar clientes:", err);
        setError("Error al cargar la lista de clientes");
      }
    };

    cargarClientes();
  }, []);

  const buscarCliente = () => {
    return clientes.filter((cliente) => {
      const nombreCompleto = `${cliente.nombre || ""} ${
        cliente.apellido || ""
      }`.toLowerCase();
      const cuit = (cliente.cuit || "").toString();

      // Si es Factura C, solo mostrar clientes con CUIT válido
      if (tipoDocumento === "Factura C") {
        const cuitValido = validarCUIT(cuit);
        const coincideNombre = nombreBusqueda
          ? nombreCompleto.includes(nombreBusqueda.toLowerCase()) ||
            cuit.includes(nombreBusqueda)
          : true;

        return cuitValido && coincideNombre;
      }

      // Para otros tipos de documento, mostrar todos los clientes que coincidan
      return nombreBusqueda
        ? nombreCompleto.includes(nombreBusqueda.toLowerCase()) ||
            cuit.includes(nombreBusqueda)
        : true;
    });
  };

  // Reemplazar la función validarDocumento por esta versión mejorada
  const validarCUIT = (cuit) => {
    const doc = (cuit || "").toString().replace(/\D/g, "");
    return (
      doc.length === 11 &&
      ["20", "23", "24", "27", "30", "33", "34"].includes(doc.substr(0, 2))
    );
  };



  const handleSelectCliente = (cliente) => {
    const doc = (cliente.cuit || "").toString().replace(/\D/g, "");
    const largo = doc.length;
  
    const esValido = largo === 8 || largo === 11 || doc === "0";
  
    if (!esValido) {
      setError("Documento inválido: debe tener 11 dígitos para CUIT, 8 para DNI o 0 para consumidor final");
      return;
    }
  
    onSelect({ ...cliente, cuit: doc });
    setError(null);
  };
  
  const handleNuevoCliente = () => {
    setClienteEdit(null);
    setMostrarFormulario(true);
    setError(null);
  };

  const resultadosFiltrados = buscarCliente();

  return (
    <Box sx={{ maxWidth: "600px", margin: "0 auto", p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Clientes
        {tipoDocumento === "Factura C" && (
          <Typography variant="caption" display="block" color="text.secondary">
            * Para Factura C seleccione cliente con CUIT válido
          </Typography>
        )}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!mostrarFormulario ? (
        <>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNuevoCliente}
            sx={{ mb: 2 }}
          >
            Agregar Cliente
          </Button>

          <TextField
            label="CUIT o DNI (sin guiones)"
            value={nombreBusqueda} // Cambiar de values.documento a nombreBusqueda
            onChange={(e) => setNombreBusqueda(e.target.value)}
            fullWidth
            margin="normal"
            helperText="Ingrese 11 dígitos para CUIT o 8 para DNI, 0 para consumidor final"
          />

          {nombreBusqueda && (
            <Paper elevation={3} sx={{ mb: 2 }}>
              {resultadosFiltrados.length === 0 ? (
                <Box
                  sx={{ p: 2, textAlign: "center", color: "text.secondary" }}
                >
                  No se encontraron resultados.
                </Box>
              ) : (
                <List>
                  {resultadosFiltrados.map((cliente) => (
                    <ListItem
                      key={cliente.id}
                      disablePadding
                      onClick={() => handleSelectCliente(cliente)}
                      sx={{
                        borderBottom: "1px solid #eee",
                        cursor: "pointer",
                        "&:hover": { backgroundColor: "action.hover" },
                        p: 2,
                        // Resaltar clientes válidos para Factura C
                        ...(tipoDocumento === "Factura C" &&
                          validarDocumento(cliente.cuit) && {
                            borderLeft: "4px solid",
                            borderColor: "success.main",
                          }),
                      }}
                    >
                      <ListItemText
                        primary={`${cliente.nombre} ${cliente.apellido}`}
                        secondary={
                          <>
                            <span>
                              CUIT: {cliente.cuit || "No especificado"}
                            </span>
                            {tipoDocumento === "Factura C" &&
                              !validarDocumento(cliente.cuit) && (
                                <span
                                  style={{ color: "red", marginLeft: "8px" }}
                                >
                                  (No válido para Factura C)
                                </span>
                              )}
                          </>
                        }
                      />
                      <Box sx={{ color: "primary.main", fontWeight: "bold" }}>
                        →
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </>
      ) : (
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
          <ClientesForm
            clienteEdit={clienteEdit}
            tipoDocumento={tipoDocumento} // Pasar el tipoDocumento al formulario
            onClienteCreado={(nuevoCliente) => {
              if (clienteEdit) {
                setClientes((prev) =>
                  prev.map((c) => (c.id === nuevoCliente.id ? nuevoCliente : c))
                );
              } else {
                setClientes((prev) => [...prev, nuevoCliente]);
              }
              setClienteEdit(null);
              setMostrarFormulario(false);
            }}
            onCancel={() => {
              setClienteEdit(null);
              setMostrarFormulario(false);
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default ClientesPanel;
