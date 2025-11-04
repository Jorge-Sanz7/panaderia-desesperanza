// ✅ Validación del lado del cliente
const validateProduct = (product) => {
    const errors = [];
    
    if (!product.nombre || product.nombre.trim().length < 3) {
        errors.push('El nombre debe tener al menos 3 caracteres');
    }

    if (!product.precio || product.precio <= 0) {
        errors.push('El precio debe ser mayor a 0');
    }

    if (!product.cantidad || product.cantidad < 0) {
        errors.push('La cantidad no puede ser negativa');
    }

    return errors;
};

// ✅ Manejador de errores
const handleError = (error) => {
    console.error('Error:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        Error: ${error.message || 'Ha ocurrido un error'}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(errorDiv, document.querySelector('.table-responsive'));
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
};

// ✅ Cargar productos
const loadProducts = async () => {
    try {
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error('Error al cargar productos');
        const productos = await response.json();
        renderProducts(productos);
    } catch (error) {
        handleError(error);
    }
};

// ✅ Renderizar productos en la tabla
const renderProducts = (products) => {
    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${product._id}</td>
            <td>${product.imagen ? `<img src="${product.imagen}" alt="${product.nombre}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;">` : ''}</td>
            <td>${product.nombre}</td>
            <td>$${product.precio.toFixed(2)}</td>
            <td>${product.cantidad}</td>
            <td>${product.categoria}</td>
            <td>
                ${product.temporada !== 'ninguna' ? 
                    `<span class="badge ${product.temporada === 'halloween' ? 'halloween-badge' : 'day-of-dead-badge'}">
                        ${product.temporada === 'halloween' ? 'Halloween' : 'Día de Muertos'}
                    </span>` : ''}
            </td>
            <td>
                <button class="btn btn-sm btn-primary edit-btn" data-id="${product._id}">Editar</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${product._id}">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Asignar eventos a los botones
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => editProduct(e.target.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteProduct(e.target.dataset.id));
    });
};

// ✅ Al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('token')) {
        window.location.href = '/';
        return;
    }

    loadProducts();

    const productModal = new bootstrap.Modal(document.getElementById('productModal'));
    let editingProductId = null;

    // Nuevo producto
    document.getElementById('addProductBtn').addEventListener('click', () => {
        editingProductId = null;
        document.getElementById('modalTitle').textContent = 'Agregar Producto';
        document.getElementById('productForm').reset();
        document.getElementById('imagenPreview').innerHTML = '';
        productModal.show();
    });

    // Mostrar/ocultar temporada
    document.getElementById('categoria').addEventListener('change', (e) => {
        document.getElementById('temporadaDiv').style.display =
            e.target.value === 'temporada' ? 'block' : 'none';
    });

    // Preview imagen
    const imagenInput = document.getElementById('imagen');
    const imagenPreview = document.getElementById('imagenPreview');
    if (imagenInput) {
        imagenInput.addEventListener('change', () => {
            imagenPreview.innerHTML = '';
            const file = imagenInput.files[0];
            if (file) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.style.width = '120px';
                img.style.height = '120px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '6px';
                imagenPreview.appendChild(img);
            }
        });
    }

    // ✅ Envío del formulario (agregar o editar)
    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('imagen');

        // Crear objeto para validar
        const productData = {
            nombre: document.getElementById('nombre').value.trim(),
            precio: parseFloat(document.getElementById('precio').value),
            cantidad: parseInt(document.getElementById('cantidad').value),
            categoria: document.getElementById('categoria').value,
            descripcion: document.getElementById('descripcion').value.trim(),
            temporada: document.getElementById('categoria').value === 'temporada'
                ? document.getElementById('temporada').value
                : 'ninguna'
        };

        // Validar datos
        const errors = validateProduct(productData);
        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        // Crear FormData
        const formData = new FormData();
        for (const key in productData) {
            formData.append(key, productData[key]);
        }

        if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('imagen', fileInput.files[0]);
        }

        try {
            const url = editingProductId ? `/api/productos/${editingProductId}` : '/api/productos';

            const response = await fetch(url, {
                method: editingProductId ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Error al guardar el producto');

            productModal.hide();
            loadProducts();
        } catch (error) {
            handleError(error);
        }
    });
});

// ✅ Editar producto
const editProduct = async (productId) => {
    try {
        const response = await fetch(`/api/productos/${productId}`);
        if (!response.ok) throw new Error('Error al cargar el producto');
        
        const product = await response.json();
        editingProductId = product._id;

        // Rellenar formulario
        document.getElementById('nombre').value = product.nombre;
        document.getElementById('precio').value = product.precio;
        document.getElementById('cantidad').value = product.cantidad;
        document.getElementById('categoria').value = product.categoria;
        document.getElementById('descripcion').value = product.descripcion;
        document.getElementById('temporada').value = product.temporada || 'ninguna';

        const imagenPreview = document.getElementById('imagenPreview');
        imagenPreview.innerHTML = '';
        if (product.imagen) {
            const img = document.createElement('img');
            img.src = product.imagen;
            img.style.width = '120px';
            img.style.height = '120px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '6px';
            imagenPreview.appendChild(img);
        }

        const imagenInput = document.getElementById('imagen');
        if (imagenInput) imagenInput.value = '';

        document.getElementById('modalTitle').textContent = 'Editar Producto';
        document.getElementById('temporadaDiv').style.display =
            product.categoria === 'temporada' ? 'block' : 'none';

        const productModal = new bootstrap.Modal(document.getElementById('productModal'));
        productModal.show();
    } catch (error) {
        handleError(error);
    }
};

// ✅ Eliminar producto
const deleteProduct = async (productId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    try {
        const response = await fetch(`/api/productos/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Error al eliminar el producto');

        loadProducts();
    } catch (error) {
        handleError(error);
    }
};
