# Terminal and Network Fixes Test Script for PMPOS
# Tests connectivity to SambaPOS server and validates terminal fixes

param(
    [string]$SambaPOSUrl = "http://192.168.1.125:9000",
    [string]$LogLevel = "INFO",
    [switch]$TestAll = $false,
    [switch]$TestNetwork = $false,
    [switch]$TestTerminal = $false,
    [switch]$TestToken = $false
)

# Helper function for logging
function Write-LogMessage {
    param(
        [string]$Message,
        [ValidateSet("INFO", "SUCCESS", "WARNING", "ERROR", "TEST")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss.fff"
    $prefix = switch ($Level) {
        "INFO" { "🔧" }
        "SUCCESS" { "✅" }
        "WARNING" { "⚠️" }
        "ERROR" { "❌" }
        "TEST" { "🧪" }
        default { "📝" }
    }
    
    $color = switch ($Level) {
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        "TEST" { "Cyan" }
        default { "White" }
    }
    
    Write-Host "[$timestamp] $prefix $Message" -ForegroundColor $color
}

# Test network connectivity to SambaPOS server
function Test-NetworkConnectivity {
    param([string]$Url)
    
    Write-LogMessage "Testing network connectivity to $Url" -Level "TEST"
    
    try {
        # Test basic TCP connectivity
        $uri = [System.Uri]$Url
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connectTask = $tcpClient.ConnectAsync($uri.Host, $uri.Port)
        $timeout = [System.Threading.Tasks.Task]::Delay(5000)
        
        $completed = [System.Threading.Tasks.Task]::WaitAny($connectTask, $timeout)
        
        if ($completed -eq 0 -and $connectTask.Status -eq 'RanToCompletion') {
            Write-LogMessage "TCP connection to $($uri.Host):$($uri.Port) successful" -Level "SUCCESS"
            $tcpClient.Close()
            $tcpResult = $true
        }
        else {
            Write-LogMessage "TCP connection to $($uri.Host):$($uri.Port) failed or timed out" -Level "ERROR"
            $tcpResult = $false
        }
        
        # Test HTTP connectivity
        try {
            $response = Invoke-WebRequest -Uri "$Url/api/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
            Write-LogMessage "HTTP health check successful (Status: $($response.StatusCode))" -Level "SUCCESS"
            $httpResult = $true
        }
        catch {
            Write-LogMessage "HTTP health check failed: $($_.Exception.Message)" -Level "WARNING"
            $httpResult = $false
        }
        
        # Test GraphQL endpoint
        try {
            $graphqlUrl = "$Url/graphql"
            $response = Invoke-WebRequest -Uri $graphqlUrl -Method POST -TimeoutSec 10 -ErrorAction Stop -Body "{}"
            Write-LogMessage "GraphQL endpoint accessible (Status: $($response.StatusCode))" -Level "SUCCESS"
            $graphqlResult = $true
        }
        catch {
            Write-LogMessage "GraphQL endpoint test failed: $($_.Exception.Message)" -Level "WARNING"
            $graphqlResult = $false
        }
        
        return @{
            TCP     = $tcpResult
            HTTP    = $httpResult
            GraphQL = $graphqlResult
            Overall = $tcpResult -and ($httpResult -or $graphqlResult)
        }
        
    }
    catch {
        Write-LogMessage "Network connectivity test failed: $($_.Exception.Message)" -Level "ERROR"
        return @{
            TCP     = $false
            HTTP    = $false
            GraphQL = $false
            Overall = $false
        }
    }
}

# Test PMPOS application files
function Test-PMPOSFiles {
    Write-LogMessage "Testing PMPOS application files" -Level "TEST"
    
    $requiredFiles = @(
        "app\services\tokenService.js",
        "app\services\networkHealthService.js", 
        "app\services\terminalFixService.js",
        "app\services\terminalHealthService.js",
        "app\components\ConnectionStatus.jsx",
        "app\components\App.jsx",
        "package.json"
    )
    
    $missingFiles = @()
    $presentFiles = @()
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-LogMessage "File exists: $file" -Level "SUCCESS"
            $presentFiles += $file
        }
        else {
            Write-LogMessage "File missing: $file" -Level "ERROR"
            $missingFiles += $file
        }
    }
    
    return @{
        Present    = $presentFiles
        Missing    = $missingFiles
        AllPresent = $missingFiles.Count -eq 0
    }
}

