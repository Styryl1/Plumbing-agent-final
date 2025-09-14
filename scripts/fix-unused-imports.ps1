# PowerShell script to fix unused useTranslations imports
# Direct approach: remove import if no useTranslations() calls found

Set-Location "C:\Users\styry\plumbing-agent"

# Get files with unused useTranslations imports
$lintOutput = pnpm -s lint 2>&1 | Out-String
$unusedFiles = $lintOutput -split "`n" | Where-Object { $_ -match "useTranslations.*is defined but never used" } | ForEach-Object {
    ($_ -split ":")[0].Trim()
} | Sort-Object -Unique

Write-Host "Found $($unusedFiles.Count) files with unused useTranslations imports"

foreach ($file in $unusedFiles) {
    if (Test-Path $file) {
        Write-Host "Processing: $file"
        $content = Get-Content $file -Raw

        # Check if file has useTranslations() calls
        if ($content -notmatch "useTranslations\(") {
            Write-Host "  No calls found - removing import"

            # Remove standalone useTranslations import
            $content = $content -replace 'import \{ useTranslations \} from "next-intl";\r?\n', ''

            # Remove from mixed imports (handle various patterns)
            $content = $content -replace 'import \{ useTranslations, ', 'import { '
            $content = $content -replace ', useTranslations \}', ' }'
            $content = $content -replace '\{ useTranslations, ([^}]+) \}', '{ $1 }'

            Set-Content $file $content -NoNewline
            Write-Host "  ✓ Fixed"
        } else {
            Write-Host "  ⚠ Has useTranslations() calls - skipping"
        }
    }
}

Write-Host "Cleanup complete"