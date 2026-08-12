/**
 * SONY STORE - Admin Core & Dashboard Manager
 * Manages admin security gates, top-bar notifications, animated count-up numbers,
 * store settings storage, and SVG sales chart rendering.
 */

// Admin Authentication Helpers
function getAdminAuth() {
    try {
        const auth = JSON.parse(localStorage.getItem('sony_store_admin_auth'));
        return auth && auth.loggedIn ? auth : null;
    } catch (e) {
        return null;
    }
}

function setAdminAuth(token = 'demo-admin-session') {
    localStorage.setItem('sony_store_admin_auth', JSON.stringify({
        loggedIn: true,
        username: 'Admin Concierge',
        token: token,
        loginTime: new Date().toISOString()
    }));
}

function logoutAdmin() {
    localStorage.removeItem('sony_store_admin_auth');
    window.location.href = 'login.html';
}

function requireAdminAuth() {
    if (window.location.pathname.endsWith('admin/login.html') || window.location.pathname.endsWith('login.html')) {
        return;
    }
    const auth = getAdminAuth();
    if (!auth) {
        window.location.href = 'login.html';
    }
}

// Store Settings Management (localStorage: sony_store_settings)
const defaultStoreSettings = {
    storeName: "SONY STORE",
    currency: "$",
    deliveryFee: 0,
    lowStockThreshold: 5,
    contactPhone: "+1 (800) 555-SONY-WATCH",
    contactEmail: "support@sonystore.com"
};

function getStoreSettings() {
    try {
        const settings = localStorage.getItem('sony_store_settings');
        if (settings) return JSON.parse(settings);
    } catch (e) {}
    localStorage.setItem('sony_store_settings', JSON.stringify(defaultStoreSettings));
    return defaultStoreSettings;
}

function saveStoreSettings(newSettings) {
    localStorage.setItem('sony_store_settings', JSON.stringify(newSettings));
}

// Animated Number Counter Effect
function animateCounter(elementId, targetValue, isCurrency = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let start = 0;
    const duration = 1200;
    const stepTime = 30;
    const steps = duration / stepTime;
    const increment = targetValue / steps;

    const timer = setInterval(() => {
        start += increment;
        if (start >= targetValue) {
            start = targetValue;
            clearInterval(timer);
        }
        el.textContent = isCurrency ? `$${Math.round(start).toLocaleString()}` : Math.round(start).toLocaleString();
    }, stepTime);
}

// Top Bar Notifications System (Scans orders and product inventory)
function updateAdminNotifications() {
    const orders = JSON.parse(localStorage.getItem('sony_store_orders')) || [];
    const products = JSON.parse(localStorage.getItem('sony_store_products')) || [];
    const settings = getStoreSettings();

    const notifList = [];

    // Pending Orders
    const pendingOrders = orders.filter(o => o.status === 'Pending');
    if (pendingOrders.length > 0) {
        notifList.push({
            title: `${pendingOrders.length} New Order${pendingOrders.length === 1 ? '' : 's'} Pending`,
            time: 'Action Required',
            icon: '📦'
        });
    }

    // Low Stock & Out of Stock Alerts
    const outOfStock = products.filter(p => (p.stock || 0) <= 0);
    const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= settings.lowStockThreshold);

    if (outOfStock.length > 0) {
        notifList.push({
            title: `${outOfStock.length} Product${outOfStock.length === 1 ? '' : 's'} Out of Stock!`,
            time: 'Immediate Restock Needed',
            icon: '🔴'
        });
    }

    if (lowStock.length > 0) {
        notifList.push({
            title: `${lowStock.length} Product${lowStock.length === 1 ? '' : 's'} Below Stock Threshold (${settings.lowStockThreshold})`,
            time: 'Inventory Notice',
            icon: '⚠️'
        });
    }

    // Update Badge & Dropdown DOM
    const badgeEl = document.getElementById('adminNotifBadge');
    const dropdownEl = document.getElementById('adminNotifDropdown');

    if (badgeEl) {
        badgeEl.textContent = notifList.length;
        badgeEl.style.display = notifList.length > 0 ? 'flex' : 'none';
    }

    if (dropdownEl) {
        if (notifList.length === 0) {
            dropdownEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 10px;">No new alerts. Store running smoothly.</div>`;
        } else {
            dropdownEl.innerHTML = `
                <div style="font-family: var(--font-heading); font-size: 0.9rem; color: var(--gold-light); margin-bottom: 10px; border-bottom: 1px solid var(--admin-border-subtle); padding-bottom: 6px;">STORE NOTIFICATIONS</div>
                ${notifList.map(n => `
                    <div class="notif-item">
                        <div style="font-weight: 700;">${n.icon} ${n.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${n.time}</div>
                    </div>
                `).join('')}
            `;
        }
    }
}

