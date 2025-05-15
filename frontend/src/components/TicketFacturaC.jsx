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

  return (
    <div
      id="ticket"
      style={{
        width: "58mm",
        padding: "5px",
        fontSize: "20px", // antes 10px
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
        <h3>TIENDA LIBRE DE GLUTEN</h3>
        <p>Factura C N° {nroFacturaCompleto}</p>
        <p>Fecha: {fecha}</p>
        <p>CUIT: 20267036099</p>
        <p>IVA: Monotributo</p>
        <hr />
      </center>
      <p>Cliente: {cliente.nombre}</p>
      <p>
        {cliente.tipoDoc === 96 ? "DNI" : "CUIT"}: {cliente.nroDoc}
      </p>
      <hr />
      {productos.map((prod, i) => (
        <div key={i}>
          <p>{prod.descripcion || prod.titulo}</p>
          <p>
            {prod.cantidad} x $
            {prod.precioUnitario?.toFixed(2) || prod.precioVenta?.toFixed(2)} =
            $
            {(
              prod.cantidad * (prod.precioUnitario || prod.precioVenta)
            ).toFixed(2)}
          </p>
        </div>
      ))}
      <hr />
      <p>Subtotal: ${importeNeto.toFixed(2)}</p>
      <p>Total: ${importeTotal.toFixed(2)}</p>
      <p>CAE: {CAE}</p>
      <p>Vto CAE: {CAEVto}</p>
      <center>
        <div
          style={{
            background: "white",
            padding: "4px",
            display: "inline-block",
          }}
        >
          <QRCode value={urlQR} size={120} />
        </div>
        <p>Gracias por su compra</p>
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
