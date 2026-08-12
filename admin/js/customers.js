/**
 * SONY STORE - Admin Customer Management Module
 * Aggregates client profiles from orders & user sessions, calculates total expenditures,
 * and handles customer search & history inspection.
 */

function renderCustomersDirectory() {
    const tbody = document.getElementById('customersTbody');
    const searchInput = document.getElementById('custSearchInput');

    if (!tbody) return;

    const orders = JSON.parse(localStorage.getItem('sony_store_orders')) || [];
    const activeUser = JSON.parse(localStorage.getItem('sony_store_user'));

    const customerMap = {};

    // Add active logged-in user profile if exists
    if (activeUser && activeUser.phone) {
        customerMap[activeUser.phone] = {
            name: activeUser.name || 'Valued Client',
            phone: activeUser.phone,
            email: activeUser.email || 'N/A',
            ordersCount: 0,
            totalSpent: 0,
            lastOrderDate: 'N/A',
            orders: []
        };
    }

    // Aggregate orders per customer
    orders.forEach(o => {
        const phone = (o.customer && o.customer.phone) ? o.customer.phone : 'Unknown Phone';
        if (!customerMap[phone]) {
            customerMap[phone] = {
                name: o.customer ? o.customer.name : 'Valued Client',
                phone: phone,
                email: (o.customer && o.customer.email) ? o.customer.email : 'N/A',
                ordersCount: 0,
                totalSpent: 0,
                lastOrderDate: o.date,
                orders: []
            };
        }

        customerMap[phone].ordersCount += 1;
        customerMap[phone].orders.push(o);
        if (o.status !== 'Cancelled') {
            customerMap[phone].totalSpent += (o.total || 0);
        }
        if (!customerMap[phone].lastOrderDate || new Date(o.date) > new Date(customerMap[phone].lastOrderDate)) {
            customerMap[phone].lastOrderDate = o.date;
        }
    });

    const customersList = Object.values(customerMap);
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtered = customersList;
    if (search) {
        filtered = customersList.filter(c => 
            c.name.toLowerCase().includes(search) ||
            c.phone.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search)
        );
    }

    const countBadge = document.getElementById('custCountBadge');
    if (countBadge) countBadge.textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No client profiles found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td style="font-weight: 700; color: #fff;">${c.name}</td>
            <td style="font-weight: 700; color: var(--gold-light);">${c.phone}</td>
            <td>${c.email}</td>
            <td><span class="badge-status badge-confirmed">${c.ordersCount} Order${c.ordersCount === 1 ? '' : 's'}</span></td>
            <td style="font-weight: 800; color: var(--gold-primary);">$${c.totalSpent.toLocaleString()}</td>
            <td>${c.lastOrderDate !== 'N/A' ? new Date(c.lastOrderDate).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button onclick="inspectCustomerHistory('${c.phone}')" class="btn-admin" style="padding: 4px 10px; font-size: 0.75rem;">VIEW HISTORY</button>
            </td>
        </tr>
    `).join('');
}

function inspectCustomerHistory(phone) {
    const orders = JSON.parse(localStorage.getItem('sony_store_orders')) || [];
    const clientOrders = orders.filter(o => o.customer && o.customer.phone === phone);
    const modal = document.getElementById('customerDetailModal');
    if (!modal) return;

    document.getElementById('modalCustTitle').textContent = `CLIENT PROFILE & ORDERS: ${phone}`;
    
    if (clientOrders.length === 0) {
        document.getElementById('modalCustBody').innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No placed orders on record for this customer phone number.</div>`;
    } else {
        document.getElementById('modalCustBody').innerHTML = clientOrders.map(o => `
            <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--admin-border-subtle); padding: 14px; border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <strong style="color: var(--gold-light);">${o.id}</strong>
                    <span class="badge-status badge-${(o.status||'pending').toLowerCase()}">${o.status}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${new Date(o.date).toLocaleString()}</div>
                <div style="margin-top: 8px; font-weight: 700;">$${o.total.toLocaleString()} — ${o.items.length} items</div>
            </div>
        `).join('');
    }

    modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    renderCustomersDirectory();

    const searchInput = document.getElementById('custSearchInput');
    if (searchInput) searchInput.addEventListener('input', renderCustomersDirectory);
});
