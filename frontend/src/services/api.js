const BASE_URL = '/api';

let csrfToken = null;

async function request(endpoint, options = {}) {
  const { body, method = 'GET', isFormData = false } = options;

  const config = {
    method,
    credentials: 'include',
    headers: {},
  };

  if (method !== 'GET' && csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  if (body && !isFormData) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  } else if (body && isFormData) {
    config.body = body;
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, config);

  // Auto-retry on CSRF token expiry — refresh token and retry once
  if (response.status === 403 && method !== 'GET') {
    try {
      const errorData = await response.clone().json();
      if (errorData.error && errorData.error.toLowerCase().includes('csrf')) {
        // Refresh the CSRF token
        const me = await fetch(`${BASE_URL}/auth/me`, { credentials: 'include' });
        if (me.ok) {
          const meData = await me.json();
          if (meData.csrf_token) {
            csrfToken = meData.csrf_token;
            config.headers['X-CSRF-Token'] = csrfToken;
            // Retry the original request
            response = await fetch(`${BASE_URL}${endpoint}`, config);
          }
        }
      }
    } catch {
      // If refresh fails, fall through to normal error handling
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Response was not JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Auth
export async function login(username, password) {
  const user = await request('/auth/login', { method: 'POST', body: { username, password } });
  if (user && !user.error) {
    // Fetch CSRF token after successful login
    const me = await request('/auth/me');
    if (me && me.csrf_token) {
      csrfToken = me.csrf_token;
    }
  }
  return user;
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export async function getMe() {
  const user = await request('/auth/me');
  if (user && user.csrf_token) {
    csrfToken = user.csrf_token;
    delete user.csrf_token;
  }
  return user;
}

// SSO
export function getSsoConfig() {
  return request('/auth/sso-config');
}

// Recipes
export function getRecipes(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.perPage) query.set('per_page', params.perPage);
  if (params.search) query.set('search', params.search);
  if (params.tag) query.set('tag', params.tag);
  const qs = query.toString();
  return request(`/recipes${qs ? '?' + qs : ''}`);
}

export function getRecipe(id) {
  return request(`/recipes/${id}`);
}

export function createRecipe(data, imageFile) {
  if (imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('data', JSON.stringify(data));
    return request('/recipes', { method: 'POST', body: formData, isFormData: true });
  }
  return request('/recipes', { method: 'POST', body: data });
}

export function updateRecipe(id, data, imageFile) {
  if (imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('data', JSON.stringify(data));
    return request(`/recipes/${id}`, { method: 'PUT', body: formData, isFormData: true });
  }
  return request(`/recipes/${id}`, { method: 'PUT', body: data });
}

export function deleteRecipe(id) {
  return request(`/recipes/${id}`, { method: 'DELETE' });
}

export function importRecipe(url) {
  return request('/recipes/import', { method: 'POST', body: { url } });
}

export function importBatch(urls) {
  return request('/recipes/import-batch', { method: 'POST', body: { urls } });
}

export function importMealie(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/recipes/import-mealie', { method: 'POST', body: formData, isFormData: true });
}

export function importPaprika(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/recipes/import-paprika', { method: 'POST', body: formData, isFormData: true });
}

// Tags
export function getTags() {
  return request('/tags');
}

export function deleteTag(id) {
  return request(`/tags/${id}`, { method: 'DELETE' });
}

// Grocery Lists
export function getGroceryLists() {
  return request('/grocery');
}

export function createGroceryList(name) {
  return request('/grocery', { method: 'POST', body: { name } });
}

export function getGroceryList(id) {
  return request(`/grocery/${id}`);
}

export function addGroceryItem(listId, item) {
  return request(`/grocery/${listId}/items`, { method: 'POST', body: item });
}

export function updateGroceryItem(listId, itemId, fields) {
  return request(`/grocery/${listId}/items/${itemId}`, { method: 'PUT', body: fields });
}

export function deleteGroceryItem(listId, itemId) {
  return request(`/grocery/${listId}/items/${itemId}`, { method: 'DELETE' });
}

export function deleteGroceryList(id) {
  return request(`/grocery/${id}`, { method: 'DELETE' });
}

export function addRecipeToGrocery(listId, recipeId) {
  return request(`/grocery/${listId}/recipes/${recipeId}`, { method: 'POST' });
}

export function clearCheckedItems(listId) {
  return request(`/grocery/${listId}/checked`, { method: 'DELETE' });
}

// Favorites
export function toggleFavorite(recipeId) {
  return request(`/recipes/${recipeId}/favorite`, { method: 'POST' });
}

export function getFavorites() {
  return request('/favorites');
}

// Ratings
export function rateRecipe(recipeId, score) {
  return request(`/recipes/${recipeId}/rate`, { method: 'POST', body: { score } });
}

// Cook Log
export function logCook(recipeId, notes = null) {
  return request(`/recipes/${recipeId}/cook`, { method: 'POST', body: { notes } });
}

export function getCookLog() {
  return request('/cook-log');
}

export function getRecipeCookLog(recipeId) {
  return request(`/recipes/${recipeId}/cook-log`);
}

export function getForgottenFavorites() {
  return request('/cook-log/forgotten-favorites');
}

export function getUncookedRecipes() {
  return request('/recipes/uncooked');
}

// Featured & Related
export function getFeaturedRecipe() {
  return request('/recipes/featured');
}

export function getRelatedRecipes(recipeId) {
  return request(`/recipes/${recipeId}/related`);
}

// Users (admin)
export function getUsers() {
  return request('/users');
}

export function createUser(username, password, role, email) {
  return request('/users', { method: 'POST', body: { username, password, role, email } });
}

export function resetPassword(id, newPassword) {
  return request(`/users/${id}/password`, { method: 'PUT', body: { password: newPassword } });
}

export function updateUser(id, data) {
  return request(`/users/${id}`, { method: 'PUT', body: data });
}

export function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' });
}

// Recipe Sharing
export function createShareLink(recipeId) {
  return request(`/recipes/${recipeId}/share`, { method: 'POST' });
}

export function revokeShareLink(recipeId) {
  return request(`/recipes/${recipeId}/share`, { method: 'DELETE' });
}

export function getSharedRecipe(token) {
  return request(`/shared/${token}`);
}

// Meal Planning
export function getMealPlan(weekStart) {
  return request(`/meal-plan?week=${weekStart}`);
}

export function getTodayMeals() {
  return request('/meal-plan/today');
}

export function addMealPlanItem(recipeId, dayOfWeek, weekStart) {
  return request('/meal-plan/items', {
    method: 'POST',
    body: { recipe_id: recipeId, day_of_week: dayOfWeek, week_start: weekStart },
  });
}

export function updateMealPlanItem(itemId, data) {
  return request(`/meal-plan/items/${itemId}`, {
    method: 'PUT',
    body: data,
  });
}

export function removeMealPlanItem(itemId) {
  return request(`/meal-plan/items/${itemId}`, { method: 'DELETE' });
}

export function generateGroceryFromPlan(weekStart, listName) {
  return request('/meal-plan/grocery', {
    method: 'POST',
    body: { week_start: weekStart, list_name: listName },
  });
}

// Data Export
export function exportRecipes() {
  return request('/recipes/export');
}

// Ingredient-based search ("What can I make?")
export function findByIngredients(ingredients) {
  return request(`/recipes/by-ingredients?ingredients=${encodeURIComponent(ingredients.join(','))}`);
}

// Stats
export function getStats() {
  return request('/stats');
}

// Annotations
export function getAnnotations(recipeId) {
  return request(`/recipes/${recipeId}/annotations`);
}

export function saveAnnotation(recipeId, targetType, targetIndex, note) {
  return request(`/recipes/${recipeId}/annotations`, {
    method: 'PUT',
    body: { target_type: targetType, target_index: targetIndex, note },
  });
}

export function deleteAnnotation(recipeId, targetType, targetIndex) {
  return request(`/recipes/${recipeId}/annotations`, {
    method: 'DELETE',
    body: { target_type: targetType, target_index: targetIndex },
  });
}

// Discover (TheMealDB)
export function getDiscoverMeals() {
  return request('/discover');
}

export function searchDiscoverMeals(query) {
  return request(`/discover/search?q=${encodeURIComponent(query)}`);
}

export function getDiscoverCategories() {
  return request('/discover/categories');
}

export function getDiscoverByCategory(name) {
  return request(`/discover/category?name=${encodeURIComponent(name)}`);
}

export function getDiscoverMeal(mealdbId) {
  return request(`/discover/${mealdbId}`);
}

export function importDiscoverMeal(mealdbId) {
  return request('/discover/import', { method: 'POST', body: { mealdb_id: mealdbId } });
}

// Food Lookup (Open Food Facts)
export function lookupBarcode(code) {
  return request(`/food-lookup/barcode?code=${encodeURIComponent(code)}`);
}

export function searchFoodProducts(query) {
  return request(`/food-lookup/search?q=${encodeURIComponent(query)}`);
}

// Ingredient Database
export function getIngredientData(search = '') {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return request(`/ingredient-data${qs}`);
}

export function updateIngredientData(id, data) {
  return request(`/ingredient-data/${id}`, { method: 'PUT', body: data });
}

export function createIngredientData(data) {
  return request('/ingredient-data', { method: 'POST', body: data });
}

export function deleteIngredientData(id) {
  return request(`/ingredient-data/${id}`, { method: 'DELETE' });
}

export function autoNutrition(ingredientNames, servings) {
  return request('/ingredient-data/auto-nutrition', { method: 'POST', body: { ingredients: ingredientNames, servings } });
}

export function searchUsda(query) {
  return request(`/ingredient-data/usda-search?q=${encodeURIComponent(query)}`);
}

// Recipe Analysis
export function analyzeRecipe(recipeId) {
  return request(`/recipes/${recipeId}/analyze`);
}

// License
export function getLicenseStatus() {
  return request('/license/status');
}

export function activateLicense(key) {
  return request('/license/activate', { method: 'POST', body: { key } });
}

export function deactivateLicense() {
  return request('/license/deactivate', { method: 'POST' });
}
