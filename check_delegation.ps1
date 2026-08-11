$ErrorActionPreference = 'Stop'
try {
    $c = (Invoke-WebRequest -Uri 'https://digibiz-sys.web.app/modules/retail/inventory.html' -UseBasicParsing).Content
    $i = $c.IndexOf('Event delegation for stock history popup clicks')
    if ($i -ge 0) {
        Write-Output "--- DELEGATION BLOCK ---"
        Write-Output $c.Substring($i, 700)
    } else {
        Write-Output "DELEGATION COMMENT NOT FOUND"
        $j = $c.IndexOf('closest(.stock-history-trigger')
        if ($j -ge 0) {
            Write-Output "FOUND closest. ctx:"
            Write-Output $c.Substring($j-150, 400)
        } else {
            Write-Output "closest NOT FOUND either"
        }
    }
    $k = $c.IndexOf('getEffectiveBusinessId')
    Write-Output "--- GETEFFBIZ ---"
    Write-Output "GETEFFBIZ COUNT: $([regex]::Matches($c,'getEffectiveBusinessId').Count)"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
