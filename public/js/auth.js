// Decodificar token JWT
const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

// Verificar token y obtener rol
const verifyToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    const tokenData = parseJwt(token);
    return tokenData ? { isValid: true, rol: tokenData.rol } : { isValid: false };
};

// Verificar si es admin
const isAdmin = () => {
    const { isValid, rol } = verifyToken();
    return isValid && rol === 'admin';
};

// Cerrar sesión
const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Si estamos en la página de inventario, verificar permisos
    if (window.location.pathname === '/inventario.html') {
        const { isValid, rol } = verifyToken();
        if (!isValid) {
            window.location.href = '/';
            return;
        }

        // Solo admin puede acceder a la página de inventario
        if (rol !== 'admin') {
            alert('No tienes permiso para acceder a esta página');
            window.location.href = '/';
            return;
        }
    }

    // Actualizar UI basado en el rol del usuario
    const { isValid, rol } = verifyToken();
    if (isValid) {
        // Mostrar/ocultar elementos según el rol
        document.querySelectorAll('[data-role]').forEach(element => {
            const requiredRole = element.dataset.role;
            if (requiredRole === rol || (requiredRole === 'any' && isValid)) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });

        // Mostrar nombre del rol en la UI si existe el elemento
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = rol.charAt(0).toUpperCase() + rol.slice(1);
        }
    }
});