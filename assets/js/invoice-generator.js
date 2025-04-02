(function() {
    'use strict';

    let currentInvoiceItems = [];
    let invoiceModalInstance = null;
    const productDataKey = 'productData';

    function getProductData() {
        try {
            const data = localStorage.getItem(productDataKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Invoice Generator: Error reading product data:", e);
            showAlert('خطأ في قراءة بيانات المنتج للفاتورة.', 'danger');
            return [];
        }
    }

    function formatCurrency(amount) {
        // Ensure correct formatting for currency values
        const num = parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    }


    function calculateLineTotal(price, quantity) {
        const numPrice = parseFloat(price || 0);
        const numQuantity = parseInt(quantity || 1, 10);
        return formatCurrency(numPrice * numQuantity);
    }

    function updateInvoiceTotal() {
        const total = currentInvoiceItems.reduce((sum, item) => {
            // Use item's total price for calculation
            return sum + parseFloat(calculateLineTotal(item.product.total, item.quantity));
        }, 0);
        const totalElement = document.getElementById('invoiceTotalAmount');
        if (totalElement) {
            totalElement.textContent = formatCurrency(total);
        }
    }

    function renderInvoiceItemsTable() {
        const tableBody = document.getElementById('invoiceItemsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = ''; // Clear existing rows
        if (currentInvoiceItems.length === 0) {
             tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted pt-3 pb-3">لم تتم إضافة منتجات بعد.</td></tr>';
             updateInvoiceTotal(); // Ensure total is also updated (to 0)
             return;
        }

        currentInvoiceItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.setAttribute('data-index', index); // Store index for updates/removals
            row.innerHTML = `
                <td>${item.product.title}</td>
                <td class="text-center">${formatCurrency(item.product.total)}</td>
                <td class="text-center"><input type="number" class="form-control form-control-sm quantity-input mx-auto" value="${item.quantity}" min="1" style="width: 70px;" aria-label="كمية ${item.product.title}"></td>
                <td class="line-total text-end">${calculateLineTotal(item.product.total, item.quantity)}</td>
                <td class="text-center"><button class="btn btn-danger btn-sm remove-item-btn" title="إزالة ${item.product.title}"><i class="fas fa-times"></i></button></td> {/* Changed button content */}
            `;
            tableBody.appendChild(row);
        });
        updateInvoiceTotal();
    }

    function addProductToInvoice() {
        const productSelect = document.getElementById('invoiceProductSelect');
        const quantityInput = document.getElementById('invoiceQuantityInput');
        const selectedOption = productSelect.options[productSelect.selectedIndex];

        if (!selectedOption || selectedOption.value === "") { // Check for empty value
            showAlert('يرجى اختيار منتج لإضافته.', 'warning');
            return;
        }

        const productIndex = parseInt(selectedOption.value, 10);
        const allProducts = getProductData();

        if (isNaN(productIndex) || productIndex < 0 || productIndex >= allProducts.length) {
             showAlert('المنتج المختار غير صالح.', 'danger');
             return;
        }

        const product = allProducts[productIndex];
        const quantity = parseInt(quantityInput.value || 1, 10);

        if (isNaN(quantity) || quantity <= 0) {
            showAlert('الرجاء إدخال كمية صحيحة (أكبر من 0).', 'warning');
            quantityInput.focus();
            return;
        }


        if (product) {
            // Check if item already exists (based on product title or a unique ID if available)
            // Using index might be unreliable if productData changes. Let's use title for simplicity here.
            const existingItemIndex = currentInvoiceItems.findIndex(item => item.product.title === product.title);

            if (existingItemIndex > -1) {
                // Update quantity of existing item
                currentInvoiceItems[existingItemIndex].quantity += quantity;
            } else {
                // Add new item
                currentInvoiceItems.push({ product: { ...product }, quantity: quantity }); // Store a copy of product data
            }
            renderInvoiceItemsTable();
            // Reset inputs
            quantityInput.value = '1';
            productSelect.selectedIndex = 0; // Reset dropdown to placeholder
        } else {
             showAlert('حدث خطأ غير متوقع، لم يتم العثور على المنتج.', 'danger');
        }
    }

    function handleItemUpdateOrRemove(e) {
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !row.hasAttribute('data-index')) return; // Ignore clicks outside data rows

        const index = parseInt(row.getAttribute('data-index'), 10);
        if (isNaN(index) || index < 0 || index >= currentInvoiceItems.length) return; // Invalid index

        if (target.classList.contains('quantity-input')) {
            // Handle quantity change (on input or change event)
            const newQuantity = parseInt(target.value, 10);
            if (!isNaN(newQuantity) && newQuantity >= 1) {
                currentInvoiceItems[index].quantity = newQuantity;
                const lineTotalCell = row.querySelector('.line-total');
                if(lineTotalCell) {
                    lineTotalCell.textContent = calculateLineTotal(currentInvoiceItems[index].product.total, newQuantity);
                }
                updateInvoiceTotal();
            } else {
                 // Revert to previous quantity if invalid input
                 target.value = currentInvoiceItems[index].quantity;
                 showAlert('الرجاء إدخال كمية صالحة (1 أو أكثر).', 'warning');
            }
        } else if (target.closest('.remove-item-btn')) { // Check closest button
            // Handle item removal
            const productTitle = currentInvoiceItems[index].product.title;
            currentInvoiceItems.splice(index, 1);
            renderInvoiceItemsTable(); // Re-render table which recalculates totals
            showAlert(`تم إزالة "${productTitle}" من الفاتورة.`, 'info');
        }
    }


    function generateInvoiceHTML(customerName) {
        const now = new Date();
        const invoiceDate = now.toLocaleDateString('ar-SA', {day: '2-digit', month: 'long', year: 'numeric'});
        const invoiceTime = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

        let itemsHTML = '';
        currentInvoiceItems.forEach((item, index) => {
            itemsHTML += `
                <tr class="item ${index === currentInvoiceItems.length - 1 ? 'last' : ''}">
                    <td>${index + 1}</td>
                    <td>${item.product.title} ${item.product.category ? '('+item.product.category+')' : ''}</td>
                    <td class="text-center">${formatCurrency(item.product.total)}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-end">${calculateLineTotal(item.product.total, item.quantity)}</td>
                </tr>
            `;
        });

        const totalAmount = formatCurrency(currentInvoiceItems.reduce((sum, item) => {
            return sum + parseFloat(calculateLineTotal(item.product.total, item.quantity));
        }, 0));

        const css = `
            @media print {
                 @page { size: A4; margin: 1cm; }
                 body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; }
                 .invoice-box { box-shadow: none !important; border: none !important; margin: 0; max-width: 100%; padding: 0; }
                 .no-print { display: none !important; }
            }
            body { font-family: 'Tahoma', 'Segoe UI', sans-serif; direction: rtl; margin: 20px; background-color: #fff; color: #333; }
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .1); font-size: 14px; line-height: 1.6; color: #555; background-color: #fff; }
            .invoice-box table { width: 100%; line-height: inherit; text-align: right; border-collapse: collapse; }
            .invoice-box table td { padding: 8px; vertical-align: top; }
            .invoice-box table tr.top table td { padding-bottom: 20px; }
            .invoice-box table tr.top table td.title { font-size: 35px; line-height: 35px; color: #333; font-weight: bold; }
             .invoice-box table tr.top table td:last-child { text-align: left; font-size: 12px; } /* Align invoice details left */

            .invoice-box table tr.information table td { padding-bottom: 30px; }
             .invoice-box table tr.information table td:last-child { text-align: left; }

            .invoice-box table tr.heading td { background: #f2f2f2 !important; border: 1px solid #ddd; font-weight: bold; text-align: right; padding: 10px 8px;}
            .invoice-box table tr.item td { border: 1px solid #eee; text-align: right; vertical-align: middle; } /* Added vertical align */
            .invoice-box table tr.item.last td { border-bottom: 1px solid #eee; } /* Keep bottom border for last item */

            /* Column Alignments & Widths */
            .invoice-box table tr.heading td:nth-child(1), .invoice-box table tr.item td:nth-child(1) { width: 5%; text-align: center; } /* # */
            .invoice-box table tr.heading td:nth-child(2), .invoice-box table tr.item td:nth-child(2) { width: 45%; } /* Item */
            .invoice-box table tr.heading td:nth-child(3), .invoice-box table tr.item td:nth-child(3) { width: 15%; text-align: center; } /* Price */
            .invoice-box table tr.heading td:nth-child(4), .invoice-box table tr.item td:nth-child(4) { width: 10%; text-align: center; } /* Qty */
            .invoice-box table tr.heading td:nth-child(5), .invoice-box table tr.item td:nth-child(5) { width: 25%; text-align: end; } /* Line Total */


            .invoice-box table tr.total td { border-top: 2px solid #eee; font-weight: bold; font-size: 1.1em; text-align: left; padding-top: 10px !important; }
            .invoice-box .company-details { text-align: left; font-size: 12px; color: #777; }
            .invoice-box .customer-details { font-weight: bold; margin-bottom: 5px; }
        `;

        // Simplified HTML structure
        return `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>فاتورة ${invoiceNumber}</title>
                <style>${css}</style>
            </head>
            <body>
                <div class="invoice-box">
                    <table cellpadding="0" cellspacing="0">
                        <tr class="top">
                            <td colspan="2">
                                <table>
                                    <tr>
                                        <td class="title">فاتورة</td>
                                        <td>
                                            رقم الفاتورة #: ${invoiceNumber}<br>
                                            تاريخ الإنشاء: ${invoiceDate}<br>
                                            الوقت: ${invoiceTime}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr class="information">
                            <td colspan="2">
                                <table>
                                    <tr>
                                        <td>
                                            <div class="customer-details">فاتورة إلى:</div>
                                            ${customerName || 'عميل نقدي'}
                                        </td>
                                        <td class="company-details">
                                            اسم شركتك<br>
                                            عنوان الشركة<br>
                                            info@yourcompany.com
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr class="heading">
                            <td>#</td>
                            <td>المنتج</td>
                            <td>السعر</td>
                            <td>الكمية</td>
                            <td>الإجمالي</td>
                        </tr>
                        ${itemsHTML}
                        <tr class="total">
                            <td colspan="3"></td>
                            <td colspan="2"><strong>المجموع: ${totalAmount}</strong></td>
                        </tr>
                    </table>
                </div>
                 <script>
                    window.addEventListener('load', () => {
                      setTimeout(() => window.print(), 500); // Delay for rendering
                    });
                    // window.addEventListener('afterprint', () => window.close()); // Optional: Close after print
                 </script>
            </body>
            </html>
        `;
    }


    function showFinalInvoice() {
        const customerNameInput = document.getElementById('invoiceCustomerName');
        const customerName = customerNameInput ? customerNameInput.value.trim() : '';

        if (currentInvoiceItems.length === 0) {
            showAlert('الرجاء إضافة منتجات إلى الفاتورة أولاً.', 'warning');
            return;
        }

        const invoiceHTML = generateInvoiceHTML(customerName);
        const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        if(printWindow){
            printWindow.document.open();
            printWindow.document.write(invoiceHTML);
            printWindow.document.close();
        } else {
             showAlert('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.', 'danger');
        }

        // Hide the modal after attempting to open the print window
         if (invoiceModalInstance) {
            invoiceModalInstance.hide();
         }
    }

    function populateProductSelector() {
        const select = document.getElementById('invoiceProductSelect');
        if (!select) return;
        select.innerHTML = '<option value="" selected disabled>-- اختر منتج --</option>';
        const products = getProductData();
        if(products.length === 0) {
             select.innerHTML = '<option value="" selected disabled>-- لا توجد منتجات متاحة --</option>';
             return;
        }
        products.forEach((product, index) => {
            const option = document.createElement('option');
            option.value = index; // Use original index from productData
            // Display title and total price in the option
            option.textContent = `${product.title} (${formatCurrency(product.total)})`;
            select.appendChild(option);
        });
    }

    function resetInvoiceModal() {
        currentInvoiceItems = []; // Clear the items array
        // Reset form fields
        const customerNameInput = document.getElementById('invoiceCustomerName');
        const productSelect = document.getElementById('invoiceProductSelect');
        const quantityInput = document.getElementById('invoiceQuantityInput');
        const tableBody = document.getElementById('invoiceItemsTableBody');
        const totalElement = document.getElementById('invoiceTotalAmount');

        if(customerNameInput) customerNameInput.value = '';
        if(productSelect) productSelect.selectedIndex = 0;
        if(quantityInput) quantityInput.value = '1';
        if(tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted pt-3 pb-3">لم تتم إضافة منتجات بعد.</td></tr>'; // Reset visual table
        if(totalElement) totalElement.textContent = '0.00'; // Reset the total display
    }

    function createInvoiceModal() {
        // Avoid creating multiple modals
        if (document.getElementById('invoiceGeneratorModal')) return;

         // *** التعليق محذوف من السطر التالي ***
        const modalHTML = `
            <div class="modal fade" id="invoiceGeneratorModal" tabindex="-1" aria-labelledby="invoiceModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="invoiceModalLabel">إنشاء فاتورة جديدة</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="invoiceCustomerName" class="form-label">اسم العميل (اختياري)</label>
                                <input type="text" class="form-control" id="invoiceCustomerName" placeholder="أدخل اسم العميل أو اتركه فارغًا لـ 'عميل نقدي'">
                            </div>
                            <hr>
                            <h6>إضافة منتجات للفاتورة</h6>
                            <div class="row g-2 mb-3 align-items-end">
                                <div class="col-md-6">
                                    <label for="invoiceProductSelect" class="form-label">المنتج</label>
                                    <select class="form-select" id="invoiceProductSelect" aria-label="اختر منتجاً"></select>
                                </div>
                                <div class="col-md-3">
                                    <label for="invoiceQuantityInput" class="form-label">الكمية</label>
                                    <input type="number" class="form-control" id="invoiceQuantityInput" value="1" min="1" aria-label="كمية المنتج المختار">
                                </div>
                                <div class="col-md-3 d-grid">
                                    <button type="button" class="btn btn-success" id="addProductToInvoiceBtn">
                                       <i class="fas fa-plus me-1"></i> إضافة
                                    </button>
                                </div>
                            </div>
                            <hr>
                            <h6>المنتجات في الفاتورة</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered table-striped">
                                    <thead class="table-light">
                                        <tr>
                                            <th>المنتج</th>
                                            <th class="text-center">السعر</th>
                                            <th class="text-center">الكمية</th>
                                            <th class="text-end">الإجمالي</th>
                                            <th class="text-center">إزالة</th>
                                        </tr>
                                    </thead>
                                    <tbody id="invoiceItemsTableBody">
                                       <tr><td colspan="5" class="text-center text-muted pt-3 pb-3">لم تتم إضافة منتجات بعد.</td></tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="table-light">
                                            <td colspan="3" class="text-end fw-bold">المجموع الكلي:</td>
                                            <td id="invoiceTotalAmount" class="fw-bold text-end">0.00</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer justify-content-between">
                            <button type="button" class="btn btn-outline-secondary" id="resetInvoiceBtn">البدء من جديد</button>
                            <div>
                               <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                               <button type="button" class="btn btn-primary" id="generateInvoiceBtn">إنشاء وطباعة الفاتورة</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modalElement = document.getElementById('invoiceGeneratorModal');
        if (modalElement) {
            invoiceModalInstance = new bootstrap.Modal(modalElement);

            // Event listeners for modal lifecycle
            modalElement.addEventListener('show.bs.modal', populateProductSelector);
            modalElement.addEventListener('hidden.bs.modal', resetInvoiceModal); // Reset when closed

            // Event listeners for buttons and inputs inside the modal
            document.getElementById('addProductToInvoiceBtn')?.addEventListener('click', addProductToInvoice);
            document.getElementById('generateInvoiceBtn')?.addEventListener('click', showFinalInvoice);
            document.getElementById('resetInvoiceBtn')?.addEventListener('click', resetInvoiceModal);

            // Use event delegation for table body interactions
            const tableBody = document.getElementById('invoiceItemsTableBody');
            if (tableBody) {
                tableBody.addEventListener('click', handleItemUpdateOrRemove);
                tableBody.addEventListener('input', handleItemUpdateOrRemove); // For quantity changes
            }
        } else {
             console.error("Invoice modal element could not be found after insertion.");
        }
    }

    function addInvoiceButton() {
         // Find the target container for action buttons
         const targetContainer = document.getElementById('actionButtonsContainer');
         const deleteAllBtn = document.getElementById('deleteAllBtn'); // Reference element

        if (!targetContainer || document.getElementById('createInvoiceBtn')) return; // Already exists or container missing

        const createInvoiceBtn = document.createElement('button');
        createInvoiceBtn.className = 'btn btn-info btn-sm me-2'; // Adjusted margin
        createInvoiceBtn.id = 'createInvoiceBtn';
        createInvoiceBtn.innerHTML = '<i class="fas fa-file-invoice"></i> إنشاء فاتورة';
        createInvoiceBtn.title = 'إنشاء فاتورة عميل جديدة';
        createInvoiceBtn.addEventListener('click', () => {
             if (invoiceModalInstance) {
                invoiceModalInstance.show();
             } else {
                // If modal not initialized yet, try creating and showing
                console.warn("Invoice modal instance not ready, attempting to create and show.");
                createInvoiceModal(); // Ensure it's created
                 if (invoiceModalInstance) {
                    invoiceModalInstance.show();
                 } else {
                    showAlert("فشل في تهيئة نافذة إنشاء الفاتورة.", "danger");
                 }
             }
        });

        // Insert the button before the 'Delete All' button
        if(deleteAllBtn) {
             targetContainer.insertBefore(createInvoiceBtn, deleteAllBtn);
        } else {
             targetContainer.appendChild(createInvoiceBtn); // Append if delete button is missing
        }

        // Ensure the modal structure is created on load, even if the button isn't clicked immediately
        createInvoiceModal();
    }

    // Global alert function
    function showAlert(message, type = 'info') {
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, type);
        } else {
            console.warn("Invoice Generator: Global showAlert function not found. Falling back to alert.");
            alert(message); // Fallback
        }
    }


    // Initialize when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addInvoiceButton);
    } else {
        addInvoiceButton();
    }

})();