/**
 * تحليلات المنتجات الذكية - يقدم رؤى وتوصيات تلقائية للمنتجات
 * يحلل البيانات ويقترح تحسينات للأسعار والمخزون والتصنيفات
 */
(function() {

    let insightsPanel = null; // Reference to the panel element

    // إضافة زر التحليلات إلى الواجهة
    function addInsightsButton() {
        const insightsBtn = document.createElement('button');
        insightsBtn.className = 'btn btn-primary btn-sm me-2'; // Adjusted margin
        insightsBtn.id = 'showInsightsBtn';
        insightsBtn.innerHTML = '<i class="fas fa-lightbulb"></i> تحليلات ذكية';
        insightsBtn.title = 'عرض تحليلات وتوصيات للمنتجات';
        insightsBtn.addEventListener('click', toggleInsightsPanel); // Toggle visibility

        // إضافة الزر إلى حاوية الأزرار الرئيسية
        const actionContainer = document.getElementById('actionButtonsContainer');
        const deleteAllBtn = document.getElementById('deleteAllBtn'); // Reference point
         if (actionContainer && deleteAllBtn) {
            actionContainer.insertBefore(insightsBtn, deleteAllBtn);
        } else if (deleteAllBtn?.parentNode) {
             deleteAllBtn.parentNode.insertBefore(insightsBtn, deleteAllBtn); // Fallback
        }

        // إنشاء لوحة التحليلات (ستكون مخفية في البداية)
        createInsightsPanel();
    }

    // إنشاء عنصر لوحة التحليلات وإضافته بعد جدول المنتجات
    function createInsightsPanel() {
        if (document.getElementById('insightsPanel')) return; // Already exists

        insightsPanel = document.createElement('div');
        insightsPanel.id = 'insightsPanel';
        insightsPanel.className = 'card shadow-sm mt-4 d-none'; // Start hidden
        insightsPanel.innerHTML = `
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h3 class="h5 mb-0">تحليلات المنتجات والتوصيات</h3>
                 <button type="button" class="btn-close btn-close-white" aria-label="Close" id="closeInsightsBtn"></button>
            </div>
            <div class="card-body" id="insightsContent">
                 <div class="text-center p-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جاري تحميل التحليلات...</span>
                    </div>
                    <p class="mt-2 text-muted">جاري تحليل البيانات...</p>
                </div>
            </div>
             <div class="card-footer text-end">
                 <button class="btn btn-sm btn-outline-secondary" id="refreshInsightsBtn">
                     <i class="fas fa-sync-alt me-1"></i> تحديث التحليل
                 </button>
             </div>
        `;

        // Insert the panel after the table card
        const tableCard = document.querySelector('.card.shadow-sm:has(#productTable)'); // Find card containing the table
        if (tableCard) {
            tableCard.parentNode.insertBefore(insightsPanel, tableCard.nextSibling);
        } else {
             // Fallback: append to main container
             document.querySelector('.container.my-5')?.appendChild(insightsPanel);
        }

        // Add listeners for close and refresh buttons within the panel
         document.getElementById('closeInsightsBtn')?.addEventListener('click', hideInsightsPanel);
         document.getElementById('refreshInsightsBtn')?.addEventListener('click', generateInsights);
    }

     // إظهار أو إخفاء لوحة التحليلات
     function toggleInsightsPanel() {
         if (!insightsPanel) createInsightsPanel(); // Create if it doesn't exist

         if (insightsPanel.classList.contains('d-none')) {
             // Show panel and generate insights
             insightsPanel.classList.remove('d-none');
             generateInsights(); // Generate fresh insights when shown
             insightsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
         } else {
             // Hide panel
             hideInsightsPanel();
         }
     }

     // إخفاء لوحة التحليلات
     function hideInsightsPanel() {
          if (insightsPanel) {
            insightsPanel.classList.add('d-none');
          }
     }


    // توليد التحليلات والتوصيات
    function generateInsights() {
        const insightsContent = document.getElementById('insightsContent');
        if (!insightsContent) {
             console.error("Insights content area not found.");
             return;
        }

         // Show loading state
        insightsContent.innerHTML = ` <div class="text-center p-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p class="mt-2 text-muted">جاري تحليل البيانات...</p>
                </div>`;


        // Use setTimeout to allow the loading spinner to render before potentially heavy calculation
        setTimeout(() => {
            const productData = JSON.parse(localStorage.getItem('productData')) || [];
            if (productData.length < 3) {
                insightsContent.innerHTML = '<div class="alert alert-warning m-0">يجب إضافة ٣ منتجات على الأقل للحصول على تحليلات دقيقة.</div>';
                return;
            }

            // --- تحليل البيانات ---
            const categories = {};
            let totalValue = 0;
            let productsWithIssues = []; // e.g., low price, no category
            let priceDistribution = { low: 0, medium: 0, high: 0 };
            const priceThresholds = { low: 50, medium: 200 }; // Example thresholds

            productData.forEach(product => {
                const price = parseFloat(product.total || product.price || 0);
                totalValue += price;

                // 1. Categorization Analysis
                const cat = product.category?.trim() || 'غير مصنف';
                if (!categories[cat]) {
                    categories[cat] = { count: 0, totalPrice: 0, products: [] };
                }
                categories[cat].count++;
                categories[cat].totalPrice += price;
                categories[cat].products.push(product.title);

                 // 2. Price Distribution
                 if (price <= priceThresholds.low) priceDistribution.low++;
                 else if (price <= priceThresholds.medium) priceDistribution.medium++;
                 else priceDistribution.high++;

                 // 3. Identify Potential Issues
                 if (price <= 5) { // Example: Very low price
                     productsWithIssues.push(`<li>مراجعة سعر "${product.title}" (${price.toFixed(2)}) - قد يكون منخفضًا جدًا.</li>`);
                 }
                 if (!product.category?.trim()) {
                      productsWithIssues.push(`<li>المنتج "${product.title}" غير مصنف.</li>`);
                 }
                 if (parseFloat(product.discount || 0) > price * 0.5 && price > 0) { // High discount
                      productsWithIssues.push(`<li>خصم مرتفع (${parseFloat(product.discount).toFixed(2)}) على المنتج "${product.title}".</li>`);
                 }

            });

            const totalProducts = productData.length;
            const avgValue = totalProducts > 0 ? (totalValue / totalProducts) : 0;

            // Sort categories by count descending
            const sortedCategories = Object.entries(categories)
                                         .sort(([,a],[,b]) => b.count - a.count);

            // --- إنشاء التوصيات ---
            let recommendations = [];

             // Recommendation based on most populated category
             if (sortedCategories.length > 0) {
                 const topCat = sortedCategories[0][0];
                 const topCatCount = sortedCategories[0][1].count;
                 if (topCatCount > totalProducts * 0.4) { // If one category dominates
                     recommendations.push(`<li>فئة "<strong>${topCat}</strong>" تحتوي على ${topCatCount} منتج (${((topCatCount/totalProducts)*100).toFixed(0)}%). فكر في تنويع المنتجات بفئات أخرى.</li>`);
                 } else {
                     recommendations.push(`<li>أكثر فئة شيوعًا هي "<strong>${topCat}</strong>" (${topCatCount} منتج). استمر في مراقبة أداءها.</li>`);
                 }
             }

             // Recommendation based on uncategorized items
              if (categories['غير مصنف'] && categories['غير مصنف'].count > 0) {
                 const uncategorizedCount = categories['غير مصنف'].count;
                 recommendations.push(`<li>يوجد <strong>${uncategorizedCount}</strong> منتج غير مصنف. قم بتصنيفها لتحسين التحليل.</li>`);
             }

            // Recommendation based on price distribution
             if (priceDistribution.low > totalProducts * 0.5) {
                 recommendations.push(`<li>أكثر من نصف المنتجات (${priceDistribution.low}) أسعارها منخفضة (≤ ${priceThresholds.low}). قد تكون هناك فرصة لتقديم منتجات ذات قيمة أعلى.</li>`);
             }
              if (priceDistribution.high > totalProducts * 0.2) {
                 recommendations.push(`<li>نسبة جيدة (${priceDistribution.high}) من المنتجات أسعارها مرتفعة (> ${priceThresholds.medium}). تأكد من أن قيمتها تبرر السعر.</li>`);
             }

            // --- عرض النتائج ---
            let insightsHTML = `
                <div class="row">
                    <div class="col-md-6 mb-3 mb-md-0">
                        <h5 class="text-primary mb-3"><i class="fas fa-chart-pie me-2"></i>نظرة عامة</h5>
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item d-flex justify-content-between align-items-center">إجمالي المنتجات <span class="badge bg-primary rounded-pill">${totalProducts}</span></li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">عدد الفئات الفريدة <span class="badge bg-info rounded-pill">${Object.keys(categories).length}</span></li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">إجمالي قيمة المخزون <span class="badge bg-success rounded-pill">${totalValue.toFixed(2)}</span></li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">متوسط قيمة المنتج <span class="badge bg-warning text-dark rounded-pill">${avgValue.toFixed(2)}</span></li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                         <h5 class="text-primary mb-3"><i class="fas fa-tags me-2"></i>توزيع الفئات (الأعلى)</h5>
                         <ul class="list-group list-group-flush">
                             ${sortedCategories.slice(0, 4).map(([cat, data]) => `
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    ${cat} <span class="badge bg-secondary rounded-pill">${data.count}</span>
                                </li>`).join('')}
                              ${sortedCategories.length > 4 ? `<li class="list-group-item text-muted small">... و ${sortedCategories.length - 4} فئات أخرى</li>` : ''}
                              ${sortedCategories.length === 0 ? `<li class="list-group-item text-muted">لا توجد فئات</li>` : ''}
                         </ul>
                    </div>
                </div>
                <hr>
                 ${productsWithIssues.length > 0 ? `
                 <div class="mt-3">
                     <h5 class="text-danger mb-2"><i class="fas fa-exclamation-triangle me-2"></i>نقاط للمراجعة (${productsWithIssues.length})</h5>
                     <div class="alert alert-light border small" style="max-height: 150px; overflow-y: auto;">
                        <ul class="mb-0 ps-3">${productsWithIssues.join('')}</ul>
                     </div>
                 </div>
                 ` : ''}

                ${recommendations.length > 0 ? `
                 <div class="mt-3">
                    <h5 class="text-success mb-2"><i class="fas fa-lightbulb me-2"></i>توصيات مقترحة</h5>
                    <div class="alert alert-success">
                        <ul class="mb-0 ps-3">${recommendations.join('')}</ul>
                    </div>
                </div>
                ` : `
                 <div class="mt-3">
                     <p class="text-muted text-center">لا توجد توصيات تلقائية حالياً بناءً على البيانات المتاحة.</p>
                 </div>
                `}
            `;

            insightsContent.innerHTML = insightsHTML;
        }, 100); // Short delay for UI update
    }


    // إضافة دالة مساعدة لعرض الإشعارات (تستخدم النسخة العامة)
    function showAlert(message, type = 'info') {
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, type);
        } else {
            console.warn("Insights: Global showAlert function not found. Falling back to alert.");
            alert(message); // Fallback
        }
    }

    // تنفيذ الميزة عند تحميل الصفحة
    window.addEventListener('DOMContentLoaded', addInsightsButton);

     // تحديث التحليلات عند تغيير البيانات
     window.addEventListener('productDataSaved', () => {
         // Only regenerate if the panel is currently visible
         if (insightsPanel && !insightsPanel.classList.contains('d-none')) {
             generateInsights();
         }
     });

})();