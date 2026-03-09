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

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

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
