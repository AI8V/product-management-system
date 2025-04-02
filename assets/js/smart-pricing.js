/**
 * اقتراحات التسعير الذكية - يقدم اقتراحات آلية لتسعير المنتجات الجديدة
 * يعتمد على تحليل الفئات والمنتجات الحالية لتحديد السعر الأمثل
 */
(function() {
    // إضافة زر الاقتراح الذكي للسعر ومؤشر الجودة
    function addSmartPricingFeatures() {
        const priceField = document.getElementById('price');
        if (!priceField) return;

        const priceFieldContainer = priceField.parentNode; // Get the container div (e.g., col-md-3)

        // --- إنشاء زر اقتراح السعر ---
        if (!document.getElementById('smartPriceBtn')) {
            const smartPriceBtn = document.createElement('button');
            smartPriceBtn.className = 'btn btn-outline-info btn-sm mt-2 w-100'; // Use outline and full width
            smartPriceBtn.type = 'button';
            smartPriceBtn.id = 'smartPriceBtn';
            smartPriceBtn.innerHTML = '<i class="fas fa-magic"></i> اقتراح سعر ذكي';
            smartPriceBtn.title = 'يقترح سعراً بناءً على منتجات مشابهة في نفس الفئة';
            smartPriceBtn.addEventListener('click', suggestOptimalPrice);

            // إضافة الزر داخل حاوية حقل السعر
            priceFieldContainer.appendChild(smartPriceBtn);
        }

        // --- إنشاء مؤشر جودة السعر ---
        if (!document.getElementById('priceQualityIndicator')) {
             const indicator = document.createElement('div');
             indicator.id = 'priceQualityIndicator';
             indicator.className = 'price-quality mt-2 small d-none'; // Hidden initially
             priceFieldContainer.appendChild(indicator); // Add inside container too

             // تحديث مؤشر جودة السعر عند تغيير السعر أو الفئة
             priceField.addEventListener('input', updatePriceQuality);
             const categoryField = document.getElementById('category');
             if(categoryField) {
                categoryField.addEventListener('input', updatePriceQuality);
                categoryField.addEventListener('change', updatePriceQuality); // Also on change
             }
        }
    }

    // اقتراح السعر الأمثل
    function suggestOptimalPrice() {
        const productData = JSON.parse(localStorage.getItem('productData')) || [];
        const categoryField = document.getElementById('category');
        const priceField = document.getElementById('price');

        if (!categoryField || !priceField) return;

        const category = categoryField.value.trim();

        if (!category) {
            showAlert('الرجاء إدخال فئة المنتج أولاً للحصول على اقتراح سعر دقيق.', 'warning');
            categoryField.focus();
            return;
        }
         if (productData.length < 2) {
            showAlert('أضف المزيد من المنتجات (منتجين على الأقل) للحصول على اقتراحات أفضل.', 'info');
            return; // Don't stop, maybe suggest a default? No, better to warn.
        }

        // تحليل أسعار المنتجات المماثلة (في نفس الفئة)
        const similarProducts = productData.filter(p => p.category && p.category.trim() === category);

        if (similarProducts.length > 0) {
            // حساب متوسط الأسعار للمنتجات المماثلة
            const avgPrice = similarProducts.reduce((sum, prod) => sum + parseFloat(prod.price || 0), 0) / similarProducts.length;

            // اقتراح سعر قريب من المتوسط (مع تقريب بسيط)
            let suggestedPrice = Math.round(avgPrice / 5) * 5; // Round to nearest 5
             if (suggestedPrice <= 0) { // Ensure positive price
                suggestedPrice = Math.round(avgPrice) > 0 ? Math.round(avgPrice) : 10; // Use rounded average or a default like 10
             }

            // تعيين السعر المقترح
            priceField.value = suggestedPrice;

            // تنفيذ حدث input لتحديث الإجمالي ومؤشر الجودة
            priceField.dispatchEvent(new Event('input', { bubbles: true }));

            showAlert(`تم اقتراح سعر (${suggestedPrice}) بناءً على ${similarProducts.length} منتج مشابه في فئة "${category}".`, 'success');
        } else {
            showAlert(`لم يتم العثور على منتجات مشابهة في فئة "${category}". لا يمكن اقتراح سعر تلقائي.`, 'info');
        }
    }

    // تحديث مؤشر جودة السعر
    function updatePriceQuality() {
        const indicator = document.getElementById('priceQualityIndicator');
        const priceField = document.getElementById('price');
        const categoryField = document.getElementById('category');

        if (!indicator || !priceField || !categoryField) {
            return;
        }

        const priceValue = priceField.value;
        const categoryValue = categoryField.value.trim();

        // إخفاء المؤشر إذا لم يكن هناك سعر أو فئة
        if (!priceValue || !categoryValue) {
            indicator.className = 'price-quality mt-2 small d-none';
            return;
        }

        const price = parseFloat(priceValue);
        if (isNaN(price) || price <= 0) {
             indicator.className = 'price-quality mt-2 small d-none';
             return;
        }

        const productData = JSON.parse(localStorage.getItem('productData')) || [];

        // تحليل أسعار المنتجات المماثلة
        const similarProducts = productData.filter(p => p.category && p.category.trim() === categoryValue && p.price > 0);

        if (similarProducts.length > 0) {
            // حساب متوسط الأسعار للمنتجات المماثلة
            const prices = similarProducts.map(p => parseFloat(p.price));
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

            // تحديد مدى مناسبة السعر
            let quality, message, iconClass, textClass;
            const ratio = price / avgPrice;

            if (ratio < 0.7) {
                quality = 'منخفض جداً';
                message = 'أقل بكثير من متوسط الفئة';
                iconClass = 'fas fa-arrow-down';
                textClass = 'text-danger';
            } else if (ratio < 0.9) {
                quality = 'منخفض';
                message = 'أقل من متوسط الفئة';
                iconClass = 'fas fa-arrow-down';
                textClass = 'text-warning';
            } else if (ratio > 1.5) { // Increased upper threshold
                quality = 'مرتفع جداً';
                message = 'أعلى بكثير من متوسط الفئة';
                iconClass = 'fas fa-arrow-up';
                textClass = 'text-danger';
            } else if (ratio > 1.2) { // Increased upper threshold
                quality = 'مرتفع';
                message = 'أعلى من متوسط الفئة';
                iconClass = 'fas fa-arrow-up';
                textClass = 'text-warning';
            } else {
                quality = 'مثالي';
                message = 'مناسب لمتوسط الفئة';
                iconClass = 'fas fa-check-circle';
                textClass = 'text-success';
            }

            indicator.className = `price-quality mt-2 small ${textClass}`;
            indicator.innerHTML = `<i class="${iconClass} me-1"></i> <strong>${quality}:</strong> ${message} (المتوسط: ${avgPrice.toFixed(2)})`;
        } else {
            // لا توجد منتجات للمقارنة
            indicator.className = 'price-quality mt-2 small text-muted';
             indicator.innerHTML = `<i class="fas fa-info-circle me-1"></i> لا توجد منتجات كافية للمقارنة في هذه الفئة.`;
        }
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
    window.addEventListener('DOMContentLoaded', addSmartPricingFeatures);
})();