const getToken = () => localStorage.getItem('token');

const formatCurrency = (n) => `$${Number(n).toFixed(2)}`;

const loadCart = async () => {
  try {
    const token = getToken();
    if (!token) {
      document.getElementById('cartContainer').innerHTML =
        '<div class="alert alert-warning">Debes iniciar sesión para ver tu carrito.</div>';
      return;
    }

    const res = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('No se pudo cargar el carrito');
    const cart = await res.json();
    renderCart(cart);
  } catch (err) {
    document.getElementById('cartContainer').innerHTML =
      `<div class="alert alert-danger">${err.message}</div>`;
  }
};

const renderCart = (cart) => {
  const container = document.getElementById('cartContainer');
  if (!cart.items || cart.items.length === 0) {
    container.innerHTML = '<div class="alert alert-info">Tu carrito está vacío.</div>';
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio</th>
            <th>Cantidad</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
  `;

  let total = 0;
  cart.items.forEach(item => {
    const prod = item.producto || {};
    const price = item.precioSnapshot || (prod.precio || 0);
    const subtotal = price * item.cantidad;
    total += subtotal;
    html += `
      <tr data-item-id="${item._id}">
        <td>${prod.nombre || 'Producto'}</td>
        <td>${formatCurrency(price)}</td>
        <td><input type="number" min="1" value="${item.cantidad}" class="form-control qty-input" style="width:80px"></td>
        <td>${formatCurrency(subtotal)}</td>
        <td><button class="btn btn-sm btn-danger remove-btn">Eliminar</button></td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
    <div class="d-flex justify-content-end align-items-center">
      <h4 class="me-3">Total: ${formatCurrency(total)}</h4>
      <button class="btn btn-success" id="checkoutBtn">Pagar</button>
    </div>
  `;

  container.innerHTML = html;

  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const tr = e.target.closest('tr');
      const itemId = tr.dataset.itemId;
      await removeItem(itemId);
    });
  });

  document.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const tr = e.target.closest('tr');
      const itemId = tr.dataset.itemId;
      const cantidad = Number(e.target.value) || 1;
      await updateItem(itemId, cantidad);
    });
  });

  document.getElementById('checkoutBtn').addEventListener('click', async () => {
    if (!confirm('¿Confirmas realizar la compra y descontar del inventario?')) return;

    const btn = document.getElementById('checkoutBtn');
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Procesando...';

    try {
      const token = getToken();
      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.mensaje || body.error || 'Error en el checkout');

      alert(`Compra completada\nOrden: ${body.ordenId || ''}\nTotal: $${body.total || '0'}`);

      loadCart();
      if (typeof window.loadGallery === 'function') window.loadGallery();
      if (typeof window.loadProducts === 'function') window.loadProducts();
    } catch (err) {
      alert(err.message || 'Error en el checkout');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
};

const removeItem = async (itemId) => {
  try {
    const token = getToken();
    const res = await fetch(`/api/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo eliminar el item');
    await loadCart(); // ✅ actualiza carrito
  } catch (err) {
    alert(err.message);
  }
};

const updateItem = async (itemId, cantidad) => {
  try {
    const token = getToken();
    const res = await fetch(`/api/cart/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cantidad })
    });
    if (!res.ok) throw new Error('No se pudo actualizar la cantidad');
    await loadCart(); // ✅ actualiza también al cambiar cantidad
  } catch (err) {
    alert(err.message);
  }
};

document.addEventListener('DOMContentLoaded', loadCart);
