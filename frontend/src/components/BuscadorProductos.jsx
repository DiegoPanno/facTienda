import { obtenerProductos } from "../services/productService";
import { useState, useEffect, useRef } from "react";

const BuscadorProductos = ({ onSeleccionar }) => {
  const [query, setQuery] = useState("");
  const [productos, setProductos] = useState([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const cargarProductos = async () => {
      const productosData = await obtenerProductos();
      setProductos(productosData);
    };
    cargarProductos();
  }, []);

  const buscarYSeleccionar = (valor) => {
    const codigo = valor.trim().toLowerCase();
    const productoEncontrado = productos.find(
      (p) => p.id?.toString().toLowerCase() === codigo
    );

    if (productoEncontrado) {
      onSeleccionar(productoEncontrado);
      setQuery("");
      setMostrarResultados(false);
      inputRef.current?.focus();
    } else {
      setMostrarResultados(valor.length > 0);
    }
  };

  const productosFiltrados = query
    ? productos.filter(
        (p) =>
          p.titulo?.toLowerCase().includes(query.toLowerCase()) ||
          p.id?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div style={{ marginBottom: "1rem", width: "580px" }}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar con codigo de barra..."
        value={query}
        onChange={(e) => {
          const valor = e.target.value;
          setQuery(valor);
          buscarYSeleccionar(valor);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            buscarYSeleccionar(query);
          }
        }}
        style={{
          width: "79%",
          padding: "0.5rem",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
      />

      {mostrarResultados && (
        <ul
          style={{
            maxHeight: "200px",
            overflowY: "auto",
            border: "1px solid #eee",
            borderRadius: "4px",
            marginTop: "0.5rem",
            padding: "0",
            listStyle: "none",
          }}
        >
          {productosFiltrados.length > 0 ? (
            productosFiltrados.map((prod) => (
              <li
                key={prod.id}
                onClick={() => {
                  onSeleccionar(prod);
                  setQuery("");
                  setMostrarResultados(false);
                  inputRef.current?.focus();
                }}
                style={{
                  padding: "0.5rem",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
              >
                {prod.titulo} (ID: {prod.id})
              </li>
            ))
          ) : (
            <li style={{ padding: "0.5rem", color: "#666" }}>
              No se encontraron productos
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default BuscadorProductos;

