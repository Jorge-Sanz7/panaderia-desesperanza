// Manejador de errores global 
const handleError = (error) => {
    console.error('Error:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        Error: ${error.message || 'Ha ocurrido un error'}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(errorDiv, document.querySelector('.row'));
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
};

// Cargar productos en la galería
const loadGallery = async () => {
    try {
        const response = await fetch('/api/productos');
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        const productos = await response.json();
        renderGallery(productos);
    } catch (error) {
        handleError(error);
    }
};

// Renderizar galería de productos
const renderGallery = (products) => {
    const gallery = document.getElementById('productGallery');
    gallery.innerHTML = '';

    products.forEach(product => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4';
        col.innerHTML = `
            <div class="card product-card shadow-sm">
                ${product.imagen ? 
                    `<img src="${product.imagen}" class="card-img-top" alt="${product.nombre}" style="height: 200px; object-fit: cover;">`
                    : `<img src="/img/default.jpg" class="card-img-top" alt="Sin imagen" style="height: 200px; object-fit: cover;">`}
                <div class="card-body">
                    <h5 class="card-title text-capitalize">${product.nombre}</h5>
                    ${product.temporada !== 'ninguna' ? 
                        `<span class="badge ${product.temporada === 'halloween' ? 'halloween-badge' : 'day-of-dead-badge'}">
                            ${product.temporada === 'halloween' ? 'Halloween' : 'Día de Muertos'}
                        </span>` : 
                        ''}
                    <p class="card-text mt-2">${product.descripcion || ''}</p>
                    <p class="card-text">
                        <strong>Precio:</strong> $${product.precio.toFixed(2)}<br>
                        <strong>Disponible:</strong> ${product.cantidad} unidades
                    </p>
                    <div class="d-flex justify-content-between mt-3">
                        <button class="btn btn-sm btn-outline-primary add-to-cart" data-id="${product._id}">Agregar al carrito</button>
                        <a href="/inventario.html" class="btn btn-sm btn-secondary">Ver inventario</a>
                    </div>
                </div>
            </div>
        `;
        gallery.appendChild(col);
    });

    // Botón de agregar al carrito
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const productId = e.target.dataset.id;
            const token = localStorage.getItem('token');
            if (!token) {
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
                sessionStorage.setItem('pendingAddToCart', productId);
                return;
            }

            try {
                const res = await fetch('/api/cart/items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ producto: productId, cantidad: 1 })
                });

                if (!res.ok) throw new Error('No se pudo agregar al carrito');
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-success fixed-top m-3';
                alertDiv.style.zIndex = 2000;
                alertDiv.textContent = 'Producto agregado al carrito';
                document.body.appendChild(alertDiv);
                setTimeout(() => alertDiv.remove(), 2000);
            } catch (err) {
                alert(err.message || 'Error agregando al carrito');
            }
        });
    });
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadGallery();
    
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    
    document.getElementById('loginBtn')?.addEventListener('click', () => loginModal.show());
    document.getElementById('registerBtn')?.addEventListener('click', () => registerModal.show());

    document.getElementById('showRegisterBtn')?.addEventListener('click', () => {
        loginModal.hide();
        registerModal.show();
    });

    document.getElementById('showLoginBtn')?.addEventListener('click', () => {
        registerModal.hide();
        loginModal.show();
    });

    // Login
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const loginData = {
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        };

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });

            if (!response.ok) throw new Error('Credenciales inválidas');
            const data = await response.json();
            localStorage.setItem('token', data.token);
            const tokenData = JSON.parse(atob(data.token.split('.')[1]));
            localStorage.setItem('userRole', tokenData.rol);

            const pending = sessionStorage.getItem('pendingAddToCart');
            if (pending) {
                await fetch('/api/cart/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
                    body: JSON.stringify({ producto: pending, cantidad: 1 })
                }).catch(console.warn);
                sessionStorage.removeItem('pendingAddToCart');
            }

            if (tokenData.rol === 'admin' || tokenData.rol === 'empleado') {
                window.location.href = '/inventario.html';
            } else {
                loginModal.hide();
                window.location.reload();
            }
        } catch (error) {
            handleError(error);
        }
    });

    // Registro
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const registerData = {
            nombre: document.getElementById('registerName').value,
            email: document.getElementById('registerEmail').value,
            password: document.getElementById('registerPassword').value
        };

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.mensaje || 'Error registrando usuario');
            }

            const data = await response.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                const tokenData = JSON.parse(atob(data.token.split('.')[1]));
                localStorage.setItem('userRole', tokenData.rol);

                const pending = sessionStorage.getItem('pendingAddToCart');
                if (pending) {
                    await fetch('/api/cart/items', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
                        body: JSON.stringify({ producto: pending, cantidad: 1 })
                    }).catch(console.warn);
                    sessionStorage.removeItem('pendingAddToCart');
                }

                registerModal.hide();
                window.location.reload();
            } else {
                registerModal.hide();
                loginModal.show();
            }
        } catch (error) {
            handleError(error);
        }
    });
});
