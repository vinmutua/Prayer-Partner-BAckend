# Prayer Partners API Test Script
Write-Host "Starting Prayer Partners API Tests..." -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"
$adminEmail = "admin@example.com"
$adminPassword = "SecurePassword123!"
$testUserEmail = "testuser@example.com"
$testUserPassword = "Password123!"

# Helper function to make API requests
function Invoke-APIRequest {
    param (
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$Token = "",
        [switch]$IgnoreErrors
    )

    $uri = "$baseUrl/$Endpoint"
    $headers = @{}

    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $params = @{
        Method = $Method
        Uri = $uri
        ContentType = "application/json"
        Headers = $headers
    }

    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json)
    }

    try {
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        if (-not $IgnoreErrors) {
            Write-Host "Error calling $Method $uri" -ForegroundColor Red
            Write-Host "Status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
            Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        return $null
    }
}

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Green
$healthCheck = Invoke-RestMethod -Uri "http://localhost:3000"
Write-Host "Health Check Response: $healthCheck" -ForegroundColor Yellow

# Test 2: Authentication
Write-Host "`n2. Testing Authentication Endpoints..." -ForegroundColor Green

# Test 2.1: Register a new test user (might fail if user already exists)
Write-Host "`n2.1 Registering a new test user..." -ForegroundColor Yellow
$registerBody = @{
    email = $testUserEmail
    password = $testUserPassword
    firstName = "Test"
    lastName = "User"
}
$registerResponse = Invoke-APIRequest -Method "POST" -Endpoint "auth/register" -Body $registerBody -IgnoreErrors
if ($registerResponse) {
    Write-Host "User registration successful" -ForegroundColor Green
} else {
    Write-Host "User might already exist, proceeding with login" -ForegroundColor Yellow
}

# Test 2.2: Login as admin
Write-Host "`n2.2 Logging in as admin..." -ForegroundColor Yellow
$adminLoginBody = @{
    email = $adminEmail
    password = $adminPassword
}
$adminLoginResponse = Invoke-APIRequest -Method "POST" -Endpoint "auth/login" -Body $adminLoginBody
if ($adminLoginResponse) {
    $adminToken = $adminLoginResponse.data.token
    $adminRefreshToken = $adminLoginResponse.data.refreshToken
    Write-Host "Admin login successful" -ForegroundColor Green
} else {
    Write-Host "Admin login failed, cannot proceed with tests" -ForegroundColor Red
    exit
}

# Test 2.3: Login as regular user
Write-Host "`n2.3 Logging in as regular user..." -ForegroundColor Yellow
$userLoginBody = @{
    email = $testUserEmail
    password = $testUserPassword
}
$userLoginResponse = Invoke-APIRequest -Method "POST" -Endpoint "auth/login" -Body $userLoginBody
if ($userLoginResponse) {
    $userToken = $userLoginResponse.data.token
    $userRefreshToken = $userLoginResponse.data.refreshToken
    $userId = $userLoginResponse.data.user.id
    Write-Host "User login successful" -ForegroundColor Green
} else {
    Write-Host "User login failed, some tests may not work" -ForegroundColor Red
}

# Test 2.4: Get current user profile
Write-Host "`n2.4 Getting current user profile..." -ForegroundColor Yellow
$profileResponse = Invoke-APIRequest -Method "GET" -Endpoint "auth/me" -Token $adminToken
if ($profileResponse) {
    Write-Host "Profile retrieval successful" -ForegroundColor Green
} else {
    Write-Host "Profile retrieval failed" -ForegroundColor Red
}

# Test 2.5: Refresh token
Write-Host "`n2.5 Testing token refresh..." -ForegroundColor Yellow
$refreshBody = @{
    refreshToken = $adminRefreshToken
}
$refreshResponse = Invoke-APIRequest -Method "POST" -Endpoint "auth/refresh-token" -Body $refreshBody -Token $adminToken
if ($refreshResponse) {
    $adminToken = $refreshResponse.data.token
    Write-Host "Token refresh successful" -ForegroundColor Green
} else {
    Write-Host "Token refresh failed" -ForegroundColor Red
}

# Test 3: User Management
Write-Host "`n3. Testing User Management Endpoints..." -ForegroundColor Green

# Test 3.1: Get all users (admin only)
Write-Host "`n3.1 Getting all users..." -ForegroundColor Yellow
$allUsersResponse = Invoke-APIRequest -Method "GET" -Endpoint "users/all" -Token $adminToken
if ($allUsersResponse) {
    Write-Host "Retrieved all users successfully" -ForegroundColor Green
    Write-Host "Number of users: $($allUsersResponse.data.Count)" -ForegroundColor Yellow
} else {
    Write-Host "Failed to retrieve all users" -ForegroundColor Red
}

# Test 3.2: Get user by ID (admin only)
if ($userId) {
    Write-Host "`n3.2 Getting user by ID..." -ForegroundColor Yellow
    $userByIdResponse = Invoke-APIRequest -Method "GET" -Endpoint "users/$userId" -Token $adminToken
    if ($userByIdResponse) {
        Write-Host "Retrieved user by ID successfully" -ForegroundColor Green
    } else {
        Write-Host "Failed to retrieve user by ID" -ForegroundColor Red
    }
}

# Test 4: Prayer Themes
Write-Host "`n4. Testing Prayer Theme Endpoints..." -ForegroundColor Green

