import React, { useState } from 'react';
import axios from 'axios';

const FacturaAFIP = ({ datosFacturaInicial = {} }) => {
  const [factura, setFactura] = useState({
    total: 0,
    docTipo: 99,  // 99 = Consumidor Final
    docNro: 0,
    ...datosFacturaInicial,  // Permite sobrescribir valores desde props
  });
  const [loading, setLoading] = useState(false);
  const [cae, setCae] = useState(null);

  const handleEnviarAFIP = async () => {
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:3001/api/emitir-factura', factura);
      setCae(response.data.cae);
      alert(`✅ Factura registrada en AFIP\nCAE: ${response.data.cae}\nVencimiento: ${response.data.vencimientoCAE}`);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      console.error('Error al enviar a AFIP:', errorMsg);
      alert(`❌ Error al registrar en AFIP: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="factura-afip">
      <button 
        onClick={handleEnviarAFIP} 
        disabled={loading || factura.total <= 0}
        className="btn-afip"
      >
        {loading ? 'Enviando a AFIP...' : 'Registrar en AFIP'}
      </button>

      {cae && (
        <div className="cae-result">
          <h3>Comprobante AFIP</h3>
          <p><strong>CAE:</strong> {cae}</p>
          <p><strong>Tipo:</strong> Factura {factura.tipoComprobante || 'C'}</p>
        </div>
      )}
    </div>
  );
};

export default FacturaAFIP;