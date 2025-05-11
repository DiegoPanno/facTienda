import { Link } from "react-router-dom";
import { IoHomeSharp } from "react-icons/io5";
import { FaCashRegister } from "react-icons/fa";
import { FaShoppingCart } from "react-icons/fa";
import { IoPersonSharp } from "react-icons/io5";
import { BsCashCoin } from "react-icons/bs";


const Navbar = () => {
  return (
      
    <div style={{
      width: "80px",
      height: "100vh",
      background: "#edeeec",
      color: '#020583',
      padding: "20px",
      position: "fixed",
      top: 0,
      left: 0,
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box"
    }}> 
      <IoHomeSharp style={{ 
        marginBottom: "200px",
        fontSize: "33px",
         }} />
      
      <nav>
        <Link to="/" style={linkStyle}><FaCashRegister /></Link>
        <Link to="/productos" style={linkStyle}><FaShoppingCart /></Link>
        <Link to="/clientes" style={linkStyle}><IoPersonSharp /></Link>
        <Link to="/caja" style={linkStyle}><BsCashCoin /></Link>
      </nav>
    </div>
  );
};

const linkStyle = {
  color: "#020583",
  textDecoration: "none",
  margin: "10px 0",
  display: "flex",
  fontSize: "25px",
  alineItem: "center",
};



export default Navbar;
