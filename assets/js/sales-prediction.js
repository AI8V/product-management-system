/**
 * التنبؤ الذكي بالمبيعات - يقدم توقعات مستقبلية للمبيعات بناءً على تحليل البيانات
 * يساعد أصحاب الأعمال في اتخاذ قرارات مبنية على توقعات ذكية لأداء المنتجات
 */
(function() {
    // إضافة زر التنبؤ الذكي إلى الواجهة
    function addSalesPredictionButton() {
        const predictionBtn = document.createElement('button');
        predictionBtn.className = 'btn btn-warning btn-sm me-2'; // Adjusted margin
        predictionBtn.id = 'salesPredictBtn';
        predictionBtn.innerHTML = '<i class="fas fa-chart-line"></i> تنبؤ المبيعات';
        predictionBtn.title = 'إنشاء توقعات للمبيعات المستقبلية';
        predictionBtn.addEventListener('click', showSalesPredictionModal);

        // إضافة الزر إلى حاوية الأزرار الرئيسية
        const actionContainer = document.getElementById('actionButtonsContainer');
        const deleteAllBtn = document.getElementById('deleteAllBtn'); // Reference point
        if (actionContainer && deleteAllBtn) {
            actionContainer.insertBefore(predictionBtn, deleteAllBtn);
        } else if(deleteAllBtn?.parentNode) {
            // Fallback
             deleteAllBtn.parentNode.insertBefore(predictionBtn, deleteAllBtn);
        }

        // إنشاء النافذة المنبثقة
        createPredictionModal();
    }

    // إنشاء النافذة المنبثقة للتنبؤات
    function createPredictionModal() {
        if (document.getElementById('predictionsModal')) return;

        const modalHTML = `
            <div class="modal fade" id="predictionsModal" tabindex="-1" aria-labelledby="predictionsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title" id="predictionsModalLabel">توقعات المبيعات للأشهر القادمة</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" id="predictionsBody">
                            <!-- Content will be loaded here -->
                             <div class="text-center p-5">
                                <div class="spinner-border text-warning" role="status">
                                    <span class="visually-hidden">جاري التحميل...</span>
                                </div>
                            </div>
                        </div>
                         <div class="modal-footer">
                             <small class="text-muted me-auto">ملاحظة: هذه التنبؤات تقديرية وتعتمد على البيانات الحالية.</small>
                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                         </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

         // Cleanup on close
         const modalElement = document.getElementById('predictionsModal');
         modalElement?.addEventListener('hidden.bs.modal', function() {
             document.getElementById('predictionsBody').innerHTML = ` <div class="text-center p-5">
                                <div class="spinner-border text-warning" role="status">
                                    <span class="visually-hidden">جاري التحميل...</span>
                                </div>
                            </div>`; // Reset body
         });
    }


    // عرض نافذة التنبؤات
    function showSalesPredictionModal() {
        const modalElement = document.getElementById('predictionsModal');
        if (!modalElement) return;

        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();

        // تأخير بسيط للسماح للنافذة بالظهور قبل توليد البيانات
        setTimeout(generateSalesPrediction, 200);
    }


    // توليد تنبؤات ذكية للمبيعات وعرضها
    function generateSalesPrediction() {
        const predictionsBody = document.getElementById('predictionsBody');
        if (!predictionsBody) return;

        const productData = JSON.parse(localStorage.getItem('productData')) || [];

        if (productData.length < 3) {
            predictionsBody.innerHTML = '<div class="alert alert-warning">يجب توفر ٣ منتجات على الأقل لإنشاء تنبؤات دقيقة.</div>';
            return;
        }

        // تحليل البيانات وإنشاء تنبؤات بالمبيعات المتوقعة
        const currentDate = new Date();
        // استخدام السعر الإجمالي للمنتج (total) كأساس للقيمة
        const totalValue = productData.reduce((sum, product) => sum + parseFloat(product.total || 0), 0);
        const avgProductValue = totalValue / productData.length;

        // إنشاء تنبؤات للأشهر الستة القادمة (باستخدام خوارزمية نمو بسيطة)
        const predictions = [];
        // معدل نمو شهري (يمكن جعله أكثر تعقيدًا بناءً على بيانات تاريخية إن وجدت)
        // يبدأ بمعدل أساسي ويتأثر قليلاً بعدد المنتجات ومتوسط قيمتها (افتراضات بسيطة)
        let monthlyGrowth = 1.03 + (productData.length / 1000) + (avgProductValue / 5000);
        monthlyGrowth = Math.min(Math.max(monthlyGrowth, 1.01), 1.15); // Clamp between 1% and 15% growth

        let currentPredictedValue = totalValue;

        for (let i = 1; i <= 6; i++) {
            const nextMonth = new Date(currentDate);
            nextMonth.setMonth(currentDate.getMonth() + i);

            const monthName = nextMonth.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
            // تطبيق النمو على القيمة الحالية
            currentPredictedValue *= monthlyGrowth;

            predictions.push({
                month: monthName,
                salesValue: Math.round(currentPredictedValue) // قيمة المبيعات المتوقعة لذلك الشهر
            });

             // إضافة بعض العشوائية الطفيفة للتنبؤات لتبدو أقل خطية
             monthlyGrowth *= (0.98 + Math.random() * 0.04); // Fluctuate growth slightly each month
        }

        // عرض النتائج في النافذة المنبثقة
        const predictionsHTML = `
            <p class="text-center mb-3">بناءً على تحليل <strong>${productData.length}</strong> منتج بقيمة إجمالية حالية <strong>${totalValue.toFixed(2)}</strong>.</p>
            <h6 class="text-center mb-3">القيمة الإجمالية المتوقعة للمبيعات:</h6>
            <ul class="list-group">
                ${predictions.map(p => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${p.month}
                        <span class="badge bg-warning text-dark rounded-pill">${p.salesValue.toFixed(2)}</span>
                    </li>
                `).join('')}
            </ul>
        `;

        predictionsBody.innerHTML = predictionsHTML;
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
    window.addEventListener('DOMContentLoaded', addSalesPredictionButton);
})();