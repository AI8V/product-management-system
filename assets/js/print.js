/**
 * وحدة طباعة المنتجات - نسخة محسنة وأكثر كفاءة
 * - تدعم طباعة الصور.
 * - تعتمد على بيانات المنتج الأصلية بدلاً من قراءة خلايا الجدول مباشرة.
 * - تحسينات في التنسيق.
 */
(function() {
    'use strict';

    // --- إضافة أزرار الطباعة ---
    function addPrintButtons() {
        const actionContainer = document.getElementById('actionButtonsContainer');
        const deleteAllBtn = document.getElementById('deleteAllBtn'); // Reference point

        // زر طباعة القائمة
        if (!document.getElementById('printListBtn')) {
            const printBtn = document.createElement('button');
            printBtn.className = 'btn btn-secondary btn-sm me-2'; // Adjusted margin
            printBtn.id = 'printListBtn';
            printBtn.innerHTML = '<i class="fas fa-print"></i> طباعة القائمة';
            printBtn.title = 'طباعة القائمة المعروضة حالياً';
            printBtn.addEventListener('click', printProductList);

            if (actionContainer && deleteAllBtn) {
                 actionContainer.insertBefore(printBtn, deleteAllBtn);
            } else if(deleteAllBtn?.parentNode){
                deleteAllBtn.parentNode.insertBefore(printBtn, deleteAllBtn);
            }
        }

        // زر طباعة بطاقة المنتج (في النموذج)
        addPrintButtonToForm();

        // إضافة أزرار الطباعة لكل منتج (سيتم إضافتها ديناميكيًا)
        setupTableRowPrintButtonInjection();
    }

    // --- طباعة قائمة المنتجات ---
    function printProductList() {
        const productData = getProductDataFromLocalStorage();
        const visibleProductsData = getCurrentlyDisplayedProducts(productData); // Get data for visible rows

        if (visibleProductsData.length === 0) {
            showAlert('لا توجد منتجات للطباعة في القائمة الحالية', 'warning');
            return;
        }

        // تحديد عنوان التقرير
        const searchInput = document.getElementById('searchInput');
        const reportTitle = searchInput?.value ? `نتائج البحث عن: ${searchInput.value}` : 'قائمة جرد المنتجات';

        // جمع بيانات الطباعة
        let totalAmount = 0;
        const printRows = visibleProductsData.map((product, index) => {
            totalAmount += parseFloat(product.total || 0);
            // Use the exposed generateProductId function if available
            const productId = window.productImagesModule?.generateProductId?.(product);
            const imageData = productId ? window.productImagesModule?.getProductImage?.(productId) : null;
            return {
                index: index + 1, // رقم تسلسلي للتقرير المطبوع
                image: imageData,
                title: product.title || '',
                price: parseFloat(product.price || 0).toFixed(2),
                taxes: parseFloat(product.taxes || 0).toFixed(2),
                ads: parseFloat(product.ads || 0).toFixed(2),
                discount: parseFloat(product.discount || 0).toFixed(2),
                total: parseFloat(product.total || 0).toFixed(2),
                category: product.category || '-'
            };
        });

        // إنشاء محتوى HTML للطباعة
        const printContent = generateListPrintHTML(reportTitle, printRows, totalAmount);

        // فتح نافذة الطباعة وكتابة المحتوى
        openPrintWindow(printContent, `print_list_${Date.now()}`);
    }

    // --- طباعة تفاصيل منتج واحد ---
    function printProductDetails(productIndex) {
        const productData = getProductDataFromLocalStorage();

        if (typeof productIndex !== 'number' || !productData[productIndex]) {
            showAlert('المنتج المحدد غير موجود أو المؤشر غير صالح', 'danger');
            return;
        }

        const product = productData[productIndex];
        const productId = window.productImagesModule?.generateProductId?.(product);
        const imageData = productId ? window.productImagesModule?.getProductImage?.(productId) : null;

        // إنشاء محتوى HTML لبطاقة المنتج
        const printContent = generateDetailsPrintHTML(product, imageData);

        // فتح نافذة الطباعة
        openPrintWindow(printContent, `print_details_${productIndex}_${Date.now()}`);
    }
     // Expose globally for mobile experience or other modules
     window.printProductDetails = printProductDetails;

    // --- مساعدة: قراءة بيانات المنتج من التخزين بأمان ---
    function getProductDataFromLocalStorage() {
        try {
            const storedData = localStorage.getItem('productData');
            return storedData ? JSON.parse(storedData) : [];
        } catch (e) {
            console.error("Print.js: خطأ في قراءة بيانات المنتج.", e);
            showAlert('حدث خطأ أثناء قراءة بيانات المنتج للطباعة.', 'danger');
            return [];
        }
    }

    // --- مساعدة: الحصول على بيانات المنتجات المعروضة حالياً في الجدول ---
    function getCurrentlyDisplayedProducts(allProductData) {
         const visibleRows = document.querySelectorAll('#productTable tr:not(:has(td[colspan]))'); // Select only data rows
         const visibleProducts = [];

         visibleRows.forEach(row => {
             // Attempt to get index from edit button
             const editBtn = row.querySelector('button[onclick*="editProduct"]');
             const match = editBtn?.getAttribute('onclick')?.match(/editProduct\((\d+)\)/);

             if (match && match[1]) {
                 const index = parseInt(match[1], 10);
                 if (allProductData[index]) {
                     // Basic check: Compare title in cell (assuming cell index 2 after adding image column)
                     const titleInCell = row.cells[2]?.textContent?.trim();
                     if (titleInCell === allProductData[index].title) {
                         visibleProducts.push(allProductData[index]);
                     } else {
                          // Fallback: If titles don't match (e.g., edited but table not refreshed?), still add if index is valid
                          console.warn(`Print.js: Title mismatch for index ${index}, but adding anyway.`);
                          visibleProducts.push(allProductData[index]);
                     }
                 }
             } else {
                 console.warn("Print.js: Could not extract valid product index from row:", row);
             }
         });

         // If extraction failed, fallback to filtering based on search input
         if (visibleProducts.length === 0 && visibleRows.length > 0) {
             console.log("Print.js: Falling back to search filter for visible products.");
             const searchInput = document.getElementById('searchInput');
             const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';
             if (searchValue) {
                 const searchTypeElement = document.querySelector('input[name="searchType"]:checked');
                 const searchType = searchTypeElement ? searchTypeElement.id : 'searchAll';
                 return allProductData.filter(item => {
                     const titleMatch = item.title && item.title.toLowerCase().includes(searchValue);
                     const categoryMatch = item.category && item.category.toLowerCase().includes(searchValue);
                     if (searchType === 'searchTitle') return titleMatch;
                     if (searchType === 'searchCategory') return categoryMatch;
                     return titleMatch || categoryMatch; // searchAll
                 });
             } else {
                  // If no search term, but rows were visible, assume all data is visible
                  return allProductData;
             }
         }


         return visibleProducts;
    }


    // --- مساعدة: إنشاء HTML لطباعة القائمة ---
    function generateListPrintHTML(title, rows, totalAmount) {
        // تحسين CSS
        const css = `
            @media print {
                @page { size: A4; margin: 1cm; }
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .print-footer, .no-print { display: none !important; }
            }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.4; color: #333; direction: rtl; }
            .container { max-width: 98%; margin: 0 auto; padding: 15px; }
            .print-header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #007bff; }
            h1 { font-size: 20px; color: #0056b3; margin-bottom: 5px; }
            .print-info { display: flex; justify-content: space-between; font-size: 12px; color: #555; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; page-break-inside: auto; font-size: 11px; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: right; vertical-align: middle; }
            th { background-color: #e9ecef !important; font-weight: 600; color: #495057; } /* Added !important for print */
            .summary { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 13px; }
            .summary p { margin: 4px 0; }
            .print-footer { text-align: center; margin-top: 25px; font-size: 10px; color: #888; }
            .total-column { font-weight: bold; background-color: #f8f9fa !important; } /* Added !important for print */
            .product-image-print { max-width: 40px; max-height: 40px; object-fit: contain; display: block; margin: auto; border-radius: 3px; background-color: #fff; }
            .no-image-print { width: 40px; height: 40px; background-color: #f0f0f0 !important; color: #bbb; display: flex; align-items: center; justify-content: center; font-size: 1.1em; margin: auto; border-radius: 3px; }
            td.image-cell { width: 55px; text-align: center; padding: 3px; } /* خلية الصورة */
        `;

        // بناء الجدول
        let tableRowsHTML = '';
        rows.forEach(row => {
            const imageHTML = row.image
                ? `<img src="${row.image}" alt="" class="product-image-print">` // Alt empty for decoration
                : `<div class="no-image-print" title="لا توجد صورة">-</div>`;
            tableRowsHTML += `
                <tr>
                    <td>${row.index}</td>
                    <td class="image-cell">${imageHTML}</td>
                    <td>${row.title}</td>
                    <td>${row.price}</td>
                    <td>${row.taxes}</td>
                    <td>${row.ads}</td>
                    <td>${row.discount}</td>
                    <td class="total-column">${row.total}</td>
                    <td>${row.category}</td>
                </tr>
            `;
        });

        // القالب الكامل
        return `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head><meta charset="UTF-8"><title>${title}</title><style>${css}</style></head>
            <body>
                <div class="container">
                    <div class="print-header">
                        <h1>${title}</h1>
                        <div class="print-info">
                            <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            <span>الوقت: ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>صورة</th> <!-- عمود الصورة -->
                                <th>اسم المنتج</th>
                                <th>السعر</th>
                                <th>الضرائب</th>
                                <th>الإعلان</th>
                                <th>الخصم</th>
                                <th class="total-column">الإجمالي</th>
                                <th>الفئة</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHTML}</tbody>
                    </table>
                    <div class="summary">
                        <p><strong>إجمالي عدد المنتجات:</strong> ${rows.length}</p>
                        <p><strong>إجمالي قيمة المنتجات:</strong> ${totalAmount.toFixed(2)}</p>
                    </div>
                    <div class="print-footer">تم إنشاؤه بواسطة نظام إدارة المنتجات</div>
                </div>
                 <script>
                    // Ensure print is called after content is fully rendered
                    window.addEventListener('load', () => {
                      setTimeout(() => window.print(), 500); // Delay allows images to load
                    });
                    // Optional: close window after printing
                    // window.addEventListener('afterprint', () => window.close());
                </script>
            </body></html>
        `;
    }

    // --- مساعدة: إنشاء HTML لبطاقة المنتج ---
    function generateDetailsPrintHTML(product, imageData) {
        const css = `
            @media print {
                @page { size: A5 landscape; margin: 1cm; }
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                 .print-footer, .no-print { display: none !important; }
            }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.5; color: #333; direction: rtl; }
            .container { max-width: 95%; margin: 0 auto; padding: 15px; }
            .product-card { border: 1px solid #007bff; border-radius: 8px; padding: 15px; display: flex; flex-direction: row; gap: 15px; align-items: flex-start; background-color: #fff !important; }
            .product-image-details { width: 130px; height: 130px; object-fit: contain; border: 1px solid #eee; border-radius: 5px; padding: 5px; background-color: #fff !important; align-self: center; }
            .no-image-details { width: 130px; height: 130px; background-color: #f8f9fa !important; color: #adb5bd; display: flex; align-items: center; justify-content: center; font-size: 2em; border: 1px solid #eee; border-radius: 5px; align-self: center; }
            .product-info { flex-grow: 1; }
            .product-title { font-size: 18px; font-weight: 600; color: #0056b3; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
            .details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px 12px; margin-bottom: 12px; font-size: 12px; }
            .detail-item { padding-bottom: 4px; border-bottom: 1px dotted #ddd; }
            .detail-label { font-weight: 600; color: #555; margin-left: 5px; }
            .total-price { font-size: 16px; font-weight: bold; text-align: center; padding: 8px; margin-top: 12px; background-color: #e9ecef !important; border-radius: 5px; color: #0056b3; }
            .print-footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
        `;

        const imageHTML = imageData
            ? `<img src="${imageData}" alt="" class="product-image-details">` // Alt empty
            : `<div class="no-image-details" title="لا توجد صورة">?</div>`;

        return `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head><meta charset="UTF-8"><title>بطاقة منتج: ${product.title}</title><style>${css}</style></head>
            <body>
                <div class="container">
                    <div class="product-card">
                        ${imageHTML} <!-- وضع الصورة هنا -->
                        <div class="product-info">
                            <div class="product-title">${product.title || 'منتج غير مسمى'}</div>
                            <div class="details-grid">
                                <div class="detail-item"><span class="detail-label">الفئة:</span><span>${product.category || 'غير محدد'}</span></div>
                                <div class="detail-item"><span class="detail-label">السعر:</span><span>${parseFloat(product.price || 0).toFixed(2)}</span></div>
                                <div class="detail-item"><span class="detail-label">الضرائب:</span><span>${parseFloat(product.taxes || 0).toFixed(2)}</span></div>
                                <div class="detail-item"><span class="detail-label">الإعلان:</span><span>${parseFloat(product.ads || 0).toFixed(2)}</span></div>
                                <div class="detail-item"><span class="detail-label">الخصم:</span><span>${parseFloat(product.discount || 0).toFixed(2)}</span></div>
                            </div>
                            <div class="total-price">السعر الإجمالي: ${parseFloat(product.total || 0).toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="print-footer">نظام إدارة المنتجات - ${new Date().toLocaleDateString('ar-SA')}</div>
                </div>
                 <script>
                     window.addEventListener('load', () => {
                       setTimeout(() => window.print(), 500); // Delay allows images to load
                     });
                      // Optional: close window after printing
                      // window.addEventListener('afterprint', () => window.close());
                 </script>
            </body></html>
        `;
    }


    // --- مساعدة: فتح نافذة الطباعة ---
    function openPrintWindow(content, windowName = '_blank') {
        try {
            // Use a unique name for each print window to avoid issues if multiple are opened
            const uniqueWindowName = `printWindow_${windowName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const printWindow = window.open('', uniqueWindowName, 'width=1000,height=700,scrollbars=yes,resizable=yes');
            if (!printWindow) {
                 showAlert('فشل فتح نافذة الطباعة. يرجى التأكد من السماح بالنوافذ المنبثقة لهذا الموقع.', 'danger');
                 return;
            }
            printWindow.document.open();
            printWindow.document.write(content);
            printWindow.document.close();
             // Print command is now inside the generated HTML's onload event
        } catch (e) {
             console.error("Print.js: خطأ في فتح نافذة الطباعة:", e);
             showAlert('حدث خطأ أثناء محاولة فتح نافذة الطباعة.', 'danger');
        }
    }

    // --- مساعدة: إضافة زر الطباعة للمنتج المحدد في نموذج التعديل ---
    function addPrintButtonToForm() {
        const form = document.getElementById('productForm');
        const submitBtn = document.getElementById('submitBtn');
        const buttonContainer = submitBtn?.parentNode; // Container of submit/clear buttons

        if (form && submitBtn && buttonContainer && !document.getElementById('printCurrentBtn')) {
            const printCurrentBtn = document.createElement('button');
            printCurrentBtn.className = 'btn btn-outline-info mt-2 d-none'; // Hidden initially
            printCurrentBtn.type = 'button';
            printCurrentBtn.id = 'printCurrentBtn';
            printCurrentBtn.innerHTML = '<i class="fas fa-id-card"></i> طباعة بطاقة المنتج الحالي';
            printCurrentBtn.title = 'طباعة تفاصيل المنتج الذي يتم تعديله حالياً';

            // Insert after the clear button
            const clearBtn = document.getElementById('clearBtn');
             if (clearBtn) {
                clearBtn.insertAdjacentElement('afterend', printCurrentBtn);
             } else {
                 buttonContainer.appendChild(printCurrentBtn);
             }


            printCurrentBtn.addEventListener('click', function() {
                // Assumes 'tmp' and 'mode' are global vars from product-manager.js
                if (window.mode === 'update' && typeof window.tmp === 'number') {
                    printProductDetails(window.tmp);
                } else {
                    showAlert('يجب أن تكون في وضع تعديل منتج لطباعة بطاقته.', 'warning');
                }
            });

            // Expose function to update visibility
             window.updatePrintCurrentButtonVisibility = (show) => {
                 printCurrentBtn.style.display = show ? 'inline-block' : 'none';
             };

            // Initial check (in case page loads in update mode)
             window.updatePrintCurrentButtonVisibility(window.mode === 'update');
        }
    }

    // --- مساعدة: إضافة أزرار الطباعة لصفوف الجدول (استخدام تفويض الأحداث) ---
    function setupTableRowPrintButtonInjection() {
        const tableBody = document.getElementById('productTable');
        if (!tableBody) return;

        // Event delegation for clicks on print buttons within the table body
        tableBody.addEventListener('click', function(e) {
            const printButton = e.target.closest('.print-product-btn');
            if (printButton) {
                e.preventDefault();
                e.stopPropagation(); // Prevent triggering row clicks if any
                const productIndex = parseInt(printButton.getAttribute('data-product-index') || '-1', 10);
                if (productIndex !== -1) {
                    printProductDetails(productIndex);
                } else {
                    console.error("Print.js: لم يتم العثور على مؤشر المنتج لزر الطباعة.");
                    showAlert('خطأ: لم يتم تحديد المنتج للطباعة.', 'danger');
                }
            }
        });

         // Expose the injection function to be called by product-manager after showProducts
         window.injectPrintButtonsIntoRows = injectPrintButtonsIntoRows;
    }

     // Injects print buttons into currently visible table rows
    function injectPrintButtonsIntoRows() {
        const rows = document.querySelectorAll('#productTable tr:not(:has(td[colspan]))'); // Target only data rows
        rows.forEach(row => {
             const actionsCell = row.cells[row.cells.length - 1]; // Actions cell is usually last
             if (actionsCell && !actionsCell.querySelector('.print-product-btn')) {
                 // Get index from the edit button within the same cell
                 const editBtn = actionsCell.querySelector('button[onclick*="editProduct"]');
                 const match = editBtn?.getAttribute('onclick')?.match(/editProduct\((\d+)\)/);
                 if (match && match[1]) {
                     const productIndex = match[1];
                     const printProductBtn = document.createElement('button');
                     printProductBtn.className = 'btn btn-sm btn-outline-secondary print-product-btn mx-1';
                     printProductBtn.innerHTML = '<i class="fas fa-print"></i>'; // Changed icon
                     printProductBtn.title = 'طباعة بطاقة هذا المنتج';
                     printProductBtn.setAttribute('data-product-index', productIndex);

                     // Insert before the edit button for better grouping
                     actionsCell.insertBefore(printProductBtn, editBtn);
                 }
             }
        });
    }


    // --- مساعدة: عرض التنبيهات ---
    function showAlert(message, type = 'info') {
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, type); // Use global alert
        } else {
            console.warn("Print.js: Global showAlert function not available.", message);
            alert(`${type.toUpperCase()}: ${message}`); // Simple fallback
        }
    }

    // --- تهيئة الوحدة ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addPrintButtons);
    } else {
        addPrintButtons(); // If DOM already loaded
    }

})();