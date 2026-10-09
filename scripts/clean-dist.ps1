$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
$dist = Join-Path (Split-Path $PSScriptRoot -Parent) 'dist'
if (Test-Path $dist) {
  Get-ChildItem $dist -Force | ForEach-Object {
    Write-Output ("recycling: " + $PSItem.Name)
    if ($PSItem.PSIsContainer) {
      [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($PSItem.FullName,'OnlyErrorDialogs','SendToRecycleBin')
    } else {
      [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($PSItem.FullName,'OnlyErrorDialogs','SendToRecycleBin')
    }
  }
  Write-Output '---- dist after cleanup ----'
  Get-ChildItem $dist -Force | Select-Object Name | Format-Table -AutoSize
} else {
  Write-Output 'no dist folder'
}
