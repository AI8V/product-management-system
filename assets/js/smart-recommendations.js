/**
 * التوصيات الذكية للعملاء - يقدم اقتراحات للمنتجات المناسبة لكل عميل
 * يعتمد على تحليل تفضيلات العميل وأنماط الشراء لتقديم توصيات شخصية
 */
(function() {
    // إضافة زر التوصيات الذكية للعملاء
    function addSmartRecommendationsButton() {
        const recommendBtn = document.createElement('button');
        recommendBtn.className = 'btn btn-success btn-sm me-2'; // Adjusted margin
        recommendBtn.id = 'smartRecommendBtn';
        recommendBtn.innerHTML = '<i class="fas fa-user-check"></i> توصيات للعملاء';
        recommendBtn.title = 'إنشاء توصيات منتجات ذكية للعملاء';
        recommendBtn.addEventListener('click', showRecommendationsPanel);

        // إضافة الزر إلى حاوية الأزرار الرئيسية
        const actionContainer = document.getElementById('actionButtonsContainer');
        const deleteAllBtn = document.getElementById('deleteAllBtn'); // Reference point
        if (actionContainer && deleteAllBtn) {
            actionContainer.insertBefore(recommendBtn, deleteAllBtn);
        } else if (deleteAllBtn?.parentNode) {
            // Fallback if container doesn't exist
             deleteAllBtn.parentNode.insertBefore(recommendBtn, deleteAllBtn);
        }

        // إضافة نموذج للتوصيات
        addRecommendationsForm();
    }

    // إضافة نموذج لإدخال بيانات العميل والتفضيلات
    function addRecommendationsForm() {
        // Ensure the modal doesn't already exist
        if (document.getElementById('recommendationsModal')) return;

        const formHTML = `
            <div class="modal fade" id="recommendationsModal" tabindex="-1" aria-labelledby="recommendationsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title" id="recommendationsModalLabel">التوصيات الذكية للعملاء</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label" for="customerName">اسم العميل</label>
                                <input type="text" id="customerName" class="form-control" placeholder="أدخل اسم العميل">
                            </div>
                            <div class="mb-3">
                                <label class="form-label" for="customerBudget">الميزانية المتاحة</label>
                                <input type="number" id="customerBudget" class="form-control" placeholder="أدخل الميزانية المتاحة">
                            </div>
                            <div class="mb-3">
                                <label class="form-label" for="customerPreferredCategories">الفئات المفضلة</label>
                                <select id="customerPreferredCategories" class="form-select" multiple>
                                    <!-- سيتم ملؤها ديناميكيًا -->
                                </select>
                                <small class="text-muted">يمكنك تحديد أكثر من فئة بالضغط مع الاستمرار على Ctrl/Cmd.</small>
                            </div>
                            <button type="button" id="generateRecommendationsBtn" class="btn btn-success w-100">
                                <i class="fas fa-magic"></i> توليد التوصيات
                            </button>
                        </div>
                        <div class="modal-footer d-none" id="recommendationsResult">
                            <div class="w-100" id="recommendationsContent"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // إضافة النموذج إلى الصفحة
        document.body.insertAdjacentHTML('beforeend', formHTML);

        // إضافة معالج الحدث لزر توليد التوصيات
        document.getElementById('generateRecommendationsBtn')?.addEventListener('click', generateRecommendations);

        // Cleanup modal when hidden
        const modalElement = document.getElementById('recommendationsModal');
        modalElement?.addEventListener('hidden.bs.modal', () => {
             document.getElementById('recommendationsResult')?.classList.add('d-none');
             document.getElementById('recommendationsContent').innerHTML = '';
             // Optional: Reset form fields
             // document.getElementById('customerName').value = '';
             // document.getElementById('customerBudget').value = '';
             // document.getElementById('customerPreferredCategories').selectedIndex = -1;
        });
    }

    // عرض نافذة التوصيات
    function showRecommendationsPanel() {
        // الحصول على المنتجات
        const productData = JSON.parse(localStorage.getItem('productData')) || [];

        if (productData.length < 3) {
            showAlert('يجب توفر ٣ منتجات على الأقل لإنشاء توصيات دقيقة', 'warning');
            return;
        }

        // استخراج جميع الفئات الفريدة
        const categories = new Set();
        productData.forEach(product => {
            if (product.category) categories.add(product.category.trim());
        });

        // ملء قائمة الفئات في النموذج
        const categorySelect = document.getElementById('customerPreferredCategories');
        categorySelect.innerHTML = ''; // Clear previous options

        if (categories.size === 0) {
             categorySelect.innerHTML = '<option disabled>لا توجد فئات معرفة للمنتجات</option>';
        } else {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }


        // عرض النافذة
        const modalElement = document.getElementById('recommendationsModal');
        if (modalElement) {
             const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
             modal.show();
             // إعادة تعيين نتائج التوصيات عند الفتح
             document.getElementById('recommendationsResult')?.classList.add('d-none');
        }
    }

    // توليد التوصيات بناءً على بيانات العميل
    function generateRecommendations() {
        const customerName = document.getElementById('customerName').value.trim();
        const budget = parseFloat(document.getElementById('customerBudget').value) || 0;

        // الحصول على الفئات المفضلة المحددة
        const categorySelect = document.getElementById('customerPreferredCategories');
        const preferredCategories = Array.from(categorySelect.selectedOptions).map(option => option.value);

        // التحقق من صحة البيانات
        if (!customerName || budget <= 0) {
            showAlert('الرجاء إدخال اسم العميل وميزانية متاحة وصالحة (> 0)', 'warning');
            return;
        }

        // الحصول على بيانات المنتجات
        const productData = JSON.parse(localStorage.getItem('productData')) || [];

        // اختيار المنتجات المناسبة للعميل
        let recommendedProducts = [];
        let baseProductSet = productData;

        // تصفية حسب الفئات المفضلة أولاً إذا تم تحديدها
        if (preferredCategories.length > 0) {
            baseProductSet = productData.filter(product =>
                preferredCategories.includes(product.category)
            );
        }

        // تصفية المنتجات ضمن الميزانية وترتيبها (الأرخص أولاً كقيمة افتراضية)
        recommendedProducts = baseProductSet
            .filter(product => parseFloat(product.total || product.price || 0) <= budget) // Use total price if available
            .sort((a, b) => {
                // ترتيب حسب السعر (أقل = أفضل كقيمة افتراضية)
                return parseFloat(a.total || a.price || 0) - parseFloat(b.total || b.price || 0);
            })
            .slice(0, 3); // أفضل 3 منتجات مطابقة

        // إذا لم يتم تحديد فئات ولم نجد شيئًا، جرب البحث في كل المنتجات ضمن الميزانية
         if (recommendedProducts.length === 0 && preferredCategories.length === 0) {
             recommendedProducts = productData
                 .filter(product => parseFloat(product.total || product.price || 0) <= budget)
                 .sort((a, b) => parseFloat(a.total || a.price || 0) - parseFloat(b.total || b.price || 0))
                 .slice(0, 3);
         }

        // إنشاء مجموعة منتجات تكميلية (منتجات مختلفة الفئات)
        const complementaryProducts = findComplementaryProducts(recommendedProducts, productData, budget);

        // عرض النتائج
        displayRecommendations(customerName, recommendedProducts, complementaryProducts, budget);
    }

    // البحث عن منتجات تكميلية (من فئات مختلفة)
    function findComplementaryProducts(recommendedProducts, allProducts, budget) {
        const recommendedCategories = new Set(recommendedProducts.map(p => p.category));
        const recommendedTitles = new Set(recommendedProducts.map(p => p.title)); // Use title to avoid duplicate *items*

        // حساب الميزانية المتبقية
        const usedBudget = recommendedProducts.reduce((sum, product) => sum + parseFloat(product.total || product.price || 0), 0);
        const remainingBudget = budget - usedBudget;

        // البحث عن منتجات تكميلية من فئات أخرى وضمن الميزانية المتبقية
        return allProducts
            .filter(product =>
                !recommendedTitles.has(product.title) && // Avoid same product
                !recommendedCategories.has(product.category) && // Different category
                parseFloat(product.total || product.price || 0) <= remainingBudget // Within remaining budget
            )
            .sort((a, b) => parseFloat(a.total || a.price || 0) - parseFloat(b.total || b.price || 0)) // Cheaper first
            .slice(0, 2); // أفضل منتجين تكميليين
    }

    // عرض التوصيات في النافذة
    function displayRecommendations(customerName, recommendedProducts, complementaryProducts, budget) {
        const resultSection = document.getElementById('recommendationsResult');
        const contentDiv = document.getElementById('recommendationsContent');
        if (!resultSection || !contentDiv) return;

        // حساب إجمالي التكلفة
        const totalCost = [...recommendedProducts, ...complementaryProducts]
            .reduce((sum, product) => sum + parseFloat(product.total || product.price || 0), 0);

        // إنشاء HTML للنتائج
        let html = `
            <div class="text-center mb-3">
                <h5>توصيات مخصصة للعميل: ${customerName}</h5>
                <p class="text-muted">الميزانية: ${budget.toFixed(2)} | التكلفة الإجمالية: ${totalCost.toFixed(2)}</p>
            </div>
        `;

        // إضافة المنتجات الموصى بها
        if (recommendedProducts.length > 0) {
            html += `
                <h6 class="text-success mb-2"><i class="fas fa-thumbs-up"></i> المنتجات الأنسب</h6>
                <div class="list-group mb-3">
                    ${recommendedProducts.map(product => `
                        <div class="list-group-item list-group-item-action">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${product.title}</h6>
                                <small class="text-primary fw-bold">${parseFloat(product.total || product.price || 0).toFixed(2)}</small>
                            </div>
                            <small class="text-muted">الفئة: ${product.category || 'غير مصنف'}</small>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            html += `<div class="alert alert-warning">لا توجد منتجات أساسية مناسبة ضمن الميزانية أو الفئات المحددة.</div>`;
        }

        // إضافة المنتجات التكميلية
        if (complementaryProducts.length > 0) {
            html += `
                <h6 class="text-info mb-2"><i class="fas fa-plus-circle"></i> منتجات تكميلية مقترحة</h6>
                <div class="list-group">
                    ${complementaryProducts.map(product => `
                        <div class="list-group-item list-group-item-action">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${product.title}</h6>
                                <small class="text-primary fw-bold">${parseFloat(product.total || product.price || 0).toFixed(2)}</small>
                            </div>
                            <small class="text-muted">الفئة: ${product.category || 'غير مصنف'}</small>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // إضافة زر لإنشاء تقرير قابل للطباعة
        // Note: Printing the modal directly might not be ideal. Consider generating a separate printable view.
        // For simplicity, we'll keep the button but printing the modal might need CSS adjustments (@media print).
        // html += `
        //     <button class="btn btn-outline-secondary w-100 mt-3" onclick="window.print()">
        //         <i class="fas fa-print"></i> طباعة التوصيات
        //     </button>
        // `;

        // عرض النتائج
        contentDiv.innerHTML = html;
        resultSection.classList.remove('d-none');
    }

    // دالة مساعدة لعرض الإشعارات - تستخدم النسخة العامة
    function showAlert(message, type = 'info') {
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, type);
        } else {
            console.warn("Global showAlert function not found. Falling back to alert.");
            alert(message); // Fallback
        }
    }

    // تنفيذ الميزة عند تحميل الصفحة
    window.addEventListener('DOMContentLoaded', addSmartRecommendationsButton);
})();