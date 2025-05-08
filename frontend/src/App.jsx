import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import { suscribirProductos, obtenerProductos } from "./services/productService";
import FacturadorPanel from "./components/FacturadorPanel";
import CajaPanel from "./components/caja/CajaPanel";
import ClientesPanel from "./components/ClientesPanel";
import ProductoForm from "./ProductoForm";
import Navbar from "./components/NavBar";

function App() {
  const [productos, setProductos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ventasRegistradas, setVentasRegistradas] = useState([]);

  // Carga inicial y suscripción a cambios
  useEffect(() => {
    setLoading(true);
    
    // Primero hacemos una carga inicial
    const cargarInicial = async () => {
      try {
        const productosIniciales = await obtenerProductos();
        setProductos(productosIniciales);
        setError(null);
      } catch (err) {
        console.error("Error en carga inicial:", err);
        setError("Error al cargar productos");
      } finally {
        setLoading(false);
      }
    };

    cargarInicial();

    // Luego nos suscribimos a cambios en tiempo real
    const unsubscribe = suscribirProductos((productosActualizados) => {
      setProductos(productosActualizados);
      setError(null);
    });

    // Función de limpieza al desmontar el componente
    return () => unsubscribe();
  }, []);

  // Función para recarga manual
  const recargarProductos = async () => {
    try {
      setLoading(true);
      const productosActualizados = await obtenerProductos();
      setProductos(productosActualizados);
      setError(null);
    } catch (err) {
      console.error("Error al recargar:", err);
      setError("Error al actualizar productos");
    } finally {
      setLoading(false);
    }
  };


  const agregarVentaACaja = (venta) => {
    setVentasRegistradas((prevVentas) => [...prevVentas, venta]);
  };


  const handleAgregarCarrito = (producto) => {
    setCarrito((prevCarrito) => {
      const nuevoCarrito = [...prevCarrito, producto];
      const nuevoTotal = nuevoCarrito.reduce((acc, curr) => acc + parseFloat(curr.precioVenta), 0);
      setTotal(nuevoTotal);
      return nuevoCarrito;
    });
  };

  return (
    <Router>
      <Navbar />
      {loading && <div style={{ padding: '1rem', textAlign: 'center' }}>Cargando productos...</div>}
      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          textAlign: 'center'
        }}>
          {error} - <button onClick={recargarProductos}>Reintentar</button>
        </div>
      )}
      
      <Routes>
        <Route path="/" element={
          <FacturadorPanel 
            productos={productos} 
            editando={editando} 
            setEditando={setEditando} 
            handleAgregarCarrito={handleAgregarCarrito} 
            total={total} 
           // onCobrar={agregarVentaACaja}
          />
        } />
        <Route path="/productos" element={
          <ProductoForm 
            onProductoGuardado={recargarProductos}
            onProductoEliminado={recargarProductos}
            setEditando={setEditando}
          />
        } />
        <Route path="/caja" element={
          <CajaPanel ventasRegistradas={ventasRegistradas} agregarVentaACaja={agregarVentaACaja} />
        } />
        <Route path="/clientes" element={<ClientesPanel />} />
      </Routes>
    </Router>
  );
}

export default App;