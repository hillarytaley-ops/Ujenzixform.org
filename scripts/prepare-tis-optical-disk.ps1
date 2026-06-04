# Prepare full TIS-OPTICAL-DISK folder for KRA read-only CD/DVD burn.
# Usage: powershell -File scripts/prepare-tis-optical-disk.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$DiskRoot = Join-Path $Root "downloads\TIS-OPTICAL-DISK"
$SrcPack = Join-Path $Root "downloads\TIS-ETIMS-Architecture"
$SrcDest = Join-Path $DiskRoot "03-SOURCE-DOCUMENTS"

Write-Host "=== UjenziXform TIS optical disk prepare ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Building software bundle..."
& (Join-Path $PSScriptRoot "build-tis-optical-disk.ps1")

Write-Host ""
Write-Host "[2/3] Generating certification PDFs..."
& (Join-Path $PSScriptRoot "generate-tis-cert-pdfs.ps1")

Write-Host ""
Write-Host "[3/3] Copying source document pack (optional)..."
if (Test-Path $SrcDest) {
  Remove-Item $SrcDest -Recurse -Force
}
Copy-Item $SrcPack $SrcDest -Recurse -Force
# Exclude generated pdf-html cache from source copy
$pdfHtmlCache = Join-Path $SrcDest "pdf-html"
if (Test-Path $pdfHtmlCache) {
  Remove-Item $pdfHtmlCache -Recurse -Force
}

Write-Host ""
Write-Host "=== Pre-burn checklist ===" -ForegroundColor Cyan

$softwareOk = Test-Path (Join-Path $DiskRoot "01-SOFTWARE\src\lib\etims")
$manifestOk = Test-Path (Join-Path $DiskRoot "SOFTWARE_MANIFEST.txt")
$pdfCount = (Get-ChildItem (Join-Path $DiskRoot "02-PDF-DOCUMENTS\*.pdf") -ErrorAction SilentlyContinue).Count
$envLeak = Get-ChildItem $DiskRoot -Recurse -Filter ".env*" -ErrorAction SilentlyContinue

Write-Host ("  01-SOFTWARE present:     " + $(if ($softwareOk) { "YES" } else { "NO - FIX" }))
Write-Host ("  SOFTWARE_MANIFEST.txt:   " + $(if ($manifestOk) { "YES" } else { "NO - FIX" }))
Write-Host ("  PDF count (expect 9):    $pdfCount")
Write-Host ("  .env files on disk:      " + $(if ($envLeak) { "WARNING - REMOVE" } else { "none" }))
Write-Host ""
Write-Host "Folder ready: $DiskRoot"
Write-Host "Next: review PDFs, fill cover letter fields, burn read-only CD/DVD."
Write-Host "See: downloads/TIS-ETIMS-Architecture/OPTICAL_DISK_SUBMISSION_INSTRUCTIONS.md"
