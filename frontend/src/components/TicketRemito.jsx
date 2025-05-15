import "./TicketFacturaC.css";
import { ImprimirTicket } from "./ImprimirTicket";
import logo from "./img/logo tienda.png"

const TicketRemito = ({ datos, onClick }) => {
  const { cliente, productos, fecha, nroRemito = "0001-00000001" } = datos;

  return (
    <div
      id="ticket"
      style={{
        width: "58mm",
        padding: "5px",
        fontSize: "12px", // antes 10px
        fontFamily: "helvetica, sans-serif", // antes monospace
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
        <h3 style={{ margin: "0" }}>TIENDA LIBRE DE GLUTEN</h3>
        <p style={{ margin: 0 }}>9 DE JULIO 2957</p>
        <p style={{ margin: 0 }}>Mar del Plata</p>
        <p style={{ margin: "4px 0" }}>Tel: 2236364740</p>
        <hr />
        <strong>REMITO</strong>
        <p>N° {nroRemito}</p>
        <p>Fecha: {fecha}</p>
        <hr />
      </center>

      <p>
        <strong>Cliente:</strong> {cliente?.nombre || "Consumidor Final"}
      </p>
      {cliente?.nroDoc && (
        <p>
          <strong>Documento:</strong> {cliente.nroDoc}
        </p>
      )}
      <hr />

      <p>
        <strong>Detalle:</strong>
      </p>
      {productos.map((prod, i) => (
        <div key={i}>
          <p style={{ margin: 0 }}>{prod.titulo}</p>
          <p style={{ margin: 0 }}>
            {prod.cantidad} x ${prod.precioVenta?.toFixed(2)} = $
            {(prod.cantidad * prod.precioVenta).toFixed(2)}
          </p>
        </div>
      ))}

      <hr />
      <p>
        <strong>Total:</strong> $
        {productos
          .reduce((acc, p) => acc + p.precioVenta * p.cantidad, 0)
          .toFixed(2)}
      </p>

      <center>
        <p>Este remito no es válido como factura</p>
        <p>Gracias por su compra</p>
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
