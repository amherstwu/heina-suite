# Install Heina Suite desktop launcher folder + shortcuts
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$desktop = [Environment]::GetFolderPath('Desktop')
$folderName = -join (0x52D5, 0x6F2B, 0x60C5, 0x5831, 0x7CFB, 0x7D71 | ForEach-Object { [char]$_ })
$folderPath = Join-Path $desktop $folderName

$launchers = @(
  @{
    Name = '01 ' + (-join (0x672C, 0x6A5F, 0x9810, 0x89BD | ForEach-Object { [char]$_ }))
    Target = Join-Path $root 'desktop\preview-gas.cmd'
    Desc = 'Build GAS bundle and preview hub at http://127.0.0.1:5280/preview/'
  },
  @{
    Name = '02 ' + (-join (0x8CBC, 0x5230, 0x20, 0x41, 0x70, 0x70, 0x73, 0x20, 0x53, 0x63, 0x72, 0x69, 0x70, 0x74 | ForEach-Object { [char]$_ }))
    Target = Join-Path $root 'desktop\paste-to-gas.cmd'
    Desc = 'Open deploy/apps-script-bundle after preview OK'
  },
  @{
    Name = '03 ' + (-join (0x505C, 0x6B62, 0x672C, 0x6A5F, 0x9810, 0x89BD | ForEach-Object { [char]$_ }))
    Target = Join-Path $root 'desktop\stop-preview.cmd'
    Desc = 'Stop preview server on port 5280'
  },
  @{
    Name = '04 ' + (-join (0x958B, 0x767C, 0x6A21, 0x5F0F | ForEach-Object { [char]$_ }))
    Target = Join-Path $root 'desktop\dev-hotreload.cmd'
    Desc = 'Vite dev hot reload (not GAS bundle)'
  },
  @{
    Name = -join (0x555F, 0x52D5, 0x9078, 0x55AE | ForEach-Object { [char]$_ })
    Target = Join-Path $root 'desktop\launcher-menu.cmd'
    Desc = 'Heina Suite launcher menu'
  }
)

if (-not (Test-Path $folderPath)) {
  New-Item -ItemType Directory -Path $folderPath | Out-Null
}

$shell = New-Object -ComObject WScript.Shell

foreach ($item in $launchers) {
  if (-not (Test-Path $item.Target)) {
    Write-Warning "Missing: $($item.Target)"
    continue
  }
  $lnkPath = Join-Path $folderPath ($item.Name + '.lnk')
  $sc = $shell.CreateShortcut($lnkPath)
  $sc.TargetPath = $item.Target
  $sc.WorkingDirectory = $root
  $sc.WindowStyle = 1
  $sc.Description = $item.Desc
  $sc.Save()
  Write-Host 'OK:' $lnkPath
}

# Desktop root: one-click open folder / menu
$rootMenuName = $folderName + ' ' + (-join (0x555F, 0x52D5, 0x5668 | ForEach-Object { [char]$_ }))
$rootMenuPath = Join-Path $desktop ($rootMenuName + '.lnk')
$rootSc = $shell.CreateShortcut($rootMenuPath)
$rootSc.TargetPath = Join-Path $root 'desktop\launcher-menu.cmd'
$rootSc.WorkingDirectory = $root
$rootSc.WindowStyle = 1
$rootSc.Description = 'Heina Suite desktop launcher menu'
$rootSc.Save()
Write-Host 'OK:' $rootMenuPath

# Remove legacy shortcuts on desktop root (same project, old names)
$legacyPatterns = @(
  ($folderName + ' ' + (-join (0x672C, 0x6A5F, 0x9810, 0x89BD | ForEach-Object { [char]$_ }))),
  ($folderName + ' ' + (-join (0x8CBC, 0x5230, 0x20, 0x41, 0x70, 0x70, 0x73, 0x20, 0x53, 0x63, 0x72, 0x69, 0x70, 0x74 | ForEach-Object { [char]$_ })))
)
foreach ($legacy in $legacyPatterns) {
  $legacyPath = Join-Path $desktop ($legacy + '.lnk')
  if (Test-Path $legacyPath) {
    Remove-Item $legacyPath -Force
    Write-Host 'Removed legacy:' $legacyPath
  }
}

Write-Host ''
Write-Host 'Desktop folder:' $folderPath
Write-Host 'Done.'
