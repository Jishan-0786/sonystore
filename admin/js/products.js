/**
 * SONY STORE - Admin Product & Stock Management Module
 * Comprehensive Product Adding System with Image Upload, Live Preview,
 * Supabase Storage & Database Synchronization, and Real-time Storefront Updates.
 */

let adminProductsList = [];
let activeStockTab = 'all';
let currentFormImages = [];

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
            (p.brand && p.brand.toLowerCase().includes(search)) ||
            (p.sku && p.sku.toLowerCase().includes(search)) ||
            (p.category && p.category.toLowerCase().includes(search))
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">No matching products found in inventory.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const stockVal = parseInt(p.stock || 0);
        const lowThreshold = parseInt(p.lowStockThreshold || settings.lowStockThreshold || 5);
        
        let badgeClass = 'badge-in-stock';
        let statusText = 'IN STOCK';

        if (stockVal <= 0) {
            badgeClass = 'badge-out-of-stock';
            statusText = 'OUT OF STOCK';
        } else if (stockVal <= lowThreshold) {
            badgeClass = 'badge-low-stock';
            statusText = 'LOW STOCK';
        }

        const isFeatured = p.featured !== false && p.is_featured !== false;
        const isActive = p.active !== false && p.is_active !== false;

        const mainImage = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'data:image/svg+xml;utf8,');

        return `
            <tr style="opacity: ${isActive ? '1' : '0.6'};">
                <td>
                    <img src="${mainImage}" alt="${p.name}" style="width: 48px; height: 48px; object-fit: contain; background: #000; border-radius: 6px; border: 1px solid var(--admin-border-subtle); padding: 2px;">
                </td>
                <td>
                    <div style="font-weight: 700; color: #fff;">${p.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${p.brand || 'SONY STORE Luxury'}</div>
                </td>
                <td>${p.category || 'Luxury'}</td>
                <td>
                    <div style="font-weight: 700; color: var(--gold-light);">$${parseFloat(p.price).toLocaleString()}</div>
                    ${p.oldPrice ? `<div style="font-size: 0.75rem; color: var(--text-muted); text-decoration: line-through;">$${parseFloat(p.oldPrice).toLocaleString()}</div>` : ''}
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <input type="number" value="${stockVal}" onchange="updateStockQuantity(${p.id}, this.value)" class="admin-input" style="width: 65px; padding: 4px 6px; font-weight: 700;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">units</span>
                    </div>
                </td>
                <td>
                    <span class="badge-status ${badgeClass}" style="display: block; margin-bottom: 4px;">${statusText} (${stockVal})</span>
                    <div style="display: flex; gap: 4px; font-size: 0.7rem;">
                        <span onclick="toggleFeaturedStatus(${p.id})" style="cursor: pointer; padding: 2px 6px; border-radius: 4px; background: ${isFeatured ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}; color: ${isFeatured ? 'var(--gold-light)' : 'var(--text-dim)'}; border: 1px solid var(--border-gold);" title="Toggle Featured">
                            ${isFeatured ? '⭐ Featured' : '☆ Standard'}
                        </span>
                        <span onclick="toggleActiveStatus(${p.id})" style="cursor: pointer; padding: 2px 6px; border-radius: 4px; background: ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color: ${isActive ? '#10b981' : '#ef4444'}; border: 1px solid ${isActive ? '#10b981' : '#ef4444'};" title="Toggle Active">
                            ${isActive ? '🟢 Active' : '🔴 Inactive'}
                        </span>
                    </div>
                </td>
                <td style="font-size: 0.78rem; color: var(--gold-primary); font-family: monospace;">${p.sku || `SNY-PRD-${p.id}`}</td>
                <td>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; max-width: 140px;">
                        <button onclick="viewProductDetails(${p.id})" class="btn-admin" style="padding: 3px 8px; font-size: 0.7rem; background: rgba(255,255,255,0.1);">VIEW</button>
                        <button onclick="editProductModal(${p.id})" class="btn-admin" style="padding: 3px 8px; font-size: 0.7rem;">EDIT</button>
                        <button onclick="duplicateProduct(${p.id})" class="btn-admin" style="padding: 3px 8px; font-size: 0.7rem; background: rgba(59,130,246,0.2); color: #60a5fa; border-color: rgba(59,130,246,0.4);">DUPLICATE</button>
                        <button onclick="deleteProductConfirm(${p.id})" class="btn-admin btn-admin-danger" style="padding: 3px 8px; font-size: 0.7rem;">DELETE</button>
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
    document.getElementById('modalFormTitle').textContent = 'ADD NEW PRODUCT';
    document.getElementById('productForm').reset();
    document.getElementById('prodIdInput').value = '';
    
    // Set default initial images with high-res luxury watch generator fallback
    const defaultSvg = typeof createWatchSvgDataUri === 'function' 
        ? createWatchSvgDataUri({ primary: '#d4af37', secondary: '#12141d', accent: '#ffffff' }, 'automatic')
        : 'data:image/svg+xml;utf8,';

    currentFormImages = [defaultSvg];
    renderImagePreviews();
    modal.style.display = 'flex';
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
}

function renderImagePreviews() {
    const container = document.getElementById('imagePreviewContainer');
    if (!container) return;

    if (currentFormImages.length === 0) {
        container.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted); margin: auto;">No images selected yet. Upload or enter a URL above.</span>`;
        return;
    }

    container.innerHTML = currentFormImages.map((imgUrl, index) => `
        <div class="image-preview-item">
            <img src="${imgUrl}" alt="Preview ${index + 1}">
            <button type="button" class="image-preview-remove" onclick="removeImageFromPreview(${index})" title="Remove Image">✕</button>
        </div>
    `).join('');
}

function handleImageFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentFormImages.push(e.target.result);
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    });
}

function addUrlImageToPreview() {
    const urlInput = document.getElementById('prodImageUrlInput');
    if (!urlInput) return;
    const url = urlInput.value.trim();
    if (url) {
        currentFormImages.push(url);
        renderImagePreviews();
        urlInput.value = '';
    }
}

function removeImageFromPreview(index) {
    currentFormImages.splice(index, 1);
    renderImagePreviews();
}

function editProductModal(id) {
    const productsList = getStoredProducts();
    const p = productsList.find(prod => prod.id === id);
    const modal = document.getElementById('productModal');
    if (!p || !modal) return;

    document.getElementById('modalFormTitle').textContent = `EDIT PRODUCT: ${p.name}`;
    document.getElementById('prodIdInput').value = p.id;
    document.getElementById('prodName').value = p.name || '';
    document.getElementById('prodBrand').value = p.brand || 'SONY STORE Luxury';
    document.getElementById('prodPrice').value = p.price || '';
    document.getElementById('prodSalePrice').value = p.oldPrice || p.sale_price || '';
    document.getElementById('prodStock').value = p.stock !== undefined ? p.stock : 25;
    document.getElementById('prodLowStockThreshold').value = p.lowStockThreshold || 5;
    document.getElementById('prodCategory').value = p.category || 'Luxury';
    document.getElementById('prodSku').value = p.sku || '';
    document.getElementById('prodDesc').value = p.description || '';
    document.getElementById('prodFeatured').value = (p.featured !== false && p.is_featured !== false) ? 'true' : 'false';
    document.getElementById('prodActive').value = (p.active !== false && p.is_active !== false) ? 'true' : 'false';

    document.getElementById('prodWatchType').value = p.watchType || p.type || 'automatic';
    document.getElementById('prodMovement').value = p.movement || '';
    document.getElementById('prodMaterial').value = p.material || p.case_material || '';
    document.getElementById('prodCase').value = p.caseSize || p.case_size || '';
    document.getElementById('prodStrap').value = p.strap || p.strap_material || '';
    document.getElementById('prodDialColor').value = p.dialColor || p.dial_color || '';
    document.getElementById('prodWater').value = p.waterResistance || p.water_resistance || '';
    document.getElementById('prodWarranty').value = p.warranty || '5 Years International Warranty';
    document.getElementById('prodGender').value = p.gender || 'Unisex';

    currentFormImages = (p.images && p.images.length > 0) ? [...p.images] : [(p.image || 'data:image/svg+xml;utf8,')];
    renderImagePreviews();

    modal.style.display = 'flex';
}

