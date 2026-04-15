<?php

/**
 * Lightweight input validation helper.
 * Provides reusable validation methods for controllers.
 */
class ValidationHelper
{
    private array $errors = [];

    /**
     * Validate that a field is present and non-empty.
     */
    public function required(mixed $value, string $field): self
    {
        if ($value === null || $value === '' || (is_array($value) && empty($value))) {
            $this->errors[] = "{$field} is required";
        }
        return $this;
    }

    /**
     * Validate that a string does not exceed max length.
     */
    public function maxLength(?string $value, string $field, int $max): self
    {
        if ($value !== null && mb_strlen($value) > $max) {
            $this->errors[] = "{$field} must not exceed {$max} characters";
        }
        return $this;
    }

    /**
     * Validate that a string meets a minimum length.
     */
    public function minLength(?string $value, string $field, int $min): self
    {
        if ($value !== null && mb_strlen($value) < $min) {
            $this->errors[] = "{$field} must be at least {$min} characters";
        }
        return $this;
    }

    /**
     * Validate that a value is a valid email address.
     */
    public function email(?string $value, string $field): self
    {
        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[] = "{$field} must be a valid email address";
        }
        return $this;
    }

    /**
     * Validate that a value is numeric.
     */
    public function numeric(mixed $value, string $field): self
    {
        if ($value !== null && $value !== '' && !is_numeric($value)) {
            $this->errors[] = "{$field} must be a number";
        }
        return $this;
    }

    /**
     * Validate that a numeric value falls within a range.
     */
    public function range(mixed $value, string $field, float $min, float $max): self
    {
        if ($value !== null && $value !== '' && is_numeric($value)) {
            $num = (float) $value;
            if ($num < $min || $num > $max) {
                $this->errors[] = "{$field} must be between {$min} and {$max}";
            }
        }
        return $this;
    }

    /**
     * Validate that a value is one of the allowed options.
     */
    public function inList(mixed $value, string $field, array $allowed): self
    {
        if ($value !== null && $value !== '' && !in_array($value, $allowed, true)) {
            $this->errors[] = "{$field} must be one of: " . implode(', ', $allowed);
        }
        return $this;
    }

    /**
     * Validate that a value is a valid date string (Y-m-d).
     */
    public function date(?string $value, string $field): self
    {
        if ($value !== null && $value !== '') {
            $d = \DateTime::createFromFormat('Y-m-d', $value);
            if (!$d || $d->format('Y-m-d') !== $value) {
                $this->errors[] = "{$field} must be a valid date (YYYY-MM-DD)";
            }
        }
        return $this;
    }

    /**
     * Validate that a value is a valid URL.
     */
    public function url(?string $value, string $field): self
    {
        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_URL)) {
            $this->errors[] = "{$field} must be a valid URL";
        }
        return $this;
    }

    /**
     * Validate that a value is an array.
     */
    public function isArray(mixed $value, string $field): self
    {
        if ($value !== null && !is_array($value)) {
            $this->errors[] = "{$field} must be an array";
        }
        return $this;
    }

    /**
     * Validate that an array does not exceed a max count.
     */
    public function maxCount(mixed $value, string $field, int $max): self
    {
        if (is_array($value) && count($value) > $max) {
            $this->errors[] = "{$field} must not contain more than {$max} items";
        }
        return $this;
    }

    /**
     * Check if validation passed.
     */
    public function passes(): bool
    {
        return empty($this->errors);
    }

    /**
     * Check if validation failed.
     */
    public function fails(): bool
    {
        return !empty($this->errors);
    }

    /**
     * Get all validation errors.
     */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * Get errors as a single string.
     */
    public function errorString(): string
    {
        return implode('. ', $this->errors);
    }

    /**
     * Return a 400 response array if validation fails, or null if it passes.
     */
    public function responseIfFailed(): ?array
    {
        if ($this->fails()) {
            http_response_code(400);
            return ['error' => $this->errorString(), 'code' => 400];
        }
        return null;
    }

    /**
     * Reset the validator for reuse.
     */
    public function reset(): self
    {
        $this->errors = [];
        return $this;
    }

    /**
     * Sanitize a string: trim and limit length.
     */
    public static function sanitize(?string $value, int $maxLength = 1000): ?string
    {
        if ($value === null) return null;
        $value = trim($value);
        if (mb_strlen($value) > $maxLength) {
            $value = mb_substr($value, 0, $maxLength);
        }
        return $value;
    }

    /**
     * Sanitize an integer within bounds.
     */
    public static function sanitizeInt(mixed $value, int $min = PHP_INT_MIN, int $max = PHP_INT_MAX): int
    {
        $val = (int) $value;
        return max($min, min($max, $val));
    }
}
