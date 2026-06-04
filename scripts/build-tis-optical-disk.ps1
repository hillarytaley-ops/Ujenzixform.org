# Build TIS integration software folder for KRA optical disk submission.
# Usage: powershell -File scripts/build-tis-optical-disk.ps1
# Output: downloads/TIS-OPTICAL-DISK/01-SOFTWARE/ + SOFTWARE_MANIFEST.txt

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  $Root = Split-Path $PSScriptRoot -Parent
}
$OutBase = Join-Path $Root "downloads\TIS-OPTICAL-DISK"
$OutSoftware = Join-Path $OutBase "01-SOFTWARE"
$ManifestPath = Join-Path $OutBase "SOFTWARE_MANIFEST.txt"
$ReadmePath = Join-Path $OutBase "README.txt"

$CopySpecs = @(
  @{ Src = "src\lib\etims"; Label = "TIS core library" },
  @{ Src = "src\components\admin\tis-integrator"; Label = "Admin TIS Integrator Hub" },
  @{ Src = "src\components\etims"; Label = "Fiscal receipt & eTIMS UI" },
  @{ Src = "supabase\functions\etims-proxy"; Label = "Edge function etims-proxy" }
)

$CopyFiles = @(
  "src\components\admin\EtimsTestPanel.tsx",
  "src\components\admin\EtimsPurchaseOrderSubmitCard.tsx",
  "src\components\admin\VendorEtimsTisRegistryPanel.tsx",
  "src\components\supplier\SupplierEtimsSettingsPanel.tsx",
  "supabase\functions\_shared\etimsPathAllowlist.ts",
  "env.local.template"
)

if (Test-Path $OutSoftware) {
  Remove-Item $OutSoftware -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $OutSoftware | Out-Null

$manifest = @()
$manifest += "UjenziXform Trader Invoicing System (TIS) - Software Manifest"
$manifest += "Product version: 1.0.0"
$manifest += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$manifest += "Reference: UJX-TIS-KRA-ARCH-2026-001"
$manifest += ""
$manifest += "PATH`tSIZE_BYTES`tDESCRIPTION"
$manifest += ("-" * 80)

function Add-ManifestLine($relativePath, $fullPath, $desc) {
  $size = (Get-Item $fullPath).Length
  $script:manifest += "$relativePath`t$size`t$desc"
}

foreach ($spec in $CopySpecs) {
  $srcPath = Join-Path $Root $spec.Src
  if (-not (Test-Path $srcPath)) {
    Write-Warning "Skip missing: $($spec.Src)"
    continue
  }
  $destPath = Join-Path $OutSoftware $spec.Src
  New-Item -ItemType Directory -Force -Path (Split-Path $destPath -Parent) | Out-Null
  Copy-Item $srcPath $destPath -Recurse -Force
  Get-ChildItem $destPath -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($OutSoftware.Length + 1).Replace("\", "/")
    Add-ManifestLine $rel $_.FullName $spec.Label
  }
}

foreach ($relFile in $CopyFiles) {
  $srcPath = Join-Path $Root $relFile
  if (-not (Test-Path $srcPath)) { continue }
  $destPath = Join-Path $OutSoftware $relFile
  New-Item -ItemType Directory -Force -Path (Split-Path $destPath -Parent) | Out-Null
  Copy-Item $srcPath $destPath -Force
  Add-ManifestLine $relFile.Replace("\", "/") $srcPath "TIS integration component"
}

$migrationGlob = Join-Path $Root "supabase\migrations\*etims*"
$migrationGlob2 = Join-Path $Root "supabase\migrations\*tis*"
$migDest = Join-Path $OutSoftware "supabase\migrations"
New-Item -ItemType Directory -Force -Path $migDest | Out-Null
Get-ChildItem $migrationGlob, $migrationGlob2 -ErrorAction SilentlyContinue | Sort-Object Name -Unique | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $migDest $_.Name) -Force
  Add-ManifestLine ("supabase/migrations/" + $_.Name) $_.FullName "Database migration (eTIMS/TIS)"
}

$manifest += ""
$manifest += "TOTAL_FILES: $(($manifest | Select-String "`t" | Measure-Object).Count - 1)"
$manifest | Set-Content -Path $ManifestPath -Encoding UTF8

@(
  "UjenziXform TIS - KRA Optical Disk (read-only CD/DVD)"
  "Product: UjenziXform Trader Invoicing System v1.0.0"
  "Reference: UJX-TIS-KRA-ARCH-2026-001"
  ""
  "01-SOFTWARE/     All TIS integration source files (see SOFTWARE_MANIFEST.txt)"
  "02-PDF-DOCUMENTS/  Certification PDFs (you must add - see OPTICAL_DISK_SUBMISSION_GUIDE.md)"
  ""
  "Do NOT include .env files, Edge secrets, or live credentials on this disk."
) | Set-Content -Path $ReadmePath -Encoding UTF8

Write-Host "Done. Software bundle: $OutSoftware"
Write-Host "Manifest: $ManifestPath"
Write-Host "Next: add PDFs to downloads\TIS-OPTICAL-DISK\02-PDF-DOCUMENTS\ then burn read-only disc."
