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
            form.reset();
        } catch (err) {
            status.textContent = err.message;
            status.classList.add('error');
        } finally {
            submitBtn.disabled = false;
        }
    });
}
