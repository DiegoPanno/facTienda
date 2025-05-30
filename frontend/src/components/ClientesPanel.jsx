import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc
} from "firebase/firestore";
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
import styles from "./ClientesPanel.module.css";

const ClientesPanel = ({ onSelect, tipoDocumento, variant = "clientes" }) => {
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

      if (tipoDocumento === "Factura C") {
        const cuitValido = cuit === "0" || validarCUIT(cuit);
        const coincideNombre = nombreBusqueda
          ? nombreCompleto.includes(nombreBusqueda.toLowerCase()) ||
            cuit.includes(nombreBusqueda)
          : true;

        return cuitValido && coincideNombre;
      }

      return nombreBusqueda
        ? nombreCompleto.includes(nombreBusqueda.toLowerCase()) ||
            cuit.includes(nombreBusqueda)
        : true;
    });
  };

  const validarCUIT = (cuit) => {
    const doc = (cuit || "").toString().replace(/\D/g, "");
    return (
      doc === "0" ||
      (doc.length === 11 &&
        ["20", "23", "24", "27", "30", "33", "34"].includes(doc.substr(0, 2)))
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

    if (onSelect) {
      onSelect({ ...cliente, cuit: doc });
    }
    setError(null);
  };

  const handleNuevoCliente = () => {
    setClienteEdit(null);
    setMostrarFormulario(true);
    setError(null);
  };

  const resultadosFiltrados = buscarCliente();

  return (
  
    <Box className={variant === "facturador" ? styles.containerFacturador : styles.containerClientes}>
        <h2 className={variant === "clientes" ? styles.titleSmall : styles.titleLarge}>Clientes</h2>
        {tipoDocumento === "Factura C" && (
          <Typography variant="caption" display="block" color="text.secondary">
            * Para Factura C seleccione cliente con CUIT válido
          </Typography>
        )}
      

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
            value={nombreBusqueda}
            onChange={(e) => setNombreBusqueda(e.target.value)}
            fullWidth
            margin="normal"
            helperText="Ingrese 11 dígitos para CUIT o 8 para DNI, 0 para consumidor final"
          />

          {nombreBusqueda && (
            <Paper elevation={3} sx={{ mb: 2 }}>
              {resultadosFiltrados.length === 0 ? (
                <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
                  No se encontraron resultados.
                </Box>
              ) : (
                <List>
                  {resultadosFiltrados.map((cliente) => (
                    <ListItem
                      key={cliente.id || cliente.cuit || Math.random()}
                      disablePadding
                      onClick={() => handleSelectCliente(cliente)}
                      sx={{
                        borderBottom: "1px solid #eee",
                        cursor: "pointer",
                        "&:hover": { backgroundColor: "action.hover" },
                        p: 2,
                        ...(tipoDocumento === "Factura C" &&
                          validarCUIT(cliente.cuit) && {
                            borderLeft: "4px solid",
                            borderColor: "success.main",
                          }),
                      }}
                    >
                      <ListItemText
                        primary={`${cliente.nombre} ${cliente.apellido}`}
                        secondary={
                          <>
                            <span>CUIT: {cliente.cuit || "No especificado"}</span>
                            {tipoDocumento === "Factura C" &&
                              !validarCUIT(cliente.cuit) && (
                                <span style={{ color: "red", marginLeft: "8px" }}>
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
            tipoDocumento={tipoDocumento}
            onClienteCreado={async (nuevoCliente) => {
              try {
                const docRef = await addDoc(collection(db, "clientes"), nuevoCliente);
                setClientes((prev) => [...prev, { ...nuevoCliente, id: docRef.id }]);
                setClienteEdit(null);
                setMostrarFormulario(false);
              } catch (error) {
                console.error("Error al guardar cliente:", error);
                setError("No se pudo guardar el cliente.");
              }
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
