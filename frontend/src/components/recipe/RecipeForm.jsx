import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, GripVertical, ChevronUp, ChevronDown, Upload, Image } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TagBadge from '../ui/TagBadge';
import Spinner from '../ui/Spinner';
import * as api from '../../services/api';

const UNIT_OPTIONS = [
  '', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'L',
  'pieces', 'cloves', 'pinch', 'to taste',
];

const emptyIngredient = () => ({ amount: '', unit: '', name: '' });
const emptyStep = () => '';

export default function RecipeForm({ initialData, onSubmit, isLoading, submitLabel = 'Save Recipe' }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [ingredients, setIngredients] = useState([emptyIngredient()]);
  const [instructions, setInstructions] = useState([emptyStep()]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sourceImageUrl, setSourceImageUrl] = useState('');
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);
  const tagInputRef = useRef(null);

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
      setPrepTime(initialData.prep_time || initialData.prepTime || '');
      setCookTime(initialData.cook_time || initialData.cookTime || '');
      setServings(initialData.servings || '');
      setSourceUrl(initialData.source_url || initialData.sourceUrl || '');

      if (initialData.ingredients && initialData.ingredients.length > 0) {
        setIngredients(initialData.ingredients.map(ing => ({
          amount: ing.amount || '',
          unit: ing.unit || '',
          name: ing.name || '',
        })));
      }

      if (initialData.instructions) {
        const steps = Array.isArray(initialData.instructions)
          ? initialData.instructions.map(s => (typeof s === 'string' ? s : s.text || String(s)))
          : [];
        if (steps.length > 0) {
          setInstructions(steps);
        }
      }

      if (initialData.tags && initialData.tags.length > 0) {
        setTags(initialData.tags.map(t => t.name || t));
      }

      if (initialData.image_path) {
        setImagePreview(`/uploads/${initialData.image_path}`);
      } else if (initialData.source_image_url) {
        setSourceImageUrl(initialData.source_image_url);
        setImagePreview(initialData.source_image_url);
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
    setIngredients(prev => [...prev, emptyIngredient()]);
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
    setInstructions(prev => [...prev, emptyStep()]);
  };

  const removeStep = (index) => {
    setInstructions(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index, value) => {
    setInstructions(prev => prev.map((step, i) => i === index ? value : step));
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

    const validSteps = instructions.filter(step => step.trim());
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
      instructions: validSteps,
      tags: tags,
    };

    // Include source image URL from import (if no local image file was chosen)
    if (!imageFile && sourceImageUrl) {
      data.source_image_url = sourceImageUrl;
    }

    onSubmit(data, imageFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
            <div key={index} className="flex items-center gap-2">
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
                className="w-24 px-2 py-2 rounded-xl border border-cream-dark text-brown focus:outline-none focus:border-terracotta text-sm bg-white min-h-[44px]"
              >
                {UNIT_OPTIONS.map(u => (
                  <option key={u} value={u}>{u || '(unit)'}</option>
                ))}
              </select>

              {/* Name */}
              <input
                type="text"
                value={ing.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
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

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addIngredient}
          className="mt-2"
        >
          <Plus size={16} />
          Add Ingredient
        </Button>
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
            <div key={index} className="flex items-start gap-2">
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
                value={step}
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
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-cream-dark rounded-xl shadow-lg z-10 overflow-hidden">
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
    </form>
  );
}
