// EXPORTS: ITdeeResult, MOCK_TDEE_RESULT
export interface ITdeeResult {
  id: string
  bmr: number
  tdee: number
  targetCalories: number
  carbs: number
  protein: number
  fat: number
  mode: 'training' | 'rest'
  restCarbsDiff: number
}

export const MOCK_TDEE_RESULT: ITdeeResult = {
  id: '1',
  bmr: 1669,
  tdee: 2295,
  targetCalories: 1795,
  carbs: 224,
  protein: 135,
  fat: 40,
  mode: 'training',
  restCarbsDiff: -34,
}