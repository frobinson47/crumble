import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, GripVertical, ChevronUp, ChevronDown, Upload, Image, ChevronRight, ClipboardPaste, Zap, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import TagBadge from '../ui/TagBadge';
import Spinner from '../ui/Spinner';
import * as api from '../../services/api';
import { parseIngredient, parseIngredientBlock } from '../../utils/ingredientParser';
import { fullImageUrl } from '../../utils/imageUrl';
import { parseRecipeText } from '../../utils/recipeTextParser';

const UNIT_OPTIONS = [
  '', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'L',
  'pieces', 'cloves', 'pinch', 'to taste',
  'can', 'bunch', 'head', 'sprig', 'dash', 'slice', 'stick', 'package',
];

const emptyIngredient = (id) => ({ _key: id, amount: '', unit: '', name: '' });
const emptyStep = (id) => ({ _key: id, text: '' });

export default function RecipeForm({ initialData, onSubmit, isLoading, submitLabel = 'Save Recipe' }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [ingredients, setIngredients] = useState(() => [emptyIngredient(1)]);
  const [instructions, setInstructions] = useState(() => [emptyStep(2)]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sourceImageUrl, setSourceImageUrl] = useState('');
  const [showNutrition, setShowNutrition] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [autoNutritionLoading, setAutoNutritionLoading] = useState(false);
  const [pasteRecipeMode, setPasteRecipeMode] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);

  const fileInputRef = useRef(null);
  const tagInputRef = useRef(null);
  const isInitializedRef = useRef(false);
  const keyCounterRef = useRef(2); // starts at 2; initial items use keys 1 and 2
  const nextKey = useCallback(() => ++keyCounterRef.current, []);

  // Draft auto-save (new recipes only, not edits)
  const DRAFT_KEY = 'cookslate-recipe-draft';

  // Restore draft on mount (new recipes only)
  useEffect(() => {
    if (initialData || isInitializedRef.current) return;
    isInitializedRef.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      // Only restore if less than 24 hours old
      if (Date.now() - draft._savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      // Only prompt if there's meaningful content
      if (!draft.title && (!draft.ingredients || !draft.ingredients.some(i => i.name))) return;
      setPendingDraft(draft);
      setShowDraftPrompt(true);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [initialData]);

  // Auto-save draft every 2 seconds (new recipes only)
  useEffect(() => {
    if (initialData) return; // Don't save drafts when editing existing recipes
    const timer = setTimeout(() => {
      const hasContent = title || ingredients.some(i => i.name.trim());
      if (!hasContent) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          title, description, prepTime, cookTime, servings, sourceUrl,
          ingredients: ingredients.map(({ _key: _k, ...rest }) => rest),
          instructions: instructions.map(s => s.text),
          tags,
          calories, protein, carbs, fat, fiber, sugar,
          _savedAt: Date.now(),
        }));
      } catch { /* quota exceeded — ignore */ }
    }, 2000);
    return () => clearTimeout(timer);
  }, [initialData, title, description, prepTime, cookTime, servings, sourceUrl,
      ingredients, instructions, tags, calories, protein, carbs, fat, fiber, sugar]);

  // Load all tags for autocomplete
  useEffect(() => {
    api.getTags()
      .then(data => setAllTags((data.tags || data || []).map(t => t.name || t)))
      .catch(() => {});
  }, []);

  // Populate form with initial data
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setPrepTime(String(initialData.prep_time || initialData.prepTime || ''));
      setCookTime(String(initialData.cook_time || initialData.cookTime || ''));
      setServings(String(initialData.servings || ''));
      setSourceUrl(initialData.source_url || initialData.sourceUrl || '');

      if (initialData.ingredients && initialData.ingredients.length > 0) {
        setIngredients(initialData.ingredients.map(ing => ({
          _key: nextKey(),
          amount: ing.amount || '',
          unit: ing.unit || '',
          name: ing.name || '',
        })));
      }

      if (initialData.instructions) {
        const steps = Array.isArray(initialData.instructions)
          ? initialData.instructions.map(s => ({
              _key: nextKey(),
              text: typeof s === 'string' ? s : s.text || String(s),
            }))
          : [];
        if (steps.length > 0) {
          setInstructions(steps);
        }
      }

      if (initialData.tags && initialData.tags.length > 0) {
        setTags(initialData.tags.map(t => t.name || t));
      }

      if (initialData.image_path) {
        setImagePreview(fullImageUrl(initialData.image_path));
      } else if (initialData.source_image_url) {
        setSourceImageUrl(initialData.source_image_url);
        setImagePreview(initialData.source_image_url);
      }

      // Nutrition
      if (initialData.calories || initialData.protein || initialData.carbs || initialData.fat || initialData.fiber || initialData.sugar) {
        setShowNutrition(true);
        setCalories(String(initialData.calories || ''));
        setProtein(String(initialData.protein || ''));
        setCarbs(String(initialData.carbs || ''));
        setFat(String(initialData.fat || ''));
        setFiber(String(initialData.fiber || ''));
        setSugar(String(initialData.sugar || ''));
      }
    }
  }, [initialData]);

  // Tag autocomplete filter
  useEffect(() => {
    if (tagInput.trim()) {
      const filtered = allTags.filter(
        t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
      );
      setTagSuggestions(filtered.slice(0, 5));
    } else {
      setTagSuggestions([]);
    }
  }, [tagInput, allTags, tags]);

  // Ingredient handlers
  const addIngredient = () => {
    setIngredients(prev => [...prev, emptyIngredient(nextKey())]);
  };

  const removeIngredient = (index) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index, field, value) => {
    setIngredients(prev => prev.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    ));
  };

  const moveIngredient = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ingredients.length) return;
    const newIngredients = [...ingredients];
    [newIngredients[index], newIngredients[newIndex]] = [newIngredients[newIndex], newIngredients[index]];
    setIngredients(newIngredients);
  };

  // Step handlers
  const addStep = () => {
    setInstructions(prev => [...prev, emptyStep(nextKey())]);
  };

  const removeStep = (index) => {
    setInstructions(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index, value) => {
    setInstructions(prev => prev.map((step, i) => i === index ? { ...step, text: value } : step));
  };

  const moveStep = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= instructions.length) return;
    const newSteps = [...instructions];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setInstructions(newSteps);
  };

  // Tag handlers
  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
    setTagSuggestions([]);
  };

  const removeTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
      }
    }
  };

  // Image handler
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setSourceImageUrl(''); // Local file overrides imported URL
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setSourceImageUrl(''); // Local file overrides imported URL
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Paste entire recipe handler
  const handlePasteRecipe = (text) => {
    const parsed = parseRecipeText(text);
    if (!parsed) return;
    if (parsed.title) setTitle(parsed.title);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.prepTime) setPrepTime(String(parsed.prepTime));
    if (parsed.cookTime) setCookTime(String(parsed.cookTime));
    if (parsed.servings) setServings(String(parsed.servings));
    if (parsed.ingredients.length > 0) {
      setIngredients(parsed.ingredients.map(ing => ({
        _key: nextKey(),
        amount: ing.amount || '',
        unit: ing.unit || '',
        name: ing.name || '',
      })));
    }
    if (parsed.instructions.length > 0) {
      setInstructions(parsed.instructions.map(s => ({
        _key: nextKey(),
        text: typeof s === 'string' ? s : s.text || '',
      })));
    }
    setPasteRecipeMode(false);
  };

  // Restore a saved draft into form state
  const restoreDraft = (draft) => {
    if (draft.title) setTitle(draft.title);
    if (draft.description) setDescription(draft.description);
    if (draft.prepTime) setPrepTime(draft.prepTime);
    if (draft.cookTime) setCookTime(draft.cookTime);
    if (draft.servings) setServings(draft.servings);
    if (draft.sourceUrl) setSourceUrl(draft.sourceUrl);
    if (draft.ingredients?.length) setIngredients(draft.ingredients.map(i => ({ ...i, _key: nextKey() })));
    if (draft.instructions?.length) setInstructions(
      draft.instructions.map(s => ({ _key: nextKey(), text: typeof s === 'string' ? s : s.text || '' }))
    );
    if (draft.tags?.length) setTags(draft.tags);
    if (draft.calories) { setCalories(draft.calories); setShowNutrition(true); }
    if (draft.protein) { setProtein(draft.protein); setShowNutrition(true); }
    if (draft.carbs) { setCarbs(draft.carbs); setShowNutrition(true); }
    if (draft.fat) { setFat(draft.fat); setShowNutrition(true); }
    if (draft.fiber) { setFiber(draft.fiber); setShowNutrition(true); }
    if (draft.sugar) { setSugar(draft.sugar); setShowNutrition(true); }
  };

  // Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    const validIngredients = ingredients.filter(ing => ing.name.trim());
    if (validIngredients.length === 0) {
      newErrors.ingredients = 'At least one ingredient is required';
    }

    const validSteps = instructions.filter(step => step.text.trim());
    if (validSteps.length === 0) {
      newErrors.instructions = 'At least one instruction step is required';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const data = {
      title: title.trim(),
      description: description.trim(),
      prep_time: prepTime ? parseInt(prepTime, 10) : null,
      cook_time: cookTime ? parseInt(cookTime, 10) : null,
      servings: servings ? parseInt(servings, 10) : null,
      source_url: sourceUrl.trim() || null,
      ingredients: validIngredients.map((ing, i) => ({
        ...ing,
        sort_order: i,
      })),
      instructions: validSteps.map(s => s.text),
      tags: tags,
      calories: calories ? parseInt(calories, 10) : null,
      protein: protein.trim() || null,
      carbs: carbs.trim() || null,
      fat: fat.trim() || null,
      fiber: fiber.trim() || null,
      sugar: sugar.trim() || null,
    };

    // Include source image URL from import (if no local image file was chosen)
    if (!imageFile && sourceImageUrl) {
      data.source_image_url = sourceImageUrl;
    }

    // Clear draft on submit
    localStorage.removeItem(DRAFT_KEY);

    onSubmit(data, imageFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Paste Recipe shortcut (only for new recipes without data) */}
      {!initialData && !title && (
        pasteRecipeMode ? (
          <div className="border-2 border-dashed border-terracotta/30 rounded-xl p-4 bg-terracotta/5">
            <label className="block text-sm font-semibold text-brown mb-2">
              Paste your full recipe text below
            </label>
            <textarea
              className="w-full h-48 p-3 rounded-xl border border-cream-dark text-brown text-sm font-mono focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta resize-y"
              placeholder={"Pasta Aglio e Olio\n\nPrep: 5 min  Cook: 15 min  Serves: 4\n\nIngredients\n1 lb spaghetti\n6 cloves garlic, thinly sliced\n1/2 cup olive oil\n1 tsp red pepper flakes\nFresh parsley, chopped\nSalt to taste\n\nInstructions\n1. Cook spaghetti according to package directions.\n2. Heat olive oil in a large skillet over medium heat.\n3. Add garlic and cook until golden, about 2 minutes.\n4. Add red pepper flakes and toss with drained pasta.\n5. Garnish with parsley and serve immediately."}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') setPasteRecipeMode(false);
              }}
              onBlur={(e) => {
                const text = e.target.value.trim();
                if (text) {
                  handlePasteRecipe(text);
                } else {
                  setPasteRecipeMode(false);
                }
              }}
            />
            <p className="text-xs text-warm-gray mt-1.5">
              Click outside when done. The parser will extract title, ingredients, instructions, and times.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPasteRecipeMode(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-cream-dark rounded-xl text-warm-gray hover:text-terracotta hover:border-terracotta/30 transition-colors duration-200"
          >
            <ClipboardPaste size={18} />
            <span className="text-sm font-medium">Paste a full recipe</span>
          </button>
        )
      )}

      {/* Title */}
      <Input
        label="Recipe Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., Grandma's Chocolate Chip Cookies"
        error={errors.title}
        required
      />

      {/* Description */}
      <Input
        label="Description"
        type="textarea"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="A brief description of this recipe..."
        rows={3}
      />

      {/* Time and Servings */}
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Prep Time (min)"
          type="number"
          value={prepTime}
          onChange={(e) => setPrepTime(e.target.value)}
          placeholder="15"
          min="0"
        />
        <Input
          label="Cook Time (min)"
          type="number"
          value={cookTime}
          onChange={(e) => setCookTime(e.target.value)}
          placeholder="30"
          min="0"
        />
        <Input
          label="Servings"
          type="number"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          placeholder="4"
          min="1"
        />
      </div>

      {/* Source URL */}
      <Input
        label="Source URL (optional)"
        type="url"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="https://..."
      />

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-semibold text-brown mb-1">Recipe Image</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-cream-dark rounded-xl p-6 text-center cursor-pointer hover:border-terracotta transition-colors duration-200"
        >
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Recipe preview"
                className="max-h-48 rounded-xl mx-auto"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageFile(null);
                  setImagePreview(null);
                  setSourceImageUrl('');
                }}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={32} className="mx-auto text-warm-gray" />
              <p className="text-warm-gray text-sm">
                Click or drag & drop an image here
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-brown">Ingredients</label>
          {errors.ingredients && (
            <span className="text-sm text-red-500">{errors.ingredients}</span>
          )}
        </div>

        <div className="space-y-2">
          {ingredients.map((ing, index) => (
            <div key={ing._key} className="flex items-center gap-2">
              {/* Reorder buttons */}
              <div className="flex flex-col shrink-0">
                <button
                  type="button"
                  onClick={() => moveIngredient(index, -1)}
                  disabled={index === 0}
                  className="p-0.5 text-warm-gray hover:text-brown disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveIngredient(index, 1)}
                  disabled={index === ingredients.length - 1}
                  className="p-0.5 text-warm-gray hover:text-brown disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Amount */}
              <input
                type="text"
                value={ing.amount}
                onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                placeholder="Amt"
                className="w-16 px-2 py-2 rounded-xl border border-cream-dark text-brown focus:outline-none focus:border-terracotta text-sm min-h-[44px]"
              />

              {/* Unit */}
              <select
                value={ing.unit}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                className="w-24 px-2 py-2 rounded-xl border border-cream-dark text-brown focus:outline-none focus:border-terracotta text-sm bg-surface min-h-[44px]"
              >
                {UNIT_OPTIONS.map(u => (
                  <option key={u} value={u}>{u || '(unit)'}</option>
                ))}
              </select>

              {/* Name — supports free-text parsing on blur/Enter when amount is empty */}
              <input
                type="text"
                value={ing.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                onBlur={(e) => {
                  const text = e.target.value.trim();
                  if (text && !ing.amount && !ing.unit) {
                    const parsed = parseIngredient(text);
                    if (parsed.amount || parsed.unit) {
                      setIngredients(prev => prev.map((item, i) =>
                        i === index ? { amount: parsed.amount || '', unit: parsed.unit || '', name: parsed.name } : item
                      ));
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const text = e.target.value.trim();
                    if (text && !ing.amount && !ing.unit) {
                      const parsed = parseIngredient(text);
                      if (parsed.amount || parsed.unit) {
                        setIngredients(prev => prev.map((item, i) =>
                          i === index ? { amount: parsed.amount || '', unit: parsed.unit || '', name: parsed.name } : item
                        ));
                      }
                    }
                    // Auto-add new row and focus it
                    if (text) {
                      setIngredients(prev => [...prev, emptyIngredient(nextKey())]);
                      setTimeout(() => {
                        const inputs = document.querySelectorAll('input[placeholder="Ingredient name"]');
                        inputs[inputs.length - 1]?.focus();
                      }, 50);
                    }
                  }
                }}
                placeholder="Ingredient name"
                className="flex-1 px-3 py-2 rounded-xl border border-cream-dark text-brown focus:outline-none focus:border-terracotta text-sm min-h-[44px]"
              />

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                disabled={ingredients.length <= 1}
                className="p-2 text-warm-gray hover:text-red-500 transition-colors disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Remove ingredient"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Paste multiple ingredients */}
        {pasteMode ? (
          <div className="mt-3">
            <textarea
              className="w-full h-36 p-3 rounded-xl border border-cream-dark text-brown text-sm font-mono focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta"
              placeholder={"Paste ingredients, one per line:\n2 cups flour\n1 tsp salt\n3 large eggs\n½ cup sugar"}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') setPasteMode(false);
              }}
              onBlur={(e) => {
                const text = e.target.value.trim();
                if (text) {
                  const parsed = parseIngredientBlock(text);
                  if (parsed.length > 0) {
                    setIngredients(prev => {
                      // Remove empty trailing ingredient if it's the only one
                      const filtered = prev.filter(ing => ing.name.trim() || ing.amount);
                      return [...filtered, ...parsed.map(p => ({
                        _key: nextKey(),
                        amount: p.amount || '',
                        unit: p.unit || '',
                        name: p.name || '',
                      }))];
                    });
                  }
                }
                setPasteMode(false);
              }}
            />
            <p className="text-xs text-warm-gray mt-1">
              Click outside or press Escape when done
            </p>
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addIngredient}
            >
              <Plus size={16} />
              Add Ingredient
            </Button>
            <button
              type="button"
              onClick={() => setPasteMode(true)}
              className="text-sm text-terracotta hover:text-terracotta-dark transition-colors px-2 py-1"
            >
              Paste multiple
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-brown">Instructions</label>
          {errors.instructions && (
            <span className="text-sm text-red-500">{errors.instructions}</span>
          )}
        </div>

        <div className="space-y-3">
          {instructions.map((step, index) => (
            <div key={step._key} className="flex items-start gap-2">
              {/* Reorder buttons */}
              <div className="flex flex-col shrink-0 mt-2">
                <button
                  type="button"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  className="p-0.5 text-warm-gray hover:text-brown disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === instructions.length - 1}
                  className="p-0.5 text-warm-gray hover:text-brown disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Step number */}
              <div className="shrink-0 w-8 h-8 rounded-full bg-terracotta/10 text-terracotta font-bold flex items-center justify-center text-sm mt-2">
                {index + 1}
              </div>

              {/* Step text */}
              <textarea
                value={step.text}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder={`Step ${index + 1}...`}
                rows={2}
                className="flex-1 px-3 py-2 rounded-xl border border-cream-dark text-brown focus:outline-none focus:border-terracotta text-sm resize-y min-h-[60px]"
              />

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeStep(index)}
                disabled={instructions.length <= 1}
                className="p-2 text-warm-gray hover:text-red-500 transition-colors disabled:opacity-30 mt-2 min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Remove step"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addStep}
          className="mt-2"
        >
          <Plus size={16} />
          Add Step
        </Button>
      </div>

      {/* Nutrition (optional, collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowNutrition(!showNutrition)}
          className="flex items-center gap-2 text-sm font-semibold text-brown hover:text-terracotta transition-colors duration-200"
        >
          <ChevronRight size={16} className={`transition-transform duration-200 ${showNutrition ? 'rotate-90' : ''}`} />
          Nutrition (optional)
        </button>

        {showNutrition && (
          <div className="mt-3">
            <button
              type="button"
              disabled={autoNutritionLoading || ingredients.filter(i => i.name?.trim()).length === 0}
              onClick={async () => {
                setAutoNutritionLoading(true);
                try {
                  const ings = ingredients.filter(i => i.name?.trim()).map(i => ({
                    name: i.name.trim(),
                    amount: i.amount || '',
                    unit: i.unit || '',
                  }));
                  const srv = servings ? parseInt(servings) : null;
                  const result = await api.autoNutrition(ings, srv);
                  const data = result.per_serving || result.total;
                  if (data) {
                    setCalories(String(data.calories || ''));
                    setProtein(String(data.protein || ''));
                    setCarbs(String(data.carbs || ''));
                    setFat(String(data.fat || ''));
                    setFiber(String(data.fiber || ''));
                  }
                } catch { }
                setAutoNutritionLoading(false);
              }}
              className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sage bg-sage/10 rounded-lg hover:bg-sage/20 transition-colors disabled:opacity-50"
            >
              {autoNutritionLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Auto-fill from ingredients
            </button>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input
                label="Calories"
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="250"
                min="0"
              />
              <Input
                label="Protein"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="12g"
              />
              <Input
                label="Carbs"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="30g"
              />
              <Input
                label="Fat"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="8g"
              />
              <Input
                label="Fiber"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                placeholder="4g"
              />
              <Input
                label="Sugar"
                value={sugar}
                onChange={(e) => setSugar(e.target.value)}
                placeholder="5g"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-brown mb-1">Tags</label>

        {/* Tag pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(tag => (
              <TagBadge key={tag} tag={tag} onRemove={() => removeTag(tag)} />
            ))}
          </div>
        )}

        {/* Tag input */}
        <div className="relative">
          <input
            ref={tagInputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags (press Enter or comma)"
            className="w-full px-4 py-2.5 rounded-xl border border-cream-dark text-brown focus:outline-none focus:border-terracotta transition-colors duration-200 min-h-[44px]"
          />

          {/* Suggestions dropdown */}
          {tagSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-cream-dark rounded-xl shadow-lg z-10 overflow-hidden">
              {tagSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addTag(suggestion)}
                  className="w-full text-left px-4 py-2.5 text-brown-light hover:bg-cream-dark transition-colors duration-200 text-sm min-h-[44px]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>

      {/* Draft restore prompt */}
      <Modal
        isOpen={showDraftPrompt}
        onClose={() => {
          localStorage.removeItem(DRAFT_KEY);
          setPendingDraft(null);
          setShowDraftPrompt(false);
        }}
        title="Unsaved Draft"
        size="sm"
      >
        <p className="text-brown-light mb-6">You have an unsaved recipe draft. Would you like to continue editing it?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => {
            localStorage.removeItem(DRAFT_KEY);
            setPendingDraft(null);
            setShowDraftPrompt(false);
          }}>
            Start Fresh
          </Button>
          <Button onClick={() => {
            if (pendingDraft) restoreDraft(pendingDraft);
            setPendingDraft(null);
            setShowDraftPrompt(false);
          }}>
            Continue Editing
          </Button>
        </div>
      </Modal>
    </form>
  );
}
