import React, { useState } from 'react';

const Carrito = ({ 
  carrito, 
  handleActualizarCantidad, 
  handleActualizarPrecio,
  handleEliminarProducto 
}) => {
  const [editandoPrecio, setEditandoPrecio] = useState(null);
  const [nuevoPrecio, setNuevoPrecio] = useState('');

  const iniciarEdicionPrecio = (id, precioActual) => {
    setEditandoPrecio(id);
    setNuevoPrecio(precioActual);
  };

  const guardarPrecio = (id) => {
    const precioNumerico = parseFloat(nuevoPrecio);
    if (!isNaN(precioNumerico)) {
      handleActualizarPrecio(id, precioNumerico);
    }
    setEditandoPrecio(null);
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #eee',
        fontSize: '1.5rem',
        color: '#333'
      }}>Carrito de Compras</h3>
      
      {carrito.length === 0 ? (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#666',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px'
        }}>
          No hay productos en el carrito
        </div>
      ) : (
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          marginBottom: '20px'
        }}>
          <thead>
            <tr style={{ 
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #ddd'
            }}>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Producto</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>Cantidad</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Precio Unit.</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Subtotal</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {carrito.map((prod) => (
              <tr key={prod.id} style={{ 
                borderBottom: '1px solid #eee',
                ':hover': { backgroundColor: '#f9f9f9' }
              }}>
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 'bold' }}>{prod.titulo}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>Código: {prod.id}</div>
                </td>
                
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button 
                      onClick={() => handleActualizarCantidad(prod.id, Math.max(1, prod.cantidad - 1))}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        backgroundColor: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>
                    <span style={{ 
                      padding: '0 10px',
                      minWidth: '30px',
                      display: 'inline-block',
                      textAlign: 'center'
                    }}>
                      {prod.cantidad}
                    </span>
                    <button 
                      onClick={() => handleActualizarCantidad(prod.id, prod.cantidad + 1)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        backgroundColor: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                </td>
                
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  {editandoPrecio === prod.id ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={nuevoPrecio}
                        onChange={(e) => setNuevoPrecio(e.target.value)}
                        step="0.01"
                        min="0"
                        style={{
                          width: '80px',
                          padding: '4px',
                          marginRight: '4px',
                          textAlign: 'right'
                        }}
                      />
                      <button 
                        onClick={() => guardarPrecio(prod.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => iniciarEdicionPrecio(prod.id, prod.precioVenta)} style={{ cursor: 'pointer' }}>
                      ${prod.precioVenta.toFixed(2)}
                      <span style={{ 
                        marginLeft: '5px',
                        fontSize: '0.7rem',
                        color: '#666',
                        display: 'inline-block'
                      }}>(click para editar)</span>
                    </div>
                  )}
                </td>
                
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                  ${(prod.precioVenta * prod.cantidad).toFixed(2)}
                </td>
                
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <button 
                    onClick={() => handleEliminarProducto(prod.id)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#ffebee',
                      color: '#c62828',
                      border: '1px solid #ef9a9a',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Carrito;
  
  