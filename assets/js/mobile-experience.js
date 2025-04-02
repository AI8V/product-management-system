/**
 * تحسين تجربة المستخدم على الأجهزة المحمولة
 * يجعل التطبيق يشبه تطبيقات الموبايل الأصلية
 */
(function() {
    'use strict';

    // --- تكوين وثوابت ---
    const MOBILE_BREAKPOINT = 768; // نقطة فاصلة للأجهزة المحمولة (بالبكسل)
    const APP_NAME = 'نظام إدارة المنتجات';

    // --- متغيرات حالة التطبيق ---
    let isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    let currentView = 'list'; // 'list', 'add', 'edit', 'details', 'dashboard', 'settings'
    let isInstallable = false; // حالة إمكانية التثبيت
    let deferredPrompt; // تخزين حدث تثبيت التطبيق
    let originalDesktopContainer = null; // Reference to the main desktop container

    // --- العناصر الأساسية ---
    let mobileContainer; // حاوية واجهة الموبايل
    let mobileNavbar; // شريط التنقل السفلي
    let mobileHeader; // رأس التطبيق
    let contentContainer; // حاوية المحتوى الديناميكي
    let productListView;
    let productFormView;
    let dashboardView;
    let settingsView;
    let searchOverlay;
    let productDetailsView; // For showing single product details

    // --- وظائف رئيسية ---

    /**
     * تهيئة تجربة الموبايل
     */
    function initMobileExperience() {
        originalDesktopContainer = document.querySelector('.container.my-5');
        if (!originalDesktopContainer) {
            console.error("Mobile Experience: Main desktop container (.container.my-5) not found.");
            return;
        }

        checkIfMobile(); // Initial check

        if (isMobile) {
            createMobileInterface(); // Create only if mobile initially
            setupEventListeners();
            initPWASupport();
            reorganizeContent();
            applyMobileCSS(); // Apply CSS needed for mobile
            updateInterfaceVisibility(); // Show mobile, hide desktop
            updateMobileProductList(); // Initial load
            changeView('list'); // Start on list view
        } else {
            // Ensure desktop is visible if starting on desktop
            originalDesktopContainer.style.display = '';
        }

        // Listen for resize to switch between modes
        window.addEventListener('resize', debounce(handleResize, 250));

        // Listen for data changes to update lists
        window.addEventListener('productDataSaved', notifyMobileOfProductChange);

        // Check initial dark mode / font size settings
         applyStoredSettings();

        console.log("Mobile Experience Initialized.");
    }

    /**
     * Handle window resize events.
     */
    function handleResize() {
        const wasMobile = isMobile;
        checkIfMobile(); // Update isMobile flag

        if (isMobile && !wasMobile) {
            // Transitioning to Mobile View
            if (!mobileContainer) { // Create interface if it doesn't exist yet
                createMobileInterface();
                setupEventListeners(); // Re-setup listeners if needed
                initPWASupport();
                reorganizeContent();
                applyMobileCSS();
                 applyStoredSettings(); // Apply settings again
            }
            updateInterfaceVisibility();
            changeView(currentView || 'list'); // Restore last view or default to list
            updateMobileProductList();
        } else if (!isMobile && wasMobile) {
            // Transitioning to Desktop View
            updateInterfaceVisibility();
            // Optional: Clean up mobile-specific things if needed
             closeSearchOverlay();
             closeProductDetailsView();
        }
    }

    /**
     * Apply stored dark mode and font size settings.
     */
    function applyStoredSettings() {
         // Dark Mode
        const darkModeSaved = localStorage.getItem('darkMode') === 'enabled';
        document.body.classList.toggle('dark-mode', darkModeSaved);
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) darkModeToggle.checked = darkModeSaved;

        // Font Size
        const fontSizeSaved = localStorage.getItem('fontSize') || '100';
        document.documentElement.style.fontSize = `${fontSizeSaved}%`;
    }

    /**
     * التحقق مما إذا كان المستخدم على جهاز محمول
     */
    function checkIfMobile() {
        isMobile = window.innerWidth < MOBILE_BREAKPOINT;
        document.body.classList.toggle('is-mobile-device', isMobile);
    }

     /**
     * Show/Hide Mobile/Desktop Interfaces
     */
     function updateInterfaceVisibility() {
         if (isMobile) {
             mobileContainer?.classList?.remove('d-none');
             originalDesktopContainer.style.display = 'none';
         } else {
             mobileContainer?.classList?.add('d-none');
             originalDesktopContainer.style.display = ''; // Restore default display
         }
     }

    /**
     * إنشاء عناصر واجهة الموبايل الأساسية
     */
    function createMobileInterface() {
        if (document.getElementById('mobileContainer')) return; // Already exists

        mobileContainer = document.createElement('div');
        mobileContainer.id = 'mobileContainer';
        mobileContainer.className = 'mobile-container d-none'; // Start hidden

        mobileHeader = document.createElement('header'); // Use header tag
        mobileHeader.id = 'mobileHeader';
        mobileHeader.className = 'mobile-header';
        // Initial header content (might be updated by views)
        mobileHeader.innerHTML = `
             <button id="backBtn" class="btn-icon d-none"><i class="fas fa-arrow-right"></i></button>
            <div class="header-title" id="mobileHeaderTitle">${APP_NAME}</div>
            <div class="header-actions">
                <button id="installBtn" class="btn-icon d-none" title="تثبيت التطبيق"><i class="fas fa-download"></i></button>
                <button id="toggleSearchBtn" class="btn-icon" title="بحث"><i class="fas fa-search"></i></button>
            </div>
        `;

        contentContainer = document.createElement('main'); // Use main tag
        contentContainer.id = 'mobileContent';
        contentContainer.className = 'mobile-content';

        mobileNavbar = document.createElement('nav'); // Use nav tag
        mobileNavbar.id = 'mobileNavbar';
        mobileNavbar.className = 'mobile-navbar';
        mobileNavbar.innerHTML = `
            <button data-view="list" class="nav-btn active"><i class="fas fa-list"></i><span>المنتجات</span></button>
            <button data-view="add" class="nav-btn"><i class="fas fa-plus-circle"></i><span>إضافة</span></button>
            <button data-view="dashboard" class="nav-btn"><i class="fas fa-chart-pie"></i><span>الإحصائيات</span></button>
            <button data-view="settings" class="nav-btn"><i class="fas fa-cog"></i><span>الإعدادات</span></button>
        `;

        mobileContainer.appendChild(mobileHeader);
        mobileContainer.appendChild(contentContainer);
        mobileContainer.appendChild(mobileNavbar);

        document.body.appendChild(mobileContainer);

        createSearchOverlay();
        // Views will be created and appended inside reorganizeContent
    }

     /**
     * Update Header Title and Actions based on current view
     */
     function updateHeaderForView(view) {
         const titleElement = document.getElementById('mobileHeaderTitle');
         const backBtn = document.getElementById('backBtn');
         const searchBtn = document.getElementById('toggleSearchBtn');
         const installBtn = document.getElementById('installBtn');

         if (!titleElement || !backBtn || !searchBtn || !installBtn) return;

         // Default states
         backBtn.classList.add('d-none');
         searchBtn.classList.remove('d-none');
         installBtn.classList.toggle('d-none', !isInstallable); // Show only if installable

         switch (view) {
             case 'list':
                 titleElement.textContent = APP_NAME;
                 break;
             case 'add':
                  titleElement.textContent = (window.mode === 'update') ? 'تعديل منتج' : 'إضافة منتج';
                  searchBtn.classList.add('d-none'); // Hide search in form
                  backBtn.classList.remove('d-none'); // Show back button
                  backBtn.onclick = () => changeView('list'); // Set back action
                 break;
             case 'details':
                  titleElement.textContent = 'تفاصيل المنتج';
                  searchBtn.classList.add('d-none'); // Hide search
                  backBtn.classList.remove('d-none'); // Show back button
                  backBtn.onclick = () => closeProductDetailsView(); // Set back action
                 break;
             case 'dashboard':
                 titleElement.textContent = 'لوحة التحكم';
                 searchBtn.classList.add('d-none'); // Hide search
                 break;
             case 'settings':
                 titleElement.textContent = 'الإعدادات';
                 searchBtn.classList.add('d-none'); // Hide search
                 break;
             default:
                 titleElement.textContent = APP_NAME;
         }
     }


    /**
     * إنشاء واجهة البحث
     */
    function createSearchOverlay() {
         if (document.getElementById('searchOverlay')) return;

        searchOverlay = document.createElement('div');
        searchOverlay.id = 'searchOverlay';
        searchOverlay.className = 'search-overlay d-none'; // Start hidden
        searchOverlay.innerHTML = `
            <div class="search-header">
                <button id="closeSearchBtn" class="btn-icon" title="إغلاق البحث"><i class="fas fa-arrow-right"></i></button>
                <input type="text" id="mobileSearchInput" class="form-control" placeholder="ابحث عن منتج..." autocomplete="off">
                <button id="clearSearchBtn" class="btn-icon" title="مسح البحث"><i class="fas fa-times"></i></button>
            </div>
            <div class="search-filters">
                <div class="btn-group w-100" role="group">
                    <input type="radio" class="btn-check" id="mobileSearchAll" name="mobileSearchType" value="all" checked>
                    <label class="btn btn-outline-primary btn-sm" for="mobileSearchAll">الكل</label>

                    <input type="radio" class="btn-check" id="mobileSearchTitle" name="mobileSearchType" value="title">
                    <label class="btn btn-outline-primary btn-sm" for="mobileSearchTitle">الاسم</label>

                    <input type="radio" class="btn-check" id="mobileSearchCategory" name="mobileSearchType" value="category">
                    <label class="btn btn-outline-primary btn-sm" for="mobileSearchCategory">الفئة</label>
                </div>
            </div>
            <div id="searchResults" class="search-results">
                 <div class="empty-state">
                    <i class="fas fa-search fa-2x text-muted mb-3"></i>
                    <p>ابدأ الكتابة للبحث...</p>
                </div>
            </div>
        `;

        document.body.appendChild(searchOverlay);
    }

    /**
     * إنشاء وتعبئة قائمة الإعدادات
     */
    function createSettingsView() {
        if (!settingsView) {
            settingsView = document.createElement('div');
            settingsView.id = 'settingsView';
            settingsView.className = 'settings-view d-none'; // Start hidden
            contentContainer.appendChild(settingsView); // Append to main content area
        }

        settingsView.innerHTML = `
            <div class="settings-content">
                <div class="setting-item">
                    <div class="setting-info">
                        <h6>الوضع الليلي</h6>
                        <p class="text-muted small">تبديل بين المظهر الفاتح والداكن</p>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="darkModeToggle" ${localStorage.getItem('darkMode') === 'enabled' ? 'checked' : ''}>
                    </div>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <h6>تثبيت التطبيق</h6>
                        <p class="text-muted small">تثبيت كتطبيق على جهازك</p>
                    </div>
                    <button id="settingsInstallBtn" class="btn btn-sm btn-primary" ${!isInstallable ? 'disabled' : ''}>
                       ${isInstallable ? 'تثبيت' : 'مثبت'}
                    </button>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <h6>حجم الخط</h6>
                        <p class="text-muted small">تعديل حجم النص في التطبيق</p>
                    </div>
                    <div class="font-size-controls">
                        <button id="decreaseFontBtn" class="btn btn-sm btn-outline-secondary">-</button>
                        <span id="currentFontSize" class="mx-2 small align-self-center">${localStorage.getItem('fontSize') || '100'}%</span>
                        <button id="increaseFontBtn" class="btn btn-sm btn-outline-secondary">+</button>
                        <button id="resetFontBtn" class="btn btn-sm btn-outline-secondary ms-2">إعادة</button>
                    </div>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <h6>حذف جميع البيانات</h6>
                        <p class="text-muted small">حذف كافة المنتجات من الجهاز</p>
                    </div>
                    <button id="clearDataBtn" class="btn btn-sm btn-danger">حذف الكل</button>
                </div>

                <div class="app-info mt-5 text-center">
                    <h6>${APP_NAME}</h6>
                    <p class="text-muted small">الإصدار 1.1.0</p> <!-- Version bumped -->
                </div>
            </div>
        `;

         // Re-attach listeners after recreating content
         attachSettingsListeners();
    }

    /**
     * إعداد مستمعي الأحداث (يُستدعى مرة واحدة أو عند إعادة إنشاء الواجهة)
     */
    function setupEventListeners() {
        // Navigation buttons
        mobileNavbar?.querySelectorAll('.nav-btn').forEach(button => {
            button.removeEventListener('click', handleNavClick); // Remove previous listener
            button.addEventListener('click', handleNavClick);
        });

        // Search buttons
        document.getElementById('toggleSearchBtn')?.addEventListener('click', toggleSearchOverlay);
        document.getElementById('closeSearchBtn')?.addEventListener('click', toggleSearchOverlay);
        document.getElementById('mobileSearchInput')?.addEventListener('input', debounce(performSearch, 300)); // Debounce search input
        document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);

        // Search type radio buttons
        document.querySelectorAll('input[name="mobileSearchType"]').forEach(radio => {
             radio.removeEventListener('change', performSearch); // Remove previous
            radio.addEventListener('change', performSearch);
        });

        // Attach settings listeners
        attachSettingsListeners();

        // Back button (in header) - Action assigned dynamically in updateHeaderForView
    }

     function handleNavClick() {
         const view = this.getAttribute('data-view');
         changeView(view);
     }

     function attachSettingsListeners() {
         // Dark mode
         document.getElementById('darkModeToggle')?.addEventListener('change', toggleDarkMode);

         // Font size
         document.getElementById('increaseFontBtn')?.addEventListener('click', () => changeFontSize(1));
         document.getElementById('decreaseFontBtn')?.addEventListener('click', () => changeFontSize(-1));
         document.getElementById('resetFontBtn')?.addEventListener('click', () => resetFontSize());

         // Install button in settings
         document.getElementById('settingsInstallBtn')?.addEventListener('click', promptInstall);

         // Clear data
         document.getElementById('clearDataBtn')?.addEventListener('click', confirmClearAllData);
     }

    /**
     * تهيئة دعم تطبيقات الويب التقدمية (PWA)
     */
    function initPWASupport() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            isInstallable = true;
            // Update button states
            document.getElementById('installBtn')?.classList.remove('d-none');
            const settingsInstallBtn = document.getElementById('settingsInstallBtn');
            if(settingsInstallBtn){
                settingsInstallBtn.removeAttribute('disabled');
                settingsInstallBtn.textContent = 'تثبيت';
            }
             console.log('PWA: Install prompt saved.');
        });

        window.addEventListener('appinstalled', () => {
            isInstallable = false;
            deferredPrompt = null;
             // Update button states
             document.getElementById('installBtn')?.classList.add('d-none');
             const settingsInstallBtn = document.getElementById('settingsInstallBtn');
             if (settingsInstallBtn) {
                 settingsInstallBtn.setAttribute('disabled', 'true');
                 settingsInstallBtn.textContent = 'مثبت';
             }
             console.log('PWA: App installed.');
        });
    }

    /**
     * إعادة تنظيم محتوى الصفحة لواجهة الموبايل
     * Moving desktop elements into mobile view containers
     */
    function reorganizeContent() {
        if (!contentContainer) return;

        // --- Create View Containers ---
        productListView = document.createElement('div');
        productListView.id = 'productListView';
        productListView.className = 'product-list-view d-none'; // Start hidden
        contentContainer.appendChild(productListView);

        productFormView = document.createElement('div');
        productFormView.id = 'productFormView';
        productFormView.className = 'product-form-view d-none'; // Start hidden
        contentContainer.appendChild(productFormView);

        dashboardView = document.createElement('div');
        dashboardView.id = 'dashboardView';
        dashboardView.className = 'dashboard-view d-none'; // Start hidden
        contentContainer.appendChild(dashboardView);

        // Settings view is created by createSettingsView and appended there

        // --- Move Desktop Elements ---
        const originalFormContainer = originalDesktopContainer.querySelector('.product-form');
        if (originalFormContainer) {
            // Move the actual form element, not just the container div
            const formElement = originalFormContainer.querySelector('form#productForm');
            if (formElement) {
                productFormView.appendChild(formElement);
            } else {
                productFormView.innerHTML = '<div class="p-5 text-center text-muted">لم يتم العثور على نموذج الإضافة الأصلي.</div>';
            }
        } else {
            productFormView.innerHTML = '<div class="p-5 text-center text-muted">لم يتم العثور على حاوية نموذج الإضافة الأصلية.</div>';
        }

        // Try to move the dashboard area created by dashboard.js
        const originalDashboardArea = document.getElementById('dashboardArea');
        if (originalDashboardArea) {
            dashboardView.appendChild(originalDashboardArea);
        } else {
            dashboardView.innerHTML = '<div class="p-5 text-center text-muted">محتوى الإحصائيات غير جاهز بعد.</div>';
            // Attempt to find it later if dashboard.js loads after this
             const observer = new MutationObserver((mutationsList, obs) => {
                const dashArea = document.getElementById('dashboardArea');
                if (dashArea && dashArea.parentNode !== dashboardView) {
                    dashboardView.innerHTML = ''; // Clear message
                    dashboardView.appendChild(dashArea);
                    obs.disconnect(); // Stop observing once found
                }
             });
             observer.observe(originalDesktopContainer, { childList: true, subtree: true });
        }

        // --- Create Mobile-Specific List Structure ---
        createMobileProductListStructure(productListView);
    }

    /**
     * إنشاء الهيكل الأساسي لقائمة منتجات الموبايل (Header + Cards Container)
     */
    function createMobileProductListStructure(container) {
        if (!container) return;

        // Clear previous content if any
        container.innerHTML = '';

        const listHeader = document.createElement('div');
        listHeader.className = 'mobile-list-header';
        listHeader.innerHTML = `
            <span class="text-muted small" id="mobileProductCount">عدد المنتجات: 0</span>
            <button class="btn btn-outline-danger btn-sm" id="mobileDeleteAllBtn" style="display: none;">حذف الكل</button>
        `;

        const cardsContainer = document.createElement('div');
        cardsContainer.id = 'mobileProductCards';
        cardsContainer.className = 'mobile-product-cards';

        container.appendChild(listHeader);
        container.appendChild(cardsContainer);

        // Add listener to the new delete button
        document.getElementById('mobileDeleteAllBtn')?.addEventListener('click', confirmClearAllData);
    }

    /**
     * تحديث قائمة المنتجات لواجهة الموبايل (يملأ `mobileProductCards`)
     */
    function updateMobileProductList() {
        if (!isMobile) return; // Only update if in mobile view

        const productData = getProductData();
        const cardsContainer = document.getElementById('mobileProductCards');
        const countElement = document.getElementById('mobileProductCount');
        const deleteAllMobileBtn = document.getElementById('mobileDeleteAllBtn');

        if (!cardsContainer) return; // View not ready

        if (countElement) countElement.textContent = `عدد المنتجات: ${productData.length}`;
        if (deleteAllMobileBtn) deleteAllMobileBtn.style.display = productData.length > 0 ? 'inline-block' : 'none';

        if (productData.length === 0) {
            cardsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                    <p>لا توجد منتجات لعرضها</p>
                    <button class="btn btn-primary btn-sm" id="addFirstProductBtnMobile">إضافة منتج جديد</button>
                </div>
            `;
             document.getElementById('addFirstProductBtnMobile')?.addEventListener('click', () => changeView('add'));
            return;
        }

        // Generate card HTML for each product
        const cardsHTML = productData.map((product, index) => {
            const productId = window.generateProductIdForImages?.(product); // Use the exposed function
            const imageData = productId ? window.productImagesModule?.getProductImage?.(productId) : null;

            const imageHTML = imageData
                ? `<img src="${imageData}" alt="" class="product-card-image">`
                : `<div class="product-card-no-image"><i class="fas fa-image"></i></div>`;

            // Determine the original index in the master list for actions
            const originalIndex = index; // Assuming productData here is the master list

            return `
                <div class="product-card" data-product-index="${originalIndex}" role="button" tabindex="0">
                    <div class="product-card-image-container">
                        ${imageHTML}
                    </div>
                    <div class="product-card-content">
                        <h5 class="product-card-title">${product.title || 'منتج بدون اسم'}</h5>
                        <div class="product-card-category">${product.category || 'بدون تصنيف'}</div>
                        <div class="product-card-price">${parseFloat(product.total || 0).toFixed(2)}</div>
                    </div>
                    <div class="product-card-actions">
                        <button class="btn btn-sm btn-primary edit-product-btn" data-index="${originalIndex}" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-product-btn" data-index="${originalIndex}" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        cardsContainer.innerHTML = cardsHTML;

        // Re-attach listeners for the new cards
        attachCardListeners(cardsContainer);
    }

     /**
      * Attach event listeners to product cards and their buttons.
      */
     function attachCardListeners(container) {
         container.querySelectorAll('.edit-product-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent card click
                const index = parseInt(this.getAttribute('data-index'), 10);
                if (typeof window.editProduct === 'function') {
                    window.editProduct(index); // Call the global edit function
                    changeView('add'); // Switch to the form view
                }
            });
        });

        container.querySelectorAll('.delete-product-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent card click
                const index = parseInt(this.getAttribute('data-index'), 10);
                if (typeof window.deleteProduct === 'function') {
                    // Confirmation is handled inside global deleteProduct
                    window.deleteProduct(index);
                    // List update is handled by the 'productDataSaved' event listener
                }
            });
        });

        container.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-product-index'), 10);
                changeView('details', { productIndex: index }); // Change view to details
            });
             // Add keyboard accessibility
             card.addEventListener('keydown', function(e) {
                 if (e.key === 'Enter' || e.key === ' ') {
                     e.preventDefault();
                     const index = parseInt(this.getAttribute('data-product-index'), 10);
                     changeView('details', { productIndex: index });
                 }
             });
        });
     }

    /**
     * عرض تفاصيل منتج في واجهة المحمول
     */
    function showProductDetailsView(index) {
         closeProductDetailsView(); // Close any existing details view first

        const productData = getProductData();
        if (index < 0 || index >= productData.length) {
             console.error(`Mobile Details: Invalid product index ${index}`);
             changeView('list'); // Go back to list if index invalid
            return;
        }

        const product = productData[index];
        const productId = window.generateProductIdForImages?.(product);
        const imageData = productId ? window.productImagesModule?.getProductImage?.(productId) : null;

        productDetailsView = document.createElement('div');
        productDetailsView.id = 'productDetailsView';
        productDetailsView.className = 'product-details-view';

        const imageHTML = imageData
            ? `<img src="${imageData}" alt="" class="product-details-image">`
            : `<div class="product-details-no-image"><i class="fas fa-image fa-3x"></i></div>`;

        productDetailsView.innerHTML = `
            <!-- Header is now managed by updateHeaderForView -->
            <div class="details-content">
                <div class="details-image-container">
                    ${imageHTML}
                </div>

                <div class="details-info">
                    <h4 class="details-title">${product.title || 'منتج بدون اسم'}</h4>
                    <div class="details-category">${product.category || 'بدون تصنيف'}</div>

                    <div class="details-price-box">
                        <div class="total-price">${parseFloat(product.total || 0).toFixed(2)}</div>
                         <div class="price-breakdown small text-muted mt-1">
                            (سعر: ${parseFloat(product.price || 0).toFixed(2)}
                            + ضريبة: ${parseFloat(product.taxes || 0).toFixed(2)}
                            + إعلان: ${parseFloat(product.ads || 0).toFixed(2)}
                            - خصم: ${parseFloat(product.discount || 0).toFixed(2)})
                        </div>
                    </div>

                    <div class="details-actions mt-3">
                         <button id="detailsEditBtnMobile" class="btn btn-primary w-100 mb-2" data-index="${index}">
                            <i class="fas fa-edit me-2"></i>تعديل المنتج
                         </button>
                         <button id="detailsPrintBtnMobile" class="btn btn-secondary w-100 mb-2" data-index="${index}">
                            <i class="fas fa-print me-2"></i>طباعة بطاقة المنتج
                         </button>
                        <button id="deleteProductBtnMobile" class="btn btn-outline-danger w-100" data-index="${index}">
                             <i class="fas fa-trash me-2"></i>حذف المنتج
                         </button>
                    </div>
                </div>
            </div>
        `;

        // Append the details view to the main content area
        contentContainer.appendChild(productDetailsView);

        // Attach listeners for buttons inside the details view
        document.getElementById('detailsEditBtnMobile')?.addEventListener('click', function() {
            const productIndex = parseInt(this.getAttribute('data-index'), 10);
            if (typeof window.editProduct === 'function') {
                window.editProduct(productIndex);
                changeView('add'); // Switch to form view for editing
            }
        });

        document.getElementById('detailsPrintBtnMobile')?.addEventListener('click', function() {
            const productIndex = parseInt(this.getAttribute('data-index'), 10);
            // Use the globally exposed print function
            if (typeof window.printProductDetails === 'function') {
                window.printProductDetails(productIndex);
            } else {
                 alert('وظيفة طباعة التفاصيل غير متاحة.');
            }
        });

        document.getElementById('deleteProductBtnMobile')?.addEventListener('click', function() {
            const productIndex = parseInt(this.getAttribute('data-index'), 10);
            if (typeof window.deleteProduct === 'function') {
                window.deleteProduct(productIndex); // Confirmation handled inside
                // Go back to list view after deletion attempt
                changeView('list');
            }
        });

        // Animate the view in
        // The view is already visible as it's part of the content flow now
         productDetailsView.style.opacity = '0';
         productDetailsView.style.transition = 'opacity 0.3s ease-in-out';
         requestAnimationFrame(() => {
            productDetailsView.style.opacity = '1';
         });


    }

     /**
      * Close and remove the product details view.
      */
     function closeProductDetailsView() {
         if (productDetailsView) {
              productDetailsView.style.opacity = '0';
              setTimeout(() => {
                 productDetailsView.remove();
                 productDetailsView = null;
              }, 300); // Wait for animation
         }
     }

    /**
     * تغيير العرض الحالي في واجهة الموبايل
     * @param {string} view - The view to switch to ('list', 'add', 'details', 'dashboard', 'settings')
     * @param {object} [options] - Optional data for the view (e.g., { productIndex: 1 })
     */
    function changeView(view, options = {}) {
        if (!isMobile) return; // Only works in mobile mode

        currentView = view;

        // Update navbar active state
        mobileNavbar?.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === view);
        });

         // Close details view if navigating away from it
         if (view !== 'details' && productDetailsView) {
             closeProductDetailsView();
         }
          // Close search overlay if navigating away using navbar
          if (view !== 'search' && !searchOverlay?.classList.contains('d-none')) {
              closeSearchOverlay();
          }

        // Hide all view containers
        [productListView, productFormView, dashboardView, settingsView, productDetailsView].forEach(v => {
            v?.classList.add('d-none');
        });

        // Show the selected view container
        let targetViewElement;
        switch (view) {
            case 'list':
                targetViewElement = productListView;
                updateMobileProductList(); // Ensure list is fresh
                break;
            case 'add':
                targetViewElement = productFormView;
                 // Check if we are in update mode and reset form if not
                 if (window.mode !== 'update') {
                     window.clearForm?.();
                 }
                break;
            case 'details':
                 // Details view is created/shown dynamically
                 showProductDetailsView(options.productIndex);
                 targetViewElement = productDetailsView; // Assign for scrolling
                 break;
            case 'dashboard':
                targetViewElement = dashboardView;
                // Trigger dashboard update if its function exists
                if (typeof window.updateDashboard === 'function') {
                    window.updateDashboard();
                }
                break;
            case 'settings':
                 createSettingsView(); // Ensure settings view content is up-to-date
                 targetViewElement = settingsView;
                break;
            default:
                 targetViewElement = productListView; // Fallback to list
                 currentView = 'list';
                 mobileNavbar?.querySelector('.nav-btn[data-view="list"]')?.classList.add('active');

        }

        targetViewElement?.classList.remove('d-none');
        updateHeaderForView(view); // Update header title and buttons

        // Scroll content area to top
        contentContainer?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Expose changeView globally if needed
    window.mobileChangeView = changeView;


    /**
     * تطبيق أنماط CSS الأساسية المطلوبة لواجهة الموبايل
     */
    function applyMobileCSS() {
        if (document.getElementById('mobileCssStyles')) return;

        const styleElement = document.createElement('style');
        styleElement.id = 'mobileCssStyles';
        styleElement.textContent = `
            /* Basic Mobile Structure */
            .mobile-container {
                position: fixed; top: 0; right: 0; bottom: 0; left: 0;
                display: flex; flex-direction: column;
                background-color: var(--bs-body-bg, #f8f9fa); /* Use Bootstrap variable */
                z-index: 1000; overflow: hidden;
            }
            .mobile-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 0.75rem 1rem; /* Reduced padding */
                background-color: var(--bs-primary, #007bff); /* Use BS variable */
                color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                flex-shrink: 0; height: 56px; /* Standard header height */
            }
            .header-title { font-size: 1.1rem; font-weight: 600; }
            .header-actions { display: flex; gap: 0.25rem; }
            .btn-icon { /* Button style in header */
                border: none; background: none; color: inherit;
                width: 36px; height: 36px; border-radius: 50%;
                display: inline-flex; align-items: center; justify-content: center;
                cursor: pointer; transition: background-color 0.2s; font-size: 1rem;
            }
            .btn-icon:hover, .btn-icon:focus { background-color: rgba(255,255,255,0.15); outline: none; }
            .mobile-content { flex: 1; overflow-y: auto; padding: 1rem; }
            .mobile-navbar {
                display: flex; justify-content: space-around;
                background-color: var(--bs-body-bg, white);
                border-top: 1px solid var(--bs-border-color, #e2e2e2);
                padding: 0.3rem 0; box-shadow: 0 -2px 4px rgba(0,0,0,0.05);
                flex-shrink: 0; height: 60px; /* Standard nav height */
            }
            .nav-btn {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                flex: 1; /* Distribute space evenly */
                border: none; background: none; color: var(--bs-secondary-color, #6c757d);
                padding: 0.25rem; border-radius: 0.25rem; transition: all 0.2s;
                text-decoration: none; /* Remove underline */
            }
             .nav-btn:hover { background-color: rgba(0,0,0,0.05); }
            .nav-btn.active { color: var(--bs-primary, #007bff); }
            .nav-btn i { font-size: 1.1rem; margin-bottom: 0.15rem; }
            .nav-btn span { font-size: 0.7rem; }

            /* Search Overlay */
            .search-overlay {
                position: fixed; top: 0; right: 0; bottom: 0; left: 0;
                background-color: var(--bs-body-bg, #f8f9fa);
                z-index: 1100; display: flex; flex-direction: column;
                transform: translateX(100%); transition: transform 0.3s ease-in-out;
            }
            .search-overlay.active { transform: translateX(0); }
            .search-header {
                display: flex; align-items: center; padding: 0.75rem 1rem; gap: 0.5rem;
                background-color: var(--bs-primary, #007bff); color: white; flex-shrink: 0; height: 56px;
            }
            .search-header input { flex: 1; }
            .search-filters { padding: 0.5rem 1rem; border-bottom: 1px solid var(--bs-border-color, #e2e2e2); flex-shrink: 0; }
            .search-results { flex: 1; overflow-y: auto; padding: 0.5rem; }
            .search-result-item {
                display: block; padding: 0.75rem 1rem; border-bottom: 1px solid var(--bs-border-color, #eee);
                cursor: pointer; text-decoration: none; color: inherit;
            }
             .search-result-item:hover { background-color: rgba(0,0,0,0.05); }
            .search-result-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 2px; }
            .search-result-category, .search-result-price { font-size: 0.8rem; color: var(--bs-secondary-color, #6c757d); }
            .search-result-price { float: left; font-weight: bold; color: var(--bs-success, #198754); }


            /* Product List View */
            .mobile-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding: 0 0.25rem; }
            .mobile-product-cards { display: flex; flex-direction: column; gap: 0.5rem; }
            .product-card {
                display: flex; align-items: stretch; /* Align items vertically */
                background-color: var(--bs-tertiary-bg, #fff); /* Use BS variable */
                border: 1px solid var(--bs-border-color, #eee);
                border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                 cursor: pointer;
            }
            .product-card-image-container {
                width: 70px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
                background-color: var(--bs-secondary-bg, #f5f5f5); border-left: 1px solid var(--bs-border-color, #eee); /* Border on left in RTL */
            }
            .product-card-image { width: 100%; height: 100%; object-fit: cover; }
            .product-card-no-image { color: #ccc; font-size: 1.5rem; }
            .product-card-content {
                flex-grow: 1; padding: 0.5rem 0.8rem; min-width: 0;
                display: flex; flex-direction: column; justify-content: center;
            }
            .product-card-title { font-size: 0.9rem; font-weight: 600; margin: 0 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--bs-body-color); }
            .product-card-category { font-size: 0.75rem; color: var(--bs-secondary-color, #777); margin: 0 0 3px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .product-card-price { font-size: 0.9rem; font-weight: bold; color: var(--bs-success, #28a745); margin-top: auto; }
            .product-card-actions { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.4rem; gap: 0.4rem; background-color: var(--bs-tertiary-bg, #f9f9f9); border-right: 1px solid var(--bs-border-color, #eee); flex-shrink: 0; } /* Border on right in RTL */
            .product-card-actions .btn { padding: 0.2rem 0.4rem; font-size: 0.8rem; line-height: 1; }

             /* Product Form View */
            .product-form-view form { padding: 0.5rem; /* Add padding inside view */ }
            .product-form-view .price-group { padding: 0.75rem; }
            .product-form-view .total-display { margin: 0.5rem 0; padding: 0.5rem; }
            .product-form-view .form-label { font-size: 0.85rem; margin-bottom: 0.1rem; }
            .product-form-view .form-control, .product-form-view .form-select { font-size: 0.9rem; padding: 0.375rem 0.75rem; }
            .product-form-view #imageFieldContainer .row { align-items: center; } /* Better alignment */
            .product-form-view #imagePreviewContainer { height: 80px; }
            .product-form-view #imagePreview img { max-height: 70px; }
            .product-form-view .d-grid { margin-top: 1rem; }


            /* Settings View */
            .settings-view { height: 100%; display: flex; flex-direction: column; }
            .settings-content { flex: 1; }
            .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 0.25rem; border-bottom: 1px solid var(--bs-border-color-translucent, #f2f2f2); }
            .setting-info { flex: 1; margin-left: 1rem; }
            .setting-info h6 { margin: 0 0 0.1rem 0; font-size: 0.95rem; }
            .setting-info .small { font-size: 0.75rem; line-height: 1.2; }
            .font-size-controls { display: flex; align-items: center; gap: 0.25rem; }
            .font-size-controls .btn { padding: 0.1rem 0.5rem; }

             /* Product Details View */
            .product-details-view { background-color: var(--bs-body-bg); /* Full page background */ overflow-y: auto; }
            .details-content { padding-bottom: 1rem; }
            .details-image-container { width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; background-color: var(--bs-secondary-bg, #f8f9fa); }
            .product-details-image { max-width: 100%; max-height: 100%; object-fit: contain; }
            .product-details-no-image { color: #adb5bd; }
            .details-info { padding: 1rem; }
            .details-title { margin: 0 0 0.25rem 0; font-size: 1.4rem; }
            .details-category { color: var(--bs-secondary-color, #6c757d); margin-bottom: 1rem; font-size: 0.9rem; }
            .details-price-box { background-color: var(--bs-tertiary-bg, #f8f9fa); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; text-align: center; border: 1px solid var(--bs-border-color, #eee); }
            .total-price { font-size: 1.8rem; font-weight: bold; color: var(--bs-success, #28a745); }
            .price-breakdown { font-size: 0.75rem; }
            .details-actions .btn { font-size: 0.9rem; padding: 0.5rem 1rem; }


            /* Empty State */
            .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 3rem 1rem; color: var(--bs-secondary-color, #6c757d); }
            .empty-state i { font-size: 2.5rem; margin-bottom: 0.5rem; }
            .empty-state p { font-size: 1rem; margin-bottom: 1rem; }

            /* Dark Mode Adjustments (using body.dark-mode) */
            body.dark-mode { --bs-body-bg: #121212; --bs-body-color: #e0e0e0; --bs-secondary-color: #aaa; --bs-border-color: #333; --bs-border-color-translucent: rgba(255, 255, 255, 0.1); --bs-tertiary-bg: #1e1e1e; --bs-secondary-bg: #2a2a2a; }
            body.dark-mode .mobile-header { background-color: #0056b3; }
            body.dark-mode .mobile-navbar { background-color: #1e1e1e; border-top-color: #333; }
            body.dark-mode .nav-btn { color: #aaa; }
            body.dark-mode .nav-btn.active { color: #0d6efd; } /* Standard Bootstrap blue */
            body.dark-mode .search-overlay { background-color: #121212; }
            body.dark-mode .search-header { background-color: #0056b3; }
            body.dark-mode .search-filters { border-color: #333; }
             body.dark-mode .search-result-item { border-color: #333; }
             body.dark-mode .search-result-item:hover { background-color: rgba(255,255,255,0.05); }
            body.dark-mode .product-card { background-color: #1e1e1e; border-color: #333; }
             body.dark-mode .product-card-image-container { background-color: #2a2a2a; border-color: #333; }
            body.dark-mode .product-card-actions { background-color: #1e1e1e; border-color: #333; }
            body.dark-mode .empty-state { color: #aaa; }
            body.dark-mode .details-image-container { background-color: #2a2a2a; }
            body.dark-mode .details-price-box { background-color: #1e1e1e; border-color: #333; }
            body.dark-mode .setting-item { border-color: #333; }

        `;
        document.head.appendChild(styleElement);
    }

    /**
     * تبديل واجهة البحث
     */
    function toggleSearchOverlay() {
        if (!searchOverlay) return;
        const isActive = searchOverlay.classList.contains('active');
        searchOverlay.classList.toggle('d-none', isActive); // Hide if active
        searchOverlay.classList.toggle('active', !isActive); // Add active if becoming visible

        if (!isActive) { // If opening
            document.getElementById('mobileSearchInput')?.focus();
            performSearch(); // Perform initial search (might show "type to search")
        }
    }

    /**
     * إغلاق واجهة البحث
     */
    function closeSearchOverlay() {
        if(searchOverlay && searchOverlay.classList.contains('active')) {
            searchOverlay.classList.add('d-none');
            searchOverlay.classList.remove('active');
        }
    }

    /**
     * تنفيذ البحث في قائمة المنتجات (Mobile)
     */
    function performSearch() {
        const searchInput = document.getElementById('mobileSearchInput');
        const searchResultsContainer = document.getElementById('searchResults');
        const searchType = document.querySelector('input[name="mobileSearchType"]:checked')?.value || 'all';

        if (!searchInput || !searchResultsContainer) return;

        const query = searchInput.value.trim().toLowerCase();
        const productData = getProductData();

        searchResultsContainer.innerHTML = ''; // Clear previous results

        if (!query) {
            searchResultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search fa-2x text-muted mb-3"></i>
                    <p>ابدأ الكتابة للبحث...</p>
                </div>`;
            return;
        }

        const filteredProducts = productData.filter(product => {
            const titleMatch = (product.title || '').toLowerCase().includes(query);
            const categoryMatch = (product.category || '').toLowerCase().includes(query);
            if (searchType === 'title') return titleMatch;
            if (searchType === 'category') return categoryMatch;
            return titleMatch || categoryMatch; // 'all'
        });

        if (filteredProducts.length === 0) {
            searchResultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle fa-2x text-muted mb-3"></i>
                    <p>لا توجد نتائج مطابقة لـ "${searchInput.value}"</p>
                </div>`;
            return;
        }

        const resultsHTML = filteredProducts.map(product => {
            // Find original index
            const originalIndex = productData.findIndex(p => p === product);
            return `
                <a href="#" class="search-result-item" data-product-index="${originalIndex}" role="button">
                    <div class="search-result-content">
                         <div class="search-result-price">${parseFloat(product.total || 0).toFixed(2)}</div>
                        <h5 class="search-result-title">${product.title || 'منتج بدون اسم'}</h5>
                        <div class="search-result-category">${product.category || 'بدون تصنيف'}</div>
                    </div>
                </a>`;
        }).join('');

        searchResultsContainer.innerHTML = resultsHTML;

        // Add listeners to results
        searchResultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const index = parseInt(this.getAttribute('data-product-index'), 10);
                closeSearchOverlay(); // Close search first
                changeView('details', { productIndex: index }); // Then show details
            });
        });
    }

    /**
     * مسح حقل البحث ونتائجه
     */
    function clearSearch() {
        const searchInput = document.getElementById('mobileSearchInput');
        if (searchInput) {
            searchInput.value = '';
            performSearch();
            searchInput.focus();
        }
    }

    /**
     * تبديل الوضع الليلي
     */
    function toggleDarkMode(event) {
        const darkModeEnabled = event?.target?.checked ?? document.body.classList.contains('dark-mode');
        document.body.classList.toggle('dark-mode', darkModeEnabled);
        localStorage.setItem('darkMode', darkModeEnabled ? 'enabled' : 'disabled');
         // Also update Bootstrap theme attribute for compatibility with other components
         document.documentElement.setAttribute('data-bs-theme', darkModeEnabled ? 'dark' : 'light');
    }

    /**
     * تغيير حجم الخط
     */
    function changeFontSize(delta) {
        let currentSize = parseFloat(localStorage.getItem('fontSize') || '100');
        currentSize += delta * 5;
        currentSize = Math.max(80, Math.min(currentSize, 130)); // Range 80% to 130%
        localStorage.setItem('fontSize', currentSize.toString());
        document.documentElement.style.fontSize = `${currentSize}%`;
        document.getElementById('currentFontSize').textContent = `${currentSize}%`;
    }

    /**
     * إعادة تعيين حجم الخط
     */
    function resetFontSize() {
        localStorage.setItem('fontSize', '100');
        document.documentElement.style.fontSize = '100%';
         document.getElementById('currentFontSize').textContent = `100%`;
    }

    /**
     * عرض مربع حوار تثبيت التطبيق
     */
    function promptInstall() {
        if (!deferredPrompt) {
            alert('هذا التطبيق مثبت بالفعل أو لا يمكن تثبيته حالياً.');
            return;
        }
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            console.log(`PWA Install Choice: ${choiceResult.outcome}`);
            // Button state update happens in 'appinstalled' listener
            deferredPrompt = null; // Prompt can only be used once
        });
    }

    /**
     * طلب تأكيد حذف جميع البيانات (Mobile context)
     */
    function confirmClearAllData() {
        // Use the globally exposed function from product-manager.js
        if (typeof window.deleteAllProducts === 'function') {
            window.deleteAllProducts();
            // Update is handled by the event listener
        } else {
            alert('وظيفة حذف البيانات غير متاحة.');
        }
    }

    /**
     * الحصول على بيانات المنتجات (معالجة الأخطاء)
     */
    function getProductData() {
        try {
            const data = JSON.parse(localStorage.getItem('productData') || '[]');
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.error('Mobile Experience: Error reading product data:', e);
            return [];
        }
    }

    /**
     * وظيفة مساعدة لتأخير التنفيذ (Debounce)
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }


    /**
     * تحديث قائمة المنتجات عند تغيير البيانات
     */
    function notifyMobileOfProductChange() {
        if (isMobile) {
             // Only update the list if the list view is currently active or about to become active
             // Or just always update the underlying data representation when needed.
             // Let's update if the current view IS list.
             if(currentView === 'list' && productListView && !productListView.classList.contains('d-none')) {
                updateMobileProductList();
             }
        }
    }

    // بدء التنفيذ
    document.addEventListener('DOMContentLoaded', initMobileExperience);

})();