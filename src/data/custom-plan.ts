// EXPORTS: type CustomPlan, type PlanPreferences, type PlanStep, PLAN_STEPS

export interface PlanPreferences {
  // 训练安排
  trainingFrequency: number;          // 每周训练次数 0-7
  trainingSplit: string;              // 训练分化类型：pushpull / upperlower / fullbody / four / five / other
  trainingCycle: string;               // 训练循环节奏：consecutive / split
  trainingDays: string[];             // 具体训练日：['mon', 'tue', ...]
  trainingTime: string;               // 训练时间段：morning / afternoon / evening
  // 食材偏好
  likedFoods: string;                 // 喜欢/常吃的食物
  dislikedFoods: string;              // 不吃/排斥的食物
  allergies: string;                  // 过敏食物
  // 作息
  wakeUpTime: string;                 // 起床时间 HH:mm
  mealTimes: string;                  // 用餐时间习惯描述
  // 饮食偏好
  tastePreference: 'light' | 'medium' | 'heavy';  // 清淡/中等/重口
  eatOutFrequency: 'rare' | 'sometimes' | 'often'; // 外食频率
  cookingSkill: 'none' | 'basic' | 'good';         // 烹饪能力
  // 现有食材/补给
  pantryItems: string;                // 家里现有的食材
  supplements: string;                // 使用的补剂
  // 其他
  additionalNotes: string;            // 其他备注
}

export interface CustomPlan {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  // 基础参数快照
  paramsSnapshot: {
    height: number;
    weight: number;
    age: number;
    gender: 'male' | 'female';
    activityFactor: number;
    goal: 'cut' | 'maintain' | 'bulk';
    deficit: number;
    surplus: number;
    bmr: number;
    tdee: number;
    targetCalories: number;
  };
  // 偏好设置
  preferences: PlanPreferences;
  // AI 生成的计划内容（markdown）
  content: string;
  // 调整历史
  adjustments: Array<{
    id: string;
    timestamp: number;
    userFeedback: string;
    adjustedContent: string;
  }>;
  // 当前展示的版本内容
  currentContent: string;
  // 状态
  status: 'generating' | 'ready' | 'failed';
}

export type PlanStep = 'basics' | 'preferences' | 'generating' | 'result';

export const PLAN_STEPS: { key: PlanStep; label: string; description: string }[] = [
  { key: 'basics', label: '基础信息', description: '身体参数与目标' },
  { key: 'preferences', label: '个性化偏好', description: '训练、饮食、作息' },
  { key: 'generating', label: '生成计划', description: 'AI 教练定制中' },
  { key: 'result', label: '计划详情', description: '查看与调整' },
];

// 训练分化选项
export const TRAINING_SPLIT_OPTIONS = [
  { value: 'pushpull', label: '推拉腿三分化' },
  { value: 'upperlower', label: '上下肢分化' },
  { value: 'fullbody', label: '全身训练' },
  { value: 'four', label: '四分化训练' },
  { value: 'five', label: '五分化训练' },
  { value: 'other', label: '其他方式' },
];

// 训练循环节奏选项
export const TRAINING_CYCLE_OPTIONS = [
  {
    value: 'consecutive',
    label: '练N天休1天（连练型）',
    description: '连续练完再集中休息，休息日结束后开启下一个循环。四分化=练4休1，五分化=练5休1。适合喜欢连续训练的人。',
  },
  {
    value: 'split',
    label: '分段排布（劳逸结合）',
    description: '将训练日分成两段，中间插入一天休息，避免身体过度疲劳。四分化=练2休1再练2（2+1+2），五分化=练3休1再练2（3+1+2）。',
  },
];

// 口味偏好选项
export const TASTE_OPTIONS = [
  { value: 'light', label: '清淡' },
  { value: 'medium', label: '适中' },
  { value: 'heavy', label: '重口' },
];

// 外食频率选项
export const EAT_OUT_OPTIONS = [
  { value: 'rare', label: '很少（≤1次/周）' },
  { value: 'sometimes', label: '偶尔（2-3次/周）' },
  { value: 'often', label: '经常（≥4次/周）' },
];

// 烹饪能力选项
export const COOKING_OPTIONS = [
  { value: 'none', label: '基本不会' },
  { value: 'basic', label: '会做简单菜' },
  { value: 'good', label: '厨艺不错' },
];

// 训练时间选项
export const TRAINING_TIME_OPTIONS = [
  { value: 'morning', label: '早上（6-9点）' },
  { value: 'afternoon', label: '下午（14-17点）' },
  { value: 'evening', label: '晚上（18-22点）' },
];

export const DEFAULT_PREFERENCES: PlanPreferences = {
  trainingFrequency: 4,
  trainingSplit: 'four',
  trainingCycle: 'consecutive',
  trainingDays: ['mon', 'tue', 'thu', 'fri'],
  trainingTime: 'evening',
  likedFoods: '',
  dislikedFoods: '',
  allergies: '',
  wakeUpTime: '07:00',
  mealTimes: '',
  tastePreference: 'medium',
  eatOutFrequency: 'sometimes',
  cookingSkill: 'basic',
  pantryItems: '',
  supplements: '',
  additionalNotes: '',
};
