[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Get-Command tesserae -ErrorAction Stop | Out-Null

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tesseraeDirectory = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot '.tesserae'))
$generatedTargets = @(
    (Join-Path $tesseraeDirectory 'graph.json'),
    (Join-Path $tesseraeDirectory 'code-graph.json')
)

foreach ($target in $generatedTargets) {
    $fullTarget = [System.IO.Path]::GetFullPath($target)
    $targetDirectory = [System.IO.Path]::GetDirectoryName($fullTarget)

    if ($targetDirectory -ne $tesseraeDirectory) {
        throw "Refusing to remove a path outside the Tesserae directory: $fullTarget"
    }

    Remove-Item -LiteralPath $fullTarget -Force -ErrorAction SilentlyContinue
}

$previousPythonUtf8 = [Environment]::GetEnvironmentVariable('PYTHONUTF8', 'Process')
$previousPythonIoEncoding = [Environment]::GetEnvironmentVariable('PYTHONIOENCODING', 'Process')

try {
    [Environment]::SetEnvironmentVariable('PYTHONUTF8', '1', 'Process')
    [Environment]::SetEnvironmentVariable('PYTHONIOENCODING', 'utf-8', 'Process')

    Push-Location -LiteralPath $repositoryRoot
    try {
        & tesserae refresh
        $refreshExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}
finally {
    [Environment]::SetEnvironmentVariable('PYTHONUTF8', $previousPythonUtf8, 'Process')
    [Environment]::SetEnvironmentVariable('PYTHONIOENCODING', $previousPythonIoEncoding, 'Process')
}

if ($refreshExitCode -ne 0) {
    throw "Tesserae refresh failed with exit code $refreshExitCode"
}
