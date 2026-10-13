// ---------- Warn if opened directly as a file instead of via the server ----------
// fetch() cannot reach a backend from a file:// origin (browsers block it outright —
// this is not something CORS headers can fix). Run `npm start` and open
// http://localhost:3000 instead of double-clicking index.html.
if (window.location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', () => {
        const warning = document.getElementById('offline-warning');
        if (warning) warning.style.display = 'block';
    });
}

// ---------- Smooth scroll ----------
function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// ---------- Navbar scroll effect ----------
window.addEventListener('scroll', function () {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ---------- Mobile menu toggle ----------
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');

mobileMenuBtn.addEventListener('click', function () {
    navLinks.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function () {
        navLinks.classList.remove('active');
    });
});

// ---------- Intersection Observer for scroll animations ----------
const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function (entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.about-content, .about-image, .gallery-item, .reservation-form, .reservation-info').forEach(el => {
    observer.observe(el);
});

// ---------- Gallery lightbox ----------
const galleryImages = [
    'https://images.unsplash.com/photo-1687945512099-400cbe94460c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjByZXN0YXVyYW50JTIwaW50ZXJpb3IlMjBtb2Rlcm58ZW58MXx8fHwxNzc0NDQyNzAyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1764397514739-57a0ac81330d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5lJTIwZGluaW5nJTIwZm9vZCUyMHBsYXRpbmd8ZW58MXx8fHwxNzc0NDQyNzAyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1753729349067-f317d8a80b9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwcmVzdGF1cmFudCUyMGFtYmlhbmNlJTIwbmlnaHR8ZW58MXx8fHwxNzc0NDQyNzAzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1676300185292-e23bb3db50fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb3VybWV0JTIwc3RlYWslMjBkaXNofGVufDF8fHx8MTc3NDQ0MjcwM3ww&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1735190093631-d66ecd1bc433?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXNoaSUyMHBsYXR0ZXIlMjBmcmVzaHxlbnwxfHx8fDE3NzQ0MzU2MzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1673968872147-30bcd4bea38b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwY29ja3RhaWxzJTIwYmFyfGVufDF8fHx8MTc3NDQ0MjcwM3ww&ixlib=rb-4.1.0&q=80&w=1080'
];

function openLightbox(index) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    lightboxImage.src = galleryImages[index];
    lightbox.classList.add('active');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
}

// ---------- Parallax effect for hero ----------
window.addEventListener('scroll', function () {
    const scrolled = window.pageYOffset;
    const heroSection = document.getElementById('home');
    if (heroSection && scrolled < window.innerHeight) {
        const heroBg = document.querySelector('.hero-bg');
        if (heroBg) {
            heroBg.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    }
});

// ---------- Live menu + reservations backed by the API ----------
document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    loadTables();
    setupReservationForm();
    loadHalls();
    setupHallForm();
    setupManageForm();
});

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

async function loadMenu() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/menu');
        if (!res.ok) throw new Error('Request failed');
        const items = await res.json();

        if (!items.length) {
            grid.innerHTML = '<p class="menu-loading">Menu coming soon.</p>';
            return;
        }

        grid.innerHTML = items.map((item, index) => `
            <div class="menu-item" style="transition-delay: ${index * 0.1}s">
                <div class="menu-item-image">
                    <img src="${escapeHtml(item.image_url || '')}" alt="${escapeHtml(item.name)}">
                    <div class="menu-category">${escapeHtml(item.category || 'Mains')}</div>
                </div>
                <div class="menu-item-content">
                    <div class="menu-item-header">
                        <div class="menu-item-name">${escapeHtml(item.name)}</div>
                        <div class="menu-item-price">₹${Number(item.price).toLocaleString('en-IN')}</div>
                    </div>
                    <div class="menu-item-description">${escapeHtml(item.description || '')}</div>
                </div>
            </div>
        `).join('');

        // Re-run the reveal animation/observer against the freshly rendered cards
        document.querySelectorAll('#menu-grid .menu-item').forEach(el => observer.observe(el));
    } catch (err) {
        grid.innerHTML = '<p class="menu-loading">Unable to load the menu right now. Please try again later.</p>';
    }
}

