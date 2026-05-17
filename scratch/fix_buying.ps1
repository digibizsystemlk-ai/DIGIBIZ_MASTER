$path = "i:\DIGIBIZ_MASTER\public\modules\admin\scrap-buying.html"
$content = Get-Content -Path $path -Raw
$badString = 'pbWrap.innerHTML = html;\\n                    } else {\\n                        pbCont.style.display = ''none'';\\n                    }\\n                }\\n            }\\n        }\\n\\n        function autoAdjustDeductionsForCollection(targetDeduction) {\\n            const advEl = document.getElementById(''advanceApplyAmount'');\\n            if (!advEl) return;\\n            \\n            const elIn = document.getElementById(''supplierAdvanceInline'');\\n            const elModal = document.getElementById(''supplierAdvance'');\\n            const advBal = Number(String(elIn?.textContent || elModal?.textContent || '''').replace(/[^0-9.]/g, '''')) || 0;\\n\\n            const newAdv = Math.min(targetDeduction, advBal);\\n            advEl.value = newAdv > 0.001 ? newAdv.toFixed(2) : '''';\\n            advEl.dataset.userEdited = ''1'';\\n\\n            updateBillPreview();\\n        }'
$goodString = 'pbWrap.innerHTML = html;
                    }
                } else {
                    pbCont.style.display = ''none'';
                }
            }
        }

        function autoAdjustDeductionsForCollection(targetDeduction) {
            const advEl = document.getElementById(''advanceApplyAmount'');
            if (!advEl) return;
            
            const elIn = document.getElementById(''supplierAdvanceInline'');
            const elModal = document.getElementById(''supplierAdvance'');
            const advBal = Number(String(elIn?.textContent || elModal?.textContent || '''').replace(/[^0-9.]/g, '''')) || 0;

            const newAdv = Math.min(targetDeduction, advBal);
            advEl.value = newAdv > 0.001 ? newAdv.toFixed(2) : '''';
            advEl.dataset.userEdited = ''1'';

            updateBillPreview();
        }'

# Replace only once to be safe
$newContent = $content.Replace($badString, $goodString)
Set-Content -Path $path -Value $newContent -NoNewline