function duplicateProduct(id) {
    const productsList = getStoredProducts();
    const p = productsList.find(prod => prod.id === id);
    if (!p) return;

    openAddProductModal();
    document.getElementById('modalFormTitle').textContent = `DUPLICATE PRODUCT (COPY OF ${p.name})`;
    document.getElementById('prodName').value = `${p.name} (Copy)`;
    document.getElementById('prodBrand').value = p.brand || 'SONY STORE Luxury';
    document.getElementById('prodPrice').value = p.price || '';
    document.getElementById('prodSalePrice').value = p.oldPrice || '';
    document.getElementById('prodStock').value = p.stock || 25;
    document.getElementById('prodCategory').value = p.category || 'Luxury';
    document.getElementById('prodSku').value = `SNY-PRD-${Date.now()}`;
    document.getElementById('prodDesc').value = p.description || '';
    document.getElementById('prodMovement').value = p.movement || '';
    document.getElementById('prodMaterial').value = p.material || '';
    document.getElementById('prodCase').value = p.caseSize || '';
    document.getElementById('prodStrap').value = p.strap || '';
    document.getElementById('prodWater').value = p.waterResistance || '';

    currentFormImages = (p.images && p.images.length > 0) ? [...p.images] : [(p.image || 'data:image/svg+xml;utf8,')];
    renderImagePreviews();
}

async function saveProductFormData(e) {
    if (e) e.preventDefault();

    const idInput = document.getElementById('prodIdInput').value;
    let productsList = getStoredProducts();

    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value);

    if (!name || isNaN(price) || isNaN(stock)) {
        alert('Please fill out all required fields: Product Name, Price, and Stock Count.');
        return;
    }

    if (currentFormImages.length === 0) {
        const defaultSvg = typeof createWatchSvgDataUri === 'function' 
            ? createWatchSvgDataUri({ primary: '#d4af37', secondary: '#12141d', accent: '#ffffff' }, 'automatic')
            : 'data:image/svg+xml;utf8,';
        currentFormImages.push(defaultSvg);
    }

    const isEditing = Boolean(idInput);
    const newId = isEditing ? parseInt(idInput) : (productsList.length > 0 ? Math.max(...productsList.map(p => p.id)) + 1 : 1001);

    const formData = {
        id: newId,
        name: name,
        brand: document.getElementById('prodBrand').value.trim() || 'SONY STORE Luxury',
        price: price,
        oldPrice: document.getElementById('prodSalePrice').value ? parseFloat(document.getElementById('prodSalePrice').value) : null,
        stock: Math.max(0, stock),
        lowStockThreshold: parseInt(document.getElementById('prodLowStockThreshold').value) || 5,
        category: document.getElementById('prodCategory').value,
        sku: document.getElementById('prodSku').value.trim() || `SNY-PRD-${newId}`,
        description: document.getElementById('prodDesc').value.trim(),
        featured: document.getElementById('prodFeatured').value === 'true',
        is_featured: document.getElementById('prodFeatured').value === 'true',
        active: document.getElementById('prodActive').value === 'true',
        is_active: document.getElementById('prodActive').value === 'true',

        watchType: document.getElementById('prodWatchType').value,
        movement: document.getElementById('prodMovement').value.trim() || 'Calibre Automatic',
        material: document.getElementById('prodMaterial').value.trim() || '18k Solid Gold & Titanium',
        caseSize: document.getElementById('prodCase').value.trim() || '42mm',
        strap: document.getElementById('prodStrap').value.trim() || 'Italian Alligator Leather',
        dialColor: document.getElementById('prodDialColor').value.trim() || 'Sunburst Onyx Gold',
        waterResistance: document.getElementById('prodWater').value.trim() || '100m / 10 ATM',
        warranty: document.getElementById('prodWarranty').value.trim() || '5 Years International Warranty',
        gender: document.getElementById('prodGender').value,
        rating: 5.0,
        image: currentFormImages[0],
        images: [...currentFormImages]
    };

    // Save to Local Storage & Global State
    if (isEditing) {
        const idx = productsList.findIndex(p => p.id === newId);
        if (idx !== -1) {
            productsList[idx] = { ...productsList[idx], ...formData };
        }
    } else {
        productsList.unshift(formData);
    }
    saveProductsToStorage(productsList);

    // Save/Sync to Supabase Database if Supabase client available
    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('products').upsert([{
                id: formData.id,
                name: formData.name,
                brand: formData.brand,
                category: formData.category,
                price: formData.price,
                stock: formData.stock,
                sku: formData.sku,
                description: formData.description,
                movement: formData.movement,
                case_material: formData.material,
                strap_material: formData.strap,
                case_size: formData.caseSize,
                water_resistance: formData.waterResistance,
                is_featured: formData.featured,
                is_active: formData.active,
                image_url: formData.images[0]
            }]);
            console.log('✅ Supabase Product Sync Successful:', formData.name);
        } catch (err) {
            console.warn('Supabase product sync fallback:', err.message);
        }
    }

    closeProductModal();
    renderProductsTable();
    alert(`🎉 SUCCESS: Product "${formData.name}" has been ${isEditing ? 'updated' : 'added'} successfully and is live on SONY STORE!`);
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

