let productData = [];
let tmp; // Index for update mode
let mode = 'create';

// DOM Elements
const form = document.getElementById('productForm');
const title = document.getElementById('title');
const price = document.getElementById('price');
const taxes = document.getElementById('taxes');
const ads = document.getElementById('ads');
const discount = document.getElementById('discount');
const total = document.getElementById('total');
const count = document.getElementById('count');
const category = document.getElementById('category');
const submitBtn = document.getElementById('submitBtn');
const searchInput = document.getElementById('searchInput');
const searchAll = document.getElementById('searchAll');
const searchTitle = document.getElementById('searchTitle');
const searchCategory = document.getElementById('searchCategory');
const productTable = document.getElementById('productTable');
const productCount = document.getElementById('productCount');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const clearBtn = document.getElementById('clearBtn');
const productIdInput = document.getElementById('productId'); // Used for hidden ID, maybe for future use

// --- Core Functions ---

/**
 * Calculate total price based on inputs.
 */
function calculateTotal() {
    const numPrice = parseFloat(price.value) || 0;
    const numTaxes = parseFloat(taxes.value) || 0;
    const numAds = parseFloat(ads.value) || 0;
    const numDiscount = parseFloat(discount.value) || 0;
    const result = (numPrice + numTaxes + numAds) - numDiscount;

    total.innerHTML = `<span>السعر الإجمالي: ${result.toFixed(2)}</span>`; // Format total
    if(numPrice > 0 && result >= 0) { // Check for positive price and non-negative total
        total.style.backgroundColor = '#d1e7dd'; // Bootstrap success background light
        total.style.color = '#0f5132'; // Bootstrap success text dark
    } else if (result < 0) {
        total.style.backgroundColor = '#f8d7da'; // Bootstrap danger background light
        total.style.color = '#842029'; // Bootstrap danger text dark
    }
    else {
        total.style.backgroundColor = '#f8f9fa'; // Default background
        total.style.color = '#198754'; // Default text color (original)
    }
}

/**
 * Save product data to localStorage and notify other modules.
 */
function saveData() {
    try {
        localStorage.setItem('productData', JSON.stringify(productData));
        // Notify other modules about the data change
        window.dispatchEvent(new CustomEvent('productDataSaved'));
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
        showAlert('حدث خطأ أثناء حفظ البيانات. قد تكون مساحة التخزين ممتلئة.', 'danger');
    }
}

/**
 * Clear the product form and reset state.
 */
function clearForm() {
    form.reset();
    calculateTotal(); // Recalculate total (should be 0)
    mode = 'create';
    submitBtn.textContent = 'إنشاء منتج جديد'; // Use textContent for safety
    count.disabled = false;
    if(productIdInput) productIdInput.value = ''; // Clear hidden ID if used
    tmp = undefined; // Reset update index

    // Notify image module to clear its preview (if exists)
     if (typeof window.clearProductImagePreview === 'function') {
         window.clearProductImagePreview();
     }
      // Notify print module to hide 'print current' button
     if (typeof window.updatePrintCurrentButtonVisibility === 'function') {
         window.updatePrintCurrentButtonVisibility(false);
     }

     title.focus(); // Set focus back to the title field
}

/**
 * Display products in the table.
 * @param {Array} [items=productData] - The array of products to display.
 */
