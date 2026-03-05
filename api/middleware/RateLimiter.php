<?php

class RateLimiter
{
    private string $storageDir;

    public function __construct(?string $storageDir = null)
    {
        $this->storageDir = $storageDir ?? sys_get_temp_dir() . '/crumble_ratelimit';
        if (!is_dir($this->storageDir)) {
            mkdir($this->storageDir, 0755, true);
        }
    }

    /**
     * Check if a request is allowed.
     *
     * @return array{allowed: bool, remaining: int, retryAfter: int}
     */
    public function check(string $identifier, string $action, int $maxAttempts, int $windowSecs): array
    {
        $key = md5($identifier . ':' . $action);
        $file = $this->storageDir . '/' . $key . '.json';
        $now = time();

        $attempts = [];
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            if (is_array($data)) {
                $attempts = array_values(array_filter($data, fn($ts) => ($now - $ts) < $windowSecs));
            }
        }

        if (count($attempts) >= $maxAttempts) {
            $oldestValid = min($attempts);
            $retryAfter = $windowSecs - ($now - $oldestValid);
            return [
                'allowed' => false,
                'remaining' => 0,
                'retryAfter' => max(1, $retryAfter),
            ];
        }

        $attempts[] = $now;
        file_put_contents($file, json_encode($attempts), LOCK_EX);

        return [
            'allowed' => true,
            'remaining' => $maxAttempts - count($attempts),
            'retryAfter' => 0,
        ];
    }
}
