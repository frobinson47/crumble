<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AutoTaggerTest extends TestCase
{
    private $tagger;

    protected function setUp(): void
    {
        require_once __DIR__ . '/../../services/AutoTagger.php';
        $this->tagger = new \AutoTagger();
    }

    public function testChickenRecipe(): void
    {
        $tags = $this->tagger->suggest([
            'title' => 'Garlic Butter Chicken Thighs',
            'ingredients' => [
                ['name' => 'chicken thighs'],
                ['name' => 'butter'],
                ['name' => 'garlic'],
            ],
        ]);
        $this->assertContains('chicken', $tags);
    }

    public function testPastaRecipe(): void
    {
        $tags = $this->tagger->suggest([
            'title' => 'Creamy Pesto Penne',
            'ingredients' => [
                ['name' => 'penne pasta'],
                ['name' => 'pesto'],
                ['name' => 'heavy cream'],
                ['name' => 'parmesan'],
            ],
        ]);
        $this->assertContains('pasta', $tags);
        $this->assertContains('italian', $tags);
    }

    public function testMexicanRecipe(): void
    {
        $tags = $this->tagger->suggest([
            'title' => 'Beef Tacos with Salsa',
            'ingredients' => [
                ['name' => 'ground beef'],
                ['name' => 'tortilla'],
                ['name' => 'salsa'],
                ['name' => 'sour cream'],
            ],
        ]);
        $this->assertContains('beef', $tags);
        $this->assertContains('mexican', $tags);
    }

    public function testDessertRecipe(): void
    {
        $tags = $this->tagger->suggest([
            'title' => 'Chocolate Lava Cake',
            'ingredients' => [
                ['name' => 'dark chocolate'],
                ['name' => 'butter'],
                ['name' => 'sugar'],
                ['name' => 'eggs'],
            ],
        ]);
        $this->assertContains('dessert', $tags);
    }

    public function testQuickRecipeByTime(): void
    {
        $tags = $this->tagger->suggest([
            'title' => 'Avocado Toast',
            'prep_time' => 5,
            'cook_time' => 5,
            'ingredients' => [
                ['name' => 'bread'],
                ['name' => 'avocado'],
            ],
        ]);
        $this->assertContains('quick', $tags);
    }

    public function testQuickTagRequiresCookTime(): void
    {
        // Prep time only (no cook_time) should NOT trigger "quick"
        $tags = $this->tagger->suggest([
            'title' => 'Simple Soup',
            'prep_time' => 10,
            'ingredients' => [['name' => 'broth']],
        ]);
        $this->assertContains('soup', $tags);
        $this->assertNotContains('quick', $tags);
    }

    public function testEmptyRecipe(): void
    {
        $tags = $this->tagger->suggest([]);
        $this->assertEmpty($tags);
    }

    public function testSoupRecipe(): void
    {
        $tags = $this->tagger->suggest([
            'title' => 'Tomato Basil Soup',
            'description' => 'A comforting bowl of creamy tomato soup',
        ]);
        $this->assertContains('soup', $tags);
    }

    public function testNoFalsePositives(): void
    {
        $tags = $this->tagger->suggest([
            'title' => 'Simple Green Salad',
            'ingredients' => [
                ['name' => 'mixed greens'],
                ['name' => 'olive oil'],
                ['name' => 'lemon juice'],
            ],
        ]);
        $this->assertContains('salad', $tags);
        $this->assertNotContains('chicken', $tags);
        $this->assertNotContains('pasta', $tags);
        $this->assertNotContains('dessert', $tags);
    }
}
