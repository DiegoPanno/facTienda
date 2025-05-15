import "./TicketFacturaC.css";
import { ImprimirTicket } from "./ImprimirTicket";
import logo from "./img/logo tienda.png"

const TicketRemito = ({ datos, onClick }) => {
  const { cliente, productos, fecha, nroRemito = "0001-00000001" } = datos;
  const total = productos.reduce((acc, p) => acc + p.precioVenta * p.cantidad, 0);

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
        <strong>REMITO</strong>
        <p style={{ margin: "2px 0" }}>N° {nroRemito}</p>
        <p style={{ margin: "2px 0" }}>Fecha: {fecha}</p>
      </div>
      
      <hr style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      
      <div style={{ marginBottom: "6px" }}>
        <p style={{ margin: "2px 0" }}><strong>Cliente:</strong> {cliente?.nombre || "Consumidor Final"}</p>
        {cliente?.nroDoc && (
          <p style={{ margin: "2px 0" }}>
            <strong>{cliente.nroDoc.length === 11 ? "CUIT:" : "DNI:"}</strong> {cliente.nroDoc}
          </p>
        )}
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
                {prod.cantidad} x {prod.titulo}
              </td>
              <td style={{ textAlign: "right", padding: "2px 0", borderBottom: "1px solid #eee" }}>
                ${prod.precioVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <hr style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      
      <div style={{ marginBottom: "6px" }}>
        <p style={{ margin: "4px 0", textAlign: "right", fontWeight: "bold" }}>
          <span style={{ float: "left" }}>Total:</span>
          ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
      </div>
      
      <div style={{ margin: "8px 0", fontSize: "10px" }}>
        <p style={{ margin: "2px 0" }}>Este remito no es válido como factura</p>
        <p style={{ margin: "2px 0" }}>Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</p>
      </div>
      
      <center style={{ marginTop: "10px" }}>
        <p style={{ margin: "4px 0", fontSize: "10px" }}>Gracias por su compra</p>
      </center>
    </div>
  );
};

// Exportamos ambas versiones
export { TicketRemito }; // Versión normal
export default (
  { datos } // Versión con impresión
) => (
  <ImprimirTicket>
    <TicketRemito datos={datos} />
  </ImprimirTicket>
);
