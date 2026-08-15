# Self-Signed Code Signing Script for LAN Saturn Binaries
# Run in PowerShell to eliminate Windows SmartScreen warnings on your local machines

$CertSubject = "CN=LAN Saturn Local Publisher"
$Cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -match "LAN Saturn" } | Select-Object -First 1

if (-not $Cert) {
    Write-Host "Creating self-signed Code Signing Certificate..." -ForegroundColor Yellow
    $Cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $CertSubject -CertStoreLocation Cert:\CurrentUser\My
    
    # Export and install into Trusted Root Certification Authorities
    $TmpPath = Join-Path $env:TEMP "LANSaturnLocalCert.cer"
    Export-Certificate -Cert $Cert -FilePath $TmpPath | Out-Null
    Import-Certificate -FilePath $TmpPath -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
    Remove-Item -Force $TmpPath
    Write-Host "Installed certificate into Trusted Root Certification Authorities." -ForegroundColor Green
} else {
    Write-Host "Found existing local Code Signing Certificate." -ForegroundColor Green
}

$ExeFiles = @(
    "dist-release\LAN-Saturn.exe",
    "dist-installer\LAN-Saturn-Setup.exe"
)

foreach ($File in $ExeFiles) {
    if (Test-Path $File) {
        Write-Host "Signing $File..." -ForegroundColor Cyan
        Set-AuthenticodeSignature -FilePath $File -Certificate $Cert -HashAlgorithm SHA256 -TimestampServer "http://timestamp.digicert.com" | Out-Null
        Write-Host "Successfully signed $File" -ForegroundColor Green
    }
}
