// EXPORTS: searchUsda, searchOpenFoodFacts, searchByBarcode, type NutritionResult
import { getEnv, log } from './index';

export interface NutritionResult {
  id: string;
  name: string;
  source: 'usda' | 'openfoodfacts';
  carbs: number;   // 每 100g
  protein: number; // 每 100g
  fat: number;     // 每 100g
  calories?: number;
  category?: string;
  brand?: string;
  barcode?: string;
}

const USDA_API_KEY = getEnv('USDA_API_KEY');
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

/**
 * USDA FoodData Central 搜索
 * API: /foods/search
 * 免费 API Key：https://fdc.nal.usda.gov/api-key-signup.html
 */
export async function searchUsda(query: string, limit = 10): Promise<NutritionResult[]> {
  if (!USDA_API_KEY) {
    log.warn('[USDA] USDA_API_KEY 未配置，跳过 USDA 查询');
    return [];
  }
  if (!query.trim()) return [];

  try {
    const url = `${USDA_BASE}/foods/search?api_key=${encodeURIComponent(
      USDA_API_KEY,
    )}&query=${encodeURIComponent(query)}&pageSize=${limit}&dataType=SR%20Legacy,Foundation,Survey%20(FNDDS),Branded`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      log.error(`[USDA] HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      foods: Array<{
        fdcId: number;
        description: string;
        dataType: string;
        brandName?: string;
        gtinUpc?: string;
        foodNutrients: Array<{
          nutrientId: number;
          nutrientName: string;
          value: number;
          unitName: string;
        }>;
        foodCategory?: string;
      }>;
    };

    const foods = data.foods ?? [];
    return foods
      .map((f) => {
        const carbs = findNutrient(f.foodNutrients, [1005, 1008]); // 碳水
        const protein = findNutrient(f.foodNutrients, [1003]);     // 蛋白
        const fat = findNutrient(f.foodNutrients, [1004]);          // 脂肪
        const energy = findNutrient(f.foodNutrients, [1008, 1062]); // 能量 kcal
        return {
          id: `usda-${f.fdcId}`,
          name: f.description,
          source: 'usda' as const,
          carbs: carbs.value,
          protein: protein.value,
          fat: fat.value,
          calories: energy.value > 0 ? energy.value : undefined,
          category: f.foodCategory,
          brand: f.brandName,
          barcode: f.gtinUpc,
        };
      })
      .filter(
        (r) =>
          Number.isFinite(r.carbs) &&
          Number.isFinite(r.protein) &&
          Number.isFinite(r.fat),
      );
  } catch (err) {
    log.error('[USDA] search error:', String(err));
    return [];
  }
}

function findNutrient(
  nutrients: Array<{ nutrientId: number; value: number; unitName: string }>,
  ids: number[],
): { value: number } {
  for (const id of ids) {
    const n = nutrients.find((x) => x.nutrientId === id && x.unitName === 'g');
    if (n && Number.isFinite(n.value)) return { value: Number(n.value.toFixed(1)) };
  }
  // 能量单位是 kcal
  for (const id of ids) {
    const n = nutrients.find((x) => x.nutrientId === id);
    if (n && Number.isFinite(n.value)) return { value: Number(n.value.toFixed(1)) };
  }
  return { value: 0 };
}

const OFF_BASE = 'https://world.openfoodfacts.org';

/**
 * Open Food Facts 名称搜索（免费开源，无需 API key）
 */
export async function searchOpenFoodFacts(query: string, limit = 10): Promise<NutritionResult[]> {
  if (!query.trim()) return [];
  try {
    const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(
      query,
    )}&search_simple=1&action=process&json=1&page_size=${limit}&fields=product_name,brands,nutriments,code,categories`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SharkDietApp/1.0 (nutrition lookup tool)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      log.error(`[OFF] HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      products?: Array<{
        product_name?: string;
        brands?: string;
        code?: string;
        categories?: string;
        nutriments?: {
          carbohydrates_100g?: number;
          proteins_100g?: number;
          fat_100g?: number;
          'energy-kcal_100g'?: number;
        };
      }>;
    };

    const products = data.products ?? [];
    return products
      .filter(
        (p) =>
          p.product_name &&
          typeof p.nutriments?.carbohydrates_100g === 'number' &&
          typeof p.nutriments?.proteins_100g === 'number' &&
          typeof p.nutriments?.fat_100g === 'number',
      )
      .map((p) => ({
        id: `off-${p.code ?? Math.random().toString(36).slice(2, 10)}`,
        name: p.product_name!,
        source: 'openfoodfacts' as const,
        carbs: Number(Number(p.nutriments!.carbohydrates_100g).toFixed(1)),
        protein: Number(Number(p.nutriments!.proteins_100g).toFixed(1)),
        fat: Number(Number(p.nutriments!.fat_100g).toFixed(1)),
        calories: p.nutriments?.['energy-kcal_100g']
          ? Number(Number(p.nutriments['energy-kcal_100g']).toFixed(0))
          : undefined,
        category: p.categories,
        brand: p.brands,
        barcode: p.code,
      }));
  } catch (err) {
    log.error('[OFF] search error:', String(err));
    return [];
  }
}

/**
 * Open Food Facts 条码查询
 */
export async function searchByBarcode(barcode: string): Promise<NutritionResult | null> {
  if (!/^\d{8,14}$/.test(barcode)) return null;
  try {
    const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}?fields=product_name,brands,nutriments,code,categories`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SharkDietApp/1.0 (nutrition lookup tool)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: number;
      product?: {
        product_name?: string;
        brands?: string;
        code?: string;
        categories?: string;
        nutriments?: {
          carbohydrates_100g?: number;
          proteins_100g?: number;
          fat_100g?: number;
          'energy-kcal_100g'?: number;
        };
      };
    };
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const n = p.nutriments;
    if (
      !p.product_name ||
      typeof n?.carbohydrates_100g !== 'number' ||
      typeof n?.proteins_100g !== 'number' ||
      typeof n?.fat_100g !== 'number'
    ) {
      return null;
    }
    return {
      id: `off-${p.code ?? barcode}`,
      name: p.product_name,
      source: 'openfoodfacts',
      carbs: Number(Number(n.carbohydrates_100g).toFixed(1)),
      protein: Number(Number(n.proteins_100g).toFixed(1)),
      fat: Number(Number(n.fat_100g).toFixed(1)),
      calories: n['energy-kcal_100g'] ? Number(Number(n['energy-kcal_100g']).toFixed(0)) : undefined,
      category: p.categories,
      brand: p.brands,
      barcode: p.code ?? barcode,
    };
  } catch (err) {
    log.error('[OFF] barcode error:', String(err));
    return null;
  }
}
