// EXPORTS: calcBMR, calcTDEE, calcTargetCalories, calcMacros, calcFoodMacros, type DietParams, type MacroValues, type FoodEntry, type DietMode

export type Gender = 'male' | 'female';
export type ActivityFactor = 1.2 | 1.375 | 1.55 | 1.725;
export type Goal = 'cut' | 'maintain' | 'bulk';
export type DietMode = 'training' | 'rest';

export interface DietParams {
  height: number;
  weight: number;
  age: number;
  gender: Gender;
  activityFactor: ActivityFactor;
  goal: Goal;
  deficit: number;
  surplus: number;
}

export interface MacroValues {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface FoodEntry {
  id: string;
  foodId: string;
  grams: number;
}

/** Mifflin-St Jeor BMR 公式 */
export function calcBMR({ weight, height, age, gender }: DietParams): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calcTDEE(params: DietParams): number {
  return calcBMR(params) * params.activityFactor;
}

/** 目标总热量（kcal） */
export function calcTargetCalories(params: DietParams): number {
  const tdee = calcTDEE(params);
  if (params.goal === 'cut') return Math.max(800, tdee - params.deficit);
  if (params.goal === 'bulk') return tdee + params.surplus;
  return tdee;
}

/**
 * 按 5:3:2 配比计算宏量（训练日）
 * 休息日碳水下调 15%，蛋白脂肪不变
 */
export function calcMacros(params: DietParams, mode: DietMode): MacroValues {
  const calories = calcTargetCalories(params);
  const trainingCarbs = (calories * 0.5) / 4;
  const protein = (calories * 0.3) / 4;
  const fat = (calories * 0.2) / 9;
  const carbs = mode === 'rest' ? trainingCarbs * 0.85 : trainingCarbs;
  const totalCal = carbs * 4 + protein * 4 + fat * 9;
  return {
    calories: Math.round(totalCal),
    carbs: Math.round(carbs),
    protein: Math.round(protein),
    fat: Math.round(fat),
  };
}

/** 计算单种食物在指定克数下的宏量 */
export function calcFoodMacros(
  food: { carbs: number; protein: number; fat: number },
  grams: number,
): MacroValues {
  const ratio = grams / 100;
  const carbs = food.carbs * ratio;
  const protein = food.protein * ratio;
  const fat = food.fat * ratio;
  const calories = carbs * 4 + protein * 4 + fat * 9;
  return { calories, carbs, protein, fat };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round0(n: number): number {
  return Math.round(n);
}
