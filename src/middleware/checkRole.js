const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ mensaje: 'No autenticado' });
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ mensaje: 'No tienes permiso para realizar esta acción' });
        }

        next();
    };
};

module.exports = checkRole;