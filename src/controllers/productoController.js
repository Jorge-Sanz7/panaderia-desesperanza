const Producto = require('../models/Producto');
const fs = require('fs');
const path = require('path');

// Obtener todos los productos
exports.obtenerProductos = async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ 
            mensaje: 'Error al obtener productos',
            error: error.message 
        });
    }
};

// Obtener un producto por ID
exports.obtenerProductoPorId = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id);
        if (!producto) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ 
            mensaje: 'Error al obtener producto',
            error: error.message 
        });
    }
};

// Crear un nuevo producto
exports.crearProducto = async (req, res) => {
    try {
        const data = Object.assign({}, req.body || {});

        if (data.precio) data.precio = parseFloat(data.precio);
        if (data.cantidad) data.cantidad = parseInt(data.cantidad);

        if (req.file) {
            data.imagen = `/img/products/${req.file.filename}`;
        }

        // Si la conexión a Mongoose es correcta, 'producto' será una instancia de modelo
        const producto = new Producto(data); 
        await producto.save(); // Aquí debería funcionar
        
        res.status(201).json(producto);
    } catch (error) {
        console.error('Error al crear producto:', error);
        
        // Manejo de errores: Si falla, borra el archivo subido
        if (req.file) {
            const filePath = path.join(__dirname, '..', '..', 'public', 'img', 'products', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                mensaje: 'Error de validación',
                errores: Object.values(error.errors).map(err => err.message)
            });
        }
        res.status(500).json({ 
            mensaje: 'Error al crear producto',
            error: error.message 
        });
    }
};

// Actualizar un producto
exports.actualizarProducto = async (req, res) => {
    let oldImagePath = null; 
    let newImage = false;

    try {
        const producto = await Producto.findById(req.params.id);
        
        if (!producto) {
            if (req.file) {
                const filePath = path.join(__dirname, '..', '..', 'public', 'img', 'products', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        if (req.body.categoria === 'temporada' && req.body.temporada === 'ninguna') {
            if (req.file) {
                const filePath = path.join(__dirname, '..', '..', 'public', 'img', 'products', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return res.status(400).json({ 
                mensaje: 'Los productos de temporada deben especificar una temporada válida' 
            });
        }

        const data = Object.assign({}, req.body || {});
        if (data.precio) data.precio = parseFloat(data.precio);
        if (data.cantidad) data.cantidad = parseInt(data.cantidad);

        if (req.file) {
            newImage = true;
            oldImagePath = producto.imagen ? path.join(__dirname, '..', '..', producto.imagen.replace(/^\//, '')) : null;
            data.imagen = `/img/products/${req.file.filename}`;
        }

        const productoActualizado = await Producto.findByIdAndUpdate(
            req.params.id,
            data,
            { new: true, runValidators: true }
        );
        
        if (newImage && oldImagePath && fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
        }

        res.json(productoActualizado);
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        
        if (req.file) {
            const filePath = path.join(__dirname, '..', '..', 'public', 'img', 'products', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                mensaje: 'Error de validación',
                errores: Object.values(error.errors).map(err => err.message)
            });
        }
        res.status(500).json({ 
            mensaje: 'Error al actualizar producto',
            error: error.message 
        });
    }
};

// Eliminar un producto
exports.eliminarProducto = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id);
        if (!producto) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        if (producto.imagen) {
            try {
                const imagePath = path.join(__dirname, '..', '..', producto.imagen.replace(/^\//, ''));
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (delErr) {
                console.warn('Advertencia: No se pudo borrar la imagen asociada al producto:', delErr.message);
            }
        }

        await Producto.findByIdAndDelete(req.params.id);
        res.json({ mensaje: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ 
            mensaje: 'Error al eliminar producto',
            error: error.message 
        });
    }
};