let adminKey = sessionStorage.getItem('one8_admin_key') || '';

document.addEventListener('DOMContentLoaded', () => {
    if (adminKey) {
        tryEnterApp();
    }
    document.getElementById('admin-key-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') login();
    });
});

function headers(json) {
    const h = { 'x-admin-key': adminKey };
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

async function login() {
    adminKey = document.getElementById('admin-key-input').value.trim();
    if (!adminKey) return;
    await tryEnterApp();
}

async function tryEnterApp() {
    const loginStatus = document.getElementById('login-status');
    loginStatus.textContent = '';
    try {
        const res = await fetch('/api/reservations', { headers: headers() });
        if (res.status === 401) {
            loginStatus.textContent = 'Incorrect admin key.';
            loginStatus.className = 'status-msg error';
            adminKey = '';
            sessionStorage.removeItem('one8_admin_key');
            return;
        }
        if (!res.ok) throw new Error('Could not reach the server.');

        sessionStorage.setItem('one8_admin_key', adminKey);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-app').style.display = 'block';

        loadMenu();
        loadReservations();
        loadTables();
        loadHallBookings();
        loadHalls();
    } catch (err) {
        loginStatus.textContent = err.message || 'Something went wrong.';
        loginStatus.className = 'status-msg error';
    }
}

function switchTab(panelId, btn) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
    btn.classList.add('active');
}

function setStatus(id, message, isError) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.className = 'status-msg ' + (isError ? 'error' : 'success');
    if (message) setTimeout(() => { el.textContent = ''; }, 4000);
}

/* ---------------- MENU / PRICES ---------------- */

