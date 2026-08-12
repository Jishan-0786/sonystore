/**
 * SONY STORE - Admin Order Management Module
 * Handles order table rendering, status filtering, order inspection modal,
 * and animated order progress tracking.
 */

let adminOrdersList = [];

function getStoredOrders() {
    try {
        return JSON.parse(localStorage.getItem('sony_store_orders')) || [];
    } catch (e) {
        return [];
    }
}

function updateOrderStatus(orderId, newStatus) {
    const orders = getStoredOrders();
    const target = orders.find(o => o.id === orderId);
    if (target) {
        target.status = newStatus;
        localStorage.setItem('sony_store_orders', JSON.stringify(orders));
        if (typeof updateSupabaseOrderStatus === 'function') {
            updateSupabaseOrderStatus(orderId, newStatus);
        }
        if (typeof updateAdminNotifications === 'function') updateAdminNotifications();
        return true;
    }
    return false;
}

function renderOrdersTable() {
    const tbody = document.getElementById('ordersTbody');
    const searchInput = document.getElementById('orderSearchInput');
    const filterSelect = document.getElementById('statusFilterSelect');

    if (!tbody) return;

    adminOrdersList = getStoredOrders();

    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filter = filterSelect ? filterSelect.value : 'all';

    let filtered = [...adminOrdersList];

    if (filter !== 'all') {
        filtered = filtered.filter(o => o.status === filter);
    }

    if (search) {
        filtered = filtered.filter(o => 
            o.id.toLowerCase().includes(search) ||
            (o.customer && o.customer.name.toLowerCase().includes(search)) ||
            (o.customer && o.customer.phone.toLowerCase().includes(search))
        );
    }

    const countBadge = document.getElementById('orderCountBadge');
    if (countBadge) countBadge.textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">No matching orders found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(o => {
        const statusClass = (o.status || 'Pending').toLowerCase();
        return `
            <tr>
                <td style="font-weight: 700; color: var(--gold-light);">${o.id}</td>
                <td>${new Date(o.date).toLocaleDateString()}</td>
                <td>${o.customer ? o.customer.name : 'Client'}</td>
                <td>${o.customer ? o.customer.phone : '-'}</td>
                <td>${o.items ? o.items.length : 0} item${o.items && o.items.length === 1 ? '' : 's'}</td>
                <td style="font-weight: 700; color: #fff;">$${o.total.toLocaleString()}</td>
                <td>
                    <span class="badge-status badge-${statusClass}">${o.status}</span>
                </td>
                <td>
                    <select onchange="handleAdminStatusChange('${o.id}', this.value)" class="admin-select">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                        <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button onclick="inspectOrderDetails('${o.id}')" class="btn-admin" style="padding: 6px 12px; font-size: 0.75rem;">VIEW</button>
                </td>
            </tr>
        `;
    }).join('');
}

function handleAdminStatusChange(orderId, newStatus) {
    updateOrderStatus(orderId, newStatus);
    renderOrdersTable();
}

function inspectOrderDetails(orderId) {
    const orders = getStoredOrders();
    const order = orders.find(o => o.id === orderId);
    const modal = document.getElementById('orderDetailModal');
    if (!order || !modal) return;

    const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
    const currentStatus = order.status || 'Pending';
    const isCancelled = currentStatus === 'Cancelled';
    const activeIdx = statuses.indexOf(currentStatus);

    document.getElementById('modalOrderTitle').textContent = `ORDER DETAILS: ${order.id}`;
    document.getElementById('modalOrderBody').innerHTML = `
        <div style="font-size: 0.9rem; line-height: 1.6;">
            
            <!-- CUSTOMER INFO -->
            <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--admin-border-subtle);">
                <div style="font-family: var(--font-heading); color: var(--gold-light); margin-bottom: 8px;">CUSTOMER & DELIVERY INFORMATION</div>
                <div><strong>Customer Name:</strong> ${order.customer.name}</div>
                <div><strong>Phone Number:</strong> ${order.customer.phone}</div>
                <div><strong>Email:</strong> ${order.customer.email || 'N/A'}</div>
                <div><strong>Delivery Address:</strong> ${order.address.street}, ${order.address.city}, ${order.address.province}, ${order.address.country}</div>
                <div><strong>Payment Method:</strong> ${order.paymentMethod}</div>
            </div>

            <!-- ORDER STATUS PROGRESS TRACKER -->
            <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--admin-border-subtle);">
                <div style="font-family: var(--font-heading); color: var(--gold-light); margin-bottom: 14px;">ORDER STATUS TRACKER</div>
                ${!isCancelled ? `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${statuses.map((st, idx) => {
                            const isDone = idx <= activeIdx;
                            const isCurrent = idx === activeIdx;
                            return `
                                <div style="display: flex; align-items: center; gap: 12px; opacity: ${isDone ? '1' : '0.4'};">
                                    <div style="width: 28px; height: 28px; border-radius: 50%; background: ${isCurrent ? 'var(--gold-light)' : (isDone ? 'var(--gold-primary)' : '#111')}; color: #000; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                                        ${isDone ? '✓' : (idx + 1)}
                                    </div>
                                    <div style="font-weight: ${isCurrent ? '800' : '500'}; color: ${isCurrent ? 'var(--gold-light)' : '#fff'};">
                                        ${st} ${isCurrent ? ' (Active)' : ''}
                                    </div>
                                </div>
                            `;
                        }).join('<div style="margin-left: 13px; width: 2px; height: 12px; background: var(--gold-primary); opacity: 0.3;"></div>')}
                    </div>
                ` : `
                    <div style="color: var(--danger); font-weight: 700; text-align: center;">Order Status: CANCELLED</div>
                `}
            </div>

            <!-- PURCHASED PRODUCTS -->
            <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; border: 1px solid var(--admin-border-subtle);">
                <div style="font-family: var(--font-heading); color: var(--gold-light); margin-bottom: 8px;">PURCHASED TIMEPIECES</div>
                ${order.items.map(item => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--admin-border-subtle);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${item.image}" style="width: 36px; height: 36px; object-fit: contain; background: #000; border-radius: 4px;">
                            <span>${item.name} × ${item.quantity}</span>
                        </div>
                        <strong style="color: var(--gold-primary);">$${(item.price * item.quantity).toLocaleString()}</strong>
                    </div>
                `).join('')}

                <div style="display: flex; justify-content: space-between; margin-top: 12px; font-weight: 800; font-size: 1.1rem; color: var(--gold-light);">
                    <span>Grand Total:</span>
                    <span>$${order.total.toLocaleString()}</span>
                </div>
            </div>

        </div>
    `;

    modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    renderOrdersTable();

    const searchInput = document.getElementById('orderSearchInput');
    const filterSelect = document.getElementById('statusFilterSelect');

    if (searchInput) searchInput.addEventListener('input', renderOrdersTable);
    if (filterSelect) filterSelect.addEventListener('change', renderOrdersTable);
});
