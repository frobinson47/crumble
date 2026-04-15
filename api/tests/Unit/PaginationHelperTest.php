<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../services/PaginationHelper.php';

class PaginationHelperTest extends TestCase
{
    public function testFromRequestDefaults(): void
    {
        // Clear any existing GET params
        $_GET = [];
        $result = \PaginationHelper::fromRequest();

        $this->assertEquals(1, $result['page']);
        $this->assertEquals(25, $result['per_page']);
        $this->assertEquals(0, $result['offset']);
    }

    public function testFromRequestWithParams(): void
    {
        $_GET = ['page' => '3', 'per_page' => '10'];
        $result = \PaginationHelper::fromRequest();

        $this->assertEquals(3, $result['page']);
        $this->assertEquals(10, $result['per_page']);
        $this->assertEquals(20, $result['offset']);
    }

    public function testFromRequestClampsPageMin(): void
    {
        $_GET = ['page' => '-1'];
        $result = \PaginationHelper::fromRequest();
        $this->assertEquals(1, $result['page']);
    }

    public function testFromRequestClampsPerPageMax(): void
    {
        $_GET = ['per_page' => '9999'];
        $result = \PaginationHelper::fromRequest();
        $this->assertEquals(100, $result['per_page']);
    }

    public function testFromRequestCustomDefault(): void
    {
        $_GET = [];
        $result = \PaginationHelper::fromRequest(50);
        $this->assertEquals(50, $result['per_page']);
    }

    public function testResponseFormat(): void
    {
        $items = [['id' => 1], ['id' => 2]];
        $result = \PaginationHelper::response($items, 50, 2, 10);

        $this->assertArrayHasKey('data', $result);
        $this->assertArrayHasKey('pagination', $result);
        $this->assertEquals(2, count($result['data']));
        $this->assertEquals(50, $result['pagination']['total']);
        $this->assertEquals(5, $result['pagination']['total_pages']);
        $this->assertEquals(2, $result['pagination']['page']);
        $this->assertEquals(10, $result['pagination']['per_page']);
    }

    public function testResponseTotalPagesRoundsUp(): void
    {
        $result = \PaginationHelper::response([], 51, 1, 10);
        $this->assertEquals(6, $result['pagination']['total_pages']);
    }

    public function testAppendLimit(): void
    {
        $sql = 'SELECT * FROM recipes ORDER BY id';
        $result = \PaginationHelper::appendLimit($sql, 25, 50);
        $this->assertEquals('SELECT * FROM recipes ORDER BY id LIMIT 25 OFFSET 50', $result);
    }

    public function testAppendLimitZeroOffset(): void
    {
        $sql = 'SELECT * FROM users';
        $result = \PaginationHelper::appendLimit($sql, 10);
        $this->assertEquals('SELECT * FROM users LIMIT 10 OFFSET 0', $result);
    }

    protected function tearDown(): void
    {
        $_GET = [];
    }
}
