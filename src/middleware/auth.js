const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    
    if (!bearerHeader) {
        return res.status(401).json({ mensaje: 'Acceso denegado' });
    }

    try {
        const bearer = bearerHeader.split(' ');
        const token = bearer[1];
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ mensaje: 'Token inválido' });
    }
};

module.exports = verifyToken;