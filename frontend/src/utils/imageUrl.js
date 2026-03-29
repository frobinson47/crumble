/**
 * Build image URLs from the stored image_path (e.g., "recipes/10/full.webp" or legacy "recipes/10/full.jpg").
 */

export function fullImageUrl(imagePath) {
  if (!imagePath) return null;
  return `/uploads/${imagePath}`;
}

export function thumbImageUrl(imagePath) {
  if (!imagePath) return null;
  // Support both .webp (new) and .jpg (legacy) paths
  return `/uploads/${imagePath.replace(/full\.(webp|jpg)$/, 'thumb.$1')}`;
}