async function loadMenu() {
    const tbody = document.getElementById('menu-tbody');
    try {
        const res = await fetch('/api/menu/all', { headers: headers() });
        const items = await res.json();
        if (!res.ok) throw new Error(items.error);

        tbody.innerHTML = items.map(item => `
            <tr data-id="${item.id}">
                <td>${escapeHtml(item.name)}</td>
                <td>
                    <input type="number" step="0.01" value="${item.price}"
                           onchange="updateMenuPrice(${item.id}, this.value)">
                </td>
                <td>${escapeHtml(item.category || '')}</td>
                <td>
                    <input type="checkbox" ${item.is_available ? 'checked' : ''}
                           onchange="updateMenuAvailability(${item.id}, this.checked)">
                </td>
                <td class="row-actions">
                    <button class="btn danger" onclick="deleteMenuItem(${item.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5">Failed to load menu: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function updateMenuPrice(id, price) {
    try {
        const res = await fetch(`/api/menu/${id}`, {
            method: 'PATCH',
            headers: headers(true),
            body: JSON.stringify({ price: Number(price) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatus('menu-status', `Price updated to ₹${Number(price).toLocaleString('en-IN')}.`, false);
    } catch (err) {
        setStatus('menu-status', err.message, true);
    }
}

async function updateMenuAvailability(id, isAvailable) {
    try {
        const res = await fetch(`/api/menu/${id}`, {
            method: 'PATCH',
            headers: headers(true),
            body: JSON.stringify({ is_available: isAvailable }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatus('menu-status', 'Availability updated.', false);
    } catch (err) {
        setStatus('menu-status', err.message, true);
    }
}

async function deleteMenuItem(id) {
    if (!confirm('Delete this dish?')) return;
    try {
        const res = await fetch(`/api/menu/${id}`, { method: 'DELETE', headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        loadMenu();
    } catch (err) {
        setStatus('menu-status', err.message, true);
    }
}

async function addMenuItem() {
    const name = document.getElementById('new-menu-name').value.trim();
    const price = document.getElementById('new-menu-price').value;
    const category = document.getElementById('new-menu-category').value.trim();
    const image_url = document.getElementById('new-menu-image').value.trim();
    const description = document.getElementById('new-menu-description').value.trim();

    if (!name || !price) {
        setStatus('menu-status', 'Name and price are required.', true);
        return;
    }

    try {
        const res = await fetch('/api/menu', {
            method: 'POST',
            headers: headers(true),
            body: JSON.stringify({ name, price: Number(price), category, image_url, description }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        ['new-menu-name', 'new-menu-price', 'new-menu-category', 'new-menu-image', 'new-menu-description']
            .forEach(id => { document.getElementById(id).value = ''; });

        setStatus('menu-status', `Added ${data.name}.`, false);
        loadMenu();
    } catch (err) {
        setStatus('menu-status', err.message, true);
    }
}

/* ---------------- RESERVATIONS / TABLE BOOKINGS ---------------- */

async function loadReservations() {
    const tbody = document.getElementById('reservations-tbody');
    try {
        const [resReservations, resTables] = await Promise.all([
            fetch('/api/reservations', { headers: headers() }),
            fetch('/api/tables', { headers: headers() }),
        ]);
        const reservations = await resReservations.json();
        const tables = await resTables.json();
        if (!resReservations.ok) throw new Error(reservations.error);

        const tableOptions = (currentId) => `
            <option value="">— unassigned —</option>
            ${tables.map(t => `<option value="${t.id}" ${t.id === currentId ? 'selected' : ''}>
                Table ${escapeHtml(t.table_number)} (${escapeHtml(t.location)}, seats ${t.capacity})
            </option>`).join('')}
        `;

        tbody.innerHTML = reservations.map(r => `
            <tr data-id="${r.id}">
                <td>${escapeHtml(r.reference || '')}</td>
                <td>${escapeHtml(r.name)}<br><span style="color:var(--text-gray);font-size:0.78rem;">${escapeHtml(r.email)}</span></td>
                <td>${escapeHtml(r.reservation_date)} ${r.reservation_time ? escapeHtml(r.reservation_time) : ''}</td>
                <td>${r.guests}</td>
                <td><select onchange="assignTable(${r.id}, this.value)">${tableOptions(r.table_id)}</select></td>
                <td>
                    <select onchange="updateReservationStatus(${r.id}, this.value)">
                        <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${r.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="cancelled" ${r.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td class="row-actions">
                    <span class="badge ${r.status}">${r.status}</span>
                    ${r.status !== 'cancelled' ? `<button class="btn danger" onclick="cancelReservation(${r.id})">Cancel</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7">Failed to load reservations: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function updateReservationStatus(id, status) {
    try {
        const res = await fetch(`/api/reservations/${id}`, {
            method: 'PATCH',
            headers: headers(true),
            body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatus('reservations-status', `Marked reservation #${id} as ${status}.`, false);
        loadReservations();
    } catch (err) {
        setStatus('reservations-status', err.message, true);
    }
}

async function cancelReservation(id) {
    if (!confirm(`Cancel reservation #${id}?`)) return;
    await updateReservationStatus(id, 'cancelled');
}

async function assignTable(id, tableId) {
    try {
        const res = await fetch(`/api/reservations/${id}`, {
            method: 'PATCH',
            headers: headers(true),
            body: JSON.stringify({ table_id: tableId || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatus('reservations-status', `Table updated for reservation #${id}.`, false);
    } catch (err) {
        setStatus('reservations-status', err.message, true);
    }
}

/* ---------------- TABLES ---------------- */

async function loadTables() {
    const tbody = document.getElementById('tables-tbody');
    try {
        const res = await fetch('/api/tables/all', { headers: headers() });
        const tables = await res.json();
        if (!res.ok) throw new Error(tables.error);

        tbody.innerHTML = tables.map(t => `
            <tr data-id="${t.id}">
                <td>${escapeHtml(t.table_number)}</td>
                <td><input type="number" value="${t.capacity}" onchange="updateTable(${t.id}, 'capacity', this.value)"></td>
                <td><input type="text" value="${escapeHtml(t.location)}" onchange="updateTable(${t.id}, 'location', this.value)"></td>
                <td><input type="checkbox" ${t.is_active ? 'checked' : ''} onchange="updateTable(${t.id}, 'is_active', this.checked)"></td>
                <td><button class="btn danger" onclick="deleteTable(${t.id})">Delete</button></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5">Failed to load tables: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function updateTable(id, field, value) {
    try {
        const res = await fetch(`/api/tables/${id}`, {
            method: 'PATCH',
            headers: headers(true),
            body: JSON.stringify({ [field]: field === 'capacity' ? Number(value) : value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatus('tables-status', 'Table updated.', false);
    } catch (err) {
        setStatus('tables-status', err.message, true);
    }
}

async function deleteTable(id) {
    if (!confirm('Delete this table?')) return;
    try {
        const res = await fetch(`/api/tables/${id}`, { method: 'DELETE', headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        loadTables();
    } catch (err) {
        setStatus('tables-status', err.message, true);
    }
}

async function addTable() {
    const table_number = document.getElementById('new-table-number').value.trim();
    const capacity = document.getElementById('new-table-capacity').value;
    const location = document.getElementById('new-table-location').value.trim();

    if (!table_number || !capacity) {
        setStatus('tables-status', 'Table number and capacity are required.', true);
        return;
    }

    try {
        const res = await fetch('/api/tables', {
            method: 'POST',
            headers: headers(true),
            body: JSON.stringify({ table_number, capacity: Number(capacity), location }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        document.getElementById('new-table-number').value = '';
        document.getElementById('new-table-capacity').value = '';
        document.getElementById('new-table-location').value = '';

        setStatus('tables-status', `Added table ${data.table_number}.`, false);
        loadTables();
    } catch (err) {
        setStatus('tables-status', err.message, true);
    }
}

/* ---------------- HALL BOOKINGS ---------------- */

function fmtTime12(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

async function loadHallBookings() {
    const tbody = document.getElementById('hall-bookings-tbody');
    try {
        const res = await fetch('/api/hall-bookings', { headers: headers() });
        const bookings = await res.json();
        if (!res.ok) throw new Error(bookings.error);

        if (!bookings.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text-gray);">No hall bookings yet.</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(b => `
            <tr data-id="${b.id}">
                <td>${escapeHtml(b.reference)}</td>
                <td>${escapeHtml(b.name)}<br>
                    <span style="color:var(--text-gray);font-size:0.78rem;">${escapeHtml(b.email)} · ${escapeHtml(b.phone)}</span>
                    ${b.message ? `<br><span style="color:var(--text-gray);font-size:0.78rem;">“${escapeHtml(b.message)}”</span>` : ''}
                </td>
                <td>${escapeHtml(b.hall_name)}<br><span style="color:var(--text-gray);font-size:0.78rem;">${escapeHtml(b.event_type || '')}</span></td>
                <td>${escapeHtml(b.event_date)}<br>${fmtTime12(b.start_time)} – ${fmtTime12(b.end_time)}</td>
                <td>${b.guests}</td>
                <td>
                    <select onchange="updateHallBookingStatus(${b.id}, this.value)">
                        <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td class="row-actions">
                    <span class="badge ${b.status}">${b.status}</span>
                    ${b.status !== 'cancelled' ? `<button class="btn danger" onclick="cancelHallBooking(${b.id}, '${escapeHtml(b.reference)}')">Cancel</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7">Failed to load hall bookings: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function updateHallBookingStatus(id, status) {
    try {
        const res = await fetch(`/api/hall-bookings/${id}`, {
            method: 'PATCH',
            headers: headers(true),
            body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatus('hall-bookings-status', `Booking #${id} marked as ${status}.`, false);
    } catch (err) {
        setStatus('hall-bookings-status', err.message, true);
    }
    loadHallBookings();
}

async function cancelHallBooking(id, reference) {
    if (!confirm(`Cancel hall booking ${reference}?`)) return;
    await updateHallBookingStatus(id, 'cancelled');
}

/* ---------------- HALLS ---------------- */

async function loadHalls() {
    const tbody = document.getElementById('halls-tbody');
    try {
        const res = await fetch('/api/halls/all', { headers: headers() });
        const halls = await res.json();
        if (!res.ok) throw new Error(halls.error);

        tbody.innerHTML = halls.map(h => `
            <tr data-id="${h.id}">
                <td><input type="text" value="${escapeHtml(h.name)}" onchange="updateHall(${h.id}, 'name', this.value)"></td>
                <td><input type="number" value="${h.capacity}" onchange="updateHall(${h.id}, 'capacity', this.value)"></td>
                <td><input type="number" step="1" value="${h.price}" onchange="updateHall(${h.id}, 'price', this.value)"></td>
                <td><input type="checkbox" ${h.is_active ? 'checked' : ''} onchange="updateHall(${h.id}, 'is_active', this.checked)"></td>
                <td><button class="btn danger" onclick="deleteHall(${h.id})">Delete</button></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5">Failed to load halls: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function updateHall(id, field, value) {
    const numeric = field === 'capacity' || field === 'price';
    try {
        const res = await fetch(`/api/halls/${id}`, {
            method: 'PATCH',
            headers: headers(true),
            body: JSON.stringify({ [field]: numeric ? Number(value) : value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatus('halls-status', 'Hall updated.', false);
    } catch (err) {
        setStatus('halls-status', err.message, true);
    }
}

async function deleteHall(id) {
    if (!confirm('Delete this hall?')) return;
    try {
        const res = await fetch(`/api/halls/${id}`, { method: 'DELETE', headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        loadHalls();
    } catch (err) {
        setStatus('halls-status', err.message, true);
    }
}

async function addHall() {
    const name = document.getElementById('new-hall-name').value.trim();
    const capacity = document.getElementById('new-hall-capacity').value;
    const price = document.getElementById('new-hall-price').value;
    const image_url = document.getElementById('new-hall-image').value.trim();
    const description = document.getElementById('new-hall-description').value.trim();

    if (!name || !capacity) {
        setStatus('halls-status', 'Name and capacity are required.', true);
        return;
    }
    try {
        const res = await fetch('/api/halls', {
            method: 'POST',
            headers: headers(true),
            body: JSON.stringify({ name, capacity: Number(capacity), price: Number(price || 0), image_url, description }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        ['new-hall-name', 'new-hall-capacity', 'new-hall-price', 'new-hall-image', 'new-hall-description']
            .forEach(id => { document.getElementById(id).value = ''; });
        setStatus('halls-status', `Added ${data.name}.`, false);
        loadHalls();
    } catch (err) {
        setStatus('halls-status', err.message, true);
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}
