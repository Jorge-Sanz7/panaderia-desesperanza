const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// --- 1. CONEXIÓN A LA BASE DE DATOS (AL INICIO) ---
// Mongoose almacenará las operaciones en búfer, por lo que no es necesario esperar
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Conexión a MongoDB iniciada.');
    // La lógica de crear el admin se puede mover aquí si es necesaria,
    // pero idealmente se hace por separado, no en el inicio del servidor.
})
.catch(err => {
    console.error('❌ Error al conectar a MongoDB:', err);
    // En Vercel, no usamos process.exit(1), dejamos que la función falle si es necesario.
});

// Manejo de errores de MongoDB
mongoose.connection.on('error', err => {
    console.error('Error de MongoDB (después de conexión inicial):', err);
});


// --- 2. INICIALIZACIÓN DE EXPRESS ---
const app = express();

// --- 3. MIDDLEWARE (SINCRÓNICO) ---
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (importante: __dirname es relativo a 'src')
app.use(express.static(path.join(__dirname, '..', 'public')));

// Log de todas las peticiones HTTP
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Manejo de errores de Multer/global (DEBE IR ANTES DE LAS RUTAS)
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ mensaje: 'El archivo es demasiado grande. Tamaño máximo 2MB.' });
    }
    if (err && err.message && err.message.includes('Tipo de archivo no permitido')) {
        return res.status(400).json({ mensaje: err.message });
    }

    // Si el error no es de Multer, pasa al siguiente manejador de errores
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(500).json({
        mensaje: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// --- 4. RUTAS DE LA API (SINCRÓNICAS) ---
app.use('/api', require('./routes/productoRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// --- 5. RUTAS DE VISTAS (PÁGINAS ESTÁTICAS) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/inventario', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'inventario.html'));
});

// --- 6. MANEJO DE RUTA 404 (AL FINAL DE TODAS LAS RUTAS) ---
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// --- 7. EXPORTAR LA APP PARA VERCEL ---
// NO usamos app.listen()
module.exports = app;
