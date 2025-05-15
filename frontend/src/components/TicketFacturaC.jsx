import "./TicketFacturaC.css";
import QRCode from "react-qr-code";
import { ImprimirTicket } from "./ImprimirTicket";
import logo from "./img/logo tienda.png"

const TicketFacturaC = ({ datos, onClick }) => {
  const {
    cliente,
    productos,
    importeTotal,
    importeNeto,
    fecha,
    CAE,
    CAEVto,
    nroFacturaCompleto,
  } = datos;

  const qrData = {
    ver: 1,
    fecha: fecha.split("/").reverse().join("-"),
    cuit: "20267036099",
    ptoVta: parseInt(nroFacturaCompleto.split("-")[0]),
    tipoCmp: 11,
    nroCmp: parseInt(nroFacturaCompleto.split("-")[1]),
    importe: importeTotal,
    moneda: "PES",
    ctz: 1.0,
    tipoDocRec: cliente.tipoDoc === 96 ? 99 : 80,
    nroDocRec: cliente.nroDoc,
    tipoCodAut: "E",
    codAut: CAE,
  };

  const urlQR = `https://www.afip.gob.ar/fe/qr/?p=${btoa(
    JSON.stringify(qrData)
  )}`;

  const iva = importeTotal - importeNeto;

  return (
    <div
      id="ticket"
      style={{
        width: "58mm",
        padding: "5px",
        fontSize: "18px",
        fontFamily: "Arial, sans-serif",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <center>
        <img
          src={logo}
          alt="Logo"
          style={{ width: "40mm", marginBottom: "8px" }}
        />
        <h3 style={{ margin: "4px 0" }}>TIENDA LIBRE DE GLUTEN</h3>
        <p style={{ margin: "2px 0" }}>Monotributista - CUIT: 20-26703609-9</p>
        <p style={{ margin: "2px 0" }}>9 de julio 2957 - Mar del Plata</p>
        <p style={{ margin: "4px 0" }}>Tel: (223) 6364740</p>
        <hr style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      </center>
      
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        <strong>FACTURA C</strong>
        <p style={{ margin: "2px 0" }}>N° {nroFacturaCompleto}</p>
        <p style={{ margin: "2px 0" }}>Fecha: {fecha}</p>
      </div>
      
      <hr style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      
      <div style={{ marginBottom: "6px" }}>
        <p style={{ margin: "2px 0" }}><strong>Cliente:</strong> {cliente.nombre}</p>
        <p style={{ margin: "2px 0" }}>
          <strong>{cliente.tipoDoc === 96 ? "DNI:" : "CUIT:"}</strong> {cliente.nroDoc}
        </p>
      </div>
      
      <hr style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "6px 0" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "2px 0", borderBottom: "1px solid #ddd" }}>Descripción</th>
            <th style={{ textAlign: "right", padding: "2px 0", borderBottom: "1px solid #ddd" }}>Precio</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((prod, i) => (
            <tr key={i}>
              <td style={{ padding: "2px 0", borderBottom: "1px solid #eee" }}>
                {prod.cantidad} x {prod.descripcion || prod.titulo}
              </td>
              <td style={{ textAlign: "right", padding: "2px 0", borderBottom: "1px solid #eee" }}>
                ${(prod.precioUnitario || prod.precioVenta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <hr style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      
      <div style={{ marginBottom: "6px" }}>
        <p style={{ margin: "2px 0", textAlign: "right" }}>
          <span style={{ float: "left" }}>Subtotal:</span>
          ${importeNeto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
        <p style={{ margin: "2px 0", textAlign: "right" }}>
          <span style={{ float: "left" }}>IVA 21%:</span>
          ${iva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
        <p style={{ margin: "4px 0", textAlign: "right", fontWeight: "bold" }}>
          <span style={{ float: "left" }}>Total:</span>
          ${importeTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
      </div>
      
      <div style={{ margin: "8px 0", fontSize: "10px" }}>
        <p style={{ margin: "2px 0" }}>Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</p>
        <p style={{ margin: "2px 0" }}>IVA Contenido: ${iva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        <p style={{ margin: "2px 0" }}>Otros Impuestos Nacionales Indirectos: $0,00</p>
      </div>
      
      <div style={{ margin: "8px 0" }}>
        <p style={{ margin: "2px 0" }}><strong>Forma de Pago:</strong> Efectivo</p>
        <p style={{ margin: "2px 0" }}><strong>CAE:</strong> {CAE}</p>
        <p style={{ margin: "2px 0" }}><strong>Vto. CAE:</strong> {CAEVto}</p>
      </div>
      
      <center style={{ marginTop: "10px" }}>
        <div style={{ background: "white", padding: "4px", display: "inline-block" }}>
          <QRCode value={urlQR} size={100} />
        </div>
        <p style={{ margin: "4px 0", fontSize: "10px" }}>Gracias por su compra</p>
      </center>
    </div>
  );
};

// Exportamos ambas versiones
export { TicketFacturaC }; // Versión normal
export default (
  { datos } // Versión con impresión
) => (
  <ImprimirTicket>
    <TicketFacturaC datos={datos} />
  </ImprimirTicket>
);
