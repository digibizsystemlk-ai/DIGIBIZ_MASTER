$ErrorActionPreference = 'Stop'
try {
    $c = (Invoke-WebRequest -Uri 'https://digibiz-sys.web.app/modules/retail/inventory.html' -UseBasicParsing).Content
    Write-Output "LENGTH: $($c.Length)"
    Write-Output "HAS_TRIGGER: $($c.Contains('stock-history-trigger'))"
    Write-Output "HAS_BTN: $($c.Contains('stock-history-btn'))"
    Write-Output "DATA_PROD_ID_COUNT: $([regex]::Matches($c, 'data-prod-id').Count)"
    Write-Output "HAS_OPEN_MODAL: $($c.Contains('openStockHistoryModal'))"
    $i = $c.IndexOf('btn-outline stock-history-trigger')
    if ($i -ge 0) {
        Write-Output "--- TRIGGER SECTION ---"
        Write-Output $c.Substring($i-40, 350)
    }
    $j = $c.IndexOf('<button type="button" class="btn-outline" onclick="window.openStockHistoryModal')
    if ($j -ge 0) {
        Write-Output "--- HISTORY ACTION BUTTON ---"
        Write-Output $c.Substring($j-10, 280)
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