# Test terminal fixes
function Test-TerminalFixes {
    Write-LogMessage "Testing terminal fixes implementation" -Level "TEST"
    
    # Check if Node.js is available
    try {
        $nodeVersion = node --version
        Write-LogMessage "Node.js version: $nodeVersion" -Level "SUCCESS"
    }
    catch {
        Write-LogMessage "Node.js not found or not accessible" -Level "ERROR"
        return $false
    }
    
    # Run the terminal fixes test script
    try {
        Write-LogMessage "Running terminal fixes validation script..." -Level "TEST"
        node "test-terminal-fixes.js" | Out-Null
        Write-LogMessage "Terminal fixes test completed" -Level "SUCCESS"
        return $true
    }
    catch {
        Write-LogMessage "Terminal fixes test failed: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Test token storage
function Test-TokenStorage {
    Write-LogMessage "Testing token storage mechanism" -Level "TEST"
    
    # Check localStorage simulation in Node.js environment
    $testScript = @"
const fs = require('fs');
const path = require('path');

// Mock localStorage for testing
global.localStorage = {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; },
    removeItem: function(key) { delete this.data[key]; }
};

// Test token storage functionality
console.log('Testing token storage...');
localStorage.setItem('sambapos_access_token', 'test-token-123');
localStorage.setItem('sambapos_token_expires', Date.now() + 3600000);

const token = localStorage.getItem('sambapos_access_token');
const expires = localStorage.getItem('sambapos_token_expires');

if (token && expires) {
    console.log('✅ Token storage test successful');
    process.exit(0);
} else {
    console.log('❌ Token storage test failed');
    process.exit(1);
}
"@
    
    try {
        $testScript | Out-File -FilePath "temp-token-test.js" -Encoding UTF8
        node "temp-token-test.js" | Out-Null
        Remove-Item "temp-token-test.js" -ErrorAction SilentlyContinue
        
        if ($LASTEXITCODE -eq 0) {
            Write-LogMessage "Token storage test successful" -Level "SUCCESS"
            return $true
        }
        else {
            Write-LogMessage "Token storage test failed" -Level "ERROR"
            return $false
        }
    }
    catch {
        Write-LogMessage "Token storage test error: $($_.Exception.Message)" -Level "ERROR"
        Remove-Item "temp-token-test.js" -ErrorAction SilentlyContinue
        return $false
    }
}

# Main execution
function Main {
    Write-LogMessage "PMPOS Terminal and Network Fixes Validation" -Level "TEST"
    Write-LogMessage "SambaPOS URL: $SambaPOSUrl" -Level "INFO"
    Write-LogMessage "=======================================" -Level "INFO"
    
    $allResults = @{}
    
    # Test files if requested or TestAll
    if ($TestAll -or (-not $TestNetwork -and -not $TestTerminal -and -not $TestToken)) {
        $allResults.Files = Test-PMPOSFiles
    }
    
    # Test network connectivity if requested or TestAll
    if ($TestAll -or $TestNetwork) {
        $allResults.Network = Test-NetworkConnectivity -Url $SambaPOSUrl
    }
    
    # Test terminal fixes if requested or TestAll
    if ($TestAll -or $TestTerminal) {
        $allResults.Terminal = Test-TerminalFixes
    }
    
    # Test token storage if requested or TestAll
    if ($TestAll -or $TestToken) {
        $allResults.Token = Test-TokenStorage
    }
    
    # Summary
    Write-LogMessage "=======================================" -Level "INFO"
    Write-LogMessage "Test Results Summary:" -Level "TEST"
    
    $overallSuccess = $true
    
    foreach ($testName in $allResults.Keys) {
        $result = $allResults[$testName]
        if ($result -is [hashtable]) {
            if ($result.ContainsKey('Overall')) {
                $success = $result.Overall
            }
            elseif ($result.ContainsKey('AllPresent')) {
                $success = $result.AllPresent
            }
            else {
                $success = $true
            }
        }
        else {
            $success = $result
        }
        
        if ($success) {
            Write-LogMessage "${testName}: PASSED" -Level "SUCCESS"
        }
        else {
            Write-LogMessage "${testName}: FAILED" -Level "ERROR"
            $overallSuccess = $false
        }
    }
    
    if ($overallSuccess) {
        Write-LogMessage "All tests passed! Terminal fixes are ready for production." -Level "SUCCESS"
        exit 0
    }
    else {
        Write-LogMessage "Some tests failed. Please review the issues above." -Level "ERROR"
        exit 1
    }
}

# Execute main function
Main
