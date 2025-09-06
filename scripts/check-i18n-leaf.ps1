# PowerShell script to detect non-leaf i18n key usage
# Flags usages like t('invoices') without a trailing segment that could cause hydration crashes

param(
    [string]$Path = "src",
    [switch]$Fix
)

Write-Host "🔍 Checking for non-leaf i18n key usage..." -ForegroundColor Cyan

$violations = @()

# Scan for problematic patterns
Get-ChildItem -Recurse -Include *.tsx,*.ts -Path $Path | Where-Object { 
    $_.FullName -notmatch '\[.*\]' 
} | ForEach-Object {
    $filePath = $_.FullName
    $relativePath = $_.FullName -replace [regex]::Escape((Get-Location).Path), "."
    
    try {
        # Read file content
        $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
        $lines = Get-Content $filePath -ErrorAction SilentlyContinue
        
        # Skip if content is null or empty
        if (-not $content) {
            return
        }
    } catch {
        Write-Warning "Could not read file: $filePath"
        return
    }
    
    # Pattern 1: t('invoices') - should be t('invoices.something')
    $matches = [regex]::Matches($content, "t\(\s*[`"`']invoices[`"`']\s*\)", [System.Text.RegularExpressions.RegexOptions]::Multiline)
    foreach ($match in $matches) {
        $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
        $line = $lines[$lineNumber - 1].Trim()
        
        $violations += [PSCustomObject]@{
            File = $relativePath
            Line = $lineNumber
            Content = $line
            Pattern = "t('invoices')"
            Issue = "Should use leaf key like t('invoices.title') or t('invoices.header.title')"
        }
    }
    
    # Pattern 2: t('jobs') without leaf - should be t('jobs.something')
    $matches = [regex]::Matches($content, "t\(\s*[`"`']jobs[`"`']\s*\)", [System.Text.RegularExpressions.RegexOptions]::Multiline)
    foreach ($match in $matches) {
        $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
        $line = $lines[$lineNumber - 1].Trim()
        
        $violations += [PSCustomObject]@{
            File = $relativePath
            Line = $lineNumber
            Content = $line
            Pattern = "t('jobs')"
            Issue = "Should use leaf key like t('jobs.title') or t('jobs.calendar.title')"
        }
    }
    
    # Pattern 3: t('customers') without leaf
    $matches = [regex]::Matches($content, "t\(\s*[`"`']customers[`"`']\s*\)", [System.Text.RegularExpressions.RegexOptions]::Multiline)
    foreach ($match in $matches) {
        $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
        $line = $lines[$lineNumber - 1].Trim()
        
        $violations += [PSCustomObject]@{
            File = $relativePath
            Line = $lineNumber
            Content = $line
            Pattern = "t('customers')"
            Issue = "Should use leaf key like t('customers.title') or t('customers.list.header')"
        }
    }
    
    # Pattern 4: Any other single-segment keys that might be problematic
    $matches = [regex]::Matches($content, "t\(\s*[`"`']([a-zA-Z]+)[`"`']\s*\)", [System.Text.RegularExpressions.RegexOptions]::Multiline)
    foreach ($match in $matches) {
        $key = $match.Groups[1].Value
        # Skip known leaf keys or very short keys
        if ($key -in @("save", "cancel", "edit", "delete", "create", "update", "loading", "error", "success", "yes", "no")) {
            continue
        }
        
        # Only flag if it looks like a section name that should have children
        if ($key -in @("dashboard", "settings", "profile", "auth", "navigation", "forms", "tables", "modals")) {
            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
            $line = $lines[$lineNumber - 1].Trim()
            
            $violations += [PSCustomObject]@{
                File = $relativePath
                Line = $lineNumber
                Content = $line
                Pattern = "t('$key')"
                Issue = "Potential non-leaf key - consider using t('$key.something')"
            }
        }
    }
}

# Report results
if ($violations.Count -eq 0) {
    Write-Host "✅ No non-leaf i18n key violations found!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Found $($violations.Count) potential non-leaf key violations:" -ForegroundColor Red
    Write-Host ""
    
    $violations | ForEach-Object {
        Write-Host "$($_.File):$($_.Line)" -ForegroundColor Yellow
        Write-Host "  Pattern: $($_.Pattern)" -ForegroundColor Red
        Write-Host "  Issue: $($_.Issue)" -ForegroundColor Gray
        Write-Host "  Code: $($_.Content)" -ForegroundColor White
        Write-Host ""
    }
    
    if ($Fix) {
        Write-Host "🔧 Fix mode not implemented - please manually update the keys to use leaf patterns" -ForegroundColor Yellow
    } else {
        Write-Host "💡 Run with -Fix to attempt automatic fixes (not yet implemented)" -ForegroundColor Cyan
    }
    
    exit 1
}