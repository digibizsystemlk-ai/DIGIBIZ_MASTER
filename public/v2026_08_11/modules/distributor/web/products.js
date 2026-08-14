// Distributor products page helpers.
// Keeps modal wiring resilient when HTML is cached/re-rendered.
(function () {
    function bindProductEditModalShortcuts() {
        var modal = document.getElementById('productEditModal');
        if (!modal) return;
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                if (typeof window.closeEditProductModal === 'function') {
                    window.closeEditProductModal();
                } else {
                    modal.style.display = 'none';
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindProductEditModalShortcuts);
    } else {
        bindProductEditModalShortcuts();
    }
})();
