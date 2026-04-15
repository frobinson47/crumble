<?php

require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/LoggerService.php';

class ImageProcessor {

    private const ALLOWED_TYPES = [
        'image/jpeg' => IMAGETYPE_JPEG,
        'image/png' => IMAGETYPE_PNG,
        'image/webp' => IMAGETYPE_WEBP,
        'image/gif' => IMAGETYPE_GIF,
    ];

    /**
     * Process an uploaded image: validate, resize to full (800px) and thumb (300px).
     *
     * @param array $file  The $_FILES['image'] array
     * @param int   $recipeId  The recipe ID for the output directory
     * @return string|null  Relative image path on success, null on failure
     */
    public function process(array $file, int $recipeId): ?string {
        // Validate upload
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return null;
        }

        // Validate file size
        if ($file['size'] > MAX_UPLOAD_SIZE) {
            return null;
        }

        // Validate MIME type
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!isset(self::ALLOWED_TYPES[$mimeType])) {
            return null;
        }

        // Verify actual image data
        $imageInfo = getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            return null;
        }

        // Create output directory
        $relativeDir = 'recipes' . DIRECTORY_SEPARATOR . $recipeId;
        $outputDir = UPLOAD_DIR . $relativeDir;

        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }

        // Load source image
        $source = $this->loadImage($file['tmp_name'], $imageInfo[2]);
        if ($source === null) {
            return null;
        }

        $origWidth = imagesx($source);
        $origHeight = imagesy($source);

        // Generate full-size image (max 800px wide)
        $this->resizeAndSave($source, $origWidth, $origHeight, IMAGE_MAX_WIDTH, IMAGE_QUALITY, $outputDir . DIRECTORY_SEPARATOR . 'full.webp');

        // Generate thumbnail (max 300px wide)
        $this->resizeAndSave($source, $origWidth, $origHeight, THUMB_MAX_WIDTH, THUMB_QUALITY, $outputDir . DIRECTORY_SEPARATOR . 'thumb.webp');

        // Free memory
        imagedestroy($source);

        // Return relative path using forward slashes for URL consistency
        return 'recipes/' . $recipeId . '/full.webp';
    }

    /**
     * Load an image from file based on its type.
     */
    private function loadImage(string $path, int $type): ?\GdImage {
        return match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($path) ?: null,
            IMAGETYPE_PNG => @imagecreatefrompng($path) ?: null,
            IMAGETYPE_WEBP => @imagecreatefromwebp($path) ?: null,
            IMAGETYPE_GIF => @imagecreatefromgif($path) ?: null,
            default => null,
        };
    }

    /**
     * Resize an image to a max width (maintaining aspect ratio) and save as WebP.
     */
    private function resizeAndSave(\GdImage $source, int $origWidth, int $origHeight, int $maxWidth, int $quality, string $outputPath): void {
        if ($origWidth <= $maxWidth) {
            $newWidth = $origWidth;
            $newHeight = $origHeight;
        } else {
            $newWidth = $maxWidth;
            $newHeight = (int) round($origHeight * ($maxWidth / $origWidth));
        }

        $resized = imagecreatetruecolor($newWidth, $newHeight);

        // Preserve alpha channel for WebP output
        imagesavealpha($resized, true);
        $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
        imagefill($resized, 0, 0, $transparent);

        imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

        imagewebp($resized, $outputPath, $quality);
        imagedestroy($resized);
    }

    /**
     * Download an image from a URL and process it.
     *
     * @param string $url  The image URL
     * @param int    $recipeId  The recipe ID
     * @return string|null  Relative image path on success, null on failure
     */
    public function processFromUrl(string $url, int $recipeId): ?string {
        // Use cURL for HTTPS support (PHP openssl ext may not be available)
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 5,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                CURLOPT_SSL_VERIFYPEER => true,
            ]);

            // Use CA bundle for SSL verification if not configured in php.ini
            $caBundle = getCaBundlePath();
            if ($caBundle) {
                curl_setopt($ch, CURLOPT_CAINFO, $caBundle);
            }

            $imageData = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($imageData === false || $httpCode !== 200) {
                LoggerService::channel('image')->error('Failed to download image', ['url' => $url, 'http_code' => $httpCode, 'curl_error' => $curlError]);
                return null;
            }
        } else {
            // Fallback to file_get_contents
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => "User-Agent: Mozilla/5.0\r\n",
                    'timeout' => 10,
                    'follow_location' => true,
                    'max_redirects' => 5,
                ],
            ]);

            $imageData = @file_get_contents($url, false, $context);
            if ($imageData === false) {
                return null;
            }
        }

        // Write to temp file
        $tmpFile = tempnam(sys_get_temp_dir(), 'cookslate_img_');
        file_put_contents($tmpFile, $imageData);

        // Create a fake $_FILES-like array
        $fakeFile = [
            'tmp_name' => $tmpFile,
            'error' => UPLOAD_ERR_OK,
            'size' => filesize($tmpFile),
        ];

        $result = $this->process($fakeFile, $recipeId);

        // Clean up temp file
        @unlink($tmpFile);

        return $result;
    }
}
