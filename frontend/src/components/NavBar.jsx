import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav style={{ padding: "1rem", backgroundColor: "#f4f4f4", display: "flex", gap: "1rem" }}>
      <Link to="/">Facturación</Link>
      <Link to="/productos">Productos</Link>
      <Link to="/caja">Caja</Link>
      <Link to="/clientes">Clientes</Link>
    </nav>
  );
};

export default Navbar;
