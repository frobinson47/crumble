<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../config/env.php';

/**
 * URL-safe base64 encode (no +/= characters that break in URLs).
 */
function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * URL-safe base64 decode.
 */
function base64url_decode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/'));
}

class OAuthController
{
    private string $clientId;
    private string $clientSecret;
    private string $providerUrl;
    private string $redirectUri;

    public function __construct()
    {
        $this->clientId = env('OAUTH2_CLIENT_ID', '');
        $this->clientSecret = env('OAUTH2_CLIENT_SECRET', '');
        $this->providerUrl = rtrim(env('OAUTH2_PROVIDER_URL', ''), '/');

        // Build redirect URI — prefer explicit config, fall back to request headers
        $appUrl = env('APP_URL', '');
        if ($appUrl) {
            $this->redirectUri = rtrim($appUrl, '/') . '/api/auth/oauth/callback';
        } else {
            $scheme = (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']))
                ? $_SERVER['HTTP_X_FORWARDED_PROTO']
                : ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');
            $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost';
            $this->redirectUri = $scheme . '://' . $host . '/api/auth/oauth/callback';
        }
    }

    /**
     * GET /auth/oauth/redirect
     * Redirects the user to Authentik's authorization page.
     */
    public function redirect(): never
    {
        // Build a self-validating state parameter using HMAC.
        // This avoids depending on PHP session persistence across the
        // cross-site redirect through Authentik.
        $nonce = bin2hex(random_bytes(16));
        $timestamp = time();
        $payload = $nonce . '|' . $timestamp;
        $signature = hash_hmac('sha256', $payload, $this->clientSecret);
        $state = base64url_encode($payload . '|' . $signature);

        $params = http_build_query([
            'response_type' => 'code',
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'scope' => 'openid profile email',
            'state' => $state,
        ]);

        $authorizeUrl = $this->providerUrl . '/application/o/authorize/?' . $params;

        header('Location: ' . $authorizeUrl);
        exit;
    }

    /**
     * GET /auth/oauth/callback
     * Handles the return from Authentik after user authorization.
     */
    public function callback(): never
    {
        // Verify HMAC-signed state parameter
        $stateRaw = base64url_decode($_GET['state'] ?? '');
        $parts = explode('|', $stateRaw);

        if (count($parts) !== 3) {
            $this->redirectWithError('Invalid OAuth2 state. Please try again.');
            exit;
        }

        [$nonce, $timestamp, $signature] = $parts;
        $payload = $nonce . '|' . $timestamp;
        $expectedSig = hash_hmac('sha256', $payload, $this->clientSecret);

        if (!hash_equals($expectedSig, $signature)) {
            $this->redirectWithError('Invalid OAuth2 state. Please try again.');
            exit;
        }

        // Reject states older than 5 minutes
        if (time() - (int) $timestamp > 300) {
            $this->redirectWithError('Login request expired. Please try again.');
            exit;
        }

        // Check for errors from provider
        if (!empty($_GET['error'])) {
            $errorDesc = $_GET['error_description'] ?? $_GET['error'];
            $this->redirectWithError($errorDesc);
            exit;
        }

        $code = $_GET['code'] ?? '';
        if (empty($code)) {
            $this->redirectWithError('No authorization code received.');
            exit;
        }

        // Exchange code for tokens
        $tokenData = $this->exchangeCode($code);
        if (!$tokenData || !empty($tokenData['error'])) {
            $errorMsg = $tokenData['error_description'] ?? $tokenData['error'] ?? 'Token exchange failed.';
            error_log('Cookslate OAuth2 token error: ' . $errorMsg);
            $this->redirectWithError('Authentication failed. Please try again.');
            exit;
        }

        $accessToken = $tokenData['access_token'] ?? '';
        if (empty($accessToken)) {
            $this->redirectWithError('No access token received.');
            exit;
        }

        // Fetch user info from Authentik
        $userInfo = $this->fetchUserInfo($accessToken);
        if (!$userInfo || !empty($userInfo['error'])) {
            error_log('Cookslate OAuth2 userinfo error: ' . json_encode($userInfo));
            $this->redirectWithError('Failed to retrieve user information.');
            exit;
        }

        // Find or create local user
        $username = $userInfo['preferred_username'] ?? $userInfo['sub'] ?? null;
        $email = $userInfo['email'] ?? null;

        if (empty($username)) {
            $this->redirectWithError('No username received from provider.');
            exit;
        }

        $userModel = new User();
        $user = $userModel->findByUsername($username);

        if (!$user) {
            // Auto-create user — password is random since auth is via SSO
            $user = $userModel->create($username, bin2hex(random_bytes(32)), 'member', $email);
        } elseif ($email && empty($user['email'])) {
            // Update email if user exists but has no email
            $userModel->update($user['id'], $email, $user['role']);
        }

        // Set session (same as normal login)
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['is_demo'] = false;

        // Redirect to frontend
        header('Location: /');
        exit;
    }

    /**
     * GET /auth/sso-config
     * Returns whether SSO is enabled (for frontend to conditionally show button).
     */
    public function config(): array
    {
        return [
            'enabled' => !empty($this->clientId) && !empty($this->providerUrl),
        ];
    }

    /**
     * Exchange authorization code for tokens.
     */
    private function exchangeCode(string $code): ?array
    {
        $tokenUrl = $this->providerUrl . '/application/o/token/';

        $postFields = http_build_query([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUri,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
        ]);

        return $this->curlPost($tokenUrl, $postFields);
    }

    /**
     * Fetch user info from the OIDC userinfo endpoint.
     */
    private function fetchUserInfo(string $accessToken): ?array
    {
        $userInfoUrl = $this->providerUrl . '/application/o/userinfo/';

        $ch = curl_init($userInfoUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken],
            CURLOPT_TIMEOUT => 10,
        ]);

        $caBundle = getCaBundlePath();
        if ($caBundle) {
            curl_setopt($ch, CURLOPT_CAINFO, $caBundle);
        }

        $response = curl_exec($ch);
        if (curl_errno($ch)) {
            error_log('Cookslate OAuth2 userinfo curl error: ' . curl_error($ch));
            curl_close($ch);
            return null;
        }
        curl_close($ch);

        return json_decode($response, true);
    }

    /**
     * POST request with form-encoded body.
     */
    private function curlPost(string $url, string $postFields): ?array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postFields,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT => 10,
        ]);

        $caBundle = getCaBundlePath();
        if ($caBundle) {
            curl_setopt($ch, CURLOPT_CAINFO, $caBundle);
        }

        $response = curl_exec($ch);
        if (curl_errno($ch)) {
            error_log('Cookslate OAuth2 curl error: ' . curl_error($ch));
            curl_close($ch);
            return null;
        }
        curl_close($ch);

        return json_decode($response, true);
    }

    /**
     * Redirect to frontend login page with an error message.
     */
    private function redirectWithError(string $message): void
    {
        header('Location: /login?error=' . urlencode($message));
    }

}
