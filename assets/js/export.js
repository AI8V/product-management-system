(function() {
    'use strict';

    // إضافة أزرار التصدير والاستيراد
    function addActionButtons() {
        const actionContainer = document.getElementById('actionButtonsContainer');
        const deleteAllBtn = document.getElementById('deleteAllBtn'); // Reference element

        if (!actionContainer) {
            console.error("Export/Import: Action button container not found.");
            return;
        }

        // --- زر التصدير ---
        if (!document.getElementById('exportBtn')) {
            const exportBtn = document.createElement('button');
            exportBtn.className = 'btn btn-success btn-sm me-2'; // Adjusted margin
            exportBtn.id = 'exportBtn';
            exportBtn.innerHTML = '<i class="fas fa-file-excel me-1"></i> تصدير Excel';
            exportBtn.title = 'تصدير قائمة المنتجات الحالية إلى ملف Excel (XLSX)';
            exportBtn.addEventListener('click', exportToExcel);
            // Insert before Delete All button
            if (deleteAllBtn) {
                 actionContainer.insertBefore(exportBtn, deleteAllBtn);
            } else {
                 actionContainer.appendChild(exportBtn);
            }
        }

        // --- زر الاستيراد ---
        if (!document.getElementById('importBtn')) {
            const importBtn = document.createElement('button');
            importBtn.className = 'btn btn-info btn-sm me-2'; // Adjusted margin
            importBtn.id = 'importBtn';
            importBtn.innerHTML = '<i class="fas fa-file-upload me-1"></i> استيراد Excel';
            importBtn.title = 'استيراد منتجات من ملف Excel (XLSX, XLS, CSV)';

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'excelFileInput';
            fileInput.accept = '.xlsx, .xls, .csv'; // Standard Excel and CSV formats
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', handleFileImport);

            importBtn.addEventListener('click', () => fileInput.click()); // Trigger file input on button click

            // Insert before Export button (or Delete All if Export doesn't exist)
            const exportBtnRef = document.getElementById('exportBtn');
            if (exportBtnRef) {
                 actionContainer.insertBefore(importBtn, exportBtnRef);
            } else if (deleteAllBtn) {
                 actionContainer.insertBefore(importBtn, deleteAllBtn);
            } else {
                actionContainer.appendChild(importBtn);
            }
             // Append the hidden file input to the body
             document.body.appendChild(fileInput);
        }
    }

    // دالة تصدير البيانات مباشرة كملف Excel (XLSX) باستخدام مكتبة SheetJS
    function exportToExcel() {
        // Access productData globally (assuming it's exposed by product-manager.js)
        const currentProductData = typeof productData !== 'undefined' ? productData : JSON.parse(localStorage.getItem('productData') || '[]');

        if (currentProductData.length === 0) {
            showAlert('لا توجد بيانات منتجات للتصدير.', 'warning');
            return;
        }

        // Check if SheetJS (XLSX) library is loaded
        if (typeof XLSX === 'undefined') {
            showAlert('مكتبة معالجة ملفات Excel غير متاحة. لا يمكن التصدير.', 'danger');
            console.error("XLSX library (SheetJS) is not loaded.");
            return;
        }

        try {
            // Prepare data for Excel sheet
            const excelHeader = ['#', 'اسم المنتج', 'السعر', 'الضرائب', 'الإعلان', 'الخصم', 'الإجمالي', 'الفئة'];
            const excelRows = currentProductData.map((item, index) => [
                index + 1,
                item.title || '',
                parseFloat(item.price || 0),
                parseFloat(item.taxes || 0),
                parseFloat(item.ads || 0),
                parseFloat(item.discount || 0),
                parseFloat(item.total || 0),
                item.category || ''
            ]);

            const excelData = [excelHeader, ...excelRows];

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Define column widths (optional but improves readability)
            const columnWidths = [
                { wch: 5 },  // #
                { wch: 35 }, // اسم المنتج
                { wch: 12 }, // السعر
                { wch: 12 }, // الضرائب
                { wch: 12 }, // الإعلان
                { wch: 12 }, // الخصم
                { wch: 12 }, // الإجمالي
                { wch: 20 }  // الفئة
            ];
            ws['!cols'] = columnWidths;

             // Set RTL direction for the sheet
             if (!ws['!props']) ws['!props'] = {};
             ws['!props'].RTL = true;


            // Create workbook and add the worksheet
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'المنتجات'); // Sheet name 'المنتجات'

            // Generate timestamp for filename
            const timestamp = new Date().toLocaleDateString('en-CA').replace(/-/g,''); // YYYYMMDD

            // Trigger download
            XLSX.writeFile(wb, `منتجات_${timestamp}.xlsx`);

            showAlert('تم تصدير البيانات بنجاح إلى ملف Excel.', 'success');

        } catch (error) {
            console.error('Error exporting to Excel:', error);
            showAlert('حدث خطأ أثناء تصدير البيانات إلى Excel.', 'danger');
        }
    }


    // Handle file selection for import
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return; // No file selected

        // Reset file input value to allow re-selecting the same file
        event.target.value = null;

        // Check if SheetJS (XLSX) library is loaded
        if (typeof XLSX === 'undefined') {
            showAlert('مكتبة معالجة ملفات Excel غير متاحة. لا يمكن الاستيراد.', 'danger');
            console.error("XLSX library (SheetJS) is not loaded.");
            return;
        }

        // Validate file type (optional, as input accept should handle it)
        const validExtensions = ['xlsx', 'xls', 'csv'];
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !validExtensions.includes(fileExt)) {
             showAlert('الرجاء اختيار ملف Excel أو CSV صالح.', 'warning');
             return;
        }


        processExcelFile(file);
    }


    // معالجة ملف Excel للاستيراد
    function processExcelFile(file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const fileData = e.target.result;
                const workbook = XLSX.read(fileData, { type: 'array' });

                // Get the first worksheet
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                     showAlert('لم يتم العثور على أوراق عمل في الملف.', 'warning');
                     return;
                }
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert sheet data to an array of arrays (rows)
                // Use defval:'' to handle empty cells gracefully
                const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval:'' });

                if (sheetData.length <= 1) {
                    showAlert('الملف لا يحتوي على بيانات كافية للاستيراد (يجب أن يحتوي على صف عناوين وصف بيانات واحد على الأقل).', 'warning');
                    return;
                }

                // --- Data Mapping and Validation ---
                 // Find header row index (usually 0, but let's be flexible)
                 let headerIndex = 0; // Assume header is the first row
                 const headerRow = sheetData[headerIndex];

                 // Map expected headers (adjust these based on export format)
                 const expectedHeaders = {
                     title: ['اسم المنتج', 'product name', 'title'],
                     price: ['السعر', 'price'],
                     taxes: ['الضرائب', 'taxes', 'tax'],
                     ads: ['الإعلان', 'ads', 'advertising'],
                     discount: ['الخصم', 'discount'],
                     total: ['الإجمالي', 'total'],
                     category: ['الفئة', 'category', 'type']
                 };

                 // Find column indices based on headers
                 const colMap = {};
                 Object.keys(expectedHeaders).forEach(key => {
                     colMap[key] = -1; // Initialize
                     const possibleHeaders = expectedHeaders[key];
                     for (let i = 0; i < headerRow.length; i++) {
                         if (possibleHeaders.includes(String(headerRow[i]).trim().toLowerCase())) {
                             colMap[key] = i;
                             break;
                         }
                     }
                 });

                 // Check if essential columns were found
                 if (colMap.title === -1 || colMap.price === -1) {
                    showAlert('لم يتم العثور على أعمدة "اسم المنتج" و "السعر" المطلوبة في الملف. يرجى التأكد من تطابق العناوين.', 'danger');
                    return;
                 }


                // --- Process Rows ---
                const importedProducts = [];
                let skippedRows = 0;
                // Start from the row after the header
                for (let i = headerIndex + 1; i < sheetData.length; i++) {
                    const row = sheetData[i];

                    // Basic check: skip empty rows or rows without a title
                    if (!row || row.length === 0 || !row[colMap.title]) {
                        skippedRows++;
                        continue;
                    }

                    const title = String(row[colMap.title]).trim();
                    const price = parseFloat(row[colMap.price]) || 0;

                     // Skip if title is empty or price is invalid/zero after parsing
                     if (!title || price <= 0) {
                         skippedRows++;
                         continue;
                     }

                    const taxes = colMap.taxes !== -1 ? parseFloat(row[colMap.taxes]) || 0 : 0;
                    const ads = colMap.ads !== -1 ? parseFloat(row[colMap.ads]) || 0 : 0;
                    const discount = colMap.discount !== -1 ? parseFloat(row[colMap.discount]) || 0 : 0;
                    let total = colMap.total !== -1 ? parseFloat(row[colMap.total]) || 0 : 0;
                    const category = colMap.category !== -1 ? String(row[colMap.category]).trim() : '';

                    // Calculate total if not provided or zero
                    if (total <= 0) {
                        total = (price + taxes + ads) - discount;
                    }

                    importedProducts.push({
                        title: title,
                        price: price,
                        taxes: taxes,
                        ads: ads,
                        discount: discount,
                        total: total,
                        category: category
                    });
                } // End row processing loop

                if (importedProducts.length === 0) {
                    showAlert(`لم يتم العثور على بيانات منتجات صالحة للاستيراد. تم تخطي ${skippedRows} صف.`, 'warning');
                    return;
                }

                // Ask user how to handle imported data
                const currentProductCount = typeof productData !== 'undefined' ? productData.length : 0;
                const confirmationMessage = `تم العثور على ${importedProducts.length} منتج صالح للاستيراد.${skippedRows > 0 ? ` (تم تخطي ${skippedRows} صف)` : ''}\n\nهل ترغب في إضافتها إلى القائمة الحالية (${currentProductCount} منتج)؟\n\n(اختر "Cancel" / "إلغاء" لاستبدال القائمة الحالية بالكامل)`;

                if (confirm(confirmationMessage)) {
                    // Append imported products to existing data
                    // Ensure productData is initialized if it wasn't
                    if (typeof productData === 'undefined') window.productData = [];
                    window.productData.push(...importedProducts);
                } else {
                    // Replace existing data with imported data
                    window.productData = importedProducts;
                }

                // Save updated data and refresh the view using global functions
                if (typeof saveData === 'function' && typeof showProducts === 'function') {
                    saveData(); // This should trigger 'productDataSaved' event
                    showProducts(); // Update the main table display
                    showAlert(`تم استيراد ${importedProducts.length} منتج بنجاح.`, 'success');
                } else {
                     showAlert('خطأ: لم يتم العثور على وظائف الحفظ أو العرض لتحديث القائمة.', 'danger');
                }

            } catch (error) {
                console.error('Error processing imported file:', error);
                showAlert('حدث خطأ أثناء معالجة الملف. تأكد من أن الملف بالتنسيق الصحيح وغير تالف.', 'danger');
            }
        };

        reader.onerror = function(event) {
            console.error("File reading error:", event.target.error);
            showAlert('حدث خطأ أثناء قراءة الملف.', 'danger');
        };

        reader.readAsArrayBuffer(file); // Read as ArrayBuffer for XLSX library
    }

    // Global alert function
    function showAlert(message, type = 'info') {
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, type);
        } else {
            console.warn("Export/Import: Global showAlert function not found. Falling back to alert.");
            alert(message); // Fallback
        }
    }

    // Initialize buttons when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addActionButtons);
    } else {
        addActionButtons();
    }

})();