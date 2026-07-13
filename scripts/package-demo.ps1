$ErrorActionPreference = "Stop"

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $root "release"))
$packageRoot = [IO.Path]::GetFullPath((Join-Path $releaseRoot "masari-hackathon-demo"))
$zipPath = [IO.Path]::GetFullPath((Join-Path $releaseRoot "masari-hackathon-demo.zip"))

if (-not $packageRoot.StartsWith($releaseRoot + [IO.Path]::DirectorySeparatorChar)) {
  throw "Refusing to package outside the release directory."
}

$freezeCommit = (git -C $root rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $freezeCommit -notmatch "^[0-9a-f]{40}$") {
  throw "Could not resolve the freeze commit."
}

if (Test-Path -LiteralPath $packageRoot) {
  Remove-Item -LiteralPath $packageRoot -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $packageRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "screenshots") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "environment") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "checksums") | Out-Null

$documents = @(
  "DEMO_RUNBOOK.md",
  "JUDGE_SCRIPT.md",
  "PROJECT_MAP.md",
  "README_DEMO_START.md",
  "RELEASE_NOTES.md",
  "BACKUP_DEMO.md"
)
foreach ($document in $documents) {
  Copy-Item -LiteralPath (Join-Path $root $document) -Destination (Join-Path $packageRoot $document)
}

$packagedNotesPath = Join-Path $packageRoot "RELEASE_NOTES.md"
$packagedNotes = Get-Content -LiteralPath $packagedNotesPath -Raw
$packagedNotes = $packagedNotes.Replace(
  "- Final Git reference: annotated tag **``v0.1.0-hackathon``** (the packaged copy resolves this to the tag's commit SHA)",
  "- Final Git reference: annotated tag **``v0.1.0-hackathon``**`r`n- Final Git commit: ``$freezeCommit``"
)
Set-Content -LiteralPath $packagedNotesPath -Value $packagedNotes -Encoding utf8NoBOM

$packagedBackupPath = Join-Path $packageRoot "BACKUP_DEMO.md"
$packagedBackup = (Get-Content -LiteralPath $packagedBackupPath -Raw).Replace(
  "docs/demo/screenshots/",
  "screenshots/"
)
Set-Content -LiteralPath $packagedBackupPath -Value $packagedBackup -Encoding utf8NoBOM

$apkSource = Join-Path $root "apps/mobile/build/app/outputs/flutter-apk/app-debug.apk"
if (-not (Test-Path -LiteralPath $apkSource)) {
  throw "Debug APK is missing."
}
Copy-Item -LiteralPath $apkSource -Destination (Join-Path $packageRoot "app-debug.apk")
Copy-Item -Path (Join-Path $root "docs/demo/screenshots/*.png") -Destination (Join-Path $packageRoot "screenshots")
Copy-Item -LiteralPath (Join-Path $root "apps/api/.env.example") -Destination (Join-Path $packageRoot "environment/api.env.example")
Copy-Item -LiteralPath (Join-Path $root "apps/admin/.env.example") -Destination (Join-Path $packageRoot "environment/admin.env.example")

$environmentReadme = @"
# Safe environment templates

These are placeholder templates only. They contain no judge-machine database password, JWT secret, or demo reset key.

- Copy values into local process environment variables.
- Never save the completed secret-bearing file in this package.
- The Android APK is already configured for http://10.0.2.2:3000.
"@
Set-Content -LiteralPath (Join-Path $packageRoot "environment/README.md") -Value $environmentReadme -Encoding utf8NoBOM

$apkHash = (Get-FileHash -LiteralPath (Join-Path $packageRoot "app-debug.apk") -Algorithm SHA256).Hash
Set-Content -LiteralPath (Join-Path $packageRoot "APK_SHA256.txt") -Value "$apkHash  app-debug.apk" -Encoding ascii
Set-Content -LiteralPath (Join-Path $packageRoot "checksums/RELEASE_COMMIT.txt") -Value $freezeCommit -Encoding ascii

$checksumPath = Join-Path $packageRoot "checksums/SHA256SUMS.txt"
$checksumLines = Get-ChildItem -LiteralPath $packageRoot -File -Recurse |
  Where-Object { $_.FullName -ne $checksumPath } |
  Sort-Object FullName |
  ForEach-Object {
    $relative = [IO.Path]::GetRelativePath($packageRoot, $_.FullName).Replace("\", "/")
    "$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)  $relative"
  }
Set-Content -LiteralPath $checksumPath -Value $checksumLines -Encoding ascii

Compress-Archive -LiteralPath $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entries = $zip.Entries.FullName
  foreach ($required in @(
    "masari-hackathon-demo/app-debug.apk",
    "masari-hackathon-demo/APK_SHA256.txt",
    "masari-hackathon-demo/DEMO_RUNBOOK.md",
    "masari-hackathon-demo/JUDGE_SCRIPT.md",
    "masari-hackathon-demo/BACKUP_DEMO.md",
    "masari-hackathon-demo/PROJECT_MAP.md",
    "masari-hackathon-demo/README_DEMO_START.md",
    "masari-hackathon-demo/RELEASE_NOTES.md",
    "masari-hackathon-demo/checksums/SHA256SUMS.txt"
  )) {
    if ($entries -notcontains $required) {
      throw "ZIP is missing $required"
    }
  }
} finally {
  $zip.Dispose()
}

[pscustomobject]@{
  package = $packageRoot
  zip = $zipPath
  freezeCommit = $freezeCommit
  apkSha256 = $apkHash
  zipSha256 = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
  fileCount = (Get-ChildItem -LiteralPath $packageRoot -File -Recurse).Count
  zipEntries = $entries.Count
} | ConvertTo-Json -Compress
