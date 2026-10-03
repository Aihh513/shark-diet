// EXPORTS: IFood, MOCK_FOODS, FOOD_CATEGORIES, IFoodCategory
export interface IFood {
  id: string
  name: string
  category: string   // 分类 key
  weightType: 'raw' | 'cooked' | 'dry' | 'other'  // 生重 / 熟重 / 干重 / 其他
  carbs: number      // 每100g 碳水 g
  protein: number    // 每100g 蛋白 g
  fat: number        // 每100g 脂肪 g
}

export interface IFoodCategory {
  key: string
  label: string
  icon: string       // 文字 emoji 作分类图标，轻量
}

export const FOOD_CATEGORIES: IFoodCategory[] = [
  { key: 'custom', label: '我的自定义', icon: '⭐' },
  { key: 'meat', label: '肉类蛋类', icon: '🍖' },
  { key: 'staple', label: '主食', icon: '🍚' },
  { key: 'dairy', label: '乳制品/补剂', icon: '🥛' },
  { key: 'vegetable', label: '蔬菜', icon: '🥦' },
  { key: 'fruit', label: '水果', icon: '🍎' },
  { key: 'fat', label: '脂肪来源', icon: '🥑' },
  { key: 'bean', label: '豆类/豆制品', icon: '🫘' },
  { key: 'other', label: '其他', icon: '🍫' },
]

