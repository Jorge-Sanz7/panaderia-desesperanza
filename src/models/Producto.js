const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es requerido'],
        minlength: [3, 'El nombre debe tener al menos 3 caracteres']
    },
    precio: {
        type: Number,
        required: [true, 'El precio es requerido'],
        min: [0, 'El precio no puede ser negativo']
    },
    cantidad: {
        type: Number,
        required: [true, 'La cantidad es requerida'],
        min: [0, 'La cantidad no puede ser negativa'],
        default: 0
    },
    descripcion: String,
    categoria: {
        type: String,
        required: [true, 'La categoría es requerida'],
        enum: {
            values: ['pan-dulce', 'pan-salado', 'temporada'],
            message: '{VALUE} no es una categoría válida'
        }
    },
    temporada: {
        type: String,
        enum: {
            values: ['ninguna', 'dia-muertos', 'halloween'],
            message: '{VALUE} no es una temporada válida'
        },
        default: 'ninguna'
    },
    imagen: {
        type: String
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    }
});

// Middleware para validación personalizada
productoSchema.pre('save', function(next) {
    if (this.categoria === 'temporada' && this.temporada === 'ninguna') {
        next(new Error('Los productos de temporada deben especificar una temporada válida'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Producto', productoSchema);