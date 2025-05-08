import { useState, useEffect } from "react";
import { obtenerProductos } from "../services/productService";

const BuscadorProductos = ({ onSeleccionar }) => {
  const [query, setQuery] = useState("");
  const [productos, setProductos] = useState([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  useEffect(() => {
    const cargarProductos = async () => {
      const productosData = await obtenerProductos();
      setProductos(productosData);
    };
    cargarProductos();
  }, []);

  const productosFiltrados = query
    ? productos.filter(
        (p) =>
          p.titulo?.toLowerCase().includes(query.toLowerCase()) ||
          p.id?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div style={{ marginBottom: "1rem" }}>
      <input
        type="text"
        placeholder="Buscar por ID o nombre..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setMostrarResultados(e.target.value.length > 0);
        }}
        style={{
          width: "100%",
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
                }}
                style={{
                  padding: "0.5rem",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                  ":hover": {
                    backgroundColor: "#f5f5f5",
                  },
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