// Lightweight SVG Sales Chart Generator
function renderSalesOverviewChart(timeRange = 'week') {
    const chartBox = document.getElementById('salesChartBox');
    if (!chartBox) return;

    const orders = JSON.parse(localStorage.getItem('sony_store_orders')) || [];

    let labels = [];
    let dataPoints = [];

    if (timeRange === 'today') {
        labels = ['8 AM', '11 AM', '2 PM', '5 PM', '8 PM', 'Now'];
        dataPoints = [4500, 8900, 14200, 18900, 24500, 29800];
    } else if (timeRange === 'month') {
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        dataPoints = [34000, 48500, 62000, 89000];
    } else { // 'week' default
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dataPoints = [12000, 18500, 14200, 24800, 31000, 42500, 58000];
    }

    // Calculate chart height bounds
    const maxVal = Math.max(...dataPoints, 10000);
    const chartHeight = 160;
    const chartWidth = 550;
    const stepX = chartWidth / (labels.length - 1);

    const pointsStr = dataPoints.map((val, idx) => {
        const x = idx * stepX;
        const y = chartHeight - (val / maxVal) * (chartHeight - 30);
        return `${x},${y}`;
    }).join(' ');

    const svgHtml = `
        <svg viewBox="0 0 ${chartWidth} ${chartHeight + 30}" width="100%" height="200" style="overflow: visible;">
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#d4af37" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#d4af37" stop-opacity="0.0"/>
                </linearGradient>
            </defs>

            <!-- Grid Lines -->
            <line x1="0" y1="40" x2="${chartWidth}" y2="40" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
            <line x1="0" y1="90" x2="${chartWidth}" y2="90" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
            <line x1="0" y1="140" x2="${chartWidth}" y2="140" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>

            <!-- Area Fill -->
            <polygon points="0,${chartHeight} ${pointsStr} ${chartWidth},${chartHeight}" fill="url(#chartGrad)"/>

            <!-- Line -->
            <polyline points="${pointsStr}" fill="none" stroke="#f5d77f" stroke-width="3" stroke-linecap="round"/>

            <!-- Data Dots & X Labels -->
            ${dataPoints.map((val, idx) => {
                const x = idx * stepX;
                const y = chartHeight - (val / maxVal) * (chartHeight - 30);
                return `
                    <circle cx="${x}" cy="${y}" r="5" fill="#d4af37" stroke="#000" stroke-width="2"/>
                    <text x="${x}" y="${chartHeight + 24}" fill="#94a3b8" font-size="11" text-anchor="middle">${labels[idx]}</text>
                    <text x="${x}" y="${y - 10}" fill="#f5d77f" font-size="10" font-weight="bold" text-anchor="middle">$${Math.round(val / 1000)}k</text>
                `;
            }).join('')}
        </svg>
    `;

    chartBox.innerHTML = svgHtml;
}

// Global DOM Content Loaded Setup
document.addEventListener('DOMContentLoaded', () => {
    requireAdminAuth();

    // Top Bar Date Rendering
    const dateEl = document.getElementById('adminCurrentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Update Notification Badges
    updateAdminNotifications();

    // Notifications Dropdown Toggle
    const notifBtn = document.getElementById('adminNotifBtn');
    const notifDropdown = document.getElementById('adminNotifDropdown');
    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => {
            notifDropdown.classList.remove('open');
        });
    }

    // Mobile Navigation Hamburger Toggle
    const mobileBtn = document.getElementById('adminMobileToggle');
    const sidebar = document.querySelector('.admin-sidebar');
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
});
