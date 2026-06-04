# Generate PDFs for TIS certification documents from Markdown sources.
# Usage: powershell -File scripts/generate-tis-cert-pdfs.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Node = (Get-Command node -ErrorAction Stop).Source
$Edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $Edge)) {
  $Edge = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}
if (-not (Test-Path $Edge)) {
  throw "Microsoft Edge not found - required for headless PDF generation."
}

$MdToHtml = Join-Path $PSScriptRoot "tis-md-to-html.mjs"
$SrcDir = Join-Path $Root "downloads\TIS-ETIMS-Architecture"
$PdfDir = Join-Path $Root "downloads\TIS-OPTICAL-DISK\02-PDF-DOCUMENTS"
$HtmlDir = Join-Path $Root "downloads\TIS-ETIMS-Architecture\pdf-html"

New-Item -ItemType Directory -Force -Path $PdfDir, $HtmlDir | Out-Null

$Docs = @(
  @{ Md = "KRA_TIS_COVER_LETTER.html";     Pdf = "01_KRA_TIS_COVER_LETTER.pdf";     IsHtml = $true },
  @{ Md = "EXECUTIVE_SUMMARY.html";        Pdf = "02_EXECUTIVE_SUMMARY.pdf";        IsHtml = $true },
  @{ Md = "TIS_ETIMS_INTEGRATION_ARCHITECTURE.html"; Pdf = "03_TIS_ETIMS_INTEGRATION_ARCHITECTURE.pdf"; IsHtml = $true; NeedMermaid = $true },
  @{ Md = "appendix\APPENDIX_SAMPLE_SALESREQ.md"; Pdf = "04_APPENDIX_SAMPLE_SALESREQ.pdf"; IsHtml = $false },
  @{ Md = "USER_OPERATOR_MANUAL.md";        Pdf = "05_USER_OPERATOR_MANUAL.pdf";     IsHtml = $false },
  @{ Md = "INSTALLATION_DEPLOYMENT_GUIDE.md"; Pdf = "06_INSTALLATION_DEPLOYMENT_GUIDE.pdf"; IsHtml = $false },
  @{ Md = "CERTIFICATION_TEST_PLAN.md";     Pdf = "07_CERTIFICATION_TEST_PLAN.pdf"; IsHtml = $false },
  @{ Md = "OPTICAL_DISK_SUBMISSION_INSTRUCTIONS.md"; Pdf = "08_OPTICAL_DISK_SUBMISSION_INSTRUCTIONS.pdf"; IsHtml = $false },
  @{ Md = "REPRESENTATIVE_HANDOVER_KENYA.md"; Pdf = "09_REPRESENTATIVE_HANDOVER_KENYA.pdf"; IsHtml = $false }
)

foreach ($doc in $Docs) {
  $srcPath = Join-Path $SrcDir $doc.Md
  $pdfPath = Join-Path $PdfDir $doc.Pdf

  if (-not (Test-Path $srcPath)) {
    Write-Warning "Skip missing: $srcPath"
    continue
  }

  if ($doc.IsHtml) {
    $htmlPath = $srcPath
    Write-Host "PDF:  $($doc.Pdf) (from HTML)"
  } else {
    $htmlName = [System.IO.Path]::GetFileNameWithoutExtension($doc.Md) + ".html"
    $htmlPath = Join-Path $HtmlDir $htmlName
    Write-Host "HTML: $($doc.Md)"
    & $Node $MdToHtml $srcPath $htmlPath
    if ($LASTEXITCODE -ne 0) { throw "Markdown conversion failed for $($doc.Md)" }
    Write-Host "PDF:  $($doc.Pdf)"
  }

  if (Test-Path $pdfPath) { Remove-Item $pdfPath -Force }

  $fileUri = "file:///" + ($htmlPath -replace "\\", "/")
  $edgeArgs = @(
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--print-to-pdf=$pdfPath"
  )
  if ($doc.NeedMermaid) {
    $edgeArgs += "--virtual-time-budget=20000"
  }
  $edgeArgs += $fileUri
  & $Edge @edgeArgs | Out-Null
  $waitSeconds = if ($doc.NeedMermaid) { 8 } else { 2 }
  Start-Sleep -Seconds $waitSeconds

  if (-not (Test-Path $pdfPath)) {
    throw "PDF not created: $pdfPath"
  }
  $sizeKb = [math]::Round((Get-Item $pdfPath).Length / 1KB, 1)
  Write-Host "  -> $sizeKb KB"
}

Write-Host ""
Write-Host "Done. PDFs in: $PdfDir"
