/**
 * SONY STORE - Shop & Collection Page Controller
 * Handles dynamic product card rendering, search filtering, category tabs, availability filters, and sorting.
 */

let activeCategory = 'all';
let searchQuery = '';
let activeAvailability = 'all';
let activeSort = 'featured';

function renderProductCard(product) {
    const stockInfo = getStockStatus(product.stock);
    const wishlist = getStoredWishlist();
    const isWishlisted = wishlist.includes(product.id);

    return `
        <div class="watch-card" data-id="${product.id}">
            <span class="stock-badge ${stockInfo.class}">${stockInfo.text.split('—')[0]}</span>
            <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}" data-id="${product.id}" onclick="toggleWishlist(${product.id})" title="Add to Wishlist">
                ♥
            </button>
            <a href="product.html?id=${product.id}" class="card-image-box">
                <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
            </a>
            <div class="card-content">
                <span class="card-brand">${product.brand}</span>
                <h3 class="card-title">
                    <a href="product.html?id=${product.id}">${product.name}</a>
                </h3>
                <p class="card-desc">${product.description}</p>
                <div class="card-pricing">
                    <span class="price-current">$${product.price.toLocaleString()}</span>
                    ${product.oldPrice ? `<span class="price-old">$${product.oldPrice.toLocaleString()}</span>` : ''}
                </div>
                <div class="card-actions">
                    <a href="product.html?id=${product.id}" class="btn-card-details">View Details</a>
                    <button class="btn-card-cart" ${product.stock <= 0 ? 'disabled' : ''} onclick="addToCart(${product.id}, 1)">
                        ${product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function filterAndSortProducts() {
    let filtered = [...products];

    // Filter by Category
    if (activeCategory !== 'all') {
        filtered = filtered.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.brand.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query)
        );
    }

    // Filter by Availability
    if (activeAvailability === 'in-stock') {
        filtered = filtered.filter(p => p.stock > 0);
    } else if (activeAvailability === 'low-stock') {
        filtered = filtered.filter(p => p.stock > 0 && p.stock <= 5);
    }

    // Sort Products
    if (activeSort === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'popularity') {
        filtered.sort((a, b) => b.rating - a.rating);
    } else if (activeSort === 'newest') {
        filtered.sort((a, b) => b.id - a.id);
    }

    return filtered;
}

function updateShopGrid() {
    const grid = document.getElementById('shopProductsGrid');
    const countEl = document.getElementById('shopProductCount');
    
    if (!grid) return;

    const filtered = filterAndSortProducts();

    if (countEl) {
        countEl.textContent = `${filtered.length} Timepiece${filtered.length === 1 ? '' : 's'} Found`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                <h3 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 12px; color: var(--gold-primary);">No Timepieces Match Your Filter</h3>
                <p style="color: var(--text-muted); margin-bottom: 20px;">Try adjusting your search term or category filters.</p>
                <button onclick="resetShopFilters()" class="btn-primary">Reset Filters</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(renderProductCard).join('');
}

function resetShopFilters() {
    activeCategory = 'all';
    searchQuery = '';
    activeAvailability = 'all';
    activeSort = 'featured';

    const searchInput = document.getElementById('shopSearchInput');
    if (searchInput) searchInput.value = '';

    const categoryBtns = document.querySelectorAll('.pill-btn');
    categoryBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'all');
    });

    const sortSelect = document.getElementById('shopSortSelect');
    if (sortSelect) sortSelect.value = 'featured';

    const availSelect = document.getElementById('shopAvailabilitySelect');
    if (availSelect) availSelect.value = 'all';

    updateShopGrid();
}

document.addEventListener('DOMContentLoaded', () => {
    // Check if on shop page
    if (!document.getElementById('shopProductsGrid')) return;

    // Check URL parameters for pre-selected category or search
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    const searchParam = urlParams.get('search');

    if (categoryParam) {
        activeCategory = categoryParam;
    }
    if (searchParam) {
        searchQuery = searchParam;
        const searchInput = document.getElementById('shopSearchInput');
        if (searchInput) searchInput.value = searchParam;
    }

    // Category Pill Click Handlers
    document.querySelectorAll('.pill-btn').forEach(btn => {
        if (btn.dataset.category === activeCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }

        btn.addEventListener('click', () => {
            document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.category;
            updateShopGrid();
        });
    });

    // Live Search Input Listener
    const searchInput = document.getElementById('shopSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            updateShopGrid();
        });
    }

    // Sort Dropdown Listener
    const sortSelect = document.getElementById('shopSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            activeSort = e.target.value;
            updateShopGrid();
        });
    }

    // Availability Filter Listener
    const availSelect = document.getElementById('shopAvailabilitySelect');
    if (availSelect) {
        availSelect.addEventListener('change', (e) => {
            activeAvailability = e.target.value;
            updateShopGrid();
        });
    }

    // Initial Render
    updateShopGrid();
});
