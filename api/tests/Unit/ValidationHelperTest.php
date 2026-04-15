<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../services/ValidationHelper.php';

class ValidationHelperTest extends TestCase
{
    private \ValidationHelper $v;

    protected function setUp(): void
    {
        $this->v = new \ValidationHelper();
    }

    // --- required ---

    public function testRequiredPassesWithValue(): void
    {
        $this->v->required('hello', 'name');
        $this->assertTrue($this->v->passes());
    }

    public function testRequiredFailsWithNull(): void
    {
        $this->v->required(null, 'name');
        $this->assertTrue($this->v->fails());
        $this->assertStringContainsString('name is required', $this->v->errorString());
    }

    public function testRequiredFailsWithEmptyString(): void
    {
        $this->v->required('', 'field');
        $this->assertTrue($this->v->fails());
    }

    public function testRequiredFailsWithEmptyArray(): void
    {
        $this->v->required([], 'items');
        $this->assertTrue($this->v->fails());
    }

    // --- maxLength ---

    public function testMaxLengthPasses(): void
    {
        $this->v->maxLength('hello', 'name', 10);
        $this->assertTrue($this->v->passes());
    }

    public function testMaxLengthFails(): void
    {
        $this->v->maxLength('this is way too long', 'name', 5);
        $this->assertTrue($this->v->fails());
        $this->assertStringContainsString('must not exceed 5 characters', $this->v->errorString());
    }

    public function testMaxLengthSkipsNull(): void
    {
        $this->v->maxLength(null, 'name', 5);
        $this->assertTrue($this->v->passes());
    }

    // --- minLength ---

    public function testMinLengthPasses(): void
    {
        $this->v->minLength('hello', 'name', 3);
        $this->assertTrue($this->v->passes());
    }

    public function testMinLengthFails(): void
    {
        $this->v->minLength('ab', 'name', 3);
        $this->assertTrue($this->v->fails());
    }

    // --- email ---

    public function testEmailPasses(): void
    {
        $this->v->email('user@example.com', 'email');
        $this->assertTrue($this->v->passes());
    }

    public function testEmailFails(): void
    {
        $this->v->email('not-an-email', 'email');
        $this->assertTrue($this->v->fails());
        $this->assertStringContainsString('valid email', $this->v->errorString());
    }

    public function testEmailSkipsEmpty(): void
    {
        $this->v->email('', 'email');
        $this->assertTrue($this->v->passes());
    }

    // --- numeric ---

    public function testNumericPasses(): void
    {
        $this->v->numeric('42', 'amount');
        $this->assertTrue($this->v->passes());
    }

    public function testNumericPassesWithFloat(): void
    {
        $this->v->numeric('3.14', 'amount');
        $this->assertTrue($this->v->passes());
    }

    public function testNumericFails(): void
    {
        $this->v->numeric('abc', 'amount');
        $this->assertTrue($this->v->fails());
    }

    // --- range ---

    public function testRangePasses(): void
    {
        $this->v->range(3, 'score', 1, 5);
        $this->assertTrue($this->v->passes());
    }

    public function testRangeFailsTooLow(): void
    {
        $this->v->range(0, 'score', 1, 5);
        $this->assertTrue($this->v->fails());
    }

    public function testRangeFailsTooHigh(): void
    {
        $this->v->range(10, 'score', 1, 5);
        $this->assertTrue($this->v->fails());
    }

    // --- inList ---

    public function testInListPasses(): void
    {
        $this->v->inList('admin', 'role', ['admin', 'member']);
        $this->assertTrue($this->v->passes());
    }

    public function testInListFails(): void
    {
        $this->v->inList('superuser', 'role', ['admin', 'member']);
        $this->assertTrue($this->v->fails());
        $this->assertStringContainsString('must be one of', $this->v->errorString());
    }

    // --- date ---

    public function testDatePasses(): void
    {
        $this->v->date('2026-01-15', 'start_date');
        $this->assertTrue($this->v->passes());
    }

    public function testDateFails(): void
    {
        $this->v->date('not-a-date', 'start_date');
        $this->assertTrue($this->v->fails());
    }

    public function testDateFailsInvalidDay(): void
    {
        $this->v->date('2026-02-30', 'start_date');
        $this->assertTrue($this->v->fails());
    }

    // --- url ---

    public function testUrlPasses(): void
    {
        $this->v->url('https://example.com/recipe', 'link');
        $this->assertTrue($this->v->passes());
    }

    public function testUrlFails(): void
    {
        $this->v->url('not a url', 'link');
        $this->assertTrue($this->v->fails());
    }

    // --- isArray ---

    public function testIsArrayPasses(): void
    {
        $this->v->isArray(['a', 'b'], 'items');
        $this->assertTrue($this->v->passes());
    }

    public function testIsArrayFails(): void
    {
        $this->v->isArray('not-array', 'items');
        $this->assertTrue($this->v->fails());
    }

    // --- maxCount ---

    public function testMaxCountPasses(): void
    {
        $this->v->maxCount([1, 2, 3], 'items', 5);
        $this->assertTrue($this->v->passes());
    }

    public function testMaxCountFails(): void
    {
        $this->v->maxCount([1, 2, 3, 4, 5, 6], 'items', 5);
        $this->assertTrue($this->v->fails());
    }

    // --- chaining ---

    public function testChainingMultipleRules(): void
    {
        $this->v->required('test', 'name')
                ->maxLength('test', 'name', 100)
                ->minLength('test', 'name', 2);
        $this->assertTrue($this->v->passes());
    }

    public function testChainingCollectsMultipleErrors(): void
    {
        $this->v->required(null, 'name')
                ->required(null, 'email');
        $this->assertTrue($this->v->fails());
        $errors = $this->v->errors();
        $this->assertCount(2, $errors);
    }

    // --- responseIfFailed ---

    public function testResponseIfFailedReturnsNullWhenPasses(): void
    {
        $this->v->required('value', 'field');
        $this->assertNull($this->v->responseIfFailed());
    }

    public function testResponseIfFailedReturnsArrayWhenFails(): void
    {
        $this->v->required(null, 'field');
        $response = $this->v->responseIfFailed();
        $this->assertIsArray($response);
        $this->assertArrayHasKey('error', $response);
        $this->assertEquals(400, $response['code']);
    }

    // --- sanitize ---

    public function testSanitizeTrimsAndLimitsLength(): void
    {
        $result = \ValidationHelper::sanitize('  hello world  ', 5);
        $this->assertEquals('hello', $result);
    }

    public function testSanitizeReturnsNullForNull(): void
    {
        $this->assertNull(\ValidationHelper::sanitize(null));
    }

    // --- sanitizeInt ---

    public function testSanitizeIntClampsToBounds(): void
    {
        $this->assertEquals(1, \ValidationHelper::sanitizeInt(-5, 1, 100));
        $this->assertEquals(100, \ValidationHelper::sanitizeInt(999, 1, 100));
        $this->assertEquals(50, \ValidationHelper::sanitizeInt(50, 1, 100));
    }

    // --- reset ---

    public function testResetClearsErrors(): void
    {
        $this->v->required(null, 'field');
        $this->assertTrue($this->v->fails());
        $this->v->reset();
        $this->assertTrue($this->v->passes());
    }
}
