
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    
    initCharts();
    
    // Initialize Bootstrap ScrollSpy for sidebar highlighting
    const scrollSpy = bootstrap.ScrollSpy.getOrCreateInstance(document.body, {
        target: '#sidebar',
        offset: 100
    });

    
    const sidebar = document.getElementById('sidebar');
    const sidebarToggler = document.getElementById('sidebarToggler');
    
    if (sidebarToggler) {
        sidebarToggler.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }

// ===== PROFILE PAGE LOGIC =====
function initProfilePage() {
    // detect profile page
    const insightsGrid = document.getElementById('insightsGrid');
    if (!insightsGrid) return;

    // Mock insights (could be fetched)
    const mock = {
        orders: 18,
        aov: 1249.5,
        topCategory: 'Office Supplies',
        savings: 820,
        tip: 'You save most on bulk paper orders. Consider a monthly subscription.'
    };
    const el = (id)=>document.getElementById(id);
    if (el('insightOrders')) el('insightOrders').textContent = mock.orders;
    if (el('insightAOV')) el('insightAOV').textContent = `₹${mock.aov.toFixed(2)}`;
    if (el('insightFavCat')) el('insightFavCat').textContent = mock.topCategory;
    if (el('insightSavings')) el('insightSavings').textContent = `₹${mock.savings.toFixed(0)}`;
    if (el('insightTip')) el('insightTip').textContent = mock.tip;

    // Preferences
    const CATEGORY_POOL = ['Office Supplies','Electronics','Cleaning','Beverages','Furniture','Printing','Networking','Stationery'];
    const prefCategoriesWrap = document.getElementById('prefCategories');
    const prefBrands = document.getElementById('prefBrands');
    const prefSpeed = document.getElementById('prefSpeed');
    const prefEco = document.getElementById('prefEco');
    const notifDeals = document.getElementById('notifDeals');
    const notifOrders = document.getElementById('notifOrders');
    const savePrefsBtn = document.getElementById('savePrefsBtn');
    const clearProfileBtn = document.getElementById('clearProfileBtn');

    // Build selectable tags
    if (prefCategoriesWrap) {
        prefCategoriesWrap.innerHTML = '';
        CATEGORY_POOL.forEach(cat=>{
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = cat;
            span.dataset.value = cat;
            span.addEventListener('click', ()=>{
                const active = prefCategoriesWrap.querySelectorAll('.tag.active').length;
                if (!span.classList.contains('active') && active >= 5) {
                    showToast('You can select up to 5 categories', 'warning');
                    return;
                }
                span.classList.toggle('active');
            });
            prefCategoriesWrap.appendChild(span);
        });
    }

    // Load saved profile
    const profile = loadProfile();
    if (profile) {
        prefBrands && (prefBrands.value = profile.brands || '');
        prefSpeed && (prefSpeed.value = profile.speed || 'standard');
        prefEco && (prefEco.checked = !!profile.eco);
        notifDeals && (notifDeals.checked = !!profile.notifDeals);
        notifOrders && (notifOrders.checked = !!profile.notifOrders);
        if (prefCategoriesWrap && Array.isArray(profile.categories)) {
            profile.categories.forEach(v=>{
                const chip = prefCategoriesWrap.querySelector(`.tag[data-value="${CSS.escape(v)}"]`);
                if (chip) chip.classList.add('active');
            });
        }
    }

    savePrefsBtn && savePrefsBtn.addEventListener('click', ()=>{
        const categories = Array.from(prefCategoriesWrap.querySelectorAll('.tag.active')).map(x=>x.dataset.value);
        const data = {
            categories,
            brands: prefBrands?.value || '',
            speed: prefSpeed?.value || 'standard',
            eco: !!prefEco?.checked,
            notifDeals: !!notifDeals?.checked,
            notifOrders: !!notifOrders?.checked,
        };
        localStorage.setItem('bbh_profile', JSON.stringify(data));
        showToast('Preferences saved', 'success');
        renderRecommendations();
    });

    clearProfileBtn && clearProfileBtn.addEventListener('click', ()=>{
        localStorage.removeItem('bbh_profile');
        showToast('Profile data cleared', 'success');
        location.reload();
    });

    // Rewards wallet (mock)
    const tierBadge = el('tierBadge');
    const walletCoins = el('walletCoins');
    const tierProgress = el('tierProgress');
    const tierHint = el('tierHint');
    const wallet = loadWallet();
    walletCoins && (walletCoins.textContent = wallet.coins.toString());
    const {tier, nextAt, pct, hint} = computeTier(wallet.coins);
    if (tierBadge) tierBadge.textContent = tier;
    if (tierProgress) tierProgress.style.width = `${pct}%`;
    if (tierHint) tierHint.textContent = hint;

    // Recommendations based on categories/brands
    function renderRecommendations() {
        const list = document.getElementById('recList');
        if (!list) return;
        list.innerHTML = '';
        const p = loadProfile() || {};
        const cats = p.categories || ['Office Supplies','Electronics'];
        const items = cats.slice(0,3).map((c, i)=>({
            title: `${c} pick #${i+1}`,
            subtitle: 'Tailored to your preferences',
            badge: i===0 ? 'Deal' : (i===1 ? 'Trending' : 'Popular')
        }));
        items.forEach(it=>{
            const div = document.createElement('div');
            div.className = 'list-group-item';
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-semibold">${it.title}</div>
                        <div class="small text-muted">${it.subtitle}</div>
                    </div>
                    <span class="badge bg-primary">${it.badge}</span>
                </div>
            `;
            list.appendChild(div);
        });
    }
    renderRecommendations();

    // helpers
    function loadProfile() {
        try { return JSON.parse(localStorage.getItem('bbh_profile')||'{}'); } catch { return null; }
    }
    function loadWallet() {
        try { return JSON.parse(localStorage.getItem('bbh_wallet')||'{"coins":320}'); } catch { return {coins:320}; }
    }
    function computeTier(coins) {
        if (coins >= 2000) return {tier:'Gold', nextAt:null, pct:100, hint:'You are at the highest tier'};
        if (coins >= 500) return {tier:'Silver', nextAt:2000, pct: Math.min(100, (coins-500)/(2000-500)*100), hint:`${2000-coins} coins to reach Gold`};
        return {tier:'Bronze', nextAt:500, pct: Math.min(100, coins/500*100), hint:`${500-coins} coins to reach Silver`};
    }
}

// ===== CART PAGE LOGIC =====
function initCartPage() {
    const cartList = document.getElementById('cartItems');
    if (!cartList) return; // not on cart page

    const couponApplyBtn = document.querySelector('[data-coupon-apply]');
    const couponInput = document.getElementById('couponCode');

    const elSubtotal = document.getElementById('summarySubtotal');
    const elDiscount = document.getElementById('summaryDiscount');
    const elTax = document.getElementById('summaryTax');
    const elTotal = document.getElementById('summaryTotal');
    const elMobileTotal = document.getElementById('mobileTotal');
    const freeShip = document.getElementById('freeShippingMsg');

    let appliedDiscountPct = 0;

    function recalc() {
        let subtotal = 0;
        cartList.querySelectorAll('[data-line-total]').forEach(line => {
            const price = parseFloat(line.getAttribute('data-price')) || 0;
            const qtyInput = line.closest('.row').querySelector('[data-qty-input]');
            const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
            const lineTotal = price * qty;
            line.textContent = formatINR(lineTotal);
            subtotal += lineTotal;
        });
        const discount = subtotal * appliedDiscountPct;
        const taxable = Math.max(0, subtotal - discount);
        const tax = taxable * 0.18; // 18% GST example
        const total = taxable + tax;

        if (elSubtotal) elSubtotal.textContent = formatINR(subtotal);
        if (elDiscount) elDiscount.textContent = `- ${formatINR(discount)}`;
        if (elTax) elTax.textContent = formatINR(tax);
        if (elTotal) elTotal.textContent = formatINR(total);
        if (elMobileTotal) elMobileTotal.textContent = formatINR(total);
        if (freeShip) freeShip.style.display = total >= 999 ? 'block' : 'none';

        // persist to session for checkout
        sessionStorage.setItem('bbh_totals', JSON.stringify({subtotal, discount, tax, total}));
    }

    function formatINR(n) { return `₹${(n||0).toFixed(2)}`; }

    cartList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-qty]');
        if (btn) {
            const dir = btn.getAttribute('data-qty');
            const input = btn.parentElement.querySelector('[data-qty-input]');
            let val = Math.max(1, parseInt(input.value || '1', 10));
            if (dir === 'inc') val += 1; else if (dir === 'dec') val = Math.max(1, val - 1);
            input.value = val;
            recalc();
        }
        const remove = e.target.closest('[data-remove]');
        if (remove) {
            const item = remove.closest('.list-group-item');
            item.parentElement.removeChild(item);
            recalc();
        }
    });

    cartList.addEventListener('change', (e) => {
        if (e.target.matches('[data-qty-input]')) recalc();
    });

    if (couponApplyBtn) {
        couponApplyBtn.addEventListener('click', () => {
            const code = (couponInput?.value || '').trim().toUpperCase();
            if (!code) { showToast('Enter a coupon code', 'warning'); return; }
            if (code === 'SAVE10') {
                appliedDiscountPct = 0.10;
                showToast('Coupon applied: 10% off', 'success');
            } else {
                appliedDiscountPct = 0;
                showToast('Invalid coupon', 'danger');
            }
            recalc();
        });
    }

    recalc();
}

// ===== CHECKOUT PAGE LOGIC =====
function initCheckoutPage() {
    const steps = document.getElementById('checkoutSteps');
    if (!steps) return; // not on checkout page

    const elCoSubtotal = document.getElementById('coSubtotal');
    const elCoDiscount = document.getElementById('coDiscount');
    const elCoTax = document.getElementById('coTax');
    const elCoTotal = document.getElementById('coTotal');
    const elMobileTotal = document.getElementById('mobileCoTotal');
    const revSubtotal = document.getElementById('revSubtotal');
    const revDiscount = document.getElementById('revDiscount');
    const revTax = document.getElementById('revTax');
    const revTotal = document.getElementById('revTotal');

    function applyTotals() {
        let totals = {subtotal:0, discount:0, tax:0, total:0};
        try { totals = JSON.parse(sessionStorage.getItem('bbh_totals') || '{}'); } catch {}
        const f = (n)=>`₹${(n||0).toFixed(2)}`;
        if (elCoSubtotal) elCoSubtotal.textContent = f(totals.subtotal);
        if (elCoDiscount) elCoDiscount.textContent = `- ${f(totals.discount)}`;
        if (elCoTax) elCoTax.textContent = f(totals.tax);
        if (elCoTotal) elCoTotal.textContent = f(totals.total);
        if (elMobileTotal) elMobileTotal.textContent = f(totals.total);
        if (revSubtotal) revSubtotal.textContent = f(totals.subtotal);
        if (revDiscount) revDiscount.textContent = `- ${f(totals.discount)}`;
        if (revTax) revTax.textContent = f(totals.tax);
        if (revTotal) revTotal.textContent = f(totals.total);
    }

    // step navigation via data-next / data-prev
    document.body.addEventListener('click', (e) => {
        const nextBtn = e.target.closest('[data-next]');
        const prevBtn = e.target.closest('[data-prev]');
        if (nextBtn) {
            const target = nextBtn.getAttribute('data-next');
            const tab = document.querySelector(target);
            if (tab) new bootstrap.Tab(tab).show();
            e.preventDefault();
        }
        if (prevBtn) {
            const target = prevBtn.getAttribute('data-prev');
            const tab = document.querySelector(target);
            if (tab) new bootstrap.Tab(tab).show();
            e.preventDefault();
        }
    });

    applyTotals();
}

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        const isClickInside = sidebar.contains(event.target) || 
                            (sidebarToggler && sidebarToggler.contains(event.target));
        
        if (!isClickInside && window.innerWidth < 768) {
            sidebar.classList.remove('show');
        }
    });

    
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            sidebar.classList.remove('show');
        }
        // Refresh ScrollSpy positions on resize
        if (scrollSpy && typeof scrollSpy.refresh === 'function') {
            scrollSpy.refresh();
        }
    });

    initFormValidation();

  
    initDatepickers();

    
    initFileUpload();

    initNotifications();

    // Page-specific initializers
    initCartPage();
    initCheckoutPage();
    initProfilePage();
});

// Initialize charts
function initCharts() {
    // Cost Optimization Chart
    const costCtx = document.getElementById('costChart');
    if (costCtx) {
        new Chart(costCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [
                    {
                        label: 'Spending',
                        data: [18500, 20100, 23000, 25500, 24780, 26300, 28100],
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Budget',
                        data: [25000, 25000, 25000, 25000, 25000, 25000, 25000],
                        borderColor: '#6c757d',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 12 },
                        bodyFont: { size: 12 },
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 6,
                        hoverBorderWidth: 3
                    }
                }
            }
        });
    }

    // Vendor Performance Chart
    const vendorCtx = document.getElementById('vendorChart');
    if (vendorCtx) {
        new Chart(vendorCtx, {
            type: 'bar',
            data: {
                labels: ['OfficePlus', 'TechSupplies', 'CafeDirect', 'OfficeDepot', 'Staples'],
                datasets: [{
                    label: 'On-time Delivery %',
                    data: [95, 88, 92, 85, 90],
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + '% on-time delivery';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
}

// Initialize form validation
function initFormValidation() {
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll('.needs-validation');

    // Loop over them and prevent submission
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        }, false);
    });
}

// Initialize datepickers
function initDatepickers() {
    // This would be replaced with actual datepicker initialization
    // For example, if using flatpickr:
    // flatpickr("[data-datepicker]", {
    //     dateFormat: "Y-m-d",
    //     allowInput: true
    // });
}

// Initialize file upload preview
function initFileUpload() {
    const fileInputs = document.querySelectorAll('.custom-file-input');
    
    fileInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : 'Choose file';
            const label = this.nextElementSibling;
            label.textContent = fileName;
        });
    });
}

// Initialize notifications
function initNotifications() {
    const notificationBell = document.querySelector('.notification-bell');
    const notificationPanel = document.querySelector('.notification-panel');
    
    if (notificationBell && notificationPanel) {
        notificationBell.addEventListener('click', function(e) {
            e.preventDefault();
            notificationPanel.classList.toggle('show');
        });
        
        // Close notification panel when clicking outside
        document.addEventListener('click', function(e) {
            if (!notificationBell.contains(e.target) && !notificationPanel.contains(e.target)) {
                notificationPanel.classList.remove('show');
            }
        });
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Toggle sidebar on mobile
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
}

// Show loading state
function showLoading(element) {
    const btn = element;
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';
    
    return function() {
        btn.disabled = false;
        btn.innerHTML = originalText;
    };
}

// Show toast notification
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    
    bsToast.show();
    
    // Remove toast from DOM after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Confirm dialog
function confirmDialog(message, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.tabIndex = '-1';
    modal.setAttribute('data-bs-backdrop', 'static');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirm</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="confirmBtn">Confirm</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    
    const confirmBtn = modal.querySelector('#confirmBtn');
    
    confirmBtn.addEventListener('click', function() {
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
        modalInstance.hide();
    });
    
    modal.addEventListener('hidden.bs.modal', function() {
        if (typeof onCancel === 'function') {
            onCancel();
        }
        document.body.removeChild(modal);
    });
}

// Debounce function for resize/scroll events
function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Throttle function for scroll/resize events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Copy to clipboard
function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(function() {
        const originalText = element.innerHTML;
        element.innerHTML = '<i class="bi bi-check"></i> Copied!';
        setTimeout(function() {
            element.innerHTML = originalText;
        }, 2000);
    }).catch(function(err) {
        console.error('Could not copy text: ', err);
    });
}

// Toggle password visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.querySelector(`[data-toggle-password="${inputId}"] i`);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}

// Initialize tooltips on dynamically added elements
document.addEventListener('mouseover', function(e) {
    const element = e.target.closest('[data-bs-toggle="tooltip"]');
    if (element && !element.hasAttribute('data-bs-original-title')) {
        new bootstrap.Tooltip(element);
    }
});

// Handle AJAX form submission
function handleFormSubmit(form, onSuccess, onError) {
    const formData = new FormData(form);
    const url = form.getAttribute('action');
    const method = form.getAttribute('method') || 'POST';
    
    fetch(url, {
        method: method,
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (typeof onSuccess === 'function') {
                onSuccess(data);
            }
        } else {
            throw new Error(data.message || 'An error occurred');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (typeof onError === 'function') {
            onError(error);
        } else {
            showToast(error.message || 'An error occurred', 'danger');
        }
    });
}
