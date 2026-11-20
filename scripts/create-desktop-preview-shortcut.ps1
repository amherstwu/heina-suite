# Create desktop shortcuts: GAS preview + paste to Apps Script
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$previewBat = Join-Path $root 'open-local-preview.bat'
$deployBat = Join-Path $root 'deploy-gas.cmd'
foreach ($p in @($previewBat, $deployBat)) {
  if (-not (Test-Path $p)) { Write-Error "Missing: $p" }
}

function New-DesktopShortcut($fileNameChars, $target, $desc) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $name = -join ($fileNameChars | ForEach-Object { [char]$_ }) + '.lnk'
  $lnkPath = Join-Path $desktop $name
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($lnkPath)
  $shortcut.TargetPath = $target
  $shortcut.WorkingDirectory = $root
  $shortcut.WindowStyle = 1
  $shortcut.Description = $desc
  $shortcut.Save()
  Write-Host 'OK:' $lnkPath
}

# 動漫情報系統 本機預覽
New-DesktopShortcut @(
  0x52D5, 0x6F2B, 0x60C5, 0x5831, 0x7CFB, 0x7D71, 0x20,
  0x672C, 0x6A5F, 0x9810, 0x89BD
) $previewBat 'Build GAS bundle and preview at http://127.0.0.1:5280'

# 動漫情報系統 貼到 Apps Script
New-DesktopShortcut @(
  0x52D5, 0x6F2B, 0x60C5, 0x5831, 0x7CFB, 0x7D71, 0x20,
  0x8CBC, 0x5230, 0x20, 0x41, 0x70, 0x70, 0x73, 0x20, 0x53, 0x63, 0x72, 0x69, 0x70, 0x74
) $deployBat 'Open deploy/apps-script-bundle after preview OK'
