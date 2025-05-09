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
import { toast } from "react-toastify";
import { generarFacturaPDF } from "../services/pdfGenerator";
import api from "../api";
import { getAuth } from "firebase/auth";

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

  const getSubtotal = () => total / 1.21;
  const getIVA = () => total - getSubtotal();

  const comprobanteRef = useRef(null);

  // Verificar caja abierta al cargar el componente
  useEffect(() => {
    const verificarCaja = async () => {
      try {
        const caja = await obtenerCajaAbierta();
        setCajaAbierta(caja);
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

  // Manejar agregar producto al carrito
  const handleAgregarCarrito = (producto) => {
    setCarrito((prevCarrito) => {
      const existe = prevCarrito.find((p) => p.id === producto.id);
      const precio = Number(producto.precioVenta) || 0;

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
  };

  // Generar PDF del comprobante
  const generarPDF = async () => {
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

      const nombreArchivo = `${tipoDocumento || "Comprobante"}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      pdf.save(nombreArchivo);
      setSuccess(`✅ ${tipoDocumento || "Comprobante"} generado exitosamente`);

      return pdf.output("blob"); // Retornamos el blob para usar en handleCobrar
    } catch (error) {
      console.error("Error al generar PDF:", error);
      setError("❌ Error al generar el documento");
      throw error;
    }
  };

  const handleCobrar = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (carrito.length === 0) {
      setError("No hay productos en el carrito");
      setIsSubmitting(false);
      return;
    }

    if (!cajaAbierta?.id) {
      setError("No hay caja abierta. Abra caja primero.");
      setIsSubmitting(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await generarPDF();

      // Usa las funciones que ya tienes definidas
      const auth = getAuth();
      const usuario = auth.currentUser;

      const movimiento = {
        tipo: "ingreso",
        monto: getSubtotal(),
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
        usuario: {
          nombre: usuario.displayName || usuario.email || "Desconocido",
          uid: usuario.uid,
        },
      };

      await registrarMovimiento(cajaAbierta.id, movimiento);

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
            {Math.floor(Math.random() * 10000)
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
  function prepararDatosReceptor(clienteSeleccionado) {
    const doc = (clienteSeleccionado?.cuit || "0").replace(/\D/g, "");
    const nombre = clienteSeleccionado?.nombre || "Consumidor Final";

    let tipoDocAfip = 99;
    if (doc.length === 11) tipoDocAfip = 80; // CUIT
    else if (doc.length === 8) tipoDocAfip = 96; // DNI

    return {
      nombre,
      tipoDoc: tipoDocAfip,
      nroDoc: parseInt(doc || "0"),
    };
  }

  // Función para enviar la factura a AFIP
  // Función para enviar la factura a AFIP
  async function handleEnviarAFIP() {
    try {
      if (tipoDocumento === "Factura C" && !clienteSeleccionado) {
        throw new Error("Seleccione un cliente");
      }

      // Datos del receptor
      const receptor = prepararDatosReceptor(clienteSeleccionado);

      // Productos
      const items = carrito.map((prod, index) => ({
        codigo: prod.id || index + 1,
        descripcion: prod.titulo,
        cantidad: prod.cantidad,
        precioUnitario: prod.precioVenta,
        subtotal: prod.cantidad * prod.precioVenta,
      }));

      const total = items.reduce((acc, item) => acc + item.subtotal, 0);

      // Datos antes de la adición de datosFactura
      const response = await api.post("/api/afip/emitir-factura-c", {
        cliente: receptor,
        importeTotal: total,
        importeNeto: getSubtotal(),
        fecha: new Date().toISOString().slice(0, 10).replace(/-/g, ""), // Formato YYYYMMDD
      });

      const resultado = response.data; // Usamos data directamente porque axios devuelve los datos como JSON.

      console.log("Respuesta de AFIP:", resultado);

      if (resultado?.Resultado === "A") {
        // OK, seguimos
      } else {
        const mensajeError =
          resultado?.Observaciones?.Obs?.[0]?.Msg || "Error al emitir factura";
        throw new Error(mensajeError);
      }

      // Extraer información de la respuesta
      const numeroFactura = resultado.numeroFactura || "0000-00000000";
      const cae = resultado.cae || "Sin CAE";
      const vencimientoCae = resultado.vencimientoCae || "No especificado";
      const archivoPdf = resultado.archivoPdf || "";

      setCaeInfo({
        cae,
        vencimiento: vencimientoCae,
        numeroFactura,
        numero: numeroFactura.split("-")[1],
        fecha: new Date().toLocaleDateString("es-AR"),
        archivoPdf,
      });

      toast.success(`✅ Factura emitida. N°: ${numeroFactura} - CAE: ${cae}`);
    } catch (error) {
      console.error("Error en handleEnviarAFIP:", error);
      toast.error(error.message || "Error al enviar factura a AFIP");
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
    setCarrito(carrito.filter((item) => item.id !== productoId));
  };

  const handleGenerarFacturaPDF = async () => {
    if (!caeInfo?.cae) {
      toast.error("Primero debe emitir la factura con AFIP");
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

      toast.success("Factura generada con éxito");
    } catch (error) {
      console.error("Error al generar factura:", error);
      toast.error("Error al generar la factura");
    }
  };

  // Función auxiliar para formatear fecha
  // function formatFecha(fechaStr) {
  //   if (fechaStr.includes("/")) return fechaStr;
  //   const [year, month, day] = [
  //     fechaStr.substr(0, 4),
  //     fechaStr.substr(4, 2),
  //     fechaStr.substr(6, 2),
  //   ];
  //   return `${day}/${month}/${year}`;
  // }

  return (
    <div
      style={{
        minHeight: "100vh", // Ocupa toda la altura visible
        width: "95vw", // Ocupa todo el ancho visible
        margin: "0 auto",
        padding: "20px",
        display: "grid",
        gridTemplateColumns: "2fr 3fr", // Más espacio para el carrito
        gap: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Columna izquierda - Productos y búsqueda */}
      <div>
        <h2
          style={{
            marginBottom: "1.5rem",
            color: "#333",
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
        <div style={{ marginBottom: "1.5rem" }}>
          <input
            type="text"
            placeholder="Buscar producto por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        {/* Listado de productos filtrados */}
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
                      transition: "background-color 0.2s",
                      ":hover": { backgroundColor: "#f9f9f9" },
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold" }}>{prod.titulo}</div>
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
                          transition: "background-color 0.2s",
                          ":hover": { backgroundColor: "#3e8e41" },
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

        {/* Panel de clientes */}
        <div style={{ marginBottom: "1.5rem" }}>
          <ClientesPanel
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

      {/* Columna derecha - Carrito y opciones */}
      <div>
        {/* Carrito de compras */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Carrito
            carrito={carrito}
            handleActualizarCantidad={handleActualizarCantidad}
            handleActualizarPrecio={handleActualizarPrecio}
            handleEliminarProducto={handleEliminarProducto}
          />
        </div>

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
          <h3
            style={{
              marginBottom: "1rem",
              paddingBottom: "10px",
              borderBottom: "1px solid #eee",
            }}
          >
            Resumen
          </h3>

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
            <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
              Total:
            </span>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
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
          <h3
            style={{
              marginBottom: "1rem",
              paddingBottom: "10px",
              borderBottom: "1px solid #eee",
            }}
          >
            Configuración del Documento
          </h3>

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
              <option value="Recibo">Recibo</option>
              <option value="Nota de Crédito C">Nota de Crédito C</option>
            </select>
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

        {/* Botones de acción */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
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
                backgroundColor: carrito.length === 0 ? "#cccccc" : "#0b7dda",
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
                backgroundColor: carrito.length === 0 ? "#cccccc" : "#d32f2f",
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
                  (tipoDocumento === "Factura C" && !clienteSeleccionado)
                }
                style={{
                  padding: "12px 24px",
                  backgroundColor:
                    carrito.length === 0 ||
                    cobroRealizado ||
                    !cajaAbierta ||
                    loading ||
                    (tipoDocumento === "Factura C" && !clienteSeleccionado)
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
                    (tipoDocumento === "Factura C" && !clienteSeleccionado)
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
                Descargar Factura
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
                  : "Registrar Cobro"}
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
              {/* CAE y QR */}
              {/* {caeInfo?.cae && (
                <div
                  style={{
                    marginTop: "30px",
                    paddingTop: "10px",
                    borderTop: "1px solid #ccc",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p>
                      <strong>CAE:</strong> {caeInfo.cae}
                    </p>
                    <p>
                      <strong>Vto. CAE:</strong> {caeInfo.vencimiento}
                    </p>
                  </div>

                  <div>
                    <img
                      src={`https://www.afip.gob.ar/fe/qr/?p=${btoa(
                        JSON.stringify({
                          ver: 1,
                          fecha: new Date().toISOString().slice(0, 10),
                          cuit: "20267036099",
                          ptoVta: 3,
                          tipoCmp: 11,
                          nroCmp: caeInfo?.numeroFactura
                            ? Number(caeInfo.numeroFactura.split("-")[1])
                            : 0,
                          importe: total,
                          moneda: "PES",
                          ctz: 1.0,
                          tipoDocRec: clienteSeleccionado ? 80 : 99,
                          nroDocRec: clienteSeleccionado?.cuit
                            ? parseInt(clienteSeleccionado.cuit)
                            : 0,
                          tipoCodAut: "E",
                          codAut: caeInfo.cae,
                        })
                      )}`}
                      alt="QR AFIP"
                      style={{ width: "100px", height: "100px" }}
                    />
                  </div>
                </div>
              )} */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacturadorPanel;
