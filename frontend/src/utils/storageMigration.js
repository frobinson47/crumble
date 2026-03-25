const KEY_MAP = {
  'crumble-theme': 'cookslate-theme',
  'crumble_recently_viewed': 'cookslate_recently_viewed',
  'crumble-cook-progress': 'cookslate-cook-progress',
  'crumble-recipe-draft': 'cookslate-recipe-draft',
  'crumble-grocery-grouped': 'cookslate-grocery-grouped',
};

export function migrateLocalStorage() {
  if (localStorage.getItem('cookslate-storage-migrated')) return;
  for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
    const value = localStorage.getItem(oldKey);
    if (value !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, value);
      localStorage.removeItem(oldKey);
    }
  }
  localStorage.setItem('cookslate-storage-migrated', '1');
}