async function loadTables() {
    const select = document.getElementById('table-select');
    if (!select) return;

    try {
        const res = await fetch('/api/tables');
        if (!res.ok) throw new Error('Request failed');
        const tables = await res.json();

        tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table.id;
            option.textContent = `Table ${table.table_number} — ${table.location} (seats ${table.capacity})`;
            select.appendChild(option);
        });
    } catch (err) {
        // Table list is a nice-to-have; leave just the "no preference" option if it fails.
    }
}

function setupReservationForm() {
    const form = document.getElementById('reservationForm');
    const status = document.getElementById('reservation-status');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = '';
        status.className = 'form-status';
        document.getElementById('reservation-ref').style.display = 'none';

        const payload = Object.fromEntries(new FormData(form).entries());
        if (!payload.table_id) delete payload.table_id;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');

            status.textContent = 'Reservation request submitted! We will confirm shortly.';
            status.classList.add('success');
            showReference('reservation-ref', data.reservation.reference, 'reservation');
            form.reset();
        } catch (err) {
            status.textContent = err.message;
            status.classList.add('error');
        } finally {
            submitBtn.disabled = false;
        }
    });
}


// ---------- Booking reference box (shown after a successful booking) ----------
function showReference(elId, reference, kind) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `
        Your ${kind} reference
        <strong class="code">${escapeHtml(reference)}</strong>
        Save this code — you'll need it with your email to cancel or check your booking in
        <a href="#manage" style="color: var(--primary-color);">Manage Booking</a>.
    `;
    el.style.display = 'block';
}