export const MOCK_FOODS: IFood[] = [
  // ===== 肉类 / 蛋类（生重）=====
  { id: '1', name: '鸡胸肉', category: 'meat', weightType: 'raw', carbs: 0, protein: 23, fat: 1.2 },
  { id: '2', name: '猪里脊', category: 'meat', weightType: 'raw', carbs: 0, protein: 20.2, fat: 7.9 },
  { id: '3', name: '牛里脊', category: 'meat', weightType: 'raw', carbs: 0, protein: 22, fat: 5 },
  { id: '4', name: '虾仁', category: 'meat', weightType: 'raw', carbs: 0, protein: 20, fat: 0.5 },
  { id: '5', name: '鸡蛋（全蛋）', category: 'meat', weightType: 'other', carbs: 1.5, protein: 13, fat: 8.8 },
  { id: '6', name: '鸡蛋清', category: 'meat', weightType: 'other', carbs: 1.1, protein: 11.6, fat: 0.1 },
  { id: '101', name: '三文鱼', category: 'meat', weightType: 'raw', carbs: 0, protein: 20, fat: 13 },
  { id: '102', name: '鳕鱼', category: 'meat', weightType: 'raw', carbs: 0, protein: 20, fat: 0.7 },
  { id: '103', name: '金枪鱼', category: 'meat', weightType: 'raw', carbs: 0, protein: 23, fat: 1 },
  { id: '104', name: '虾（熟）', category: 'meat', weightType: 'cooked', carbs: 0, protein: 24, fat: 0.3 },
  { id: '105', name: '鸡蛋黄', category: 'meat', weightType: 'other', carbs: 3.4, protein: 15.9, fat: 26.5 },
  { id: '106', name: '鸡腿肉（去皮）', category: 'meat', weightType: 'raw', carbs: 0, protein: 18, fat: 7 },
  { id: '107', name: '牛肉（瘦）', category: 'meat', weightType: 'raw', carbs: 0, protein: 20, fat: 5 },
  { id: '108', name: '鸭肉（去皮）', category: 'meat', weightType: 'raw', carbs: 0, protein: 18, fat: 7 },
  { id: '109', name: '瘦羊肉', category: 'meat', weightType: 'raw', carbs: 0, protein: 20, fat: 8 },

  // ===== 主食类 =====
  { id: '7', name: '米饭', category: 'staple', weightType: 'cooked', carbs: 25.9, protein: 2.6, fat: 0.3 },
  { id: '8', name: '红薯（带皮）', category: 'staple', weightType: 'cooked', carbs: 24.5, protein: 1.6, fat: 0.2 },
  { id: '9', name: '土豆', category: 'staple', weightType: 'cooked', carbs: 17, protein: 2, fat: 0.1 },
  { id: '10', name: '燕麦（干）', category: 'staple', weightType: 'dry', carbs: 66, protein: 15, fat: 7 },
  { id: '201', name: '紫薯', category: 'staple', weightType: 'cooked', carbs: 25, protein: 1.2, fat: 0.2 },
  { id: '202', name: '玉米', category: 'staple', weightType: 'cooked', carbs: 22.8, protein: 4, fat: 1.2 },
  { id: '203', name: '糙米', category: 'staple', weightType: 'cooked', carbs: 23, protein: 2.6, fat: 0.9 },
  { id: '204', name: '荞麦面', category: 'staple', weightType: 'cooked', carbs: 25, protein: 5, fat: 0.5 },
  { id: '205', name: '全麦面包', category: 'staple', weightType: 'other', carbs: 41, protein: 13, fat: 3.4 },
  { id: '206', name: '红薯（生）', category: 'staple', weightType: 'raw', carbs: 20.1, protein: 1.6, fat: 0.2 },
  { id: '207', name: '燕麦（熟）', category: 'staple', weightType: 'cooked', carbs: 12, protein: 3, fat: 1.5 },
  { id: '208', name: '意面', category: 'staple', weightType: 'cooked', carbs: 25, protein: 6, fat: 0.5 },

  // ===== 乳制品 / 补剂 =====
  { id: '11', name: '无糖豆浆', category: 'dairy', weightType: 'other', carbs: 1.2, protein: 3, fat: 1.6 },
  { id: '12', name: '蛋白粉', category: 'dairy', weightType: 'dry', carbs: 10, protein: 75.6, fat: 5 },
  { id: '301', name: '希腊酸奶（无糖）', category: 'dairy', weightType: 'other', carbs: 4, protein: 10, fat: 0.5 },
  { id: '302', name: '牛奶（脱脂）', category: 'dairy', weightType: 'other', carbs: 5, protein: 3.4, fat: 0.1 },
  { id: '303', name: '牛奶（全脂）', category: 'dairy', weightType: 'other', carbs: 5, protein: 3.2, fat: 3.6 },
  { id: '304', name: '低脂奶酪', category: 'dairy', weightType: 'other', carbs: 3, protein: 25, fat: 10 },
  { id: '305', name: '肌酸（一水）', category: 'dairy', weightType: 'dry', carbs: 0, protein: 0, fat: 0 },

  // ===== 蔬菜类 =====
  { id: '401', name: '西兰花', category: 'vegetable', weightType: 'cooked', carbs: 7, protein: 3.5, fat: 0.4 },
  { id: '402', name: '菠菜', category: 'vegetable', weightType: 'cooked', carbs: 3.5, protein: 2.8, fat: 0.3 },
  { id: '403', name: '生菜', category: 'vegetable', weightType: 'raw', carbs: 2, protein: 1, fat: 0.2 },
  { id: '404', name: '黄瓜', category: 'vegetable', weightType: 'raw', carbs: 3.6, protein: 0.7, fat: 0.1 },
  { id: '405', name: '番茄', category: 'vegetable', weightType: 'raw', carbs: 4, protein: 0.9, fat: 0.2 },
  { id: '406', name: '芦笋', category: 'vegetable', weightType: 'cooked', carbs: 5, protein: 2.9, fat: 0.2 },
  { id: '407', name: '卷心菜', category: 'vegetable', weightType: 'cooked', carbs: 6, protein: 1.7, fat: 0.1 },

  // ===== 水果类 =====
  { id: '501', name: '香蕉', category: 'fruit', weightType: 'raw', carbs: 22.8, protein: 1.1, fat: 0.3 },
  { id: '502', name: '苹果', category: 'fruit', weightType: 'raw', carbs: 13.8, protein: 0.3, fat: 0.2 },
  { id: '503', name: '蓝莓', category: 'fruit', weightType: 'raw', carbs: 14.5, protein: 0.7, fat: 0.3 },
  { id: '504', name: '牛油果', category: 'fruit', weightType: 'raw', carbs: 8.5, protein: 2, fat: 15 },

  // ===== 脂肪来源 =====
  { id: '13', name: '无添加花生酱', category: 'fat', weightType: 'other', carbs: 20, protein: 25, fat: 50 },
  { id: '601', name: '橄榄油', category: 'fat', weightType: 'other', carbs: 0, protein: 0, fat: 100 },
  { id: '602', name: '混合坚果', category: 'fat', weightType: 'dry', carbs: 20, protein: 20, fat: 50 },
  { id: '603', name: '杏仁', category: 'fat', weightType: 'dry', carbs: 20, protein: 21, fat: 50 },
  { id: '604', name: '蛋黄酱（低脂）', category: 'fat', weightType: 'other', carbs: 3, protein: 1, fat: 25 },

  // ===== 豆类 / 豆制品 =====
  { id: '701', name: '豆腐（北）', category: 'bean', weightType: 'other', carbs: 2, protein: 8, fat: 4.8 },
  { id: '702', name: '毛豆', category: 'bean', weightType: 'cooked', carbs: 11, protein: 11, fat: 5 },
  { id: '703', name: '鹰嘴豆', category: 'bean', weightType: 'cooked', carbs: 27, protein: 9, fat: 2.6 },

  // ===== 其他 =====
  { id: '801', name: '黑巧克力（70%+）', category: 'other', weightType: 'other', carbs: 45, protein: 8, fat: 43 },
  { id: '802', name: '蜂蜜', category: 'other', weightType: 'other', carbs: 82, protein: 0.3, fat: 0 },
  { id: '803', name: '白砂糖', category: 'other', weightType: 'other', carbs: 99.9, protein: 0, fat: 0 },
]
