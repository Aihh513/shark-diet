// ---- plugin:food_nutrition_recognition_1 ----
// ============================================================
// 插件 food_nutrition_recognition_1 (食物营养成分识别) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FoodNutritionRecognitionOneInput {
  /** 要查询营养成分的食物名称 */
  food_name: string;
}

/**
 * capabilityClient.load('food_nutrition_recognition_1').call<FoodNutritionRecognitionOneOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { carbohydrate, protein, fat } = result;
 * 返回值形如：
 *   {"carbohydrate":0,"protein":0,"fat":0}
 */
export interface FoodNutritionRecognitionOneOutput {
  /** 每100g食物中碳水化合物的含量，单位克，Number类型 */
  carbohydrate: number;
  /** 每100g食物中蛋白质的含量，单位克，Number类型 */
  protein: number;
  /** 每100g食物中脂肪的含量，单位克，Number类型 */
  fat: number;
}
// ---- end:food_nutrition_recognition_1 ----

// ---- plugin:coach_custom_diet_plan_generate_1 ----
// ============================================================
// 插件 coach_custom_diet_plan_generate_1 (教练级深度定制饮食计划生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface CoachCustomDietPlanGenerateOneInput {
  /** 用户食材偏好、饮食禁忌、过敏食物等信息 */
  dietary_preferences: string;
  /** 用户训练安排，包括训练频率、训练类型、训练强度、训练时间等 */
  training_schedule: string;
  /** 用户健身目标，如增肌、减脂、塑形、维持体重等 */
  fitness_goal: string;
  /** 其他特殊要求，如预算限制、烹饪时间要求等（可选） */
  additional_requirements?: string;
  /** 用户个人基本信息，包括身高、体重、年龄、性别、基础代谢率等 */
  personal_info: string;
}

/**
 * capabilityClient.load('coach_custom_diet_plan_generate_1').callStream<CoachCustomDietPlanGenerateOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 CoachCustomDietPlanGenerateOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"response":"示例文本","content":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.response ?? ''; }
 */
export interface CoachCustomDietPlanGenerateOneOutput {
  /** [object Object] */
  response?: string;
  /** [object Object] */
  content: string;
}
// ---- end:coach_custom_diet_plan_generate_1 ----

// ---- plugin:diet_plan_adjustment_ai_generate_1 ----
// ============================================================
// 插件 diet_plan_adjustment_ai_generate_1 (饮食计划调整AI生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DietPlanAdjustmentAiGenerateOneInput {
  /** 原始的饮食计划内容 */
  original_diet_plan: string;
  /** 用户提出的饮食计划修改建议和需求 */
  user_modification_suggestions: string;
}

/**
 * capabilityClient.load('diet_plan_adjustment_ai_generate_1').callStream<DietPlanAdjustmentAiGenerateOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 DietPlanAdjustmentAiGenerateOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface DietPlanAdjustmentAiGenerateOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:diet_plan_adjustment_ai_generate_1 ----