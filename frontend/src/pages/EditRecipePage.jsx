import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RecipeForm from '../components/recipe/RecipeForm';
import useRecipes from '../hooks/useRecipes';
import Spinner from '../components/ui/Spinner';

export default function EditRecipePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipe, isLoading, error, fetchRecipe, updateRecipe } = useRecipes();

  useEffect(() => {
    fetchRecipe(id);
  }, [id, fetchRecipe]);

  const handleSubmit = async (data, imageFile) => {
    try {
      await updateRecipe(id, data, imageFile);
      navigate(`/recipe/${id}`);
    } catch {
      // Error shown in form
    }
  };

  if (isLoading && !recipe) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-warm-gray">{error || 'Recipe not found'}</p>
      </div>
    );
  }

  // Prepare initial data with parsed instructions
  const initialData = {
    ...recipe,
    instructions: Array.isArray(recipe.instructions)
      ? recipe.instructions
      : typeof recipe.instructions === 'string'
        ? JSON.parse(recipe.instructions)
        : [],
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown">Edit Recipe</h1>
        <button
          onClick={() => navigate(`/recipe/${id}`)}
          className="text-sm text-warm-gray hover:text-brown transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6">
        <RecipeForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Update Recipe"
        />
      </div>
    </div>
  );
}