function todayISO() {
    // Local date in YYYY-MM-DD (toISOString would shift to UTC)
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

function formatTime12(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatDateLong(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' });
}

// ---------- Halls & banquets ----------
let hallsCache = [];

async function loadHalls() {
    const grid = document.getElementById('hall-grid');
    const select = document.getElementById('hall-select');
    if (!grid) return;

    try {
        const res = await fetch('/api/halls');
        if (!res.ok) throw new Error('Request failed');
        hallsCache = await res.json();

        if (!hallsCache.length) {
            grid.innerHTML = '<p class="menu-loading">Halls coming soon.</p>';
            return;
        }

        grid.innerHTML = hallsCache.map(h => `
            <div class="hall-card">
                ${h.image_url ? `<img src="${escapeHtml(h.image_url)}" alt="${escapeHtml(h.name)}">` : ''}
                <div class="hall-card-body">
                    <h3>${escapeHtml(h.name)}</h3>
                    <p>${escapeHtml(h.description || '')}</p>
                    <div class="hall-meta">
                        <span>Up to ${h.capacity} guests</span>
                        <span class="hall-price">from ₹${Number(h.price).toLocaleString('en-IN')}</span>
                    </div>
                    <button class="btn-primary" onclick="selectHall(${h.id})">Book this hall</button>
                </div>
            </div>
        `).join('');

        hallsCache.forEach(h => {
            const option = document.createElement('option');
            option.value = h.id;
            option.textContent = `${h.name} (up to ${h.capacity} guests)`;
            select.appendChild(option);
        });
    } catch (err) {
        grid.innerHTML = '<p class="menu-loading">Unable to load halls right now. Please try again later.</p>';
    }
}

function selectHall(id) {
    const select = document.getElementById('hall-select');
    select.value = String(id);
    select.dispatchEvent(new Event('change'));
    scrollToSection('hall-booking');
}

async function refreshHallAvailability() {
    const hallId = document.getElementById('hall-select').value;
    const date = document.getElementById('hall-date').value;
    const note = document.getElementById('hall-availability');
    note.textContent = '';
    note.classList.remove('warn');
    if (!hallId || !date) return;

    try {
        const res = await fetch(`/api/halls/${hallId}/availability?date=${encodeURIComponent(date)}`);
        const data = await res.json();
        if (!res.ok) return;
        if (data.booked.length) {
            const slots = data.booked.map(b => `${formatTime12(b.start_time)} – ${formatTime12(b.end_time)}`).join(', ');
            note.textContent = `Already booked on this date: ${slots}`;
            note.classList.add('warn');
        } else {
            note.textContent = 'Available for the whole day.';
        }
    } catch (err) { /* availability hint is optional */ }
}

function setupHallForm() {
    const form = document.getElementById('hallForm');
    if (!form) return;
    const status = document.getElementById('hall-status');
    const dateInput = document.getElementById('hall-date');
    dateInput.min = todayISO();

    document.getElementById('hall-select').addEventListener('change', () => {
        const hall = hallsCache.find(h => String(h.id) === document.getElementById('hall-select').value);
        document.getElementById('hall-guests').max = hall ? hall.capacity : '';
        refreshHallAvailability();
    });
    dateInput.addEventListener('change', refreshHallAvailability);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = '';
        status.className = 'form-status';
        document.getElementById('hall-ref').style.display = 'none';

        const payload = Object.fromEntries(new FormData(form).entries());
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/hall-bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');

            const b = data.booking;
            status.textContent = `${b.hall_name} requested for ${formatDateLong(b.event_date)}, ${formatTime12(b.start_time)} – ${formatTime12(b.end_time)}. We will confirm shortly.`;
            status.classList.add('success');
            showReference('hall-ref', b.reference, 'booking');
            form.reset();
            document.getElementById('hall-availability').textContent = '';
        } catch (err) {
            status.textContent = err.message;
            status.classList.add('error');
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// ---------- Manage / cancel a booking ----------
function setupManageForm() {
    const form = document.getElementById('manageForm');
    if (!form) return;
    const status = document.getElementById('manage-status');
    const result = document.getElementById('manage-result');

    function render(b) {
        const when = `${formatDateLong(b.date)}${b.start_time ? ', ' + formatTime12(b.start_time) : ''}${b.end_time ? ' – ' + formatTime12(b.end_time) : ''}`;
        const canCancel = b.status !== 'cancelled' && !b.is_past;
        result.innerHTML = `
            <dl>
                <dt>Reference</dt><dd>${escapeHtml(b.reference)}</dd>
                <dt>Type</dt><dd>${b.type === 'hall' ? 'Hall / banquet booking' : 'Table reservation'}</dd>
                ${b.place ? `<dt>${b.type === 'hall' ? 'Hall' : 'Table'}</dt><dd>${escapeHtml(b.place)}</dd>` : ''}
                <dt>Name</dt><dd>${escapeHtml(b.name)}</dd>
                <dt>When</dt><dd>${escapeHtml(when)}</dd>
                <dt>Guests</dt><dd>${b.guests}</dd>
                <dt>Status</dt><dd><span class="status-pill ${escapeHtml(b.status)}">${escapeHtml(b.status)}</span></dd>
            </dl>
            ${canCancel
                ? '<button type="button" class="btn-danger" id="cancel-booking-btn">Cancel this booking</button>'
                : `<p style="color: var(--text-gray);">${b.status === 'cancelled' ? 'This booking has been cancelled.' : 'This booking date has passed, so it can no longer be cancelled.'}</p>`}
        `;
        result.style.display = 'block';

        const cancelBtn = document.getElementById('cancel-booking-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', async () => {
                if (!confirm('Cancel this booking? This cannot be undone.')) return;
                cancelBtn.disabled = true;
                try {
                    const res = await fetch('/api/bookings/cancel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(lastQuery)
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Could not cancel the booking.');
                    render(data.booking);
                    status.textContent = 'Your booking has been cancelled.';
                    status.className = 'form-status success';
                } catch (err) {
                    status.textContent = err.message;
                    status.className = 'form-status error';
                    cancelBtn.disabled = false;
                }
            });
        }
    }

    let lastQuery = null;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = '';
        status.className = 'form-status';
        result.style.display = 'none';

        lastQuery = Object.fromEntries(new FormData(form).entries());
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/bookings/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lastQuery)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
            render(data);
        } catch (err) {
            status.textContent = err.message;
            status.classList.add('error');
        } finally {
            submitBtn.disabled = false;
        }
    });
}
