param(
    [string]$Remote = "origin",
    [string]$SourceBranch = "ln-front",
    [string]$BackupBranch = "ln-front-backup-20260309"
)

$ErrorActionPreference = "Continue"

function Invoke-Git {
    param(
        [string[]]$GitArgs,
        [int[]]$AcceptExitCodes = @(0),
        [int]$MaxRetries = 3,
        [int]$RetryDelaySeconds = 2
    )

    for ($try = 1; $try -le $MaxRetries; $try++) {
        $output = & git @GitArgs 2>&1
        $exitCode = $LASTEXITCODE

        if ($AcceptExitCodes -contains $exitCode) {
            return [PSCustomObject]@{
                Output = $output
                ExitCode = $exitCode
            }
        }

        if ($try -lt $MaxRetries) {
            Start-Sleep -Seconds $RetryDelaySeconds
            continue
        }

        $outputText = ($output | Out-String).Trim()
        throw "Failed: git $($GitArgs -join ' ') (exit $exitCode). $outputText"
    }
}

Write-Host "[1/4] Fetching remote refs..."
Invoke-Git -GitArgs @("fetch", $Remote, "--prune") | Out-Null

$sourceRef = "$Remote/$SourceBranch"
$sourceShaResult = Invoke-Git -GitArgs @("rev-parse", $sourceRef)
$sourceSha = ($sourceShaResult.Output | Select-Object -First 1).Trim()

if (-not $sourceSha) {
    throw "Failed: source branch $sourceRef not found."
}

Write-Host "[2/4] Updating backup branch..."
$backupHeadResult = Invoke-Git -GitArgs @("ls-remote", "--heads", $Remote, $BackupBranch) -AcceptExitCodes @(0, 2)
$backupHeadLine = $backupHeadResult.Output | Select-Object -First 1

if ([string]::IsNullOrWhiteSpace($backupHeadLine)) {
    Invoke-Git -GitArgs @("push", $Remote, "${sourceRef}:refs/heads/${BackupBranch}") | Out-Null
}
else {
    Invoke-Git -GitArgs @("push", $Remote, "${sourceRef}:refs/heads/${BackupBranch}", "--force-with-lease=refs/heads/${BackupBranch}") | Out-Null
}

Write-Host "[3/4] Verifying remote SHAs..."
$sourceHeadLine = (Invoke-Git -GitArgs @("ls-remote", "--heads", $Remote, $SourceBranch)).Output | Select-Object -First 1
$backupHeadLineAfter = (Invoke-Git -GitArgs @("ls-remote", "--heads", $Remote, $BackupBranch)).Output | Select-Object -First 1

if ([string]::IsNullOrWhiteSpace($sourceHeadLine) -or [string]::IsNullOrWhiteSpace($backupHeadLineAfter)) {
    throw "Failed: cannot read remote head for source or backup branch."
}

$sourceRemoteSha = ($sourceHeadLine -split '\s+')[0]
$backupRemoteSha = ($backupHeadLineAfter -split '\s+')[0]

if ($sourceRemoteSha -ne $backupRemoteSha) {
    throw "Verification failed: $Remote/$SourceBranch=$sourceRemoteSha but $Remote/$BackupBranch=$backupRemoteSha"
}

Write-Host "[4/4] Done."
Write-Host "Source branch : $Remote/$SourceBranch"
Write-Host "Backup branch : $Remote/$BackupBranch"
Write-Host "Matched SHA   : $sourceRemoteSha"
