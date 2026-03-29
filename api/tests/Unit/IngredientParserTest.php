<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class IngredientParserTest extends TestCase
{
    private $parser;

    protected function setUp(): void
    {
        require_once __DIR__ . '/../../services/IngredientParser.php';
        $this->parser = new \IngredientParser();
    }

    public function testBasicIngredient(): void
    {
        $result = $this->parser->parse('2 cups flour');
        $this->assertEquals('2', $result['amount']);
        $this->assertEquals('cup', $result['unit']);
        $this->assertEquals('flour', $result['name']);
    }

    public function testMixedNumber(): void
    {
        $result = $this->parser->parse('1 1/2 tsp salt');
        $this->assertEquals('1 1/2', $result['amount']);
        $this->assertEquals('tsp', $result['unit']);
        $this->assertEquals('salt', $result['name']);
    }

    public function testNoAmount(): void
    {
        $result = $this->parser->parse('salt and pepper to taste');
        $this->assertNull($result['amount']);
        $this->assertNull($result['unit']);
        $this->assertEquals('salt and pepper to taste', $result['name']);
    }

    public function testParentheticalUnit(): void
    {
        $result = $this->parser->parse('2 (14 oz) cans tomatoes');
        $this->assertEquals('2', $result['amount']);
        $this->assertEquals('can', $result['unit']);
        $this->assertStringContainsString('tomatoes', $result['name']);
    }

    public function testUnicodeFractionHalf(): void
    {
        $result = $this->parser->parse('½ cup butter');
        $this->assertEquals('1/2', $result['amount']);
        $this->assertEquals('cup', $result['unit']);
        $this->assertEquals('butter', $result['name']);
    }

    public function testUnicodeFractionQuarter(): void
    {
        $result = $this->parser->parse('¼ tsp cinnamon');
        $this->assertEquals('1/4', $result['amount']);
        $this->assertEquals('tsp', $result['unit']);
        $this->assertEquals('cinnamon', $result['name']);
    }

    public function testUnicodeMixedNumber(): void
    {
        $result = $this->parser->parse('1 ½ cups milk');
        $this->assertEquals('1 1/2', $result['amount']);
        $this->assertEquals('cup', $result['unit']);
        $this->assertEquals('milk', $result['name']);
    }

    public function testUnicodeMixedNumberNoSpace(): void
    {
        $result = $this->parser->parse('1½ cups milk');
        $this->assertEquals('1 1/2', $result['amount']);
        $this->assertEquals('cup', $result['unit']);
        $this->assertEquals('milk', $result['name']);
    }

    public function testThreeQuarters(): void
    {
        $result = $this->parser->parse('¾ lb chicken');
        $this->assertEquals('3/4', $result['amount']);
        $this->assertEquals('lb', $result['unit']);
        $this->assertEquals('chicken', $result['name']);
    }

    public function testRange(): void
    {
        $result = $this->parser->parse('2-3 tablespoons oil');
        $this->assertEquals('2-3', $result['amount']);
        $this->assertEquals('tbsp', $result['unit']);
        $this->assertEquals('oil', $result['name']);
    }

    public function testNoUnit(): void
    {
        $result = $this->parser->parse('3 eggs');
        $this->assertEquals('3', $result['amount']);
        $this->assertNull($result['unit']);
        $this->assertEquals('eggs', $result['name']);
    }

    public function testEmptyString(): void
    {
        $result = $this->parser->parse('');
        $this->assertNull($result['amount']);
        $this->assertNull($result['unit']);
        $this->assertEquals('', $result['name']);
    }
}
