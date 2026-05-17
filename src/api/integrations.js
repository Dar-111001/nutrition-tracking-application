// AI integrations — not configured yet. Replace with real implementations when needed.

export const InvokeLLM = async () => {
  throw new Error('AI search not configured. Please enter nutritional values manually.');
};

// Search food nutritional values via OpenFoodFacts (free, no API key, multilingual)
export const SearchFood = async (query) => {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,nutriments`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('OpenFoodFacts request failed');
  const data = await response.json();

  return (data.products || [])
    .filter(p => {
      const n = p.nutriments;
      return p.product_name?.trim() &&
        n &&
        n.proteins_100g !== undefined &&
        n.carbohydrates_100g !== undefined &&
        n.fat_100g !== undefined;
    })
    .map(p => ({
      name:    p.product_name.trim(),
      protein: Math.round((p.nutriments.proteins_100g      || 0) * 10) / 10,
      carbs:   Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
      fat:     Math.round((p.nutriments.fat_100g           || 0) * 10) / 10,
    }))
    .slice(0, 5);
};

export const UploadFile = async () => {
  throw new Error('File upload not configured.');
};

export const ExtractDataFromUploadedFile = async () => {
  throw new Error('File extraction not configured.');
};

export const SendEmail = async () => {
  throw new Error('Email not configured.');
};

export const GenerateImage = async () => {
  throw new Error('Image generation not configured.');
};

export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
};
