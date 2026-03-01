import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Link2 } from 'lucide-react';
import RecipeForm from '../components/recipe/RecipeForm';
import ImportForm from '../components/recipe/ImportForm';
import useRecipes from '../hooks/useRecipes';

export default function AddRecipePage() {
  const navigate = useNavigate();
  const { createRecipe, importRecipe, isLoading } = useRecipes();
  const [mode, setMode] = useState('choose'); // 'choose', 'manual', 'import'
  const [importedData, setImportedData] = useState(null);

  const handleSubmit = async (data, imageFile) => {
    try {
      const result = await createRecipe(data, imageFile);
      const newId = result?.recipe?.id || result?.id;
      if (newId) {
        navigate(`/recipe/${newId}`);
      } else {
        navigate('/');
      }
    } catch {
      // Error shown in form
    }
  };

  const handleImportSuccess = (data) => {
    const parsed = data.recipe || data;

    // API returned an error with no useful data (e.g. fetch_blocked)
    if (parsed.error && !parsed.title) {
      throw new Error(parsed.error);
    }

    setImportedData({
      title: parsed.title || '',
      description: parsed.description || '',
      prep_time: parsed.prepTime || parsed.prep_time || '',
      cook_time: parsed.cookTime || parsed.cook_time || '',
      servings: parsed.servings || '',
      source_url: parsed.sourceUrl || parsed.source_url || '',
      source_image_url: parsed.image_url || parsed.imageUrl || '',
      ingredients: (parsed.ingredients || []).map((ing, i) => {
        if (typeof ing === 'string') {
          return { amount: '', unit: '', name: ing, sort_order: i };
        }
        return {
          amount: ing.amount || '',
          unit: ing.unit || '',
          name: ing.name || '',
          sort_order: i,
        };
      }),
      instructions: parsed.instructions || [],
      tags: parsed.tags || [],
    });
    setMode('manual');
  };

  if (mode === 'choose') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-brown">Add New Recipe</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('import')}
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-terracotta/10 flex items-center justify-center group-hover:bg-terracotta/20 transition-colors duration-200">
              <Link2 size={28} className="text-terracotta" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-brown">Import from URL</h3>
              <p className="text-sm text-warm-gray mt-1">
                Paste a link from your favorite recipe site
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-sage/10 flex items-center justify-center group-hover:bg-sage/20 transition-colors duration-200">
              <BookOpen size={28} className="text-sage" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-brown">Write Manually</h3>
              <p className="text-sm text-warm-gray mt-1">
                Enter your own recipe from scratch
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'import' && !importedData) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brown">Import Recipe</h1>
          <button
            onClick={() => setMode('choose')}
            className="text-sm text-warm-gray hover:text-brown transition-colors"
          >
            Back
          </button>
        </div>

        <ImportForm
          onImportSuccess={handleImportSuccess}
          onImport={importRecipe}
          isLoading={isLoading}
        />

        <div className="text-center">
          <button
            onClick={() => setMode('manual')}
            className="text-sm text-terracotta hover:underline"
          >
            Or enter manually instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown">
          {importedData ? 'Review Imported Recipe' : 'New Recipe'}
        </h1>
        <button
          onClick={() => {
            setMode('choose');
            setImportedData(null);
          }}
          className="text-sm text-warm-gray hover:text-brown transition-colors"
        >
          Back
        </button>
      </div>

      {importedData && (
        <div className="p-3 rounded-xl bg-sage-light/20 text-sage-dark text-sm">
          Recipe imported! Review and edit the details below before saving.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md p-6">
        <RecipeForm
          initialData={importedData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Save Recipe"
        />
      </div>
    </div>
  );
}
