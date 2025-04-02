(function() {
    'use strict';

    // --- Elements ---
    let dashboardContainer = null; // سيتم إنشاؤه أو الإشارة إليه لاحقًا
    let dashboardTriggerButton = null; // زر لفتح/إظهار لوحة التحكم

    // --- Chart Instance ---
    let categoryChart = null; // للاحتفاظ بمثيل الرسم البياني لتحديثه لاحقًا

    // --- Data Function ---
    function getProductData() {
        try {
            const data = localStorage.getItem('productData');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Dashboard: Error reading product data:", e);
            return [];
        }
    }

    // --- Calculation Functions ---
    function calculateStats(products) {
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
        const categories = {};
        products.forEach(p => {
            const cat = p.category || 'غير مصنف';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        const uniqueCategories = Object.keys(categories).length;
        const averagePrice = totalProducts > 0 ? totalValue / totalProducts : 0;

        // Sort categories by count (descending) for top categories list
        const sortedCategories = Object.entries(categories)
                                     .sort(([,a],[,b]) => b-a)
                                     .slice(0, 5); // Get top 5

        return {
            totalProducts,
            totalValue: totalValue.toFixed(2),
            uniqueCategories,
            averagePrice: averagePrice.toFixed(2),
            categoryCounts: categories, // For the chart
            topCategories: sortedCategories // For the list
        };
    }

    // --- Rendering Functions ---
    function renderDashboard(stats) {
        if (!dashboardContainer) return;

        // 1. Render Key Stats
        const statsHTML = `
            <div class="row text-center mb-4">
                <div class="col-6 col-md-3 mb-3">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title text-primary">${stats.totalProducts}</h5>
                            <p class="card-text text-muted small">إجمالي المنتجات</p>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-3">
                     <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title text-success">${stats.totalValue}</h5>
                            <p class="card-text text-muted small">إجمالي القيمة</p>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-3">
                     <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title text-info">${stats.uniqueCategories}</h5>
                            <p class="card-text text-muted small">عدد الفئات</p>
                        </div>
                    </div>
                </div>
                 <div class="col-6 col-md-3 mb-3">
                     <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title text-warning">${stats.averagePrice}</h5>
                            <p class="card-text text-muted small">متوسط السعر</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 2. Render Top Categories List
        let topCategoriesHTML = '<h5 class="mb-3">أعلى الفئات</h5><ul class="list-group list-group-flush mb-4">';
        if (stats.topCategories.length > 0) {
             stats.topCategories.forEach(([category, count]) => {
                topCategoriesHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
                                        ${category}
                                        <span class="badge bg-secondary rounded-pill">${count}</span>
                                      </li>`;
            });
        } else {
            topCategoriesHTML += '<li class="list-group-item text-muted">لا توجد فئات لعرضها</li>';
        }
        topCategoriesHTML += '</ul>';


        // 3. Prepare Chart Area
        const chartHTML = `
            <h5 class="mb-3">توزيع المنتجات حسب الفئة</h5>
            <div style="max-height: 300px;"> <!-- Limit chart height -->
                 <canvas id="categoryChartCanvas"></canvas>
            </div>`;

        // Combine all parts
        dashboardContainer.innerHTML = `
            <div class="card shadow-sm">
                 <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <h4 class="h5 mb-0">لوحة التحكم</h4>
                    <button class="btn btn-sm btn-outline-secondary" id="refreshDashboardBtn" title="تحديث البيانات">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <div class="card-body">
                    ${statsHTML}
                    <div class="row">
                        <div class="col-md-4">
                            ${topCategoriesHTML}
                        </div>
                        <div class="col-md-8">
                             ${chartHTML}
                        </div>
                    </div>
                </div>
            </div>`;

        // 4. Render Chart (using Chart.js - needs to be included)
        renderCategoryChart(stats.categoryCounts);

        // Add refresh button listener
        document.getElementById('refreshDashboardBtn')?.addEventListener('click', updateDashboard);

    }

    function renderCategoryChart(categoryData) {
         // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not loaded. Cannot render chart.');
             const canvas = document.getElementById('categoryChartCanvas');
             if(canvas) {
                const ctx = canvas.getContext('2d');
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#dc3545'; // Red color for error
                ctx.fillText('مكتبة الرسوم البيانية (Chart.js) غير محملة.', canvas.width / 2, canvas.height / 2);
             }
            return;
        }

        const ctx = document.getElementById('categoryChartCanvas')?.getContext('2d');
        if (!ctx) return;

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        // Destroy previous chart instance if exists
        if (categoryChart) {
            categoryChart.destroy();
        }

        // Generate dynamic colors (simple example)
        const backgroundColors = labels.map((_, i) => `hsl(${i * (360 / labels.length)}, 70%, 60%)`);

        categoryChart = new Chart(ctx, {
            type: 'doughnut', // or 'pie' or 'bar'
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد المنتجات',
                    data: data,
                    backgroundColor: backgroundColors,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow chart to fill container height
                plugins: {
                    legend: {
                        position: 'top', // Or 'bottom', 'left', 'right'
                        labels: {
                           font: {
                              family: 'inherit' // Use body font if possible
                           }
                        }
                    },
                     tooltip: {
                        bodyFont: {
                           family: 'inherit'
                        },
                        titleFont: {
                           family: 'inherit'
                        }
                    }
                }
            }
        });
    }


    // --- Update Function ---
    function updateDashboard() {
        console.log("Updating dashboard...");
        const products = getProductData();
        if (products.length === 0 && dashboardContainer) {
             dashboardContainer.innerHTML = `
                <div class="card shadow-sm">
                     <div class="card-header bg-light"><h4 class="h5 mb-0">لوحة التحكم</h4></div>
                     <div class="card-body">
                        <p class="text-muted text-center py-5">لا توجد بيانات منتجات لعرض لوحة التحكم.</p>
                     </div>
                 </div>`;
             return;
        }
        const stats = calculateStats(products);
        renderDashboard(stats);
    }

    // --- Initialization ---
    function initDashboard() {
        // Create container dynamically or find existing one
        let containerTarget = document.querySelector('.container.my-5'); // Target main container
        if (containerTarget && !document.getElementById('dashboardArea')) {
             dashboardContainer = document.createElement('div');
             dashboardContainer.id = 'dashboardArea';
             dashboardContainer.className = 'mb-4'; // Add some margin
             // Insert it before the product creation card
             let productCard = containerTarget.querySelector('.card.shadow-sm.mb-4');
             if (productCard) {
                containerTarget.insertBefore(dashboardContainer, productCard);
             } else {
                 containerTarget.prepend(dashboardContainer); // Add at the beginning if card not found
             }
        } else {
            dashboardContainer = document.getElementById('dashboardArea');
        }

        // Load Chart.js dynamically if not already included
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = updateDashboard; // Render dashboard once script is loaded
            script.onerror = () => {
                 console.error("Failed to load Chart.js");
                 updateDashboard(); // Try to render without chart
            };
            document.body.appendChild(script);
        } else {
             // Initial dashboard rendering
             updateDashboard();
        }


         // Listen for product data changes (simple approach: update when main functions are called)
         // We need to modify product-manager.js slightly to notify the dashboard
         window.addEventListener('productDataChanged', updateDashboard);


    }

     // --- Add event listener for data changes (to be triggered from product-manager.js) ---
     // Create a custom event dispatcher
     function notifyDataChange() {
        window.dispatchEvent(new CustomEvent('productDataChanged'));
     }

     // Expose the notifier function globally (or use a better module system if available)
     window.notifyDashboardOfDataChange = notifyDataChange;


    // --- Run ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }

})();