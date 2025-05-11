import { useState, useEffect } from "react";
import { obtenerProductos } from "../services/productService";
import {
  obtenerCajaAbierta,
  registrarMovimiento,
} from "../services/cajaService";
import {
  TextField,
  Button,
  MenuItem,
  Typography,
  Paper,
  Grid,
} from "@mui/material";
import ClientesPanel from "./ClientesPanel";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
import generarRemitoPDF from "../utils/generarRemitoPDF";

const RemitoRegistro = () => {
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [formaPago, setFormaPago] = useState("");
  const [total, setTotal] = useState(0);
  const [nroRemito, setNroRemito] = useState("");
  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(false);

  const comprobanteRef = useRef();

  const generarPDFRemito = async () => {
    if (!comprobanteRef.current) return;

    const canvas = await html2canvas(comprobanteRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Remito_${nroRemito || "sin_numero"}.pdf`);
  };

  useEffect(() => {
    const cargar = async () => {
      const lista = await obtenerProductos();
      setProductos(lista);
      const cajaAbierta = await obtenerCajaAbierta();
      setCaja(cajaAbierta);
    };
    cargar();
  }, []);

  useEffect(() => {
    const totalCalculado = items.reduce(
      (acc, item) => acc + (item.precioConIVA || 0) * (item.cantidad || 0),
      0
    );
    setTotal(totalCalculado);
  }, [items]);

  const agregarItem = () => {
    setItems([...items, { id: "", cantidad: 1, precioConIVA: 0 }]);
  };

  const actualizarItem = (index, campo, valor) => {
    const nuevos = [...items];
    nuevos[index][campo] =
      campo === "cantidad" || campo === "precioConIVA" ? Number(valor) : valor;
    setItems(nuevos);
  };

  const registrarRemito = async () => {
    if (!caja?.id) return alert("No hay caja abierta");
    if (!nroRemito) return alert("Debe ingresar un número de remito");
    if (items.length === 0 || total <= 0)
      return alert("Debe cargar al menos un producto");

    const descripcion =
      `Remito nro #${nroRemito}` +
      (cliente?.nombre ? ` - Cliente: ${cliente.nombre}` : "");

    try {
      setLoading(true);
      await registrarMovimiento(caja.id, {
        tipo: "ingreso",
        monto: total,
        descripcion,
        formaPago: formaPago || "efectivo",
        fecha: new Date().toISOString(),
        usuario: { nombre: "Admin", uid: "local" },
      });
      alert("✅ Remito registrado correctamente");
      setItems([]);
      setNroRemito("");
    } catch (err) {
      console.error(err);
      alert("❌ Error al registrar remito");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarRemito = async () => {
    const totalConIVA = productos.reduce(
      (acc, p) => acc + p.precio * p.cantidad,
      0
    );

    await registrarMovimiento(idCaja, {
      tipo: "ingreso",
      monto: totalConIVA,
      descripcion: `Remito nro #${nroRemito} - Cliente: ${
        cliente?.nombre || "Sin nombre"
      }`,
      formaPago,
      fecha: new Date().toISOString(),
      usuario: { nombre: "Admin", uid: "local" },
    });

    generarRemitoPDF({
      nroRemito,
      fecha: new Date(),
      productos,
      cliente,
      observaciones,
    });

    alert(`✅ Remito #${nroRemito} registrado correctamente`);

    // opcional: limpiar campos
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Registro de Remito
      </Typography>

      <TextField
        label="N° Remito"
        fullWidth
        sx={{ mb: 2 }}
        value={nroRemito}
        onChange={(e) => setNroRemito(e.target.value)}
      />

      {items.map((item, index) => (
        <Grid container spacing={2} key={index} sx={{ mb: 1 }}>
          <Grid item xs={4}>
            <TextField
              select
              label="Producto"
              value={item.id}
              onChange={(e) => actualizarItem(index, "id", e.target.value)}
              fullWidth
            >
              {productos.map((prod) => (
                <MenuItem key={prod.id} value={prod.id}>
                  {prod.titulo}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={3}>
            <TextField
              type="number"
              label="Cantidad"
              value={item.cantidad}
              onChange={(e) =>
                actualizarItem(index, "cantidad", e.target.value)
              }
              fullWidth
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              type="number"
              label="Precio con IVA"
              value={item.precioConIVA}
              onChange={(e) =>
                actualizarItem(index, "precioConIVA", e.target.value)
              }
              fullWidth
            />
          </Grid>
        </Grid>
      ))}

      <Button variant="outlined" onClick={agregarItem} sx={{ mb: 2 }}>
        + Agregar producto
      </Button>

      <ClientesPanel onSelect={setCliente} />

      <TextField
        select
        fullWidth
        label="Forma de pago"
        value={formaPago}
        onChange={(e) => setFormaPago(e.target.value)}
        sx={{ my: 2 }}
      >
        <MenuItem value="Efectivo">Efectivo</MenuItem>
        <MenuItem value="Tarjeta">Tarjeta</MenuItem>
        <MenuItem value="Transferencia">Transferencia</MenuItem>
        <MenuItem value="Mercado Pago">Mercado Pago</MenuItem>
      </TextField>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Total a cobrar: ${total.toFixed(2)}
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={handleRegistrarRemito} // Aquí se asocia a handleRegistrarRemito
        disabled={loading}
      >
        Registrar Remito
      </Button>
      <Button
        variant="outlined"
        color="secondary"
        onClick={generarPDFRemito}
        sx={{ mt: 2, ml: 2 }}
      >
        Descargar PDF Remito
      </Button>
      <div
        ref={comprobanteRef}
        style={{ padding: 20, backgroundColor: "#fff", marginTop: 30 }}
      >
        <h2>Remito Interno</h2>
        <p>
          <strong>N°:</strong> {nroRemito}
        </p>
        <p>
          <strong>Fecha:</strong> {new Date().toLocaleDateString("es-AR")}
        </p>
        {cliente && (
          <div>
            <p>
              <strong>Cliente:</strong> {cliente.nombre}
            </p>
            {cliente.cuit && (
              <p>
                <strong>CUIT:</strong> {cliente.cuit}
              </p>
            )}
            {cliente.documento && (
              <p>
                <strong>DNI:</strong> {cliente.documento}
              </p>
            )}
          </div>
        )}
        <table
          style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc" }}>
              <th align="left">Producto</th>
              <th align="center">Cantidad</th>
              <th align="right">Precio c/IVA</th>
              <th align="right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const prod = productos.find((p) => p.id === item.id);
              const nombre = prod?.titulo || "Producto";
              const subtotal = item.precioConIVA * item.cantidad;
              return (
                <tr key={idx}>
                  <td>{nombre}</td>
                  <td align="center">{item.cantidad}</td>
                  <td align="right">${item.precioConIVA.toFixed(2)}</td>
                  <td align="right">${subtotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h3 style={{ textAlign: "right", marginTop: 20 }}>
          Total: ${total.toFixed(2)}
        </h3>
        <p>
          <strong>Forma de pago:</strong> {formaPago || "Efectivo"}
        </p>
        <p style={{ fontStyle: "italic", marginTop: 20 }}>
          Este remito es un comprobante interno sin validez fiscal.
        </p>
      </div>
    </Paper>
  );
};

export default RemitoRegistro;
