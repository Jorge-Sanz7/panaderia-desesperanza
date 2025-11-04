const Cart = require('../models/Cart');
const Producto = require('../models/Producto');

const cartController = {
  getCart: async (req, res) => {
    try {
      const userId = req.user.id;
      let cart = await Cart.findOne({ user: userId }).populate('items.producto');
      if (!cart) {
        cart = new Cart({ user: userId, items: [] });
        await cart.save();
        cart = await Cart.findById(cart._id).populate('items.producto');
      }
      res.json(cart);
    } catch (error) {
      console.error('Error al obtener carrito:', error);
      res.status(500).json({ mensaje: 'Error al obtener carrito', error: error.message });
    }
  },

  addItem: async (req, res) => {
    try {
      const userId = req.user.id;
      const { producto: productoId, cantidad = 1 } = req.body;

      if (!productoId) {
        return res.status(400).json({ mensaje: 'producto es requerido' });
      }

      const producto = await Producto.findById(productoId);
      if (!producto) {
        return res.status(404).json({ mensaje: 'Producto no encontrado' });
      }

      const cantidadSolicitada = Number(cantidad);
      if (cantidadSolicitada <= 0) {
        return res.status(400).json({ mensaje: 'Cantidad inválida' });
      }
      if (producto.cantidad < cantidadSolicitada) {
        return res.status(400).json({ mensaje: `Stock insuficiente. Disponible: ${producto.cantidad}` });
      }

      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({ user: userId, items: [] });
      }

      const existing = cart.items.find(i => i.producto.toString() === productoId.toString());
      if (existing) {
        const nuevaCantidad = existing.cantidad + cantidadSolicitada;
        if (nuevaCantidad > producto.cantidad) {
          return res.status(400).json({ mensaje: `Stock insuficiente para agregar esa cantidad. Disponible: ${producto.cantidad}` });
        }
        existing.cantidad = nuevaCantidad;
      } else {
        cart.items.push({ producto: productoId, cantidad: cantidadSolicitada, precioSnapshot: producto.precio });
      }

      await cart.save();
      cart = await Cart.findById(cart._id).populate('items.producto');
      res.status(201).json(cart);
    } catch (error) {
      console.error('Error al agregar item al carrito:', error);
      res.status(500).json({ mensaje: 'Error al agregar item', error: error.message });
    }
  },

  updateItem: async (req, res) => {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;
      const { cantidad } = req.body;

      if (cantidad == null) {
        return res.status(400).json({ mensaje: 'cantidad es requerida' });
      }

      const cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ mensaje: 'Carrito no encontrado' });

      const item = cart.items.id(itemId);
      if (!item) return res.status(404).json({ mensaje: 'Item no encontrado en carrito' });

      const producto = await Producto.findById(item.producto);
      if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

      if (cantidad > producto.cantidad) {
        return res.status(400).json({ mensaje: `Stock insuficiente. Disponible: ${producto.cantidad}` });
      }

      item.cantidad = Number(cantidad);
      if (item.cantidad <= 0) {
        cart.items = cart.items.filter(i => i._id.toString() !== itemId);
      }

      await cart.save();
      const updated = await Cart.findById(cart._id).populate('items.producto');
      res.json(updated);
    } catch (error) {
      console.error('Error al actualizar item:', error);
      res.status(500).json({ mensaje: 'Error al actualizar item', error: error.message });
    }
  },

  removeItem: async (req, res) => {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;

      let cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ mensaje: 'Carrito no encontrado' });

      const exists = cart.items.id(itemId);
      if (!exists) return res.status(404).json({ mensaje: 'Item no encontrado' });

      // ✅ eliminar con filtro (más seguro)
      cart.items = cart.items.filter(i => i._id.toString() !== itemId);
      await cart.save();

      cart = await Cart.findById(cart._id).populate('items.producto');
      res.json(cart);
    } catch (error) {
      console.error('Error al eliminar item:', error);
      res.status(500).json({ mensaje: 'Error al eliminar item', error: error.message });
    }
  },

  clearCart: async (req, res) => {
    try {
      const userId = req.user.id;
      const cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ mensaje: 'Carrito no encontrado' });
      cart.items = [];
      await cart.save();
      res.json({ mensaje: 'Carrito vaciado' });
    } catch (error) {
      console.error('Error al vaciar carrito:', error);
      res.status(500).json({ mensaje: 'Error al vaciar carrito', error: error.message });
    }
  },

  checkout: async (req, res) => {
    const mongoose = require('mongoose');

    const performCheckoutNoTx = async (userId, cart) => {
      for (const item of cart.items) {
        const producto = await Producto.findById(item.producto._id || item.producto);
        if (!producto) return { ok: false, status: 404, mensaje: `Producto no encontrado: ${item.producto}` };
        if (producto.cantidad < item.cantidad) {
          return { ok: false, status: 400, mensaje: `Stock insuficiente para ${producto.nombre}` };
        }
      }

      let total = 0;
      for (const item of cart.items) {
        const producto = await Producto.findById(item.producto._id || item.producto);
        producto.cantidad -= item.cantidad;
        await producto.save();
        total += (item.precioSnapshot || producto.precio) * item.cantidad;
      }

      const Order = require('../models/Order');
      const orden = new Order({
        user: userId,
        items: cart.items.map(i => ({
          producto: i.producto._id ? i.producto._id : i.producto,
          cantidad: i.cantidad,
          precio: i.precioSnapshot || 0
        })),
        total,
        estado: 'completado'
      });
      await orden.save();

      cart.items = [];
      await cart.save();

      return { ok: true, orden, total };
    };

    let session;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const userId = req.user.id;
      const cart = await Cart.findOne({ user: userId }).populate('items.producto').session(session);
      if (!cart || cart.items.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ mensaje: 'Carrito vacío' });
      }

      for (const item of cart.items) {
        const producto = await Producto.findById(item.producto._id).session(session);
        if (!producto) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ mensaje: `Producto no encontrado: ${item.producto._id}` });
        }
        if (producto.cantidad < item.cantidad) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ mensaje: `Stock insuficiente para ${producto.nombre}` });
        }
      }

      let total = 0;
      for (const item of cart.items) {
        const producto = await Producto.findById(item.producto._id).session(session);
        producto.cantidad -= item.cantidad;
        await producto.save({ session });
        total += (item.precioSnapshot || producto.precio) * item.cantidad;
      }

      const Order = require('../models/Order');
      const orden = new Order({
        user: userId,
        items: cart.items.map(i => ({
          producto: i.producto._id ? i.producto._id : i.producto,
          cantidad: i.cantidad,
          precio: i.precioSnapshot || 0
        })),
        total,
        estado: 'completado'
      });
      await orden.save({ session });

      cart.items = [];
      await cart.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.json({ mensaje: 'Compra completada', ordenId: orden._id, total });
    } catch (error) {
      if (session) {
        try { await session.abortTransaction(); } catch (e) {}
        try { session.endSession(); } catch (e) {}
      }
      console.warn('Transacción falló, reintentando sin transacción:', error && error.message);

      try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ user: userId }).populate('items.producto');
        if (!cart || cart.items.length === 0) {
          return res.status(400).json({ mensaje: 'Carrito vacío' });
        }

        const result = await performCheckoutNoTx(userId, cart);
        if (!result.ok) {
          return res.status(result.status || 400).json({ mensaje: result.mensaje });
        }

        return res.json({ mensaje: 'Compra completada', ordenId: result.orden._id, total: result.total });
      } catch (err2) {
        console.error('Error en checkout (fallback):', err2);
        return res.status(500).json({ mensaje: 'Error completando la compra', error: err2.message });
      }
    }
  }
};

module.exports = cartController;