function showProducts(items = productData) {
    const tbody = document.getElementById('productTable');
    if (!tbody) {
        console.error("Table body 'productTable' not found.");
        return;
    }

    // Calculate total columns based on thead (including potential image column)
    const thead = tbody.closest('table')?.querySelector('thead tr');
    const colspan = thead?.cells?.length || 9; // Default to 9 if header not found

    // Update product count and visibility of 'Delete All' button
    const displayDeleteAll = items.length > 0;
    deleteAllBtn.style.display = displayDeleteAll ? 'inline-block' : 'none'; // Use inline-block for button
    productCount.textContent = `عدد المنتجات: ${items.length}`;

    // Clear table or show 'no products' message
    tbody.innerHTML = ''; // Clear previous content first

    if(items.length === 0) {
        tbody.innerHTML = `
            <tr class="text-center">
                <td class="text-muted py-4" colspan="${colspan}">لا توجد منتجات لعرضها</td>
            </tr>
        `;
        return;
    }

    // Build table rows
    let tableContent = '';
    items.forEach((item) => {
        // Find the original index in the main productData array
        const originalIndex = productData.findIndex(p => p === item);
        if (originalIndex === -1) {
            console.warn("Could not find original index for item:", item);
            return; // Skip items not found in main data (shouldn't happen often)
        }

        // *** لا توجد تعليقات هنا الآن ***
        tableContent += `
            <tr>
                <td>${originalIndex + 1}</td>
                <td>${item.title || '-'}</td>
                <td>${(parseFloat(item.price) || 0).toFixed(2)}</td>
                <td>${(parseFloat(item.taxes) || 0).toFixed(2)}</td>
                <td>${(parseFloat(item.ads) || 0).toFixed(2)}</td>
                <td>${(parseFloat(item.discount) || 0).toFixed(2)}</td>
                <td>${(parseFloat(item.total) || 0).toFixed(2)}</td>
                <td>${item.category || '-'}</td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-primary mx-1" onclick="editProduct(${originalIndex})" title="تعديل">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${originalIndex})" title="حذف">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = tableContent;

    // Notify image module to update table rows (add image cells/thumbnails)
     if (typeof window.updateTableRowsWithImages === 'function') {
        window.updateTableRowsWithImages();
     }
     // Notify print module to update table rows (add print buttons)
      if (typeof window.injectPrintButtonsIntoRows === 'function') {
         window.injectPrintButtonsIntoRows();
      }
}

/**
 * Delete a product by its index.
 * @param {number} index - The index of the product to delete in productData.
 */
function deleteProduct(index) {
    if (index >= 0 && index < productData.length) {
        const productTitle = productData[index].title || 'هذا المنتج';
         if(confirm(`هل أنت متأكد من حذف "${productTitle}"؟`)) {

             // Notify image module *before* deleting data
             if (typeof window.handleProductDelete === 'function') {
                 window.handleProductDelete(index);
             }

            productData.splice(index, 1);
            saveData(); // This now also triggers the 'productDataSaved' event
            showProducts(); // Re-render the table
            showAlert(`تم حذف "${productTitle}" بنجاح`, 'success');
        }
    } else {
         showAlert('خطأ: مؤشر المنتج غير صالح للحذف.', 'danger');
    }
}
// Expose deleteProduct globally if needed by other modules (like mobile)
window.deleteProduct = deleteProduct;


/**
 * Populate the form for editing a product.
 * @param {number} index - The index of the product to edit in productData.
 */
function editProduct(index) {
     if (index >= 0 && index < productData.length) {
        mode = 'update';
        tmp = index; // Store index for the submit handler

        const product = productData[index];
        title.value = product.title || '';
        price.value = product.price || '';
        taxes.value = product.taxes || '';
        ads.value = product.ads || '';
        discount.value = product.discount || '';
        category.value = product.category || '';
        count.value = 1;
        count.disabled = true; // Disable count field in update mode

        calculateTotal(); // Update total display
        submitBtn.textContent = 'تحديث المنتج'; // Change button text

        // Notify image module to handle image preview for editing
         if (typeof window.handleProductEdit === 'function') {
             window.handleProductEdit(index);
         }
         // Notify print module to show/hide 'print current' button
         if (typeof window.updatePrintCurrentButtonVisibility === 'function') {
             window.updatePrintCurrentButtonVisibility(true);
         }


        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        title.focus(); // Focus on title field for editing
     } else {
         showAlert('خطأ: مؤشر المنتج غير صالح للتعديل.', 'danger');
         clearForm(); // Reset form if index was invalid
     }
}
// Expose editProduct globally if needed by other modules (like mobile)
window.editProduct = editProduct;


/**
 * Delete all products.
 */
function deleteAllProducts() {
    if (productData.length === 0) return;

    if(confirm(`هل أنت متأكد من حذف جميع المنتجات (${productData.length})؟ لا يمكن التراجع عن هذا الإجراء.`)) {

        // Notify image module *before* deleting data
         if (typeof window.handleProductDeleteAll === 'function') {
             window.handleProductDeleteAll();
         }

        productData = [];
        saveData(); // This now also triggers the 'productDataSaved' event
        showProducts(); // Update display
        showAlert('تم حذف جميع المنتجات بنجاح', 'success');
    }
}
// Expose deleteAllProducts globally if needed
window.deleteAllProducts = deleteAllProducts;


/**
 * Handle form submission for creating or updating products.
 * @param {Event} e - The form submission event.
 */
function handleFormSubmit(e) {
    e.preventDefault();

    // Basic validation
    const productTitle = title.value.trim();
    const productPrice = parseFloat(price.value);

    if (!productTitle) {
        showAlert('يرجى إدخال اسم المنتج.', 'warning');
        title.focus();
        return;
    }
     if (isNaN(productPrice) || productPrice <= 0) {
        showAlert('يرجى إدخال سعر صالح للمنتج (أكبر من 0).', 'warning');
        price.focus();
        return;
    }

    // Calculate total before creating/updating the object
    const numPrice = parseFloat(price.value) || 0;
    const numTaxes = parseFloat(taxes.value) || 0;
    const numAds = parseFloat(ads.value) || 0;
    const numDiscount = parseFloat(discount.value) || 0;
    const itemTotal = (numPrice + numTaxes + numAds) - numDiscount;


    let productObject = {
        title: productTitle,
        price: numPrice,
        taxes: numTaxes,
        ads: numAds,
        discount: numDiscount,
        total: itemTotal,
        category: category.value.trim(),
    };

    let savedIndex = -1; // To keep track of the index for image processing

    if(mode === 'update' && typeof tmp === 'number' && tmp >= 0 && tmp < productData.length) {
        // --- Update Mode ---
        productData[tmp] = productObject;
        savedIndex = tmp;
        saveData(); // Save and trigger event
         // Process image *after* saving data, *before* clearing form
         if (typeof window.processProductImage === 'function') {
             window.processProductImage(savedIndex, 'update');
         }
        showAlert('تم تحديث المنتج بنجاح', 'success');
    }
    else {
        // --- Create Mode ---
        mode = 'create'; // Ensure mode is create
        const numCount = parseInt(count.value, 10) || 1;

        if(numCount > 0) {
            let firstNewIndex = productData.length; // Index of the first new product to be added
            for(let i = 0; i < numCount; i++) {
                 // Create a distinct object copy for each product
                productData.push({...productObject});
            }
            savedIndex = firstNewIndex; // Use index of the first added product for potential image association
            saveData(); // Save and trigger event
             // Process image for the first created product *after* saving data, *before* clearing form
             if (numCount === 1 && typeof window.processProductImage === 'function') {
                 window.processProductImage(savedIndex, 'create');
             } else if (numCount > 1 && typeof window.processProductImage === 'function') {
                 // Optionally handle images differently for multiple items, or just ignore for multi-add
                  console.log("Image upload skipped for multi-product creation.");
             }

             showAlert(numCount > 1 ? `تم إنشاء ${numCount} منتجات بنجاح` : 'تم إنشاء المنتج بنجاح', 'success');
        } else {
             showAlert('الرجاء إدخال كمية صالحة (1 أو أكثر).', 'warning');
             return; // Stop execution if count is invalid
        }
    }

    // Clear form and update table display *after* all processing
    clearForm();
    showProducts();
}


/**
 * Handle search input changes.
 */
function handleSearch() {
    const searchValue = searchInput.value.trim().toLowerCase();
    let searchResult = productData; // Default to all products

    if (searchValue) {
        const searchTypeElement = document.querySelector('input[name="searchType"]:checked');
        const searchType = searchTypeElement ? searchTypeElement.id : 'searchAll';

        searchResult = productData.filter(item => {
            const titleMatch = item.title && item.title.toLowerCase().includes(searchValue);
            const categoryMatch = item.category && item.category.toLowerCase().includes(searchValue);

            if (searchType === 'searchTitle') {
                return titleMatch;
            } else if (searchType === 'searchCategory') {
                return categoryMatch;
            } else { // searchAll
                return titleMatch || categoryMatch;
            }
        });
    }
    showProducts(searchResult); // Display filtered results
}

/**
 * Display alerts to the user.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The alert type (e.g., 'success', 'warning', 'danger', 'info').
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
         console.warn("Alert container '#alertContainer' not found. Message:", message);
         // Fallback to standard alert if container is missing
         alert(`${type.toUpperCase()}: ${message}`);
         return;
    }

    const alertId = `alert-${Date.now()}`;
    const alertDiv = document.createElement('div');
    alertDiv.id = alertId;
    // Use Bootstrap alert classes
    alertDiv.className = `alert alert-${type} alert-dismissible fade show m-2`;
    alertDiv.setAttribute('role', 'alert');
    // Ensure proper alignment and close button functionality
    alertDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
             <span>${message}</span>
             <button type="button" class="btn-close p-0" data-bs-dismiss="alert" aria-label="Close" style="margin-left: 0.5rem;"></button>
        </div>
    `;

    alertContainer.prepend(alertDiv); // Add new alerts to the top

    // Auto remove using Bootstrap's API
     const alertInstance = bootstrap.Alert.getOrCreateInstance(alertDiv);
     setTimeout(() => {
         if (alertInstance) {
             alertInstance.close();
         } else {
             // Fallback removal if instance wasn't created or already closed
             const currentAlert = document.getElementById(alertId);
             currentAlert?.remove();
         }
     }, 4000); // Auto-close after 4 seconds
}
// Expose showAlert globally
window.showAlert = showAlert;


// --- Initialization and Event Listeners ---

window.onload = function() {
    // Load data from localStorage
    if(localStorage.productData) {
        try {
            productData = JSON.parse(localStorage.productData);
        } catch (e) {
             console.error("Error parsing product data from localStorage:", e);
             localStorage.removeItem('productData'); // Clear corrupted data
             productData = [];
        }
    }
    showProducts(); // Initial display
    if (productData.length > 0) {
         window.dispatchEvent(new CustomEvent('productDataSaved')); // Notify modules on initial load if data exists
    }


    // Add event listeners
    const calcInputs = document.querySelectorAll('.calc-input');
    calcInputs.forEach(input => {
        input.addEventListener('input', calculateTotal);
    });

    form.addEventListener('submit', handleFormSubmit);
    clearBtn.addEventListener('click', clearForm);
    deleteAllBtn.addEventListener('click', deleteAllProducts); // Use the global function
    searchInput.addEventListener('input', handleSearch);

    document.querySelectorAll('input[name="searchType"]').forEach(radio => {
        radio.addEventListener('change', handleSearch);
    });

    // Indicate that the product manager is initialized
     window.productManagerInitialized = true;
     window.dispatchEvent(new CustomEvent('productManagerReady'));
     console.log("Product Manager Initialized.");
};