# Test 4.1: Get all themes
Write-Host "`n4.1 Getting all prayer themes..." -ForegroundColor Yellow
$themesResponse = Invoke-APIRequest -Method "GET" -Endpoint "themes" -Token $adminToken
if ($themesResponse) {
    Write-Host "Retrieved all themes successfully" -ForegroundColor Green
    Write-Host "Number of themes: $($themesResponse.data.Count)" -ForegroundColor Yellow
    $themeId = $themesResponse.data[0].id
} else {
    Write-Host "Failed to retrieve themes" -ForegroundColor Red
}

# Test 4.2: Create a new theme (admin only)
Write-Host "`n4.2 Creating a new prayer theme..." -ForegroundColor Yellow
$themeBody = @{
    title = "Test Theme $(Get-Date -Format 'yyyyMMddHHmmss')"
    description = "This is a test prayer theme created via API test script"
    active = $true
}
$createThemeResponse = Invoke-APIRequest -Method "POST" -Endpoint "themes" -Body $themeBody -Token $adminToken
if ($createThemeResponse) {
    Write-Host "Created new theme successfully" -ForegroundColor Green
    $newThemeId = $createThemeResponse.data.id
} else {
    Write-Host "Failed to create new theme" -ForegroundColor Red
}

# Test 5: Prayer Pairings
Write-Host "`n5. Testing Prayer Pairing Endpoints..." -ForegroundColor Green

# Test 5.1: Get current pairings (admin only)
Write-Host "`n5.1 Getting current prayer pairings..." -ForegroundColor Yellow
$pairingsResponse = Invoke-APIRequest -Method "GET" -Endpoint "pairings" -Token $adminToken
if ($pairingsResponse) {
    Write-Host "Retrieved current pairings successfully" -ForegroundColor Green
    Write-Host "Number of pairings: $($pairingsResponse.data.Count)" -ForegroundColor Yellow
} else {
    Write-Host "Failed to retrieve current pairings" -ForegroundColor Red
}

# Test 5.2: Get current partner (member)
if ($userToken) {
    Write-Host "`n5.2 Getting current prayer partner..." -ForegroundColor Yellow
    $partnerResponse = Invoke-APIRequest -Method "GET" -Endpoint "pairings/current-partner" -Token $userToken
    if ($partnerResponse) {
        Write-Host "Retrieved current partner successfully" -ForegroundColor Green
    } else {
        Write-Host "Failed to retrieve current partner (may not be paired yet)" -ForegroundColor Yellow
    }
}

# Test 5.3: Generate pairings (admin only)
if ($themeId) {
    Write-Host "`n5.3 Generating prayer pairings..." -ForegroundColor Yellow
    $generateBody = @{
        themeId = $themeId
        startDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        endDate = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
    $generateResponse = Invoke-APIRequest -Method "POST" -Endpoint "pairings/generate" -Body $generateBody -Token $adminToken
    if ($generateResponse) {
        Write-Host "Generated pairings successfully" -ForegroundColor Green
    } else {
        Write-Host "Failed to generate pairings" -ForegroundColor Red
    }
}

# Test 6: Prayer Requests
Write-Host "`n6. Testing Prayer Request Endpoints..." -ForegroundColor Green

# Test 6.1: Create a prayer request
if ($userToken) {
    Write-Host "`n6.1 Creating a prayer request..." -ForegroundColor Yellow
    $requestBody = @{
        content = "This is a test prayer request created via API test script"
        isSpecial = $false
    }
    $createRequestResponse = Invoke-APIRequest -Method "POST" -Endpoint "prayer-requests" -Body $requestBody -Token $userToken
    if ($createRequestResponse) {
        Write-Host "Created prayer request successfully" -ForegroundColor Green
        $requestId = $createRequestResponse.data.id
    } else {
        Write-Host "Failed to create prayer request" -ForegroundColor Red
    }
}

# Test 6.2: Get user's prayer requests
if ($userToken) {
    Write-Host "`n6.2 Getting user's prayer requests..." -ForegroundColor Yellow
    $userRequestsResponse = Invoke-APIRequest -Method "GET" -Endpoint "prayer-requests/my-requests" -Token $userToken
    if ($userRequestsResponse) {
        Write-Host "Retrieved user's prayer requests successfully" -ForegroundColor Green
        Write-Host "Number of requests: $($userRequestsResponse.data.Count)" -ForegroundColor Yellow
    } else {
        Write-Host "Failed to retrieve user's prayer requests" -ForegroundColor Red
    }
}

# Test 7: Email Functionality
Write-Host "`n7. Testing Email Functionality..." -ForegroundColor Green

# Test 7.1: Send partner emails (admin only)
Write-Host "`n7.1 Sending partner emails..." -ForegroundColor Yellow
$sendEmailsResponse = Invoke-APIRequest -Method "POST" -Endpoint "pairings/send-partner-emails" -Body @{} -Token $adminToken
if ($sendEmailsResponse) {
    Write-Host "Partner emails sent successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to send partner emails" -ForegroundColor Red
}

# Test 7.2: Send reminder emails (admin only)
Write-Host "`n7.2 Sending reminder emails..." -ForegroundColor Yellow
$sendRemindersResponse = Invoke-APIRequest -Method "POST" -Endpoint "pairings/send-reminder-emails" -Body @{} -Token $adminToken
if ($sendRemindersResponse) {
    Write-Host "Reminder emails sent successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to send reminder emails" -ForegroundColor Red
}

Write-Host "`nAPI Tests Completed!" -ForegroundColor Cyan
