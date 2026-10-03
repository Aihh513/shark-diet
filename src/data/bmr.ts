// EXPORTS: IFood, MOCK_FOODS
export interface IFood {
  id: string
  name: string
  carbs: number
  protein: number
  fat: number
}

export const MOCK_FOODS: IFood[] = [
  { id: '1', name: '鸡胸肉(生)', carbs: 0, protein: 23, fat: 1.2 },
  { id: '2', name: '猪里脊(生)', carbs: 0, protein: 20.2, fat: 7.9 },
  { id: '3', name: '牛里脊(生)', carbs: 0, protein: 22, fat: 5 },
  { id: '4', name: '虾仁(生)', carbs: 0, protein: 20, fat: 0.5 },
  { id: '5', name: '鸡蛋(全蛋)', carbs: 1.5, protein: 13, fat: 8.8 },
  { id: '6', name: '鸡蛋清', carbs: 1.1, protein: 11.6, fat: 0.1 },
  { id: '7', name: '米饭(熟)', carbs: 25.9, protein: 2.6, fat: 0.3 },
  { id: '8', name: '红薯(熟带皮)', carbs: 24.5, protein: 1.6, fat: 0.2 },
  { id: '9', name: '土豆(熟)', carbs: 17, protein: 2, fat: 0.1 },
  { id: '10', name: '燕麦(干)', carbs: 66, protein: 15, fat: 7 },
  { id: '11', name: '无糖豆浆', carbs: 1.2, protein: 3, fat: 1.6 },
  { id: '12', name: '蛋白粉', carbs: 10, protein: 75.6, fat: 5 },
  { id: '13', name: '无添加花生酱', carbs: 20, protein: 25, fat: 50 },
]