function toggleFeaturedStatus(productId) {
    const productsList = getStoredProducts();
    const target = productsList.find(p => p.id === parseInt(productId));
    if (target) {
        const nextVal = !(target.featured !== false && target.is_featured !== false);
        target.featured = nextVal;
        target.is_featured = nextVal;
        saveProductsToStorage(productsList);
        renderProductsTable();
    }
}

function toggleActiveStatus(productId) {
    const productsList = getStoredProducts();
    const target = productsList.find(p => p.id === parseInt(productId));
    if (target) {
        const nextVal = !(target.active !== false && target.is_active !== false);
        target.active = nextVal;
        target.is_active = nextVal;
        saveProductsToStorage(productsList);
        renderProductsTable();
    }
}

function viewProductDetails(id) {
    const productsList = getStoredProducts();
    const p = productsList.find(prod => prod.id === id);
    const modal = document.getElementById('productDetailModal');
    const body = document.getElementById('detailModalBody');
    if (!p || !modal || !body) return;

    document.getElementById('detailModalTitle').textContent = p.name;
    const mainImg = (p.images && p.images.length > 0) ? p.images[0] : (p.image || '');

    body.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${mainImg}" alt="${p.name}" style="max-height: 220px; margin: 0 auto; object-fit: contain; background: #000; padding: 10px; border-radius: 10px; border: 1px solid var(--border-gold);">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem; color: var(--text-main);">
            <div><strong>Brand:</strong> ${p.brand || 'SONY STORE'}</div>
            <div><strong>Category:</strong> ${p.category}</div>
            <div><strong>Price:</strong> <span style="color: var(--gold-light); font-weight: 700;">$${parseFloat(p.price).toLocaleString()}</span></div>
            <div><strong>Stock:</strong> ${p.stock} units</div>
            <div><strong>SKU:</strong> ${p.sku || `SNY-PRD-${p.id}`}</div>
            <div><strong>Watch Type:</strong> ${p.watchType || p.type || 'Automatic'}</div>
            <div><strong>Movement:</strong> ${p.movement || 'Calibre S-8000'}</div>
            <div><strong>Material:</strong> ${p.material || '18k Gold'}</div>
            <div><strong>Case Size:</strong> ${p.caseSize || '42mm'}</div>
            <div><strong>Water Resistance:</strong> ${p.waterResistance || '100m'}</div>
        </div>
        <div style="margin-top: 14px; font-size: 0.85rem; color: var(--text-muted);">
            <strong>Description:</strong><br>${p.description || 'No description specified.'}
        </div>
    `;

    modal.style.display = 'flex';
}

function deleteProductConfirm(id) {
    const productsList = getStoredProducts();
    const p = productsList.find(prod => prod.id === id);
    const title = p ? p.name : `Product #${id}`;

    if (confirm(`Are you sure you want to delete "${title}" from the SONY STORE inventory?`)) {
        let updatedList = productsList.filter(prod => prod.id !== id);
        saveProductsToStorage(updatedList);

        // Delete from Supabase if connected
        if (window.supabaseClient) {
            try {
                window.supabaseClient.from('products').delete().eq('id', id);
            } catch (err) {
                console.warn('Supabase product delete fallback:', err.message);
            }
        }

        renderProductsTable();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderProductsTable();

    const searchInput = document.getElementById('prodSearchInput');
    if (searchInput) searchInput.addEventListener('input', renderProductsTable);

    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', saveProductFormData);
    }
});
