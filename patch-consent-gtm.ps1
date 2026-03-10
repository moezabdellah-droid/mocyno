param(
    [string]$Root = "public",
    [string]$Stamp = "20260310-2100",
    [switch]$DryRun,
    [switch]$ShowDiff = $true
)

$ErrorActionPreference = "Stop"

$ConsentTag = '<script defer src="/consent-ga.js"></script>'

$GtmBlockRegex = '(?is)<script\b[^>]*>.*?GTM-N4MSSMV3.*?</script>|<script\b[^>]*src=["'']https://www\.googletagmanager\.com/gtm\.js\?id=GTM-N4MSSMV3["''][^>]*></script>'

$ConsentRegex = '<script\s+defer\s+src="/consent-ga\.js"></script>'

function Get-FileEncoding {
    param([byte[]]$Bytes)

    if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) {
        return [System.Text.UTF8Encoding]::new($true)
    }
    elseif ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE) {
        return [System.Text.UnicodeEncoding]::new($false, $true)
    }
    elseif ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFE -and $Bytes[1] -eq 0xFF) {
        return [System.Text.UnicodeEncoding]::new($true, $true)
    }
    else {
        return [System.Text.UTF8Encoding]::new($false)
    }
}

function Read-TextFilePreserveEncoding {
    param([string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $encoding = Get-FileEncoding -Bytes $bytes
    $text = $encoding.GetString($bytes)

    return [pscustomobject]@{
        Text     = $text
        Encoding = $encoding
        Bytes    = $bytes
    }
}

function Get-Newline {
    param([string]$Text)

    if ($Text -match "`r`n") { return "`r`n" }
    elseif ($Text -match "`n") { return "`n" }
    else { return [Environment]::NewLine }
}

function Show-ConsoleDiff {
    param(
        [string]$Path,
        [string]$OldText,
        [string]$NewText
    )

    Write-Host ""
    Write-Host "===== DIFF: $Path =====" -ForegroundColor Cyan

    $oldLines = $OldText -split "`r?`n", 0, "SimpleMatch"
    $newLines = $NewText -split "`r?`n", 0, "SimpleMatch"

    $diff = Compare-Object -ReferenceObject $oldLines -DifferenceObject $newLines -IncludeEqual:$false
    if (-not $diff) {
        Write-Host "(aucune difference visible)" -ForegroundColor DarkGray
        return
    }

    foreach ($d in $diff) {
        if ($d.SideIndicator -eq "<=") {
            Write-Host ("- " + $d.InputObject) -ForegroundColor Red
        }
        elseif ($d.SideIndicator -eq "=>") {
            Write-Host ("+ " + $d.InputObject) -ForegroundColor Green
        }
    }
}

function Test-Order {
    param([string]$Text)

    $lines = $Text -split "`r?`n"
    $consentLine = ($lines | Select-String 'consent-ga\.js' | Select-Object -First 1).LineNumber
    $gtmLine = ($lines | Select-String 'GTM-N4MSSMV3' | Select-Object -First 1).LineNumber

    return [pscustomobject]@{
        ConsentLine = $consentLine
        GTMLine     = $gtmLine
        OK          = ($consentLine -and $gtmLine -and ($consentLine -lt $gtmLine))
    }
}

$files = Get-ChildItem -Path $Root -Recurse -File -Include *.html |
    Where-Object {
        Select-String -Path $_.FullName -Pattern 'GTM-N4MSSMV3' -Quiet
    } |
    Sort-Object FullName

$results = New-Object System.Collections.Generic.List[object]

foreach ($file in $files) {
    $path = $file.FullName
    $loaded = Read-TextFilePreserveEncoding -Path $path
    $original = $loaded.Text
    $encoding = $loaded.Encoding
    $newline = Get-Newline -Text $original

    $gtmMatch = [regex]::Match($original, $GtmBlockRegex)
    if (-not $gtmMatch.Success) {
        $results.Add([pscustomobject]@{
            File   = $path
            Status = "SKIP"
            Detail = "Bloc GTM introuvable proprement"
        })
        continue
    }

    $consentMatches = [regex]::Matches($original, $ConsentRegex, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $hasConsent = $consentMatches.Count -gt 0

    $initialCheck = Test-Order -Text $original

    if (-not $hasConsent) {
        $initialStatus = "MANQUANT"
    }
    elseif ($initialCheck.OK) {
        $initialStatus = "CONFORME"
    }
    else {
        $initialStatus = "ORDRE_INCORRECT"
    }

    $patched = $original
    $patchAction = "aucune action"

    if ($initialStatus -eq "MANQUANT") {
        $patched = $patched.Insert($gtmMatch.Index, $ConsentTag + $newline)
        $patchAction = "Insertion de consent-ga.js avant GTM"
    }
    elseif ($initialStatus -eq "ORDRE_INCORRECT") {
        $withoutConsent = [regex]::Replace(
            $patched,
            $ConsentRegex,
            '',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )

        $gtmMatch2 = [regex]::Match($withoutConsent, $GtmBlockRegex)
        if (-not $gtmMatch2.Success) {
            $results.Add([pscustomobject]@{
                File   = $path
                Status = "SKIP"
                Detail = "Bloc GTM introuvable apres retrait consent-ga.js"
            })
            continue
        }

        $patched = $withoutConsent.Insert($gtmMatch2.Index, $ConsentTag + $newline)
        $patchAction = "Deplacement de consent-ga.js avant GTM"
    }

    $patched = [regex]::Replace($patched, "($newline){3,}", "$newline$newline")

    $finalCheck = Test-Order -Text $patched
    if (-not $finalCheck.OK) {
        $results.Add([pscustomobject]@{
            File   = $path
            Status = "ERROR"
            Detail = "Ordre final invalide"
        })
        continue
    }

    $changed = ($patched -ne $original)

    if ($ShowDiff -and $changed) {
        Show-ConsoleDiff -Path $path -OldText $original -NewText $patched
    }

    if ($changed -and -not $DryRun) {
        $backup = "$path.bak-$Stamp"
        if (-not (Test-Path $backup)) {
            Copy-Item -Path $path -Destination $backup
        }

        [System.IO.File]::WriteAllText($path, $patched, $encoding)
    }

    if ($initialStatus -eq "CONFORME") {
        $results.Add([pscustomobject]@{
            File   = $path
            Status = "CONFORME"
            Detail = "Deja correct"
        })
    }
    elseif ($changed) {
        $results.Add([pscustomobject]@{
            File   = $path
            Status = $(if ($DryRun) { "DRYRUN_$initialStatus" } else { "PATCHED_$initialStatus" })
            Detail = $patchAction
        })
    }
    else {
        $results.Add([pscustomobject]@{
            File   = $path
            Status = "SKIP"
            Detail = "Aucun changement utile"
        })
    }
}

Write-Host ""
Write-Host "===== RECAPITULATIF =====" -ForegroundColor Yellow
$results | Sort-Object Status, File | Format-Table -AutoSize

Write-Host ""
Write-Host "===== STATS =====" -ForegroundColor Yellow
$results |
    Group-Object Status |
    Sort-Object Name |
    Select-Object Name, Count |
    Format-Table -AutoSize

Write-Host ""
Write-Host "===== VALIDATION FINALE =====" -ForegroundColor Yellow
Get-ChildItem -Path $Root -Recurse -File -Include *.html |
Where-Object { Select-String -Path $_.FullName -Pattern 'GTM-N4MSSMV3' -Quiet } |
ForEach-Object {
    $txt = (Read-TextFilePreserveEncoding -Path $_.FullName).Text
    $check = Test-Order -Text $txt
    [pscustomobject]@{
        File        = $_.FullName.Replace((Resolve-Path $Root).Path + "\", "")
        ConsentLine = $check.ConsentLine
        GTMLine     = $check.GTMLine
        OK          = $check.OK
    }
} | Format-Table -AutoSize
