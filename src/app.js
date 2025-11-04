const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Middleware de seguridad
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());

// Middleware para parseo de JSON y archivos estáticos
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Log de todas las peticiones HTTP
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Manejo de errores de Multer/global (DEBE IR ANTES DE LAS RUTAS)
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Handle multer errors (file size / file type)
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ mensaje: 'El archivo es demasiado grande. Tamaño máximo 2MB.' });
    }
    if (err && err.message && err.message.includes('Tipo de archivo no permitido')) {
        return res.status(400).json({ mensaje: err.message });
    }

    res.status(500).json({
        mensaje: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Manejo de errores de MongoDB
mongoose.connection.on('error', err => {
    console.error('Error de MongoDB:', err);
});

const PORT = process.env.PORT || 3000;

// Conectar a MongoDB. Usaremos el .then() para iniciar TODO lo que requiere la DB.
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('✅ Conectado exitosamente a MongoDB');

    // =================================================================
    // 💡 PASO CLAVE: MOVER LA CARGA DE RUTAS Y EL INICIO DEL SERVIDOR AQUÍ
    // =================================================================

    // Rutas de la API (Ahora se cargan DESPUÉS de la conexión)
    app.use('/api', require('./routes/productoRoutes'));
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/cart', require('./routes/cartRoutes'));
    app.use('/api/orders', require('./routes/orderRoutes'));

    // Rutas para servir archivos estáticos
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    app.get('/inventario', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'inventario.html'));
    });

    // Manejo de rutas no encontradas (DEBE IR AL FINAL)
    app.use((req, res) => {
        res.status(404).json({ mensaje: 'Ruta no encontrada' });
    });

    // Inicio del servidor
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Lógica de crear un usuario administrador por defecto (OPCIONAL, pero funciona aquí)
    try {
        if (process.env.NODE_ENV === 'development') {
            const Usuario = require('./models/Usuario');
            const bcrypt = require('bcryptjs');
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

            const existing = await Usuario.findOne({ email: adminEmail });
            if (!existing) {
                const salt = await bcrypt.genSalt(10);
                const hashed = await bcrypt.hash(adminPassword, salt);
                const adminUser = new Usuario({
                    nombre: 'Administrador',
                    email: adminEmail,
                    password: hashed,
                    rol: 'admin'
                });
                await adminUser.save();
                console.log(`Usuario administrador creado: ${adminEmail}`);
            } else {
                console.log('Usuario administrador ya existe:', adminEmail);
            }
        }
    } catch (err) {
        console.error('Error creando usuario admin por defecto:', err.message);
    }
})
.catch(err => {
    console.error('❌ Error al conectar a MongoDB:', err);
    // Terminar el proceso si no se puede conectar a la DB
    process.exit(1);
});

// Nota: Las rutas y el app.listen YA NO ESTÁN aquí fuera.