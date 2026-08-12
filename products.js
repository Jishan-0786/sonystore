/**
 * SONY STORE - Admin Product & Stock Management Module
 * Manages product table rendering, stock filters (In Stock, Low Stock, Out of Stock),
 * inline stock adjustment, and product Add/Edit/Delete modals.
 */

let adminProductsList = [];
let activeStockTab = 'all';

function getStoredProducts() {
    try {
        const stored = localStorage.getItem('sony_store_products');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return typeof defaultProducts !== 'undefined' ? defaultProducts : [];
}

function saveProductsToStorage(newProductsList) {
    localStorage.setItem('sony_store_products', JSON.stringify(newProductsList));
    adminProductsList = newProductsList;
    if (typeof updateAdminNotifications === 'function') updateAdminNotifications();
}

function updateStockQuantity(productId, newQty) {
    const productsList = getStoredProducts();
    const target = productsList.find(p => p.id === parseInt(productId));
    if (target) {
        target.stock = Math.max(0, parseInt(newQty) || 0);
        saveProductsToStorage(productsList);
        if (typeof updateSupabaseProductStock === 'function') {
            updateSupabaseProductStock(productId, target.stock);
        }
        renderProductsTable();
        return true;
    }
    return false;
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTbody');
    const searchInput = document.getElementById('prodSearchInput');

    if (!tbody) return;

    adminProductsList = getStoredProducts();
    const settings = typeof getStoreSettings === 'function' ? getStoreSettings() : { lowStockThreshold: 5 };

    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtered = [...adminProductsList];

    // Filter by Stock Status Tabs
    if (activeStockTab === 'in-stock') {
        filtered = filtered.filter(p => (p.stock || 0) > settings.lowStockThreshold);
    } else if (activeStockTab === 'low-stock') {
        filtered = filtered.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= settings.lowStockThreshold);
    } else if (activeStockTab === 'out-of-stock') {
        filtered = filtered.filter(p => (p.stock || 0) <= 0);
    }

    // Filter by Search Query
    if (search) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) ||
            p.brand.toLowerCase().includes(search) ||
            (p.sku && p.sku.toLowerCase().includes(search)) ||
            (p.category && p.category.toLowerCase().includes(search))
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">No matching products found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const stockVal = p.stock || 0;
        let badgeClass = 'badge-in-stock';
        let statusText = 'IN STOCK';

        if (stockVal <= 0) {
            badgeClass = 'badge-out-of-stock';
            statusText = 'OUT OF STOCK';
        } else if (stockVal <= settings.lowStockThreshold) {
            badgeClass = 'badge-low-stock';
            statusText = 'LOW STOCK';
        }

        return `
            <tr>
                <td>
                    <img src="${p.images[0]}" alt="${p.name}" style="width: 48px; height: 48px; object-fit: contain; background: #000; border-radius: 6px; padding: 2px;">
                </td>
                <td style="font-weight: 700; color: #fff;">
                    ${p.name}
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${p.brand}</div>
                </td>
                <td>${p.category || 'Luxury'}</td>
                <td style="font-weight: 700; color: var(--gold-light);">$${p.price.toLocaleString()}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <input type="number" value="${stockVal}" onchange="updateStockQuantity(${p.id}, this.value)" class="admin-input" style="width: 70px; padding: 4px 8px; font-weight: 700;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">units</span>
                    </div>
                </td>
                <td>
                    <span class="badge-status ${badgeClass}">${statusText} (${stockVal})</span>
                </td>
                <td style="font-size: 0.8rem; color: var(--gold-primary);">${p.sku}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="editProductModal(${p.id})" class="btn-admin" style="padding: 4px 10px; font-size: 0.75rem;">EDIT</button>
                        <button onclick="deleteProductConfirm(${p.id})" class="btn-admin btn-admin-danger" style="padding: 4px 10px; font-size: 0.75rem;">DELETE</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterStockTab(tabName, btnElement) {
    activeStockTab = tabName;
    document.querySelectorAll('.stock-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderProductsTable();
}

function openAddProductModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    document.getElementById('modalFormTitle').textContent = 'ADD NEW TIMEPIECE';
    document.getElementById('productForm').reset();
    document.getElementById('prodIdInput').value = '';
    modal.style.display = 'flex';
}

function editProductModal(id) {
    const productsList = getStoredProducts();
    const p = productsList.find(prod => prod.id === id);
    const modal = document.getElementById('productModal');
    if (!p || !modal) return;

    document.getElementById('modalFormTitle').textContent = `EDIT TIMEPIECE: ${p.name}`;
    document.getElementById('prodIdInput').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodBrand').value = p.brand;
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodOldPrice').value = p.oldPrice || '';
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodCategory').value = p.category || 'Luxury';
    document.getElementById('prodSku').value = p.sku || '';
    document.getElementById('prodDesc').value = p.description || '';
    document.getElementById('prodMovement').value = p.movement || '';
    document.getElementById('prodMaterial').value = p.material || '';
    document.getElementById('prodCase').value = p.caseSize || '';
    document.getElementById('prodStrap').value = p.strap || '';
    document.getElementById('prodWater').value = p.waterResistance || '';

    modal.style.display = 'flex';
}

function deleteProductConfirm(id) {
    if (confirm('Are you sure you want to delete this timepiece from the inventory?')) {
        let productsList = getStoredProducts();
        productsList = productsList.filter(p => p.id !== id);
        saveProductsToStorage(productsList);
        renderProductsTable();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderProductsTable();

    const searchInput = document.getElementById('prodSearchInput');
    if (searchInput) searchInput.addEventListener('input', renderProductsTable);

    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('prodIdInput').value;
            let productsList = getStoredProducts();

            const formData = {
                id: id ? parseInt(id) : (productsList.length > 0 ? Math.max(...productsList.map(p => p.id)) + 1 : 1),
                name: document.getElementById('prodName').value.trim(),
                brand: document.getElementById('prodBrand').value.trim() || 'SONY STORE Luxury',
                price: parseFloat(document.getElementById('prodPrice').value),
                oldPrice: document.getElementById('prodOldPrice').value ? parseFloat(document.getElementById('prodOldPrice').value) : null,
                stock: parseInt(document.getElementById('prodStock').value) || 0,
                category: document.getElementById('prodCategory').value,
                sku: document.getElementById('prodSku').value.trim() || `SNY-PRD-${Date.now()}`,
                description: document.getElementById('prodDesc').value.trim(),
                movement: document.getElementById('prodMovement').value.trim(),
                material: document.getElementById('prodMaterial').value.trim(),
                caseSize: document.getElementById('prodCase').value.trim(),
                strap: document.getElementById('prodStrap').value.trim(),
                waterResistance: document.getElementById('prodWater').value.trim(),
                rating: 5.0,
                images: [
                    typeof createWatchSvgDataUri === 'function' 
                        ? createWatchSvgDataUri({ primary: '#d4af37', secondary: '#12141d', accent: '#ffffff' }, 'automatic')
                        : 'data:image/svg+xml;utf8,'
                ]
            };

            if (id) {
                const idx = productsList.findIndex(p => p.id === parseInt(id));
                if (idx !== -1) {
                    productsList[idx] = { ...productsList[idx], ...formData };
                }
            } else {
                productsList.unshift(formData);
            }

            saveProductsToStorage(productsList);
            document.getElementById('productModal').style.display = 'none';
            renderProductsTable();
        });
    }
});
