/**
 * Generates a pretty recipe "note card" image using Canvas.
 * Returns a Blob (PNG) and a data URL for preview.
 */

const CARD_WIDTH = 1080;
const PADDING = 60;
const CONTENT_WIDTH = CARD_WIDTH - PADDING * 2;

// Colors matching Cookslate design tokens
const COLORS = {
  bg: '#FFF8F0',
  title: '#4A3728',
  text: '#6B5B4F',
  accent: '#C4704A',
  divider: '#E8DDD3',
  tagBg: '#E8DDD3',
  tagText: '#6B5B4F',
  white: '#FFFFFF',
};

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function formatIngredient(ing) {
  const parts = [];
  if (ing.amount) parts.push(ing.amount);
  if (ing.unit) parts.push(ing.unit);
  if (ing.name) parts.push(ing.name);
  return parts.join(' ') || ing.name || '';
}

export async function generateRecipeCard(recipe, imageUrl) {
  // Measure pass: calculate total height
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = CARD_WIDTH;
  measureCanvas.height = 100;
  const mCtx = measureCanvas.getContext('2d');

  let totalHeight = PADDING; // top padding

  // Image area
  const IMG_HEIGHT = imageUrl ? 400 : 0;
  totalHeight += IMG_HEIGHT;
  if (imageUrl) totalHeight += 30; // gap after image

  // Title
  mCtx.font = 'bold 48px Georgia, serif';
  const titleLines = wrapText(mCtx, recipe.title, CONTENT_WIDTH);
  totalHeight += titleLines.length * 58;
  totalHeight += 16; // gap

  // Description
  let descLines = [];
  if (recipe.description) {
    mCtx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    descLines = wrapText(mCtx, recipe.description, CONTENT_WIDTH);
    totalHeight += descLines.length * 34 + 16;
  }

  // Metadata line
  const metaParts = [];
  if (recipe.prep_time) metaParts.push(`Prep: ${recipe.prep_time} min`);
  if (recipe.cook_time) metaParts.push(`Cook: ${recipe.cook_time} min`);
  if (recipe.servings) metaParts.push(`Serves: ${recipe.servings}`);
  if (metaParts.length > 0) totalHeight += 40 + 20;

  // Divider
  totalHeight += 20;

  // Ingredients
  const ingredients = recipe.ingredients || [];
  if (ingredients.length > 0) {
    totalHeight += 44; // heading
    mCtx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    for (const ing of ingredients) {
      const text = formatIngredient(ing);
      const lines = wrapText(mCtx, `• ${text}`, CONTENT_WIDTH);
      totalHeight += lines.length * 30;
    }
    totalHeight += 20; // gap
  }

  // Divider
  totalHeight += 20;

  // Instructions
  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : typeof recipe.instructions === 'string'
      ? JSON.parse(recipe.instructions)
      : [];
  if (instructions.length > 0) {
    totalHeight += 44; // heading
    mCtx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    for (let i = 0; i < instructions.length; i++) {
      const text = typeof instructions[i] === 'string' ? instructions[i] : instructions[i].text || '';
      const lines = wrapText(mCtx, `${i + 1}. ${text}`, CONTENT_WIDTH - 10);
      totalHeight += lines.length * 30 + 8;
    }
    totalHeight += 10;
  }

  // Footer
  totalHeight += 40 + PADDING; // branding + bottom padding

  // Now draw
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.bg;
  roundRect(ctx, 0, 0, CARD_WIDTH, totalHeight, 32);
  ctx.fill();

  let y = PADDING;

  // Recipe image
  if (imageUrl) {
    try {
      const img = await loadImage(imageUrl);
      const aspectRatio = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      const targetAspect = CONTENT_WIDTH / IMG_HEIGHT;
      if (aspectRatio > targetAspect) {
        sw = img.height * targetAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetAspect;
        sy = (img.height - sh) / 2;
      }

      // Clip rounded image
      ctx.save();
      roundRect(ctx, PADDING, y, CONTENT_WIDTH, IMG_HEIGHT, 20);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, PADDING, y, CONTENT_WIDTH, IMG_HEIGHT);
      ctx.restore();

      y += IMG_HEIGHT + 30;
    } catch {
      // Image failed to load, skip it
    }
  }

  // Title
  ctx.font = 'bold 48px Georgia, serif';
  ctx.fillStyle = COLORS.title;
  for (const line of titleLines) {
    ctx.fillText(line, PADDING, y + 48);
    y += 58;
  }
  y += 16;

  // Description
  if (descLines.length > 0) {
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = COLORS.text;
    for (const line of descLines) {
      ctx.fillText(line, PADDING, y + 24);
      y += 34;
    }
    y += 16;
  }

  // Metadata
  if (metaParts.length > 0) {
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = COLORS.accent;
    ctx.fillText(metaParts.join('  |  '), PADDING, y + 22);
    y += 40 + 20;
  }

  // Divider
  ctx.fillStyle = COLORS.divider;
  ctx.fillRect(PADDING, y, CONTENT_WIDTH, 2);
  y += 20;

  // Ingredients
  if (ingredients.length > 0) {
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillStyle = COLORS.title;
    ctx.fillText('Ingredients', PADDING, y + 30);
    y += 44;

    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = COLORS.text;
    for (const ing of ingredients) {
      const text = formatIngredient(ing);
      const lines = wrapText(ctx, `• ${text}`, CONTENT_WIDTH);
      for (const line of lines) {
        ctx.fillText(line, PADDING, y + 22);
        y += 30;
      }
    }
    y += 20;
  }

  // Divider
  ctx.fillStyle = COLORS.divider;
  ctx.fillRect(PADDING, y, CONTENT_WIDTH, 2);
  y += 20;

  // Instructions
  if (instructions.length > 0) {
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillStyle = COLORS.title;
    ctx.fillText('Instructions', PADDING, y + 30);
    y += 44;

    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = COLORS.text;
    for (let i = 0; i < instructions.length; i++) {
      const text = typeof instructions[i] === 'string' ? instructions[i] : instructions[i].text || '';
      const lines = wrapText(ctx, `${i + 1}. ${text}`, CONTENT_WIDTH - 10);
      for (const line of lines) {
        ctx.fillText(line, PADDING, y + 22);
        y += 30;
      }
      y += 8;
    }
  }

  // Footer branding
  y += 10;
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = COLORS.divider;
  ctx.fillText('Made with Cookslate', PADDING, y + 18);

  // Export
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({
        blob,
        dataUrl: canvas.toDataURL('image/png'),
      });
    }, 'image/png');
  });
}

/**
 * Build a plain-text version of the recipe for email body.
 */
export function recipeToText(recipe) {
  const lines = [recipe.title, ''];

  if (recipe.description) {
    lines.push(recipe.description, '');
  }

  const meta = [];
  if (recipe.prep_time) meta.push(`Prep: ${recipe.prep_time} min`);
  if (recipe.cook_time) meta.push(`Cook: ${recipe.cook_time} min`);
  if (recipe.servings) meta.push(`Serves: ${recipe.servings}`);
  if (meta.length) lines.push(meta.join(' | '), '');

  const ingredients = recipe.ingredients || [];
  if (ingredients.length) {
    lines.push('INGREDIENTS', '---');
    for (const ing of ingredients) {
      lines.push(`• ${formatIngredient(ing)}`);
    }
    lines.push('');
  }

  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : typeof recipe.instructions === 'string'
      ? JSON.parse(recipe.instructions)
      : [];
  if (instructions.length) {
    lines.push('INSTRUCTIONS', '---');
    instructions.forEach((step, i) => {
      const text = typeof step === 'string' ? step : step.text || '';
      lines.push(`${i + 1}. ${text}`);
    });
  }

  return lines.join('\n');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
