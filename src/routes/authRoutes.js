const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const verifyToken = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login intento:', { email, passwordLength: password ? password.length : 0 });

        // Validar campos
        if (!email || !password) {
            return res.status(400).json({ mensaje: 'Todos los campos son requeridos' });
        }

        // Buscar usuario
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            console.log('Login fallido: usuario no encontrado para email', email);
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, usuario.password);
        console.log('Verificación de contraseña:', { email, validPassword });
        if (!validPassword) {
            console.log('Login fallido: contraseña inválida para', email);
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        // Crear y enviar token
        const token = jwt.sign(
            { id: usuario._id, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

    console.log('Login exitoso, token creado para', email);
    res.json({ token });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            mensaje: 'Error en el servidor',
            error: error.message 
        });
    }
});

// Registro público (para clientes)
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        console.log('Intento de registro:', { nombre, email, passwordLength: password ? password.length : 0 });

        // Validar campos mínimos
        if (!nombre || !email || !password) {
            return res.status(400).json({ mensaje: 'Todos los campos son requeridos' });
        }

        // Verificar si el usuario ya existe
        const usuarioExistente = await Usuario.findOne({ email });
        console.log('Usuario existente:', !!usuarioExistente);
        if (usuarioExistente) {
            return res.status(400).json({ mensaje: 'El email ya está registrado' });
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear nuevo usuario (siempre como cliente)
        const usuario = new Usuario({
            nombre,
            email,
            password: hashedPassword,
            rol: 'cliente'  // Forzar rol de cliente para registro público
        });

        await usuario.save();

        // Generar token para login inmediato
        const token = jwt.sign(
            { id: usuario._id, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(201).json({ mensaje: 'Usuario creado exitosamente', token });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            mensaje: 'Error al registrar usuario',
            error: error.message 
        });
    }
});

// Registro de admin/empleado (protegido)
router.post('/register/staff', verifyToken, async (req, res) => {
    try {
        // Verificar si el usuario que hace la petición es admin
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ mensaje: 'Solo los administradores pueden registrar personal' });
        }

        const { nombre, email, password, rol } = req.body;

        // Verificar que el rol sea válido
        if (!['admin', 'empleado'].includes(rol)) {
            return res.status(400).json({ mensaje: 'Rol inválido' });
        }

        // Verificar si el usuario ya existe
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ mensaje: 'El email ya está registrado' });
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear nuevo usuario
        const usuario = new Usuario({
            nombre,
            email,
            password: hashedPassword,
            rol
        });

        await usuario.save();
        res.status(201).json({ mensaje: 'Usuario del staff creado exitosamente' });
    } catch (error) {
        console.error('Error en registro de staff:', error);
        res.status(500).json({ 
            mensaje: 'Error al registrar usuario del staff',
            error: error.message 
        });
    }
});

module.exports = router;