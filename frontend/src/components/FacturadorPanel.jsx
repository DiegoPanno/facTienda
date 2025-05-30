import { useState, useEffect, useRef } from "react";
import { obtenerProductos } from "../services/productService";
import Carrito from "./Carrito";
import ClientesPanel from "./ClientesPanel";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  registrarMovimiento,
  obtenerCajaAbierta,
} from "../services/cajaService";
import { generarFacturaPDF } from "../services/pdfGenerator";
import api from "../api";
import TicketRemito from "./TicketRemito";
import TicketFacturaC from "./TicketFacturaC";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebase";
import { renderToStaticMarkup } from "react-dom/server";
import "./FacturadorPanel.css";
import BuscadorProductos from "./BuscadorProductos";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { actualizarProducto } from "../services/productService";

const FacturadorPanel = () => {
  // Estados del componente
  const [productos, setProductos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [medioPago, setMedioPago] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [cobroRealizado, setCobroRealizado] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caeInfo, setCaeInfo] = useState(null);
  const [idCaja, setIdCaja] = useState(null);
  const [ptoVtaAsociado, setPtoVtaAsociado] = useState("");
  const [nroAsociado, setNroAsociado] = useState("");
  const [numeroRemitoReal, setNumeroRemitoReal] = useState("");

  const getSubtotal = () => total / 1.21;
  const getIVA = () => total - getSubtotal();

  const comprobanteRef = useRef(null);

  // Verificar caja abierta al cargar el componente
  useEffect(() => {
    const verificarCaja = async () => {
      try {
        const caja = await obtenerCajaAbierta();
        setCajaAbierta(caja);
        // Si necesitas el idCaja para algo, lo puedes establecer aquí
        if (caja?.id) {
          setIdCaja(caja.id); // Asumiendo que el id de la caja está en caja.id
        }
      } catch (err) {
        setError("Error al verificar estado de caja");
        console.error(err);
      }
    };
    verificarCaja();
  }, []);

  useEffect(() => {
    const nuevoTotal = carrito.reduce(
      (acc, producto) => acc + producto.precioVenta * producto.cantidad * 1.21,
      0
    );
    setTotal(nuevoTotal);
  }, [carrito]);

  // Cargar productos al montar el componente
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const lista = await obtenerProductos();
        const productosFormateados = lista.map((prod) => ({
          ...prod,
          precioVenta: Number(prod.precioVenta) || 0,
        }));
        setProductos(productosFormateados);
      } catch (error) {
        console.error("Error al cargar productos:", error);
        setError("Error al cargar productos");
      }
    };
    cargarProductos();
  }, []);

  // Filtrar productos basado en el término de búsqueda
  const productosFiltrados = searchTerm
    ? productos.filter(
        (prod) =>
          prod.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prod.id.includes(searchTerm)
      )
    : [];

  // Calcular el total cuando cambia el carrito
  useEffect(() => {
    const nuevoTotal = carrito.reduce(
      (acc, producto) => acc + producto.precioVenta * producto.cantidad,
      0
    );
    setTotal(nuevoTotal);
  }, [carrito]);

  const obtenerProximoNumeroRemito = async () => {
    const ref = doc(db, "config", "contadores");
    const snap = await getDoc(ref);
    let nro = 1;
    if (snap.exists() && snap.data()?.ultimoRemito) {
      nro = snap.data().ultimoRemito + 1;
    }
    await setDoc(ref, { ultimoRemito: nro }, { merge: true });
    return nro;
  };

  // Manejar agregar producto al carrito
  const handleAgregarCarrito = (producto) => {
    setCarrito((prevCarrito) => {
      const existe = prevCarrito.find((p) => p.id === producto.id);
      const precio = Math.round(Number(producto.precioVenta)) || 0;

      if (existe) {
        return prevCarrito.map((p) =>
          p.id === producto.id
            ? { ...p, cantidad: p.cantidad + 1, precioVenta: precio }
            : p
        );
      }
      return [
        ...prevCarrito,
        { ...producto, cantidad: 1, precioVenta: precio },
      ];
    });
    setSearchTerm("");
    toast.info(`🛒 "${producto.titulo}" agregado al carrito`, {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "light",
    });
  };

  // Manejar cambio de cantidad en el carrito
  const handleActualizarCantidad = (id, cantidad) => {
    if (cantidad < 1) {
      setCarrito(carrito.filter((item) => item.id !== id));
      return;
    }
    setCarrito(
      carrito.map((item) => (item.id === id ? { ...item, cantidad } : item))
    );

    const producto = carrito.find((item) => item.id === id);
    toast.success(
      `🔁 "${producto?.titulo}" actualizado a ${cantidad} unidad(es)`,
      {
        autoClose: 2000,
        position: "top-center",
        theme: "colored",
      }
    );
  };

  // Generar PDF del comprobante
 const generarPDF = async (numeroRemito) => { 
  if (!comprobanteRef.current || carrito.length === 0) return;

  try {
    const canvas = await html2canvas(comprobanteRef.current, {
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm" });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    // ✅ Ahora usamos el numeroRemito para nombrar el archivo
    const nombreArchivo = `${tipoDocumento || "Comprobante"}_${numeroRemito || new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(nombreArchivo);

    toast.success(`📄 ${tipoDocumento || "Comprobante"} generado exitosamente`, {
      position: "top-right",
      autoClose: 3000,
      theme: "colored",
    });

    return pdf.output("blob"); // Retornamos el blob para usar en handleCobrar
  } catch (error) {
    console.error("Error al generar PDF:", error);
    toast.error("❌ Error al generar el documento", {
      position: "top-right",
      autoClose: 4000,
      theme: "colored",
    });
    throw error;
  }
};

  const handleCobrar = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (carrito.length === 0) {
      toast.error("❌ No hay productos en el carrito", {
        autoClose: 3000,
        position: "top-right",
        theme: "colored",
      });
      setIsSubmitting(false);
      return;
    }

    if (!cajaAbierta?.id) {
      toast.error("⚠️ No hay una caja abierta. Abrí la caja primero.", {
        autoClose: 3000,
        position: "top-right",
        theme: "colored",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      

      if (tipoDocumento === "Remito") {
        const nroRemito = await obtenerProximoNumeroRemito();
        setNumeroRemitoReal(`0001-${nroRemito.toString().padStart(8, "0")}`);

        const descripcion =
          `Remito nro #${nroRemito}` +
          (clienteSeleccionado?.nombre
            ? ` - Cliente: ${clienteSeleccionado.nombre}`
            : "");

        await registrarMovimiento(cajaAbierta.id, {
          tipo: "ingreso",
          monto: total,
          descripcion,
          formaPago: medioPago || "efectivo",
          fecha: new Date().toISOString(),
          usuario: { nombre: "Admin", uid: "local" },
        });

        // ✅ Descontar stock
        for (const item of carrito) {
          const nuevoStock = (item.stock || 0) - item.cantidad;
          await actualizarProducto(item.id, { stock: nuevoStock });
        }

        setSuccess(`✅ Remito #${nroRemito} registrado correctamente`);
        setCobroRealizado(true);
        await generarPDF(nroRemito); 
        const htmlRemito = renderToStaticMarkup(
          <TicketRemito
            datos={{
              cliente: clienteSeleccionado || {
                nombre: "Consumidor Final",
                nroDoc: "0",
              },
              productos: carrito,
              fecha: new Date().toLocaleDateString("es-AR"),
              nroRemito: `0001-${nroRemito.toString().padStart(8, "0")}`,
            }}
          />
        );

        const ticketRemitoWindow = window.open("", "_blank");
        ticketRemitoWindow.document.write(`
  <html>
    <head><title>Remito</title></head>
    <body>${htmlRemito}</body>
    <script>
      window.onload = function() {
        window.print();
        setTimeout(() => window.close(), 500);
      };
    </script>
  </html>
`);
        ticketRemitoWindow.document.close();

        // ... imprimir ticket ...

        setCarrito([]);
        setTotal(0);
        return;
      }

      const movimiento = {
        tipo: "ingreso",
        monto: total,
        descripcion: `Venta ${tipoDocumento || "Recibo"} ${
          clienteSeleccionado?.nombre || "Consumidor Final"
        }`,
        formaPago: medioPago || "efectivo",
        productos: carrito.map((item) => ({
          id: item.id,
          nombre: item.titulo,
          cantidad: item.cantidad,
          precio: item.precioVenta,
          subtotal: item.precioVenta * item.cantidad,
        })),
        iva: getIVA(),
        totalConIva: total,
        usuario: { nombre: "Administrador", uid: "admin-001" },
      };

      await registrarMovimiento(cajaAbierta.id, movimiento);

      // ✅ Descontar stock
      for (const item of carrito) {
        const nuevoStock = (item.stock || 0) - item.cantidad;
        await actualizarProducto(item.id, { stock: nuevoStock });
      }

      setCarrito([]);
      setTotal(0);
      setCobroRealizado(true);
      setSuccess("✅ Venta registrada correctamente en caja");
    } catch (error) {
      console.error("Error al registrar cobro:", error);
      setError(`❌ Error al registrar cobro: ${error.message}`);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Componente de vista previa del comprobante
  const VistaPreviaRecibo = ({
    total,
    subtotal,
    iva,
    carrito,
    tipoDocumento,
    medioPago,
    clienteSeleccionado,
  }) => (
    <div
      ref={comprobanteRef}
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#fff",
        maxWidth: "210mm",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Encabezado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
          borderBottom: "2px solid #333",
          paddingBottom: "10px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Tienda libre de gluten</h2>
          <p style={{ margin: "5px 0" }}>CUIT: 20-26703609-9</p>
          <p style={{ margin: "5px 0" }}>Dirección: 9 de julio 2957</p>
          <p style={{ margin: "5px 0" }}>Teléfono: (223) 6364740</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0 }}>{tipoDocumento || "COMPROBANTE"}</h2>
          <p style={{ margin: "5px 0" }}>
            N°:{" "}
            {tipoDocumento === "Remito" && numeroRemitoReal
              ? numeroRemitoReal
              : Math.floor(Math.random() * 10000)
                  .toString()
                  .padStart(8, "0")}
          </p>

          <p style={{ margin: "5px 0" }}>
            Fecha: {new Date().toLocaleDateString("es-AR")}
          </p>
          <p style={{ margin: "5px 0" }}>
            Hora: {new Date().toLocaleTimeString("es-AR")}
          </p>
        </div>
      </div>

      {/* Datos del Cliente */}
      <div
        style={{
          marginBottom: "20px",
          padding: "10px",
          backgroundColor: "#f9f9f9",
          borderRadius: "4px",
        }}
      >
        <h3 style={{ marginBottom: "10px", borderBottom: "1px solid #ddd" }}>
          Datos del Cliente
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          <div>
            <p style={{ margin: "5px 0" }}>
              <strong>Nombre:</strong>{" "}
              {clienteSeleccionado
                ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`
                : "CONSUMIDOR FINAL"}
            </p>
            <p style={{ margin: "5px 0" }}>
              <strong>
                {tipoDocumento === "Factura C" ? "CUIT:" : "DNI:"}
              </strong>{" "}
              {tipoDocumento === "Factura C"
                ? clienteSeleccionado?.cuit || "No especificado"
                : clienteSeleccionado?.documento === "0"
                ? "Consumidor Final"
                : clienteSeleccionado?.documento || "Consumidor Final"}
            </p>
          </div>
          <div>
            <p style={{ margin: "5px 0" }}>
              <strong>Dirección:</strong>{" "}
              {clienteSeleccionado?.direccion || "-"}
            </p>
            <p style={{ margin: "5px 0" }}>
              <strong>Teléfono:</strong> {clienteSeleccionado?.telefono || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Detalle de Productos */}
      <h3 style={{ marginBottom: "10px" }}>Detalle de Productos/Servicios</h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th
              style={{
                padding: "8px",
                textAlign: "left",
                borderBottom: "1px solid #ddd",
              }}
            >
              Código
            </th>
            <th
              style={{
                padding: "8px",
                textAlign: "left",
                borderBottom: "1px solid #ddd",
              }}
            >
              Descripción
            </th>
            <th
              style={{
                padding: "8px",
                textAlign: "center",
                borderBottom: "1px solid #ddd",
              }}
            >
              Cantidad
            </th>
            <th
              style={{
                padding: "8px",
                textAlign: "right",
                borderBottom: "1px solid #ddd",
              }}
            >
              P. Unitario
            </th>
            <th
              style={{
                padding: "8px",
                textAlign: "right",
                borderBottom: "1px solid #ddd",
              }}
            >
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {carrito.map((producto) => {
            const precio = Number(producto.precioVenta) || 0;
            const subtotal = precio * producto.cantidad;
            return (
              <tr key={producto.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px" }}>{producto.id}</td>
                <td style={{ padding: "8px" }}>{producto.titulo}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  {producto.cantidad}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  ${precio.toFixed(2)}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  ${subtotal.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totales */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "20px",
        }}
      >
        <div style={{ width: "300px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
            }}
          >
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
            }}
          >
            <span>IVA 21%:</span>
            <span>${iva.toFixed(2)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "1.2em",
              fontWeight: "bold",
              borderTop: "1px solid #333",
              paddingTop: "10px",
              marginTop: "10px",
            }}
          >
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Medio de Pago y Observaciones */}
      <div
        style={{
          marginTop: "30px",
          paddingTop: "10px",
          borderTop: "1px dashed #999",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        <div>
          <p>
            <strong>Medio de Pago:</strong> {medioPago || "No especificado"}
          </p>
          <p>
            <strong>Forma de Pago:</strong> Contado
          </p>
        </div>
        <div>
          <p>
            <strong>Observaciones:</strong>
          </p>
          <p>Gracias por su compra</p>
        </div>
      </div>

      {/* Pie de Página */}
      <div
        style={{
          marginTop: "40px",
          paddingTop: "10px",
          borderTop: "1px solid #333",
          fontSize: "0.8em",
          textAlign: "center",
        }}
      >
        <p>Este documento no válido como factura</p>
        <p>Original - Cliente / Duplicado - Archivo</p>
      </div>
    </div>
  );

  // Función para preparar los datos del receptor (cliente)
  function prepararDatosReceptor(clienteSeleccionado, totalFactura) {
    // ⚠️ Verificamos si el cliente está definido
    if (!clienteSeleccionado) {
      return {
        nombre: "Consumidor Final",
        tipoDoc: 99,
        nroDoc: 0,
      };
    }

    const rawDoc =
      clienteSeleccionado.cuit || clienteSeleccionado.documento || "0";
    const doc = rawDoc.replace(/\D/g, "");
    const nombre = clienteSeleccionado.nombre || "Consumidor Final";

    let tipoDocAfip = 99;
    let nroDoc = 0;

    if (doc.length === 11) {
      tipoDocAfip = 80; // CUIT
      nroDoc = parseInt(doc);
    } else if (doc.length === 8) {
      tipoDocAfip = 96; // DNI
      nroDoc = parseInt(doc);
    }

    // Consumidor final con total < 99999.99
    if (
      nombre.toUpperCase() === "CONSUMIDOR FINAL" &&
      totalFactura < 99999.99
    ) {
      tipoDocAfip = 99;
      nroDoc = 0;
    }

    return {
      nombre,
      tipoDoc: tipoDocAfip,
      nroDoc,
    };
  }

  // Función para enviar la factura a AFIP
  async function handleEnviarAFIP() {
    try {
      if (tipoDocumento === "Factura C") {
        let cliente = clienteSeleccionado
          ? { ...clienteSeleccionado }
          : { nombre: "Consumidor Final", cuit: "0" };

        if (cliente.cuit !== "0" && !cliente.cuit) {
          toast.warning(
            "⚠️ Seleccione un cliente válido o utilice CUIT 0 para Consumidor Final"
          );
          return;
        }

        const receptor = prepararDatosReceptor(cliente, total);
        const items = carrito.map((prod, index) => ({
          codigo: prod.id || index + 1,
          descripcion: prod.titulo,
          cantidad: prod.cantidad,
          precioUnitario: prod.precioVenta,
          subtotal: prod.cantidad * prod.precioVenta,
        }));

        const totalCalculado = parseFloat(
          items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)
        );
        const subtotalCalculado = parseFloat(getSubtotal().toFixed(2));

        const response = await api.post("/api/afip/emitir-factura-c", {
          cliente: receptor,
          importeTotal: totalCalculado,
          importeNeto: subtotalCalculado,
          fecha: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
        });

        const resultado = response.data?.data || response.data;
        const nroFactura = resultado.numeroFactura || "0000-00000000";
        const nroFacturaSplit = nroFactura.split("-");
        const ptoVtaFactura = nroFacturaSplit[0] || "0000";
        const nroCbte = nroFacturaSplit[1] || "00000000";
        const numeroFacturaFormateado = `${ptoVtaFactura.padStart(
          4,
          "0"
        )}-${nroCbte.padStart(8, "0")}`;

        if (resultado?.Resultado === "A") {
          await registrarMovimiento(idCaja, {
            tipo: "ingreso",
            monto: total,
            descripcion: `Pago de factura ${numeroFacturaFormateado}`,
            formaPago: medioPago || "efectivo",
            fecha: new Date().toISOString(),
            usuario: { nombre: "Admin", uid: "local" },
          });

          // ✅ Descontar stock
          for (const item of carrito) {
            const nuevoStock = (item.stock || 0) - item.cantidad;
            await actualizarProducto(item.id, { stock: nuevoStock });
          }

          setCaeInfo({
            cae: resultado.cae || "Sin CAE",
            vencimiento: resultado.vencimientoCae || "No especificado",
            numeroFactura: numeroFacturaFormateado,
            numero: nroCbte.padStart(8, "0"),
            fecha: new Date().toLocaleDateString("es-AR"),
            archivoPdf: resultado.archivoPdf || "",
          });

          const htmlTicket = renderToStaticMarkup(
            <TicketFacturaC
              datos={{
                cliente: {
                  nombre: cliente.nombre,
                  tipoDoc: receptor.tipoDoc,
                  nroDoc: receptor.nroDoc,
                },
                productos: carrito,
                importeTotal: totalCalculado,
                importeNeto: subtotalCalculado,
                fecha: new Date().toLocaleDateString("es-AR"),
                CAE: resultado.cae,
                CAEVto: resultado.vencimientoCae,
                nroFacturaCompleto: numeroFacturaFormateado,
              }}
            />
          );

          const ticketWindow = window.open("", "_blank");
          ticketWindow.document.write(`
  <html>
    <head><title>Ticket Factura C</title></head>
    <body>${htmlTicket}</body>
    <script>
      window.onload = function() {
        window.print();
        setTimeout(() => window.close(), 500);
      };
    </script>
  </html>
`);
          ticketWindow.document.close();

          // ... imprimir ticket ...

          toast.success(
            `✅ Factura emitida. N°: ${numeroFacturaFormateado} - CAE: ${resultado.cae}`
          );
        } else {
          const mensajeError =
            resultado?.Observaciones?.Obs?.[0]?.Msg ||
            "Error al emitir factura";
          toast.error(`❌ ${mensajeError}`);
          return;
        }
      }

      if (tipoDocumento === "Nota de Crédito C") {
        // ... lógica de NC sin actualización de stock ...
      }
    } catch (error) {
      console.error("Error en handleEnviarAFIP:", error);

      if (error.code === "ECONNABORTED") {
        toast.error("❌ Tiempo de espera agotado. AFIP no respondió a tiempo.");
      } else if (error.response?.status === 500) {
        toast.error("❌ Error interno del servidor al emitir el comprobante.");
      } else {
        toast.error(error.message || "❌ Error al enviar comprobante a AFIP");
      }
    }
  }

  // Función auxiliar para validar CUIT
  const validarCUIT = (cuit) => {
    if (!cuit) return false;

    // Limpiar el CUIT (remover guiones, espacios, etc.)
    const doc = cuit.toString().replace(/[-\s]/g, "");

    // Verificar longitud (debe tener 11 dígitos)
    if (doc.length !== 11) return false;

    // Verificar que sean solo números
    if (!/^\d+$/.test(doc)) return false;

    // Prefijos válidos para CUIT
    const prefijosValidos = ["20", "23", "24", "27", "30", "33", "34"];
    const prefijo = doc.substr(0, 2);

    return prefijosValidos.includes(prefijo);
  };

  // Función para actualizar el precio de un producto en el carrito
  const handleActualizarPrecio = (productoId, nuevoPrecio) => {
    setCarrito(
      carrito.map((item) =>
        item.id === productoId ? { ...item, precioVenta: nuevoPrecio } : item
      )
    );
  };

  // Función para eliminar un producto del carrito
  const handleEliminarProducto = (productoId) => {
    const productoEliminado = carrito.find((item) => item.id === productoId);
    setCarrito(carrito.filter((item) => item.id !== productoId));

    if (productoEliminado) {
      toast.info(`🗑️ "${productoEliminado.titulo}" eliminado del carrito`, {
        position: "top-center",
        autoClose: 2000,
        theme: "light",
      });
    }
  };

  const handleGenerarFacturaPDF = async () => {
    if (!caeInfo?.cae) {
      toast.error("❌ Primero debe emitir la factura con AFIP", {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
      });
      return;
    }

    try {
      // Generar el PDF
      const pdfBytes = await generarFacturaPDF({
        razonSocial: "Tienda libre de gluten",
        cuitEmisor: "20267036099",
        domicilio: "9 de julio 2957",
        nombreCliente: clienteSeleccionado
          ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`
          : "CONSUMIDOR FINAL",
        docTipo: tipoDocumento === "Factura C" ? "CUIT" : "DNI",
        docNro:
          tipoDocumento === "Factura C"
            ? clienteSeleccionado?.cuit || "0"
            : clienteSeleccionado?.documento || "0",
        fecha: caeInfo.fecha,
        productos: carrito,
        total: total,
        cae: caeInfo.cae,
        caeVto: caeInfo.vencimiento,
        nroFacturaCompleto: caeInfo.numeroFactura,
        ptoVta: 3,
        iva: getIVA(),
        subtotal: getSubtotal(),
      });

      // Crear blob y descargar
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Factura_C_${caeInfo.numeroFactura.replace(
        "/",
        "-"
      )}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("📥 Factura PDF generada con éxito", {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
    } catch (error) {
      console.error("Error al generar factura:", error);
      toast.error("❌ Error al generar la factura", {
        position: "top-center",
        autoClose: 4000,
        theme: "colored",
      });
    }
  };

  return (
    <div
      style={{
        Height: "95vh", // Ocupa toda la altura visible
        width: "95vw", // Ocupa todo el ancho visible
        margin: "0 auto",
        padding: "20px",
        gap: "2rem",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#dedfdd",
      }}
      className="parent"
    >
      <div className="div1"></div>

      <div className="div2">
        <div className="div5">
          {/* Columna izquierda - Productos y búsqueda */}
          <div>
            <h2
              style={{
                marginBottom: "1.5rem",
                marginLeft: "4%",
                color: "#020583",
                borderBottom: "2px solid #4caf50",
                paddingBottom: "10px",
              }}
            >
              Facturación
            </h2>

            {/* Estado de caja */}
            {cajaAbierta ? (
              <div
                style={{
                  padding: "10px",
                  marginBottom: "1rem",
                  backgroundColor: "#e8f5e9",
                  borderRadius: "4px",
                  border: "1px solid #c8e6c9",
                }}
              >
                <strong>Caja abierta:</strong> Saldo actual: $
                {cajaAbierta.saldoActual?.toFixed(2)}
              </div>
            ) : (
              <div
                style={{
                  padding: "10px",
                  marginBottom: "1rem",
                  backgroundColor: "#ffebee",
                  borderRadius: "4px",
                  border: "1px solid #ef9a9a",
                }}
              >
                <strong>Caja cerrada:</strong> No se pueden registrar ventas
              </div>
            )}

            {/* Mostrar mensajes de error/success */}
            {error && (
              <div
                style={{
                  padding: "10px",
                  marginBottom: "1rem",
                  backgroundColor: "#ffebee",
                  borderRadius: "4px",
                  border: "1px solid #ef9a9a",
                  color: "#c62828",
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  padding: "10px",
                  marginBottom: "1rem",
                  backgroundColor: "#e8f5e9",
                  borderRadius: "4px",
                  border: "1px solid #c8e6c9",
                  color: "#2e7d32",
                }}
              >
                {success}
              </div>
            )}

            {/* Buscador de productos */}
            {/* Buscador por lector de código de barras */}
            <div style={{ marginBottom: "1.5rem" }}>
              <BuscadorProductos onSeleccionar={handleAgregarCarrito} />
            </div>

            {/* Búsqueda manual por nombre */}
            <div style={{ margin: "1rem 0" }}>
              <input
                type="text"
                placeholder="Buscar por nombre manualmente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "95%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
            </div>

            {searchTerm && (
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                  overflow: "hidden",
                  marginBottom: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                {productosFiltrados.length === 0 ? (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#666",
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    No se encontraron productos
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {productosFiltrados.map((prod) => (
                      <li
                        key={prod.id}
                        style={{
                          padding: "15px",
                          borderBottom: "1px solid #eee",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "bold" }}>
                            {prod.titulo}
                          </div>
                          <div
                            style={{
                              color: "#666",
                              fontSize: "0.9rem",
                              display: "flex",
                              gap: "10px",
                              marginTop: "5px",
                            }}
                          >
                            <span>Código: {prod.id}</span>
                            <span>|</span>
                            <span>Stock: {prod.stock || 0}</span>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span style={{ fontWeight: "bold" }}>
                            ${prod.precioVenta.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleAgregarCarrito(prod)}
                            style={{
                              padding: "8px 12px",
                              backgroundColor: "#4caf50",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            Agregar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="div4">
          {/* Panel de clientes */}
          <div>
            <ClientesPanel
              variant="facturador"
              tipoDocumento={tipoDocumento}
              onSelect={(cliente) => {
                if (tipoDocumento === "Factura C") {
                  if (!cliente.cuit) {
                    setError(
                      "Para Factura C debe seleccionar un cliente con CUIT válido"
                    );
                    return;
                  }

                  if (!validarCUIT(cliente.cuit)) {
                    setError(
                      `El CUIT ${cliente.cuit} no es válido para Factura C`
                    );
                    return;
                  }
                }

                setClienteSeleccionado(cliente);
                setError(null);
              }}
            />
          </div>
        </div>
      </div>

      <div className="div3">
        <div className="div6">
          {/* Carrito de compras */}
          <div style={{ marginBottom: "1.5rem" }}>
            <Carrito
              carrito={carrito}
              handleActualizarCantidad={handleActualizarCantidad}
              handleActualizarPrecio={handleActualizarPrecio}
              handleEliminarProducto={handleEliminarProducto}
            />
          </div>
        </div>

        <div className="div7">
          {/* Resumen y opciones */}
          <div
            style={{
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "#fff",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                marginBottom: "1rem",
                paddingBottom: "10px",
                borderBottom: "1px solid #eee",
              }}
            >
              Resumen
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span style={{ fontWeight: "bold" }}>Subtotal:</span>
              <span>${getSubtotal().toFixed(2)}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span style={{ fontWeight: "bold" }}>IVA (21%):</span>
              <span>${getIVA().toFixed(2)}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                marginTop: "10px",
              }}
            >
              <span style={{ fontSize: "2rem", fontWeight: "bold" }}>
                Total:
              </span>
              <span style={{ fontSize: "2rem", fontWeight: "bold" }}>
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Opciones de documento */}
          <div
            style={{
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "#fff",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                marginBottom: "1rem",
                paddingBottom: "10px",
                borderBottom: "1px solid #eee",
              }}
            >
              Configuración del Documento
            </h2>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "bold",
                }}
              >
                Tipo de documento
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  backgroundColor: "#fff",
                }}
              >
                <option value="">Seleccionar tipo</option>
                {/*<option value="Factura A">Factura A</option>*/}
                <option value="Factura C">Factura C</option>
                <option value="Remito">Remito</option>
                <option value="Recibo C">Recibo</option>
                <option value="Nota de Crédito C">Nota de Crédito C</option>
              </select>
              {tipoDocumento === "Nota de Crédito C" && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <label
                    style={{
                      fontWeight: "bold",
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Datos de la Factura a Anular
                  </label>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      placeholder="Punto de Venta"
                      value={ptoVtaAsociado}
                      onChange={(e) =>
                        setPtoVtaAsociado(e.target.value.slice(0, 4))
                      }
                    />
                    <input
                      type="number"
                      min="1"
                      max="99999999"
                      placeholder="Número de Factura"
                      value={nroAsociado}
                      onChange={(e) =>
                        setNroAsociado(e.target.value.slice(0, 8))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "bold",
                }}
              >
                Medio de pago
              </label>
              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  backgroundColor: "#fff",
                }}
              >
                <option value="">Seleccionar medio</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                <option value="Transferencia Bancaria">
                  Transferencia Bancaria
                </option>
                <option value="Mercado Pago">Mercado Pago</option>
              </select>
            </div>
          </div>
        </div>

        <div className="div8">
          {/* Columna derecha - Carrito y opciones */}
          <div>
            {/* Botones de acción */}
            <div
              style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}
            >
              <button
                onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
                disabled={carrito.length === 0}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: carrito.length === 0 ? "#cccccc" : "#2196f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: carrito.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  transition: "background-color 0.2s",
                  ":hover": {
                    backgroundColor:
                      carrito.length === 0 ? "#cccccc" : "#0b7dda",
                  },
                }}
              >
                {mostrarVistaPrevia ? "Ocultar Vista" : "Vista Previa"}
              </button>

              <button
                onClick={() => {
                  setCarrito([]);
                  setClienteSeleccionado(null);
                }}
                disabled={carrito.length === 0}
                style={{
                  padding: "12px",
                  backgroundColor: carrito.length === 0 ? "#cccccc" : "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: carrito.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  transition: "background-color 0.2s",
                  ":hover": {
                    backgroundColor:
                      carrito.length === 0 ? "#cccccc" : "#d32f2f",
                  },
                }}
              >
                Limpiar Todo
              </button>
            </div>

            {/* Vista previa y generación de PDF */}
            {mostrarVistaPrevia && carrito.length > 0 && (
              <div style={{ marginTop: "1.5rem" }}>
                <VistaPreviaRecibo
                  total={total}
                  subtotal={getSubtotal()}
                  iva={getIVA()}
                  carrito={carrito}
                  tipoDocumento={tipoDocumento}
                  medioPago={medioPago}
                  clienteSeleccionado={clienteSeleccionado}
                  caeInfo={caeInfo}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "1rem",
                    marginTop: "1rem",
                  }}
                >
                  {/* Botón Enviar a AFIP (NUEVO) */}
                  <button
                    onClick={handleEnviarAFIP}
                    disabled={
                      carrito.length === 0 ||
                      cobroRealizado ||
                      !cajaAbierta ||
                      loading ||
                      !mostrarVistaPrevia ||
                      // Verificamos que la factura C se pueda emitir si el total es menor a 99999.99
                      (tipoDocumento === "Factura C" &&
                        !clienteSeleccionado &&
                        total >= 99999.99) // Si no hay cliente y el total es mayor a 99.999, se deshabilita
                    }
                    style={{
                      padding: "12px 24px",
                      backgroundColor:
                        carrito.length === 0 ||
                        cobroRealizado ||
                        !cajaAbierta ||
                        loading ||
                        (tipoDocumento === "Factura C" &&
                          !clienteSeleccionado &&
                          total >= 99999.99)
                          ? "#cccccc"
                          : tipoDocumento === "Factura C"
                          ? "#1976d2"
                          : "#2196F3",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor:
                        carrito.length === 0 ||
                        cobroRealizado ||
                        !cajaAbierta ||
                        loading ||
                        (tipoDocumento === "Factura C" &&
                          !clienteSeleccionado &&
                          total >= 99999.99)
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {loading
                      ? "Enviando..."
                      : tipoDocumento === "Factura C"
                      ? "Emitir Factura C"
                      : "Enviar a AFIP"}
                  </button>

                  <button
                    onClick={handleGenerarFacturaPDF}
                    disabled={!caeInfo?.cae}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: !caeInfo?.cae ? "#cccccc" : "#ff9800",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: !caeInfo?.cae ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                      marginLeft: "1rem",
                    }}
                  >
                    Descargar Factura C
                  </button>

                  {/* Botón Registrar Cobro (EXISTENTE) */}
                  <button
                    onClick={handleCobrar}
                    disabled={
                      carrito.length === 0 ||
                      cobroRealizado ||
                      !cajaAbierta ||
                      loading
                    }
                    style={{
                      padding: "12px 24px",
                      backgroundColor:
                        carrito.length === 0 || cobroRealizado || !cajaAbierta
                          ? "#cccccc"
                          : "#4caf50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor:
                        carrito.length === 0 || cobroRealizado || !cajaAbierta
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {loading
                      ? "Procesando..."
                      : cobroRealizado
                      ? "Cobrado"
                      : "Registrar Remito"}
                  </button>

                  {/* Botón Generar PDF (EXISTENTE) */}
                  <button
                    onClick={handleGenerarFacturaPDF}
                    disabled={!caeInfo?.cae}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: !caeInfo?.cae ? "#cccccc" : "#ff9800",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: !caeInfo?.cae ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Descargar Factura
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
};

export default FacturadorPanel;
