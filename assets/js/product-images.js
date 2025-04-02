/**
 * وحدة إدارة صور المنتجات - نسخة مبسطة ومحسنة
 * تركز على إضافة الصور وعرضها وتخزينها
 */
(function() {
    'use strict';

    // --- المتغيرات الرئيسية ---
    let productImages = {}; // { productId: base64String }
    const STORAGE_KEY = 'productImages';
    const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

    // --- التهيئة الرئيسية ---
    function init() {
        loadImagesFromStorage();
        addFontAwesomeIfNeeded(); // التأكد من وجود الأيقونات
        addImageStyles(); // إضافة الأنماط اللازمة
        addImageFieldToForm(); // إضافة حقل الصورة للنموذج
        setupEventHandlers(); // إعداد معالجات الأحداث الأساسية
        enhanceProductTableDisplay(); // تحسين عرض الجدول ليشمل الصور
        setupIntegrationHooks(); // ربط الوظائف مع الوظائف العامة الموجودة
        console.log('وحدة صور المنتجات تم تهيئتها.');
    }

    // --- إدارة التخزين ---
    function loadImagesFromStorage() {
        const storedImages = localStorage.getItem(STORAGE_KEY);
        if (storedImages) {
            try {
                productImages = JSON.parse(storedImages);
            } catch (e) {
                console.error('خطأ في تحليل بيانات الصور المخزنة:', e);
                productImages = {};
            }
        }
    }

    function saveImagesToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(productImages));
        } catch (e) {
            console.error('خطأ في حفظ الصور في localStorage:', e);
            showAlert('حدث خطأ أثناء حفظ الصورة. قد تكون مساحة التخزين ممتلئة.', 'danger');
        }
    }

    // --- إنشاء معرّف فريد للمنتج ---
    /**
     * إنشاء معرّف فريد للمنتج بناءً على خصائصه.
     * ملاحظة: هذه الطريقة قد لا تكون فريدة تمامًا إذا تغيرت البيانات الأساسية أو تطابقت.
     * يفضل استخدام معرّف فريد (ID) حقيقي إذا كان متاحًا في بيانات المنتج الأصلية.
     */
    function generateProductId(product) {
        // استخدام تركيبة من الخصائص لمحاولة إنشاء معرّف فريد
        // استخدام الفئة والسعر كمثال - يجب تعديله ليناسب بيانات المنتج الفعلية المضمونة عدم التغير
        const keyPart1 = String(product.title || '').trim().replace(/\s+/g, '_');
        const keyPart2 = String(product.price || '0');
        const keyPart3 = String(product.category || 'none').trim().replace(/\s+/g, '_');
        // تجنبًا للمعرفات الطويلة جدًا، يمكن استخدام جزء من العنوان
        const shortTitle = keyPart1.substring(0, 30);
        return `prod_${shortTitle}_${keyPart2}_${keyPart3}`.toLowerCase();
    }

     /**
     * استرجاع بيانات صورة المنتج
     * @param {string} productId - معرّف المنتج
     * @returns {string|null} - بيانات الصورة (Base64) أو null
     */
    function getProductImage(productId) {
        return productImages[productId] || null;
    }


    // --- إعداد واجهة المستخدم ---
    function addFontAwesomeIfNeeded() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
            document.head.appendChild(link);
            console.log('Font Awesome أُضيفت.');
        }
    }

    function addImageStyles() {
        if (!document.getElementById('product-images-styles')) {
            const style = document.createElement('style');
            style.id = 'product-images-styles';
            style.textContent = `
                .image-preview-container { height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: .25rem; position: relative; }
                #imagePreview { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                #imagePreview img { max-width: 100%; max-height: 100px; object-fit: contain; }
                #imagePreview .placeholder-icon { font-size: 2.5rem; color: #adb5bd; }
                #imagePreview .placeholder-text { font-size: 0.8rem; color: #6c757d; margin-top: 5px; }
                .product-thumbnail { width: 45px; height: 45px; object-fit: cover; border-radius: 4px; cursor: pointer; vertical-align: middle; }
                .product-thumbnail-placeholder { width: 45px; height: 45px; display: inline-flex; align-items: center; justify-content: center; background-color: #e9ecef; color: #adb5bd; border-radius: 4px; font-size: 1.2rem; vertical-align: middle; }
                .product-image-viewer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.85); display: flex; align-items: center; justify-content: center; z-index: 1060; /* أعلى من المودال الافتراضي */ cursor: pointer; }
                .product-image-viewer img { max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 5px; background: white; padding: 5px; }
                .product-image-viewer .close-viewer { position: absolute; top: 15px; right: 25px; color: white; font-size: 35px; font-weight: bold; cursor: pointer; transition: color 0.2s; }
                .product-image-viewer .close-viewer:hover { color: #ccc; }
                #imageFieldContainer .form-control, #imageFieldContainer .btn { height: calc(1.5em + .75rem + 2px); /* محاذاة الارتفاع */ }
                /* تحسينات طفيفة للنموذج */
                 #imageFieldContainer .row > div { display: flex; flex-direction: column; justify-content: space-between; }
                 #imageFieldContainer small { margin-top: 5px; }
            `;
            document.head.appendChild(style);
        }
    }

    function addImageFieldToForm() {
        const form = document.getElementById('productForm');
        // محاولة العثور على عنصر مرجعي لإدراج الحقل قبله (مثل حقل الكمية أو زر الإرسال)
        const referenceElement = form ? (form.querySelector('#count') || form.querySelector('button[type="submit"]')) : null;
        const parentContainer = referenceElement ? referenceElement.closest('.mb-3, div') : null; // حاوية العنصر المرجعي

        if (!form || !parentContainer) {
            console.warn('لم يتم العثور على نموذج المنتج أو مكان مناسب لإضافة حقل الصورة.');
            return;
        }

        // تجنب إضافة الحقل إذا كان موجودًا بالفعل
        if (document.getElementById('imageFieldContainer')) return;

        const imageFieldHTML = `
            <div class="mb-3" id="imageFieldContainer">
                <label class="form-label fw-bold">صورة المنتج (اختياري)</label>
                <div class="row g-2 align-items-center">
                    <div class="col-sm-8">
                        <div class="input-group">
                            <input type="file" class="form-control" id="productImage" accept="image/png, image/jpeg, image/gif, image/webp">
                            <button class="btn btn-outline-secondary" type="button" id="clearImageBtn" title="مسح الصورة المختارة">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                         <small class="text-muted d-block mt-1">أقصى حجم: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB. الصيغ المقبولة: JPG, PNG, GIF, WebP.</small>
                    </div>
                    <div class="col-sm-4">
                        <div class="image-preview-container">
                            <div id="imagePreview">
                                <i class="fas fa-image placeholder-icon"></i>
                                <p class="placeholder-text mb-0">معاينة</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // إدراج حقل الصورة قبل العنصر المرجعي
        parentContainer.insertAdjacentHTML('beforebegin', imageFieldHTML);
        console.log('حقل الصورة أُضيف إلى النموذج.');
    }

    // --- معالجة الأحداث ---
    function setupEventHandlers() {
        // استخدام تفويض الأحداث لربط المستمعات بعناصر قد لا تكون موجودة عند التحميل الأولي
        document.body.addEventListener('change', handleDelegatedChange);
        document.body.addEventListener('click', handleDelegatedClick);
    }

    function handleDelegatedChange(event) {
        if (event.target.matches('#productImage')) {
            handleImageSelection(event.target);
        }
    }

    function handleDelegatedClick(event) {
        if (event.target.closest('#clearImageBtn')) {
            clearImagePreview();
        } else if (event.target.matches('.product-thumbnail')) {
            showImageViewer(event.target.src);
        } else if (event.target.matches('.product-image-viewer') || event.target.matches('.close-viewer')) {
            closeImageViewer();
        }
    }

    function handleImageSelection(inputElement) {
        if (inputElement.files && inputElement.files[0]) {
            const file = inputElement.files[0];

            // التحقق من نوع الملف
            if (!file.type.startsWith('image/')) {
                showAlert('يرجى اختيار ملف صورة صالح (مثل JPG, PNG, GIF, WebP).', 'warning');
                clearImagePreview(); // مسح الإدخال والمعاينة
                return;
            }

            // التحقق من حجم الملف
            if (file.size > MAX_FILE_SIZE_BYTES) {
                showAlert(`حجم الصورة كبير جدًا (${(file.size / 1024 / 1024).toFixed(1)}MB). الحد الأقصى هو ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`, 'warning');
                clearImagePreview();
                return;
            }

            // قراءة الملف وعرض المعاينة
            const reader = new FileReader();
            reader.onload = function(e) {
                const imagePreview = document.getElementById('imagePreview');
                if (imagePreview) {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة">`;
                }
            };
            reader.onerror = function() {
                console.error('خطأ في قراءة ملف الصورة.');
                showAlert('حدث خطأ أثناء قراءة الصورة.', 'danger');
                clearImagePreview();
            };
            reader.readAsDataURL(file);
        } else {
            // لا يوجد ملف مختار (قد يكون المستخدم ألغى الاختيار)
            clearImagePreview(false); // مسح المعاينة فقط، وليس قيمة الإدخال
        }
    }

    function clearImagePreview(clearInput = true) {
        const imagePreview = document.getElementById('imagePreview');
        const imageInput = document.getElementById('productImage');

        if (imagePreview) {
            imagePreview.innerHTML = `
                <i class="fas fa-image placeholder-icon"></i>
                <p class="placeholder-text mb-0">معاينة</p>
            `;
        }
        if (imageInput && clearInput) {
            imageInput.value = ''; // مسح قيمة حقل الملف
        }
    }

    function showImageViewer(imageUrl) {
        // إزالة أي عارض صور قديم أولاً
        closeImageViewer();

        const viewer = document.createElement('div');
        viewer.className = 'product-image-viewer';
        viewer.id = 'productImageViewer';
        viewer.innerHTML = `
            <span class="close-viewer" title="إغلاق">×</span>
            <img src="${imageUrl}" alt="صورة المنتج بحجم كامل">
        `;
        document.body.appendChild(viewer);
        // منع التمرير في الخلفية
        document.body.style.overflow = 'hidden';
    }

    function closeImageViewer() {
        const viewer = document.getElementById('productImageViewer');
        if (viewer) {
            viewer.remove();
            // استعادة التمرير
             document.body.style.overflow = '';
        }
    }

     function showAlert(message, type = 'info', duration = 5000) {
        const alertContainerId = 'globalAlertContainer';
        let alertContainer = document.getElementById(alertContainerId);

        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = alertContainerId;
            // تحديد موقع ثابت للتنبيهات في أعلى الصفحة
            Object.assign(alertContainer.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '1070', // أعلى من عارض الصور
                width: '300px', // عرض مناسب للتنبيهات
                direction: 'rtl' // تأكد من اتجاه النص
            });
            document.body.appendChild(alertContainer);
        }

        const alertId = `alert-${Date.now()}`;
        const alertElement = document.createElement('div');
        alertElement.id = alertId;
        alertElement.className = `alert alert-${type} alert-dismissible fade show shadow-sm`;
        alertElement.role = 'alert';
        alertElement.style.textAlign = 'right'; // ضمان محاذاة النص لليمين
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق" style="margin-left: 0.5rem; margin-right: auto;"></button>
        `;

        alertContainer.appendChild(alertElement);

        // إزالة التنبيه تلقائيًا بعد مدة معينة
        setTimeout(() => {
            const currentAlert = document.getElementById(alertId);
            if (currentAlert) {
                 // استخدام bootstrap API للإغلاق إذا كان متاحًا، أو الإزالة المباشرة
                if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                    const bsAlert = bootstrap.Alert.getInstance(currentAlert);
                    if (bsAlert) {
                        bsAlert.close();
                    } else {
                       currentAlert.remove();
                    }
                } else {
                    currentAlert.remove();
                }
            }
             // إزالة الحاوية إذا كانت فارغة
            if (alertContainer.children.length === 0) {
                alertContainer.remove();
            }
        }, duration);
    }


    // --- تحسين عرض جدول المنتجات ---
    function enhanceProductTableDisplay() {
        // 1. إضافة عمود الصورة إلى رأس الجدول
        const table = document.querySelector('#productTable'); // يفترض وجود tbody بهذا الـ ID
        if (!table) {
            console.warn("لم يتم العثور على tbody#productTable.");
            return;
        }
        const thead = table.closest('table')?.querySelector('thead tr');
        if (thead && !thead.querySelector('th[data-image-column]')) {
            const imageHeader = document.createElement('th');
            imageHeader.textContent = 'صورة';
            imageHeader.setAttribute('data-image-column', 'true'); // علامة لتمييز العمود
            imageHeader.style.width = '60px'; // تحديد عرض ثابت لعمود الصورة
            imageHeader.style.textAlign = 'center';
            // إدراج العمود في بداية الجدول (أو في مكان مناسب آخر)
            thead.insertBefore(imageHeader, thead.children[1] || thead.firstChild); // محاولة الإدراج بعد عمود الرقم التسلسلي إن وجد
        }

         // 2. استخدام MutationObserver لمراقبة التغييرات في tbody
        const observer = new MutationObserver(mutations => {
            // استخدام debounce لتجنب الاستدعاءات المتكررة السريعة
            debounce(updateTableRowsWithImages, 50)();
        });

        observer.observe(table, { childList: true }); // مراقبة إضافة أو إزالة الصفوف

        // 3. تحديث الجدول عند التحميل الأولي
         updateTableRowsWithImages();
    }

    // دالة Debounce بسيطة
    let debounceTimer;
    function debounce(func, delay) {
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    function updateTableRowsWithImages() {
        const rows = document.querySelectorAll('#productTable tr');
        const productData = JSON.parse(localStorage.getItem('productData')) || []; // تحميل البيانات مرة واحدة

        rows.forEach(row => {
            // تجاهل الصفوف التي لا تحتوي على خلايا بيانات أو صفوف الترويسة أو "لا توجد منتجات"
            if (row.cells.length < 2 || row.querySelector('th') || row.querySelector('td[colspan]')) {
                 // التأكد من أن الصفوف التي لا تمثل منتجات لا تحتوي على خلية صورة فارغة
                 const existingImageCell = row.querySelector('td[data-image-cell]');
                 if(existingImageCell) existingImageCell.remove();
                return;
            }

            // تجنب إضافة الخلية إذا كانت موجودة بالفعل
            if (row.querySelector('td[data-image-cell]')) {
                return;
            }

            // محاولة الحصول على مؤشر المنتج من زر التعديل (طريقة هشة، تعتمد على هيكل HTML)
             const editButton = row.querySelector('button[onclick*="editProduct"]');
             let productIndex = -1;
             if (editButton) {
                 const match = editButton.getAttribute('onclick').match(/editProduct\((\d+)\)/);
                 if (match && match[1]) {
                     productIndex = parseInt(match[1], 10);
                 }
             }

             // إنشاء خلية الصورة
             const imageCell = document.createElement('td');
             imageCell.setAttribute('data-image-cell', 'true');
             imageCell.style.textAlign = 'center';
             imageCell.style.verticalAlign = 'middle';

             let imageData = null;
             if (productIndex !== -1 && productData[productIndex]) {
                 const product = productData[productIndex];
                 const productId = generateProductId(product);
                 imageData = getProductImage(productId);
             }

             // عرض الصورة أو placeholder
             if (imageData) {
                 imageCell.innerHTML = `<img src="${imageData}" alt="صورة مصغرة" class="product-thumbnail" title="اضغط لعرض الصورة بالحجم الكامل">`;
             } else {
                 imageCell.innerHTML = `<span class="product-thumbnail-placeholder" title="لا توجد صورة"><i class="fas fa-image"></i></span>`;
             }

             // إدراج الخلية في بداية الصف (أو بعد الرقم التسلسلي)
             row.insertBefore(imageCell, row.children[1] || row.firstChild);
        });
    }

    // --- الربط مع وظائف التطبيق الرئيسية ---
    function setupIntegrationHooks() {
        wrapFormSubmit();
        wrapEditProduct();
        wrapDeleteProduct();
        wrapDeleteAll();
        // ملاحظة: تم إزالة تعديل وظائف البحث، التصدير، الاستيراد، الطباعة لتبسيط الوحدة.
        // يجب أن تستدعي تلك الوظائف (إذا لزم الأمر) `productImagesModule.getProductImage(productId)` للحصول على بيانات الصورة.
    }

    // 1. الربط مع إرسال النموذج
    function wrapFormSubmit() {
        const form = document.getElementById('productForm');
        if (!form) return;

        // حفظ المعالج الأصلي إن وجد (خاصة إذا كان مرتبطًا بـ onsubmit مباشرة)
        const originalOnSubmit = form.onsubmit;
        form.onsubmit = null; // إزالته لمنع التنفيذ المزدوج

        form.addEventListener('submit', function(event) {
            event.preventDefault(); // منع الإرسال الافتراضي دائمًا هنا

            // --- تنفيذ منطق الإرسال الأصلي ---
            let productSubmitted = false;
            let submittedProductIndex = -1; // لتحديد المنتج المضاف/المعدل

            try {
                 // حفظ الحالة الحالية قبل الإرسال
                const currentMode = window.mode || 'create'; // افتراض 'create' إذا لم يكن معرفًا
                const currentIndex = window.tmp; // المؤشر المستخدم في حالة التحديث

                // محاولة استدعاء المعالج الأصلي أو المعالج المخصص
                if (typeof window.handleProductSubmit === 'function') {
                    window.handleProductSubmit(event); // استدعاء المعالج المخصص إذا وجد
                    productSubmitted = true;
                } else if (originalOnSubmit) {
                    // محاكاة استدعاء المعالج الأصلي (قد لا يعمل دائمًا بشكل مثالي)
                    const result = originalOnSubmit.call(form, event);
                    // إذا كان onsubmit يُرجع false لمنع الإرسال، نحترمه (نادر في تطبيقات SPA)
                    if (result === false) return;
                     productSubmitted = true;
                } else {
                    // كحل أخير، تنفيذ منطق بسيط لحفظ البيانات (إذا لم يكن هناك معالج آخر)
                    // هذا يجب أن يكون نادرًا ويشير إلى مشكلة في هيكل التطبيق الأصلي
                    console.warn("لم يتم العثور على معالج إرسال النموذج الأصلي (handleProductSubmit or onsubmit). محاولة حفظ أساسي.");
                    if (saveBasicProductData()) { // دالة مساعدة لحفظ البيانات الأساسية
                         productSubmitted = true;
                    }
                }

                 // تحديد مؤشر المنتج بعد الإرسال
                 if (productSubmitted) {
                     if (currentMode === 'update' && typeof currentIndex !== 'undefined') {
                         submittedProductIndex = currentIndex;
                     } else {
                         // في حالة الإنشاء، نفترض أنه آخر عنصر أُضيف
                         const productData = JSON.parse(localStorage.getItem('productData') || '[]');
                         submittedProductIndex = productData.length - 1;
                     }
                 }

            } catch (err) {
                 console.error("خطأ أثناء تنفيذ معالج الإرسال الأصلي:", err);
                 showAlert('حدث خطأ أثناء حفظ المنتج.', 'danger');
                 return; // إيقاف العملية إذا فشل حفظ المنتج
            }

             // --- معالجة الصورة بعد التأكد من نجاح إرسال المنتج ---
             if (productSubmitted && submittedProductIndex !== -1) {
                 processImageOnSubmit(submittedProductIndex); // تمرير المؤشر لمعرفة أي منتج نربط الصورة به
             } else if (!productSubmitted) {
                 console.warn("تم إيقاف معالجة الصورة لأن حفظ المنتج لم يكتمل.");
             }

             // مسح النموذج (بما في ذلك معاينة الصورة) بعد تأخير بسيط للسماح للمعالجات الأخرى بالانتهاء
             setTimeout(() => {
                 if (typeof window.clearForm === 'function') {
                      window.clearForm(); // استدعاء دالة مسح النموذج الأصلية إن وجدت
                 } else {
                      // مسح أساسي كحل احتياطي
                      form.reset();
                      if(window.mode) window.mode = 'create';
                      if(window.tmp) window.tmp = undefined;
                      // إعادة تعيين الأزرار والحالات الأخرى قد تكون ضرورية هنا
                 }
                 clearImagePreview(); // مسح معاينة الصورة دائمًا
             }, 100); // تأخير بسيط

        }, true); // استخدام التقاط الحدث لضمان التنفيذ قبل أي معالجات أخرى قد توقف الانتشار
    }

    // دالة مساعدة لحفظ البيانات الأساسية (كحل أخير)
    function saveBasicProductData() {
        try {
            const productData = JSON.parse(localStorage.getItem('productData') || '[]');
            const mode = window.mode || 'create';
            const tmp = window.tmp;

            const newProduct = {
                title: document.getElementById('title')?.value || '',
                price: document.getElementById('price')?.value || 0,
                taxes: document.getElementById('taxes')?.value || 0,
                ads: document.getElementById('ads')?.value || 0,
                discount: document.getElementById('discount')?.value || 0,
                total: window.calculateTotal ? window.calculateTotal() : 0, // استدعاء دالة الحساب الإجمالي إن وجدت
                category: document.getElementById('category')?.value || '',
            };

            if (!newProduct.title || !newProduct.price) {
                 showAlert('يرجى إدخال اسم المنتج والسعر.', 'warning');
                 return false; // فشل الحفظ
            }

            if (mode === 'update' && typeof tmp !== 'undefined' && productData[tmp]) {
                productData[tmp] = { ...productData[tmp], ...newProduct }; // دمج التغييرات
            } else {
                 const count = parseInt(document.getElementById('count')?.value || 1, 10);
                 for (let i = 0; i < Math.max(1, count); i++) { // إضافة منتج واحد على الأقل
                    productData.push({ ...newProduct });
                 }
            }
            localStorage.setItem('productData', JSON.stringify(productData));

            if (typeof window.showProducts === 'function') {
                window.showProducts(); // تحديث عرض الجدول
            }
            return true; // نجح الحفظ
        } catch (error) {
            console.error("خطأ في saveBasicProductData:", error);
            showAlert('خطأ أثناء محاولة حفظ بيانات المنتج الأساسية.', 'danger');
            return false; // فشل الحفظ
        }
    }


    function processImageOnSubmit(productIndex) {
        const imageInput = document.getElementById('productImage');
        if (!imageInput || !imageInput.files || !imageInput.files[0]) {
            // لا توجد صورة جديدة تم اختيارها، قد نحتاج لحذف الصورة القديمة إذا كان المستخدم يعدل وأزال الصورة؟
             // حاليًا، لا نحذف الصورة القديمة إلا إذا اختار المستخدم صورة جديدة أو حذف المنتج.
             console.log("لا توجد صورة جديدة لمعالجتها للمنتج في المؤشر:", productIndex);
            return;
        }

        const file = imageInput.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            const imageData = e.target.result; // Base64 string
            const productData = JSON.parse(localStorage.getItem('productData') || '[]');

            if (productData[productIndex]) {
                const product = productData[productIndex];
                const productId = generateProductId(product);

                // حفظ الصورة الجديدة وربطها بالمنتج
                productImages[productId] = imageData;
                saveImagesToStorage();
                console.log(`تم حفظ الصورة للمنتج ${productId} في المؤشر ${productIndex}`);

                // تحديث عرض الجدول فورًا لإظهار الصورة الجديدة
                updateTableRowsWithImages();

            } else {
                 console.error(`لم يتم العثور على المنتج في المؤشر ${productIndex} لحفظ الصورة.`);
                 showAlert(`لم يتم العثور على المنتج الموافق لحفظ الصورة.`, 'warning');
            }
        };

         reader.onerror = function() {
            console.error('خطأ في قراءة ملف الصورة أثناء الإرسال.');
            showAlert('حدث خطأ أثناء معالجة الصورة المختارة.', 'danger');
        };

        reader.readAsDataURL(file);
    }


    // 2. الربط مع تعديل المنتج
    function wrapEditProduct() {
        if (typeof window.editProduct !== 'function') return;

        const originalEditProduct = window.editProduct;
        window.editProduct = function(index) {
            // استدعاء الدالة الأصلية أولاً لملء النموذج
            originalEditProduct(index);

            // الآن، محاولة عرض الصورة المرتبطة في المعاينة
             setTimeout(() => { // تأخير بسيط للتأكد من أن النموذج تم ملؤه
                const productData = JSON.parse(localStorage.getItem('productData') || '[]');
                if (productData[index]) {
                    const product = productData[index];
                    const productId = generateProductId(product);
                    const imageData = getProductImage(productId);
                    const imagePreview = document.getElementById('imagePreview');

                    if (imagePreview) {
                        if (imageData) {
                            imagePreview.innerHTML = `<img src="${imageData}" alt="معاينة الصورة">`;
                            // لا نملأ حقل الإدخال <input type="file"> لأنه لا يمكن تعيين قيمته برمجيًا لأسباب أمنية
                            // ولكن يمكننا الإشارة إلى وجود صورة محفوظة
                        } else {
                            clearImagePreview(false); // مسح المعاينة فقط
                        }
                    }
                    // تأكد من مسح قيمة حقل الملف دائمًا عند بدء التعديل
                     const imageInput = document.getElementById('productImage');
                     if(imageInput) imageInput.value = '';

                } else {
                     clearImagePreview(); // مسح المعاينة والإدخال إذا لم يتم العثور على المنتج
                }
             }, 50); // تأخير 50ms
        };
    }

      // 3. الربط مع حذف منتج واحد
    function wrapDeleteProduct() {
        if (typeof window.deleteProduct !== 'function') return;

        const originalDeleteProduct = window.deleteProduct;
        window.deleteProduct = function(index) {
            const productData = JSON.parse(localStorage.getItem('productData') || '[]');

            // التحقق من وجود المنتج قبل محاولة حذفه
            if (!productData[index]) {
                console.error(`wrapDeleteProduct: المنتج بالمؤشر ${index} غير موجود.`);
                // ربما استدعاء الدالة الأصلية للسماح بمعالجة الخطأ هناك؟
                originalDeleteProduct(index);
                return;
            }

            const productToDelete = productData[index];
            const productIdToDelete = generateProductId(productToDelete);

            // تحقق مما إذا كانت هناك صورة مرتبطة بهذا المعرف
            if (productImages[productIdToDelete]) {
                // قبل الحذف، تحقق مما إذا كانت هناك منتجات أخرى *متبقية* تستخدم نفس معرف الصورة
                let isImageUsedByOthers = false;
                for (let i = 0; i < productData.length; i++) {
                    // تخطي المنتج الذي نحن بصدد حذفه
                    if (i === index) continue;

                    const otherProduct = productData[i];
                    const otherProductId = generateProductId(otherProduct);

                    if (otherProductId === productIdToDelete) {
                        isImageUsedByOthers = true;
                        break; // وجدنا منتجًا آخر يستخدم نفس الصورة، لا داعي للمتابعة
                    }
                }

                // احذف الصورة فقط إذا لم تكن هناك منتجات أخرى تستخدمها
                if (!isImageUsedByOthers) {
                    console.log(`حذف الصورة ${productIdToDelete} لأن هذا هو آخر منتج يستخدمها.`);
                    delete productImages[productIdToDelete];
                    saveImagesToStorage(); // حفظ التغييرات فقط إذا تم الحذف
                } else {
                    console.log(`الإبقاء على الصورة ${productIdToDelete} لأن ${isImageUsedByOthers ? 'منتجات أخرى' : 'لا منتجات أخرى'} لا تزال تستخدمها.`);
                }
            } else {
                // console.log(`لا توجد صورة مرتبطة بالمعرف ${productIdToDelete} ليتم حذفها.`);
            }

            // الآن، استدعاء دالة الحذف الأصلية لحذف بيانات المنتج نفسه
            originalDeleteProduct(index);
            // لا حاجة لتحديث الجدول هنا، يفترض أن `originalDeleteProduct` تستدعي `showProducts`
        };
    }

    // 4. الربط مع حذف جميع المنتجات
    function wrapDeleteAll() {
        if (typeof window.deleteAll !== 'function') return;

        const originalDeleteAll = window.deleteAll;
        window.deleteAll = function() {
             // تأكيد المستخدم (قد يكون مكررًا إذا كانت الدالة الأصلية تؤكد أيضًا، لكنه آمن)
            if (confirm('هل أنت متأكد من حذف جميع المنتجات وجميع صورها نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.')) {
                // حذف جميع الصور المخزنة
                productImages = {};
                saveImagesToStorage();
                console.log('تم حذف جميع صور المنتجات.');

                // استدعاء دالة الحذف الأصلية
                originalDeleteAll();
                // لا حاجة لتحديث الجدول هنا، يفترض أن `originalDeleteAll` تستدعي `showProducts` أو تمسح الجدول
            }
        };
    }

    // --- التنفيذ عند تحميل الصفحة ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // إذا تم تحميل DOM بالفعل
        init();
    }

    // --- واجهة برمجة التطبيقات العامة (اختياري) ---
    // يمكن استخدامه إذا احتاجت وحدات أخرى للوصول المباشر لبيانات الصور
    window.productImagesModule = {
        getProductImage: getProductImage,
        generateProductId: generateProductId // قد يكون مفيدًا لوظائف الطباعة/التصدير الخارجية
    };

})();