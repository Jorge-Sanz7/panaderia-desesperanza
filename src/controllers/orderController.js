const Order = require('../models/Order');

const orderController = {
  // Obtener órdenes del usuario autenticado
  getMyOrders: async (req, res) => {
    try {
      const userId = req.user.id;
      const orders = await Order.find({ user: userId }).populate('items.producto');
      res.json(orders);
    } catch (error) {
      console.error('Error al obtener órdenes del usuario:', error);
      res.status(500).json({ mensaje: 'Error al obtener órdenes', error: error.message });
    }
  },

  // Obtener todas las órdenes (solo admin)
  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.find().populate('items.producto').populate('user', 'nombre email');
      res.json(orders);
    } catch (error) {
      console.error('Error al obtener todas las órdenes:', error);
      res.status(500).json({ mensaje: 'Error al obtener órdenes', error: error.message });
    }
  }
};

module.exports = orderController;
