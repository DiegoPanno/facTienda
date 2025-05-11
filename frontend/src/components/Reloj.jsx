import { useState, useEffect } from 'react';

function Reloj() {
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => {
      setHora(new Date());
    }, 1000); // Actualiza cada segundo

    return () => clearInterval(intervalo); // Limpia el intervalo al desmontar
  }, []);

  return (
    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', alignItems: "center", textAlign: "center", justifyItems: "center" }}>
      {hora.toLocaleTimeString()}
    </div>
  );
}

export default Reloj;
