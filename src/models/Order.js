const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  items: [
    {
      producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
      cantidad: { type: Number, required: true, min: 1 },
      precio: { type: Number, required: true }
    }
  ],
  total: { type: Number, required: true },
  estado: { type: String, enum: ['pendiente', 'completado', 'cancelado'], default: 'pendiente' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
