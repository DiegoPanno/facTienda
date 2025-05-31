// Al inicio del archivo (importaciones)
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import BuscadorProductos from "./components/BuscadorProductos";
import GenerarEtiquetasPDF from "./components/GenerarEtiquetasPDF";
import {
  actualizarProducto,
  eliminarProducto,
  agregarProducto,
} from "./services/productService";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProductoForm = ({
  productoEdit = null,
  onProductoGuardado = () => {},
  onProductoEliminado = () => {},
  setEditando = () => {},
}) => {
  const [producto, setProducto] = useState({
    id: "",
    codigoBarras: "",
    titulo: "",
    descripcion: "",
    precioBase: "",
    margen: "",
    stock: "",
    categoria: "",
    proveedor: "",
    imagenNombre: "", // Cambiamos a solo el nombre de la imagen
  });

  const [isSaving, setIsSaving] = useState(false);
  const [productoExiste, setProductoExiste] = useState(false);

  useEffect(() => {
    if (!productoEdit) {
      setProducto({
        id: "",
        codigoBarras: "",
        titulo: "",
        descripcion: "",
        precioBase: "",
        margen: "",
        stock: "",
        categoria: "",
        proveedor: "",
        imagenNombre: "",
      });
      setProductoExiste(false);
      return;
    }

    // Extraer solo el nombre de la imagen si viene una URL completa
    let nombreImagen = "";
    if (productoEdit.imagenUrl) {
      const partes = productoEdit.imagenUrl.split("/");
      nombreImagen = partes[partes.length - 1];
    }

    setProducto({
      id: productoEdit.id || "",
      codigoBarras: productoEdit.codigoBarras || "",
      titulo: productoEdit.titulo || "",
      descripcion: productoEdit.descripcion || "",
      precioBase: productoEdit.precioBase || "",
      margen: productoEdit.margen || "",
      stock: productoEdit.stock || "",
      categoria: productoEdit.categoria || "",
      proveedor: productoEdit.proveedor || "",
      imagenNombre: nombreImagen,
    });
    setProductoExiste(true);
  }, [productoEdit]);

  useEffect(() => {
    const verificarExistenciaProducto = async () => {
      if (producto.id && !productoEdit) {
        try {
          const docRef = doc(db, "productos", producto.id);
          const docSnap = await getDoc(docRef);
          setProductoExiste(docSnap.exists());
        } catch (error) {
          console.error("Error al verificar producto:", error);
          setProductoExiste(false);
        }
      }
    };

    verificarExistenciaProducto();
  }, [producto.id, productoEdit]);

  const calcularPrecioVenta = (precioBase, margen) => {
    const base = parseFloat(precioBase);
    const ganancia = parseFloat(margen);
    if (isNaN(base) || isNaN(ganancia)) return "";
    return (base * (1 + ganancia / 100)).toFixed(2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!producto.titulo?.trim()) {
      alert("El nombre del producto es requerido");
      return;
    }

    const precioBase = parseFloat(producto.precioBase.toString().replace(",", ".")) || 0;
    const margen = parseFloat(producto.margen.toString().replace(",", ".")) || 0;

    if (isNaN(precioBase) || precioBase <= 0) {
      alert("El precio base debe ser un número positivo");
      return;
    }

    if (isNaN(margen) || margen < 0) {
      alert("El margen debe ser un número no negativo");
      return;
    }

    const precioVenta = calcularPrecioVenta(producto.precioBase, producto.margen);

    // Construir la URL de la imagen automáticamente
    const baseURL = "https://github.com/DiegoPanno/facTienda/raw/main/frontend/public/productos-img/";
    const urlImagen = producto.imagenNombre ? baseURL + producto.imagenNombre : "";

    const productoCompleto = {
      ...producto,
      precioVenta,
      ultimaActualizacion: new Date().toISOString(),
      stock: producto.stock ? parseInt(producto.stock) : 0,
      imagenUrl: urlImagen,
      ...(!producto.id && { fechaCreacion: new Date().toISOString() }),
    };

    setIsSaving(true);
    try {
      let resultado;

      if (productoEdit || producto.id) {
        resultado = await actualizarProducto(producto.id, productoCompleto);
        toast.success(resultado?.created ? "🆕 Producto creado con ID específico" : "✅ Producto actualizado correctamente", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
      } else {
        resultado = await agregarProducto(productoCompleto);
        toast.success("🆕 Producto agregado exitosamente", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
      }

      setProducto({
        id: "",
        codigoBarras: "",
        titulo: "",
        descripcion: "",
        precioBase: "",
        margen: "",
        stock: "",
        categoria: "",
        proveedor: "",
        imagenNombre: "",
      });

      if (onProductoGuardado) onProductoGuardado();
      if (productoEdit && setEditando) setEditando(null);
    } catch (error) {
      console.error("Error al guardar producto:", error);
      let mensajeError = "Ocurrió un error al guardar el producto";
      if (error.code === "permission-denied") {
        mensajeError = "No tienes permisos para realizar esta acción";
      } else if (error.message.includes("invalid-argument")) {
        mensajeError = "Datos del producto no válidos";
      }

      toast.error(`❌ ${mensajeError}`, {
        position: "top-right",
        autoClose: 4000,
        theme: "colored",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!producto.id) return;

    if (!window.confirm("¿Está seguro de eliminar este producto permanentemente?")) return;

    try {
      await eliminarProducto(producto.id);
      toast.info("🗑️ Producto eliminado", {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
      });
      setProducto({
        id: "",
        codigoBarras: "",
        titulo: "",
        descripcion: "",
        precioBase: "",
        margen: "",
        stock: "",
        categoria: "",
        proveedor: "",
        imagenNombre: "",
      });

      if (onProductoEliminado) onProductoEliminado();
      if (setEditando) setEditando(null);
    } catch (error) {
      console.error("Error eliminando producto:", error);
      toast.error(`❌ Error al eliminar: ${error.message}`, {
        position: "top-right",
        autoClose: 4000,
        theme: "colored",
      });
    }
  };

  const precioVenta = calcularPrecioVenta(producto.precioBase, producto.margen);

  return (
    <div style={{ maxWidth: "600px", marginLeft: "150px" }}>
      <h2>{productoEdit ? "Editar Producto" : "Agregar Nuevo Producto"}</h2>

      <BuscadorProductos
        onSeleccionar={(producto) => {
          setProducto(producto);
          setProductoExiste(true);
        }}
      />

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fff" }}>
        {/* Otros campos... */}

        <div>
          <label>Nombre de la Imagen (sin la URL)</label>
          <input
            type="text"
            name="imagenNombre"
            value={producto.imagenNombre}
            onChange={handleChange}
            placeholder="Ejemplo: yogurt-lemon.jpeg"
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        {producto.imagenNombre && (
          <div>
            <p>Previsualización:</p>
            <img
              src={`https://github.com/DiegoPanno/facTienda/raw/main/frontend/public/productos-img/${producto.imagenNombre}`}
              alt="Previsualización"
              style={{ width: "120px", height: "120px", objectFit: "cover", marginTop: "8px", borderRadius: "4px" }}
            />
          </div>
        )}

        {/* Botones y demás campos */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
          {producto.id && (
            <button type="button" onClick={handleEliminar} disabled={isSaving} style={{ padding: "10px 15px", backgroundColor: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a", borderRadius: "4px", cursor: "pointer" }}>
              {isSaving ? "Eliminando..." : "Eliminar Producto"}
            </button>
          )}

          <button type="submit" disabled={isSaving} style={{ padding: "10px 20px", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            {isSaving ? "Guardando..." : productoEdit ? "Guardar Cambios" : "Agregar Producto"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <GenerarEtiquetasPDF />
      </div>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
    </div>
  );
};

export default ProductoForm;



// import { useState, useEffect } from "react";
// import { doc, getDoc } from "firebase/firestore";
// import { db, storage, ref, uploadBytes, getDownloadURL } from "./firebase";
// import BuscadorProductos from "./components/BuscadorProductos";
// import GenerarEtiquetasPDF from "./components/GenerarEtiquetasPDF";
// import {
//   actualizarProducto,
//   eliminarProducto,
//   agregarProducto,
// } from "./services/productService";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const ProductoForm = ({
//   productoEdit = null, // Valor por defecto
//   onProductoGuardado = () => {}, // Función por defecto
//   onProductoEliminado = () => {}, // Función por defecto
//   setEditando = () => {}, // Función por defecto
// }) => {
//   const [producto, setProducto] = useState({
//     id: "",
//     codigoBarras: "",
//     titulo: "",
//     descripcion: "",
//     precioBase: "",
//     margen: "",
//     stock: "",
//     categoria: "",
//     proveedor: "",
//   });

//   const [isSaving, setIsSaving] = useState(false);
//   const [productoExiste, setProductoExiste] = useState(false);
//   const [foto, setFoto] = useState(null);

//   // Efecto para cargar datos del producto a editar
//   useEffect(() => {
//     // Limpiar el formulario si no hay producto para editar
//     if (!productoEdit) {
//       setProducto({
//         id: "",
//         codigoBarras: "",
//         titulo: "",
//         descripcion: "",
//         precioBase: "",
//         margen: "",
//         stock: "",
//         categoria: "",
//         proveedor: "",
//       });
//       setProductoExiste(false);
//       return;
//     }

//     // Cargar datos del producto a editar
//     setProducto({
//       id: productoEdit.id || "",
//       codigoBarras: productoEdit.codigoBarras || "",
//       titulo: productoEdit.titulo || "",
//       descripcion: productoEdit.descripcion || "",
//       precioBase: productoEdit.precioBase || "",
//       margen: productoEdit.margen || "",
//       stock: productoEdit.stock || "",
//       categoria: productoEdit.categoria || "",
//       proveedor: productoEdit.proveedor || "",
//     });
//     setProductoExiste(true);
//   }, [productoEdit]); // Solo se ejecuta cuando productoEdit cambia

//   // Función para verificar existencia del producto
//   useEffect(() => {
//     const verificarExistenciaProducto = async () => {
//       if (producto.id && !productoEdit) {
//         try {
//           const docRef = doc(db, "productos", producto.id);
//           const docSnap = await getDoc(docRef);
//           setProductoExiste(docSnap.exists());
//         } catch (error) {
//           console.error("Error al verificar producto:", error);
//           setProductoExiste(false);
//         }
//       }
//     };

//     verificarExistenciaProducto();
//   }, [producto.id, productoEdit]);

//   // Verificar existencia del producto cuando cambia el ID
//   useEffect(() => {
//     const verificarExistencia = async () => {
//       if (producto.id && !productoEdit) {
//         try {
//           const docRef = doc(db, "productos", producto.id);
//           const docSnap = await getDoc(docRef);
//           setProductoExiste(docSnap.exists());
//         } catch (error) {
//           console.error("Error verificando producto:", error);
//           setProductoExiste(false);
//         }
//       }
//     };

//     verificarExistencia();
//   }, [producto.id, productoEdit]);

//   const calcularPrecioVenta = (precioBase, margen) => {
//     const base = parseFloat(precioBase);
//     const ganancia = parseFloat(margen);
//     if (isNaN(base) || isNaN(ganancia)) return "";
//     return (base * (1 + ganancia / 100)).toFixed(2);
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setProducto((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // Validación mejorada
//     if (!producto.titulo?.trim()) {
//       alert("El nombre del producto es requerido");
//       return;
//     }

//     // Convertir y validar números
//     const precioBase =
//       parseFloat(producto.precioBase.toString().replace(",", ".")) || 0;
//     const margen =
//       parseFloat(producto.margen.toString().replace(",", ".")) || 0;

//     if (isNaN(precioBase) || precioBase <= 0) {
//       alert("El precio base debe ser un número positivo");
//       return;
//     }

//     if (isNaN(margen) || margen < 0) {
//       alert("El margen debe ser un número no negativo");
//       return;
//     }

//     const precioVenta = calcularPrecioVenta(
//       producto.precioBase,
//       producto.margen
//     );

//     // Guardar la imagen en Firebase Storage (si hay una nueva imagen cargada)
//     let urlImagen = producto.imagenUrl || "";
//     if (foto) {
//       try {
//         const storageRef = ref(storage, `productos/${foto.name}_${Date.now()}`);
//         await uploadBytes(storageRef, foto);
//         urlImagen = await getDownloadURL(storageRef);
//       } catch (error) {
//         console.error("Error al subir la imagen:", error);
//         toast.error("❌ Error al subir la imagen", {
//           position: "top-right",
//           autoClose: 4000,
//           theme: "colored",
//         });
//         return;
//       }
//     }

//     const productoCompleto = {
//       ...producto,
//       precioVenta,
//       ultimaActualizacion: new Date().toISOString(),
//       stock: producto.stock ? parseInt(producto.stock) : 0,
//       imagenUrl: urlImagen, // Agregar la URL de la imagen
//       // Agregar marca de tiempo de creación si es nuevo producto
//       ...(!producto.id && { fechaCreacion: new Date().toISOString() }),
//     };

//     setIsSaving(true);
//     try {
//       let resultado;

//       if (productoEdit || producto.id) {
//         resultado = await actualizarProducto(producto.id, productoCompleto);
//         if (resultado?.created) {
//           toast.success("🆕 Producto creado con ID específico", {
//             position: "top-right",
//             autoClose: 3000,
//             theme: "colored",
//           });
//         } else {
//           toast.success("✅ Producto actualizado correctamente", {
//             position: "top-right",
//             autoClose: 3000,
//             theme: "colored",
//           });
//         }
//       } else {
//         resultado = await agregarProducto(productoCompleto);
//         toast.success("🆕 Producto agregado exitosamente", {
//           position: "top-right",
//           autoClose: 3000,
//           theme: "colored",
//         });
//       }

//       setProducto({
//         id: "",
//         codigoBarras: "",
//         titulo: "",
//         descripcion: "",
//         precioBase: "",
//         margen: "",
//         stock: "",
//         categoria: "",
//         proveedor: "",
//         imagenFile: null,
//         imagenUrl: "",
//       });

//       if (onProductoGuardado) {
//         onProductoGuardado();
//       }

//       if (productoEdit && setEditando) {
//         setEditando(null);
//       }
//     } catch (error) {
//       console.error("Error al guardar producto:", error);
//       let mensajeError = "Ocurrió un error al guardar el producto";
//       if (error.code === "permission-denied") {
//         mensajeError = "No tienes permisos para realizar esta acción";
//       } else if (error.message.includes("invalid-argument")) {
//         mensajeError = "Datos del producto no válidos";
//       }

//       toast.error(`❌ ${mensajeError}`, {
//         position: "top-right",
//         autoClose: 4000,
//         theme: "colored",
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleEliminar = async () => {
//     if (!producto.id) return;

//     if (
//       !window.confirm("¿Está seguro de eliminar este producto permanentemente?")
//     )
//       return;

//     try {
//       await eliminarProducto(producto.id);
//       toast.info("🗑️ Producto eliminado", {
//         position: "top-right",
//         autoClose: 3000,
//         theme: "colored",
//       });
//       setProducto({
//         id: "",
//         codigoBarras: "",
//         titulo: "",
//         descripcion: "",
//         precioBase: "",
//         margen: "",
//         stock: "",
//         categoria: "",
//         proveedor: "",
//       });

//       if (onProductoEliminado) onProductoEliminado();
//       if (setEditando) setEditando(null); // Salir del modo edición
//     } catch (error) {
//       console.error("Error eliminando producto:", error);
//       toast.error(`❌ Error al eliminar: ${error.message}`, {
//         position: "top-right",
//         autoClose: 4000,
//         theme: "colored",
//       });
//     }
//   };

//   const precioVenta = calcularPrecioVenta(producto.precioBase, producto.margen);

//   return (
//     <div style={{ maxWidth: "600px", marginLeft: "150px" }}>
//       <h2>{productoEdit ? "Editar Producto" : "Agregar Nuevo Producto"}</h2>

//       <BuscadorProductos
//         onSeleccionar={(producto) => {
//           setProducto(producto);
//           setProductoExiste(true);
//         }}
//       />

//       {producto.id && (
//         <div
//           style={{
//             color: productoExiste ? "green" : "orange",
//             margin: "10px 0",
//             padding: "10px",
//             backgroundColor: "#f5f5f5",
//             borderRadius: "4px",
//             borderLeft: `4px solid ${productoExiste ? "green" : "orange"}`,
//           }}
//         >
//           {productoExiste
//             ? "✔ Este producto ya existe y será actualizado"
//             : "⚠ Este ID no existe, se creará un nuevo producto"}
//         </div>
//       )}

//       <form
//         onSubmit={handleSubmit}
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           gap: "1rem",
//           padding: "20px",
//           border: "1px solid #ddd",
//           borderRadius: "8px",
//           backgroundColor: "#fff",
//         }}
//       >
//         <div>
//           <label>ID del Producto*</label>
//           <input
//             type="text"
//             name="id"
//             value={producto.id}
//             onChange={handleChange}
//             placeholder="ID único del producto"
//             required
//             disabled={!!productoEdit}
//             style={{ width: "100%", padding: "8px" }}
//           />
//         </div>

//         <div>
//           <label>Código de Barras</label>
//           <input
//             type="text"
//             name="codigoBarras"
//             value={producto.codigoBarras}
//             onChange={handleChange}
//             placeholder="Código de barras (opcional)"
//             style={{ width: "100%", padding: "8px" }}
//           />
//         </div>

//         <div>
//           <label>Nombre del Producto*</label>
//           <input
//             type="text"
//             name="titulo"
//             value={producto.titulo}
//             onChange={handleChange}
//             placeholder="Nombre descriptivo del producto"
//             required
//             style={{ width: "100%", padding: "8px" }}
//           />
//         </div>

//         <div>
//           <label>Descripción</label>
//           <textarea
//             name="descripcion"
//             value={producto.descripcion}
//             onChange={handleChange}
//             placeholder="Descripción detallada del producto"
//             rows="3"
//             style={{ width: "100%", padding: "8px" }}
//           />
//         </div>

//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr",
//             gap: "1rem",
//           }}
//         >
//           <div>
//             <label>Precio Base*</label>
//             <input
//               type="number"
//               name="precioBase"
//               value={producto.precioBase}
//               onChange={handleChange}
//               placeholder="Precio de costo"
//               required
//               min="0"
//               step="0.01"
//               style={{ width: "100%", padding: "8px" }}
//             />
//           </div>

//           <div>
//             <label>Margen de Ganancia (%)*</label>
//             <input
//               type="number"
//               name="margen"
//               value={producto.margen}
//               onChange={handleChange}
//               placeholder="Porcentaje de ganancia"
//               required
//               min="0"
//               step="0.1"
//               style={{ width: "100%", padding: "8px" }}
//             />
//           </div>
//         </div>

//         <div>
//           <label>Precio de Venta</label>
//           <input
//             type="text"
//             value={precioVenta ? `$${precioVenta}` : ""}
//             readOnly
//             style={{
//               width: "100%",
//               padding: "8px",
//               backgroundColor: "#f0f0f0",
//               fontWeight: "bold",
//             }}
//           />
//         </div>

//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr 1fr",
//             gap: "1rem",
//           }}
//         >
//           <div>
//             <label>Stock Disponible</label>
//             <input
//               type="number"
//               name="stock"
//               value={producto.stock}
//               onChange={handleChange}
//               placeholder="Cantidad en stock"
//               min="0"
//               style={{ width: "100%", padding: "8px" }}
//             />
//           </div>

//           <div>
//             <label>Categoría</label>
//             <input
//               type="text"
//               name="categoria"
//               value={producto.categoria}
//               onChange={handleChange}
//               placeholder="Categoría del producto"
//               style={{ width: "100%", padding: "8px" }}
//             />
//           </div>

//           <div>
//             <label>Proveedor</label>
//             <input
//               type="text"
//               name="proveedor"
//               value={producto.proveedor}
//               onChange={handleChange}
//               placeholder="Proveedor principal"
//               style={{ width: "100%", padding: "8px" }}
//             />
//           </div>
//         </div>
//         <div>
//           <label>Foto del Producto</label>
//           <input
//             type="file"
//             accept="image/*"
//             onChange={(e) => setFoto(e.target.files[0])}
//             style={{ width: "100%", padding: "8px" }}
//           />
//         </div>

//         {foto && (
//           <div>
//             <p>Previsualización:</p>
//             <img
//               src={URL.createObjectURL(foto)}
//               alt="Previsualización"
//               style={{
//                 width: "120px",
//                 height: "120px",
//                 objectFit: "cover",
//                 marginTop: "8px",
//                 borderRadius: "4px",
//               }}
//             />
//           </div>
//         )}

//         <div
//           style={{
//             display: "flex",
//             gap: "1rem",
//             marginTop: "1.5rem",
//             justifyContent: "flex-end",
//           }}
//         >
//           {producto.id && (
//             <button
//               type="button"
//               onClick={handleEliminar}
//               disabled={isSaving}
//               style={{
//                 padding: "10px 15px",
//                 backgroundColor: "#ffebee",
//                 color: "#c62828",
//                 border: "1px solid #ef9a9a",
//                 borderRadius: "4px",
//                 cursor: "pointer",
//               }}
//             >
//               {isSaving ? "Eliminando..." : "Eliminar Producto"}
//             </button>
//           )}

//           <button
//             type="submit"
//             disabled={isSaving}
//             style={{
//               padding: "10px 20px",
//               backgroundColor: "#4caf50",
//               color: "white",
//               border: "none",
//               borderRadius: "4px",
//               cursor: "pointer",
//               fontWeight: "bold",
//             }}
//           >
//             {isSaving
//               ? "Guardando..."
//               : productoEdit
//               ? "Guardar Cambios"
//               : "Agregar Producto"}
//           </button>
//         </div>
//       </form>
//       <div style={{ marginTop: "2rem", textAlign: "center" }}>
//         <GenerarEtiquetasPDF />
//       </div>

//       <ToastContainer
//         position="top-right"
//         autoClose={3000}
//         hideProgressBar={false}
//         newestOnTop={false}
//         closeOnClick
//         rtl={false}
//         pauseOnFocusLoss
//         draggable
//         pauseOnHover
//         theme="colored" // o "light", "dark"
//       />
//     </div>
//   );
// };

// export default ProductoForm;
