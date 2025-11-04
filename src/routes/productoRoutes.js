const express = require('express');
const router = express.Router();

// 💡 IMPORTANTE: Desestructuramos las funciones del controlador
const { 
    obtenerProductos, 
    obtenerProductoPorId, 
    crearProducto, 
    actualizarProducto, 
    eliminarProducto 
} = require('../controllers/productoController'); 

const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- Configuración de Multer ---

const uploadDir = path.join(__dirname, '..', '..', 'public', 'img', 'products');
try {
    fs.mkdirSync(uploadDir, { recursive: true });
} catch (error) {
    console.error("Error al crear el directorio de subida:", error);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${unique}${ext}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG y WEBP son aceptados.'), false);
        }
    }
});

// --- Rutas ---

router.get('/productos', obtenerProductos);
router.get('/productos/:id', obtenerProductoPorId);

// Rutas protegidas que requieren ser admin
// Usamos las funciones desestructuradas directamente
router.post('/productos', verifyToken, checkRole(['admin']), upload.single('imagen'), crearProducto);
router.put('/productos/:id', verifyToken, checkRole(['admin']), upload.single('imagen'), actualizarProducto);
router.delete('/productos/:id', verifyToken, checkRole(['admin']), eliminarProducto);


module.exports = router;