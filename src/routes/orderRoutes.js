const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// Rutas de órdenes
router.get('/my-orders', verifyToken, orderController.getMyOrders);
router.get('/', verifyToken, checkRole(['admin']), orderController.getAllOrders);

module.exports = router;
