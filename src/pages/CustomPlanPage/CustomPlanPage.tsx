import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Calendar,
  ChefHat,
  ArrowLeft,
  ArrowRight,
  Plus,
  Sparkles,
  Copy,
  Trash2,
  ChevronRight,
  RefreshCw,
  Send,
  MessageCircle,
  History,
  Check,
  RotateCcw,
  Loader2,
  Crown,
  AlertCircle,
  Clock,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PLAN_STEPS,
  DEFAULT_PREFERENCES,
  TRAINING_SPLIT_OPTIONS,
  TRAINING_CYCLE_OPTIONS,
  TASTE_OPTIONS,
  EAT_OUT_OPTIONS,
  COOKING_OPTIONS,
  TRAINING_TIME_OPTIONS,
  type CustomPlan,
  type PlanStep,
  type PlanPreferences,
} from '@/data/custom-plan';
import { createPlanDraft, useCustomPlans } from '@/lib/membership';
import { cn } from '@/lib/utils';
import { calcMacros, calcBMR, calcTDEE, calcTargetCalories, type DietParams, type DietMode } from '@/lib/macros';
import { capabilityClient, logger, scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PLAN_GENERATE_PLUGIN_ID = 'coach_custom_diet_plan_generate_1';
const PLAN_ADJUST_PLUGIN_ID = 'diet_plan_adjustment_ai_generate_1';

interface CustomPlanPageProps {
  params: DietParams;
  mode: DietMode;
  isPremium: boolean;
}

const WEEKDAYS = [
  { value: 'mon', label: '周一' },
  { value: 'tue', label: '周二' },
  { value: 'wed', label: '周三' },
  { value: 'thu', label: '周四' },
  { value: 'fri', label: '周五' },
  { value: 'sat', label: '周六' },
  { value: 'sun', label: '周日' },
];

export default function CustomPlanPage({ params, mode, isPremium }: CustomPlanPageProps) {
  const navigate = useNavigate();
  const { plans, loading, addPlan, updatePlan, deletePlan, addAdjustment } = useCustomPlans();

  // 当前视图：列表 / 新建流程 / 查看详情
  const [view, setView] = useState<'list' | 'wizard' | 'detail'>('list');
  const [activeStep, setActiveStep] = useState<PlanStep>('basics');
  const [preferences, setPreferences] = useState<PlanPreferences>(DEFAULT_PREFERENCES);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genContent, setGenContent] = useState('');

  // 调整对话
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustInput, setAdjustInput] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustContent, setAdjustContent] = useState('');

  const currentPlan = useMemo(
    () => plans.find(p => p.id === currentPlanId),
    [plans, currentPlanId],
  );

  const stepIndex = PLAN_STEPS.findIndex(s => s.key === activeStep);
  const progressPercent = ((stepIndex + 1) / PLAN_STEPS.length) * 100;

  const trainingMacros = useMemo(() => calcMacros(params, 'training'), [params]);
  const restMacros = useMemo(() => calcMacros(params, 'rest'), [params]);
  const bmr = useMemo(() => Math.round(calcBMR(params)), [params]);
  const tdee = useMemo(() => Math.round(calcTDEE(params)), [params]);
  const targetCal = useMemo(() => Math.round(calcTargetCalories(params)), [params]);

  // ====== 生成计划 ======
  async function generatePlan() {
    setActiveStep('generating');
    setGenerating(true);
    setGenProgress(5);
    setGenContent('');

    // 创建草稿
    const draft = createPlanDraft(params, preferences);
    draft.title = `定制计划 - ${new Date().toLocaleDateString('zh-CN')}`;
    addPlan(draft);
    setCurrentPlanId(draft.id);

    // 构造输入
    const personalInfo = `
身高：${params.height}cm
体重：${params.weight}kg
年龄：${params.age}岁
性别：${params.gender === 'male' ? '男' : '女'}
基础代谢(BMR)：${bmr} kcal
每日总消耗(TDEE)：${tdee} kcal
目标：${params.goal === 'cut' ? '减脂' : params.goal === 'bulk' ? '增肌' : '维持体重'}
目标每日摄入：${targetCal} kcal
减脂缺口：${params.goal === 'cut' ? params.deficit + ' kcal' : '无'}
增肌盈余：${params.goal === 'bulk' ? params.surplus + ' kcal' : '无'}
训练日宏量：碳水 ${trainingMacros.carbs}g / 蛋白质 ${trainingMacros.protein}g / 脂肪 ${trainingMacros.fat}g
休息日宏量：碳水 ${restMacros.carbs}g / 蛋白质 ${restMacros.protein}g / 脂肪 ${restMacros.fat}g
    `.trim();

    const dietaryPrefs = `
喜欢/常吃的食物：${preferences.likedFoods || '未特别说明'}
不吃/排斥的食物：${preferences.dislikedFoods || '无'}
食物过敏：${preferences.allergies || '无'}
口味偏好：${TASTE_OPTIONS.find(o => o.value === preferences.tastePreference)?.label || '适中'}
外食频率：${EAT_OUT_OPTIONS.find(o => o.value === preferences.eatOutFrequency)?.label || '偶尔'}
烹饪能力：${COOKING_OPTIONS.find(o => o.value === preferences.cookingSkill)?.label || '基本'}
家里现有食材：${preferences.pantryItems || '未说明'}
使用的补剂：${preferences.supplements || '无'}
    `.trim();

    const cycleOption = TRAINING_CYCLE_OPTIONS.find(o => o.value === preferences.trainingCycle);
    const cycleRuleText = preferences.trainingCycle === 'split'
      ? `分段排布节奏（${cycleOption?.label || ''}）：
- 四分化 = 练2天 + 休1天 + 再练2天，共2练1休2练为一个循环单位，休完立刻开始下一个循环
- 五分化 = 练3天 + 休1天 + 再练2天，共3练1休2练为一个循环单位，休完立刻开始下一个循环
- 每个循环内有且仅有1个休息日，休息日之后永远是新循环的第一天`
      : `连练型节奏（${cycleOption?.label || ''}）：
- 四分化 = 连续练4天 + 休息1天，休息日结束后开启下一个4练循环
- 五分化 = 连续练5天 + 休息1天，休息日结束后开启下一个5练循环
- 即：练N天休1天，休完立刻开始下一个循环，不以自然周为单位重置`;

    const trainingSchedule = `
每周训练次数：${preferences.trainingFrequency} 次
训练分化方式：${TRAINING_SPLIT_OPTIONS.find(o => o.value === preferences.trainingSplit)?.label || '未说明'}
训练循环节奏：${cycleOption?.label || '未说明'}（${preferences.trainingCycle === 'split' ? '分段排布' : '连练型'}）
训练日：${preferences.trainingDays.map(d => WEEKDAYS.find(w => w.value === d)?.label).join('、') || '未指定'}
训练时间段：${TRAINING_TIME_OPTIONS.find(o => o.value === preferences.trainingTime)?.label || '未说明'}
起床时间：${preferences.wakeUpTime}
用餐时间习惯：${preferences.mealTimes || '未特别说明'}

训练循环规则（重要，必须严格遵守）：
${cycleRuleText}
- 休息日的下一天永远是新一个循环的第一天（不是周末重新开始）
- 餐单中请按所选循环节奏安排训练日餐和休息日餐
    `.trim();

    const fitnessGoal = params.goal === 'cut'
      ? '减脂减重，保留肌肉量，采用鲨鱼循环碳周期饮食法（训练日高碳、休息日低碳），宏量配比固定为5:3:2（碳水50%:蛋白30%:脂肪20%），休息日仅碳水总克数下调15%，比例本身不变'
      : params.goal === 'bulk'
        ? '增肌增重，尽量减少脂肪增长，训练日补充充足碳水支持训练强度'
        : '维持当前体重，优化身体成分和运动表现';

    const additional = `
饮食模式：鲨鱼循环（赵师 & 粗人减脂模式），宏量配比固定为 5:3:2（碳水50% : 蛋白质30% : 脂肪20%）
核心原则（必须严格遵守，任何情况下不得改变比例）：
- 宏量比例 碳水:蛋白:脂肪 = 5:3:2 是固定值，训练日和休息日比例完全相同，不允许出现 4.6:3.2:2.2 等任何偏离 5:3:2 的表述
- 休息日只是碳水总克数下调 15%，蛋白质和脂肪克数保持不变；比例数字（5:3:2）不因休息日而改变
- 所有重量按生重计算
- 外卖和加工食品脂肪通常被低估，需额外注意
- 餐单中所有宏量计算和比例描述都必须以 5:3:2 为唯一标准

训练日与休息日循环规则（必须严格遵守）：
${cycleRuleText}
- 餐单中请按所选循环节奏安排训练日餐和休息日餐
${preferences.additionalNotes ? `\n用户补充说明：${preferences.additionalNotes}` : ''}
    `.trim();

    // 顶层硬性约束（放在最前面，AI 最容易遵守）
    const hardConstraints = `
【绝对硬性约束 — 以下内容必须 100% 严格遵守，任何情况下不得偏离】

1. 总热量硬性要求：
   - 训练日每日摄入总热量 = ${targetCal} kcal（±50 kcal 以内）
   - 休息日每日摄入总热量 ≈ ${Math.round(trainingMacros.carbs * 0.15 * 4)} kcal 少于训练日 = ${Math.round(targetCal - trainingMacros.carbs * 0.15 * 4)} kcal
   - 绝不允许出现 2000kcal 以下的极低热量（除非用户体重极轻且明确要求）
   - 总热量必须基于用户的 TDEE（${tdee} kcal）和目标类型（${params.goal === 'cut' ? '减脂，缺口 ' + params.deficit + ' kcal' : params.goal === 'bulk' ? '增肌' : '维持'}）得出，不得凭空降低

2. 宏量比例硬性要求：
   - 训练日宏量比例固定为 碳水:蛋白质:脂肪 = 5:3:2（即 50% : 30% : 20%）
   - 训练日宏量克数（必须严格遵守）：
     · 碳水 = ${trainingMacros.carbs} g（${Math.round(trainingMacros.carbs * 4)} kcal，占 50%）
     · 蛋白质 = ${trainingMacros.protein} g（${Math.round(trainingMacros.protein * 4)} kcal，占 30%）
     · 脂肪 = ${trainingMacros.fat} g（${Math.round(trainingMacros.fat * 9)} kcal，占 20%）
   - 休息日宏量：碳水克数下调 15% = ${restMacros.carbs} g，蛋白质仍为 ${trainingMacros.protein} g，脂肪仍为 ${trainingMacros.fat} g
   - 绝不允许出现脂肪占比低于 15% 或高于 25% 的情况
   - 绝不允许出现碳水占比低于 40% 或高于 60% 的情况
   - 所有餐品的宏量加总必须接近当日目标（误差 ±5% 以内）

3. 餐单中每次出现「每日总热量」「宏量比例」「三大营养素」等总结时，必须严格按上述数值书写，不得自行计算或编造

4. 所有重量按生重计算

请基于以上硬性约束生成完整的个性化鲨鱼循环饮食计划。
`.trim();

    try {
      const stream = capabilityClient
        .load(PLAN_GENERATE_PLUGIN_ID)
        .callStream('textGenerate', {
          hard_constraints: hardConstraints,
          personal_info: personalInfo,
          dietary_preferences: dietaryPrefs,
          training_schedule: trainingSchedule,
          fitness_goal: fitnessGoal,
          additional_requirements: additional,
        });

      let full = '';
      for await (const chunk of stream) {
        const piece = (chunk as { content?: string }).content;
        if (piece) {
          full += piece;
          setGenContent(full);
          // 假进度，随内容增长
          const len = Math.min(full.length, 3000);
          setGenProgress(5 + (len / 3000) * 85);
        }
      }

      setGenProgress(100);

      // 保存
      updatePlan(draft.id, {
        content: full,
        currentContent: full,
        status: 'ready',
      });

      setActiveStep('result');
      setView('detail');
      toast.success('定制计划生成完成！');
    } catch (err) {
      logger.error('定制计划生成失败:', String(err));
      updatePlan(draft.id, { status: 'failed' });
      toast.error('生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  }

  // ====== 调整计划 ======
  async function handleAdjust() {
    if (!adjustInput.trim() || !currentPlan) return;
    setAdjusting(true);
    setAdjustContent('');

    // 调整时也必须遵守宏量硬性约束
    const snap = currentPlan.paramsSnapshot;
    const targetCalories = snap.targetCalories;
    const trainingCarbs = Math.round((targetCalories * 0.5) / 4);
    const protein = Math.round((targetCalories * 0.3) / 4);
    const fat = Math.round((targetCalories * 0.2) / 9);
    const restCarbs = Math.round(trainingCarbs * 0.85);

    const adjustConstraints = `
【绝对硬性约束 — 调整时必须严格遵守，不得因调整而改变总热量或宏量比例】

1. 总热量保持不变：训练日 ${targetCalories} kcal，休息日 ≈ ${Math.round(targetCalories - trainingCarbs * 0.15 * 4)} kcal
2. 宏量比例固定 5:3:2（碳水50% : 蛋白30% : 脂肪20%），训练日休息日比例相同
3. 训练日宏量目标：碳水 ${trainingCarbs}g / 蛋白质 ${protein}g / 脂肪 ${fat}g
4. 休息日宏量：碳水 ${restCarbs}g（下调15%）/ 蛋白质 ${protein}g / 脂肪 ${fat}g
5. 调整只是替换食材种类或调整餐次安排，总热量和三大宏量的克数必须基本保持不变（误差 ±5% 以内）
6. 绝不允许因为调整食材就大幅降低或提高总热量
7. 绝不允许出现脂肪占比低于 15% 的情况
`.trim();

    try {
      const stream = capabilityClient
        .load(PLAN_ADJUST_PLUGIN_ID)
        .callStream('textGenerate', {
          hard_constraints: adjustConstraints,
          original_diet_plan: currentPlan.currentContent,
          user_modification_suggestions: adjustInput,
        });

      let full = '';
      for await (const chunk of stream) {
        const piece = (chunk as { content?: string }).content;
        if (piece) {
          full += piece;
          setAdjustContent(full);
        }
      }

      // 保存调整历史（使用 addAdjustment 避免 currentPlan 闭包陈旧）
      const newAdjustment = {
        id: `adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        userFeedback: adjustInput,
        adjustedContent: full,
      };

      addAdjustment(currentPlan.id, newAdjustment);

      setAdjustDialogOpen(false);
      setAdjustInput('');
      toast.success('计划已调整更新');
    } catch (err) {
      logger.error('计划调整失败:', String(err));
      toast.error('调整失败，请稍后重试');
    } finally {
      setAdjusting(false);
    }
  }

  function handleDeletePlan(id: string) {
    deletePlan(id);
    if (currentPlanId === id) {
      setCurrentPlanId(null);
      setView('list');
    }
    toast.success('计划已删除');
  }

  function handleCopyPlan(plan: CustomPlan) {
    const newPlan: CustomPlan = {
      ...plan,
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: plan.title + ' (副本)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addPlan(newPlan);
    toast.success('已复制计划');
  }

  // ====== 渲染 ======

  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="sticky top-0 z-40 w-full bg-background/70 backdrop-blur-md border-b border-border/40">
          <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="size-4" />
              返回计算器
            </button>
            <Badge variant="outline" className="gap-1.5">
              <Crown className="size-3 text-amber-500" />
              会员功能
            </Badge>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">定制饮食计划</h1>
              <p className="text-sm text-muted-foreground">教练级深度定制，打造专属于你的饮食方案</p>
            </div>
            <Button onClick={() => { setView('wizard'); setActiveStep('basics'); setPreferences(DEFAULT_PREFERENCES); }}>
              <Plus className="size-4 mr-2" />
              新建计划
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <Card className="text-center">
              <CardContent className="pt-12 pb-10">
                <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="size-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">还没有定制计划</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                  告诉 AI 教练你的身体情况、训练安排和饮食偏好，生成一份专属于你的深度定制饮食计划
                </p>
                <Button onClick={() => { setView('wizard'); setActiveStep('basics'); }}>
                  <Sparkles className="size-4 mr-2" />
                  开始定制
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map(plan => (
                <Card
                  key={plan.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setCurrentPlanId(plan.id); setView('detail'); }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium mb-1">{plan.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(plan.createdAt).toLocaleDateString('zh-CN')} · {plan.paramsSnapshot.weight}kg / {plan.paramsSnapshot.goal === 'cut' ? '减脂' : plan.paramsSnapshot.goal === 'bulk' ? '增肌' : '维持'}
                        </p>
                      </div>
                      <Badge
                        variant={plan.status === 'ready' ? 'default' : plan.status === 'failed' ? 'destructive' : 'secondary'}
                      >
                        {plan.status === 'ready' ? '已完成' : plan.status === 'failed' ? '生成失败' : '生成中'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="size-3" />
                        {plan.preferences.trainingFrequency}次/周
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {plan.adjustments.length} 次调整
                      </span>
                      <span className="flex items-center gap-1">
                        <ChefHat className="size-3" />
                        {plan.paramsSnapshot.targetCalories} kcal
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        查看详情
                        <ChevronRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  if (view === 'detail') {
    if (!currentPlan) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
          <header className="sticky top-0 z-40 w-full bg-background/70 backdrop-blur-md border-b border-border/40">
            <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
              <button
                onClick={() => setView('list')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="size-4" />
                返回计划列表
              </button>
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-4 md:px-6 py-20 flex items-center justify-center">
            <Card className="max-w-md w-full">
              <CardContent className="pt-10 pb-8 text-center">
                <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="size-7 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">计划加载失败</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  未能找到对应的饮食计划，可能已被删除或生成失败。
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => setView('list')}>
                    返回列表
                  </Button>
                  <Button onClick={() => { setView('wizard'); setActiveStep('basics'); setPreferences(DEFAULT_PREFERENCES); }}>
                    重新生成
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="sticky top-0 z-40 w-full bg-background/70 backdrop-blur-md border-b border-border/40">
          <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => setView('list')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="size-4" />
              返回计划列表
            </button>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handleCopyPlan(currentPlan)}>
                <Copy className="size-3.5 mr-1.5" />
                复制
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm('确定删除这个计划吗？')) handleDeletePlan(currentPlan.id);
                }}
              >
                <Trash2 className="size-3.5 mr-1.5" />
                删除
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{currentPlan.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>创建于 {new Date(currentPlan.createdAt).toLocaleDateString('zh-CN')}</span>
              <span>·</span>
              <span>{currentPlan.paramsSnapshot.weight}kg · {currentPlan.paramsSnapshot.targetCalories} kcal/天</span>
              <span>·</span>
              <span>已调整 {currentPlan.adjustments.length} 次</span>
            </div>
          </div>

          {/* 操作条 */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button onClick={() => setAdjustDialogOpen(true)}>
              <MessageCircle className="size-4 mr-2" />
              调整计划
            </Button>
            <Button variant="outline" onClick={() => {
              // 重新生成
              setPreferences(currentPlan.preferences);
              setView('wizard');
              setActiveStep('basics');
              setGenContent('');
              setGenProgress(0);
            }}>
              <RefreshCw className="size-4 mr-2" />
              重新生成
            </Button>
            {currentPlan.adjustments.length > 0 && (
              <Badge variant="outline">{currentPlan.adjustments.length} 次调整历史</Badge>
            )}
          </div>

          {/* 计划内容 */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="h-[70vh]">
                <div className="p-6 md:p-8">
                  <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-h2:text-xl prose-h3:text-lg">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentPlan.currentContent}
                    </ReactMarkdown>
                  </article>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 调整历史 */}
          {currentPlan.adjustments.length > 0 && (
            <Card className="mt-6 relative z-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="size-5 text-primary" />
                  调整历史
                  <Badge variant="outline" className="ml-1">
                    共 {currentPlan.adjustments.length} 次
                  </Badge>
                </CardTitle>
                <CardDescription>点击「恢复此版本」可回退到对应调整版本</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentPlan.adjustments.map((adj, idx) => {
                  const isCurrent = currentPlan.currentContent === adj.adjustedContent;
                  return (
                    <div
                      key={adj.id}
                      className={cn(
                        'rounded-lg border p-4 transition-colors',
                        isCurrent
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/60 bg-card hover:border-border',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={isCurrent ? 'default' : 'outline'}>
                            第 {idx + 1} 次调整
                          </Badge>
                          {isCurrent && (
                            <span className="text-xs text-primary font-medium flex items-center gap-1">
                              <Check className="size-3" />
                              当前版本
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(adj.timestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="text-sm mb-3">
                        <span className="text-muted-foreground">用户反馈：</span>
                        {adj.userFeedback}
                      </div>
                      <div className="text-xs text-muted-foreground mb-3 line-clamp-2 bg-muted/40 rounded px-3 py-2">
                        {adj.adjustedContent.replace(/[#*`>\-\n]/g, ' ').slice(0, 120)}...
                      </div>
                      {!isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updatePlan(currentPlan.id, { currentContent: adj.adjustedContent });
                            toast.success('已切换到该版本');
                          }}
                        >
                          <RotateCcw className="size-3.5 mr-1.5" />
                          恢复此版本
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </main>

        {/* 调整对话弹窗 */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="size-5 text-primary" />
                调整饮食计划
              </DialogTitle>
              <DialogDescription>
                告诉 AI 教练你的想法，它会根据你的反馈调整计划
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Textarea
                placeholder="例如：这个我不吃、帮我换个食材、肉太多了、想增加碳水、晚餐改简单点..."
                value={adjustInput}
                onChange={e => setAdjustInput(e.target.value)}
                className="min-h-[120px] resize-none"
              />

              {adjusting && adjustContent && (
                <div className="rounded-lg border border-border p-3 max-h-48 overflow-y-auto bg-muted/20">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" />
                    调整中...
                  </div>
                  <article className="prose prose-xs max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {adjustContent}
                    </ReactMarkdown>
                  </article>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} disabled={adjusting}>
                取消
              </Button>
              <Button
                onClick={handleAdjust}
                disabled={adjusting || !adjustInput.trim()}
              >
                {adjusting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    调整中...
                  </>
                ) : (
                  <>
                    <Send className="size-4 mr-2" />
                    发送调整
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ====== 向导流程 ======
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-40 w-full bg-background/70 backdrop-blur-md border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => setView('list')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="size-4" />
            取消
          </button>
          <span className="text-sm font-medium">
            步骤 {stepIndex + 1} / {PLAN_STEPS.length}
          </span>
        </div>
      </header>

      {/* 进度条 */}
      <div className="border-b border-border/40 bg-card/50">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
          <Progress value={progressPercent} className="h-1.5 mb-3" />
          <div className="flex items-center justify-between">
            {PLAN_STEPS.map((step, idx) => (
              <div
                key={step.key}
                className={`flex items-center gap-2 text-xs ${
                  idx <= stepIndex ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`size-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                    idx < stepIndex
                      ? 'bg-primary text-primary-foreground'
                      : idx === stepIndex
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {idx < stepIndex ? '✓' : idx + 1}
                </div>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Step 1: 基础信息 */}
        {activeStep === 'basics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">基础信息</h2>
              <p className="text-sm text-muted-foreground">
                我们已从计算器同步了你的身体参数和目标，确认或调整后继续
              </p>
            </div>

            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>身高 (cm)</Label>
                    <div className="text-lg font-semibold tabular-nums">{params.height}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>体重 (kg)</Label>
                    <div className="text-lg font-semibold tabular-nums">{params.weight}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>年龄</Label>
                    <div className="text-lg font-semibold tabular-nums">{params.age}</div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>性别</Label>
                    <div className="text-lg font-semibold">{params.gender === 'male' ? '男' : '女'}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>活动系数</Label>
                    <div className="text-lg font-semibold">{params.activityFactor}</div>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label>目标</Label>
                  <div className="text-lg font-semibold mt-1">
                    {params.goal === 'cut' ? '减脂减重' : params.goal === 'bulk' ? '增肌增重' : '维持体重'}
                    {params.goal === 'cut' && ` · 缺口 ${params.deficit} kcal/天`}
                    {params.goal === 'bulk' && ` · 盈余 ${params.surplus} kcal/天`}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 宏量预览 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">目标宏量预览</CardTitle>
                <CardDescription>基于鲨鱼循环 5:3:2 配比</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={mode}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="training">训练日</TabsTrigger>
                    <TabsTrigger value="rest">休息日</TabsTrigger>
                  </TabsList>
                  <TabsContent value="training" className="space-y-3 pt-4">
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div>
                        <div className="text-2xl font-bold tabular-nums text-foreground">
                          {trainingMacros.calories}
                        </div>
                        <div className="text-xs text-muted-foreground">热量 kcal</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold tabular-nums text-amber-600">
                          {trainingMacros.carbs}
                        </div>
                        <div className="text-xs text-muted-foreground">碳水 g</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold tabular-nums text-rose-600">
                          {trainingMacros.protein}
                        </div>
                        <div className="text-xs text-muted-foreground">蛋白 g</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold tabular-nums text-emerald-600">
                          {trainingMacros.fat}
                        </div>
                        <div className="text-xs text-muted-foreground">脂肪 g</div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="rest" className="space-y-3 pt-4">
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div>
                        <div className="text-2xl font-bold tabular-nums text-foreground">
                          {restMacros.calories}
                        </div>
                        <div className="text-xs text-muted-foreground">热量 kcal</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold tabular-nums text-amber-600">
                          {restMacros.carbs}
                        </div>
                        <div className="text-xs text-muted-foreground">碳水 g</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold tabular-nums text-rose-600">
                          {restMacros.protein}
                        </div>
                        <div className="text-xs text-muted-foreground">蛋白 g</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold tabular-nums text-emerald-600">
                          {restMacros.fat}
                        </div>
                        <div className="text-xs text-muted-foreground">脂肪 g</div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setActiveStep('preferences')}>
                下一步：个性化偏好
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 个性化偏好 */}
        {activeStep === 'preferences' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">个性化偏好</h2>
              <p className="text-sm text-muted-foreground">
                填写越详细，生成的计划越贴合你。带 * 为必填，其余可选但推荐填写
              </p>
            </div>

            {/* 训练安排 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="size-4 text-primary" />
                  训练安排
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>每周训练次数：{preferences.trainingFrequency} 次</Label>
                  <input
                    type="range"
                    min={0}
                    max={7}
                    value={preferences.trainingFrequency}
                    onChange={e => setPreferences({ ...preferences, trainingFrequency: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>训练分化方式</Label>
                  <RadioGroup
                    value={preferences.trainingSplit}
                    onValueChange={v => setPreferences({ ...preferences, trainingSplit: v })}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                  >
                    {TRAINING_SPLIT_OPTIONS.map(opt => (
                      <div key={opt.value}>
                        <RadioGroupItem value={opt.value} id={`split-${opt.value}`} className="peer sr-only" />
                        <Label
                          htmlFor={`split-${opt.value}`}
                          className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 py-2 text-xs peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
                        >
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>训练循环节奏</Label>
                  <RadioGroup
                    value={preferences.trainingCycle}
                    onValueChange={v => setPreferences({ ...preferences, trainingCycle: v })}
                    className="space-y-2"
                  >
                    {TRAINING_CYCLE_OPTIONS.map(opt => (
                      <div key={opt.value}>
                        <RadioGroupItem value={opt.value} id={`cycle-${opt.value}`} className="peer sr-only" />
                        <Label
                          htmlFor={`cycle-${opt.value}`}
                          className="block cursor-pointer rounded-md border border-border bg-card p-3 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
                        >
                          <div className="text-sm font-medium mb-1">{opt.label}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">{opt.description}</div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>训练日选择</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map(day => {
                      const selected = preferences.trainingDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const days = selected
                              ? preferences.trainingDays.filter(d => d !== day.value)
                              : [...preferences.trainingDays, day.value];
                            setPreferences({ ...preferences, trainingDays: days, trainingFrequency: days.length });
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card border-border hover:bg-muted/50'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>训练时间段</Label>
                  <RadioGroup
                    value={preferences.trainingTime}
                    onValueChange={v => setPreferences({ ...preferences, trainingTime: v })}
                    className="grid grid-cols-3 gap-2"
                  >
                    {TRAINING_TIME_OPTIONS.map(opt => (
                      <div key={opt.value}>
                        <RadioGroupItem value={opt.value} id={`ttime-${opt.value}`} className="peer sr-only" />
                        <Label
                          htmlFor={`ttime-${opt.value}`}
                          className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 py-2 text-xs peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
                        >
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* 食材偏好 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChefHat className="size-4 text-primary" />
                  食材偏好
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>喜欢 / 常吃的食物</Label>
                  <Textarea
                    placeholder="例如：鸡蛋、鸡胸肉、牛肉、米饭、燕麦、西兰花..."
                    value={preferences.likedFoods}
                    onChange={e => setPreferences({ ...preferences, likedFoods: e.target.value })}
                    className="resize-none h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>不吃 / 排斥的食物</Label>
                  <Textarea
                    placeholder="例如：香菜、芹菜、动物内脏、乳糖不耐受..."
                    value={preferences.dislikedFoods}
                    onChange={e => setPreferences({ ...preferences, dislikedFoods: e.target.value })}
                    className="resize-none h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>食物过敏</Label>
                  <Input
                    placeholder="如：花生、海鲜、麸质等，无则不填"
                    value={preferences.allergies}
                    onChange={e => setPreferences({ ...preferences, allergies: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 作息 & 饮食偏好 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  作息与饮食习惯
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>起床时间</Label>
                    <Input
                      type="time"
                      value={preferences.wakeUpTime}
                      onChange={e => setPreferences({ ...preferences, wakeUpTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>口味偏好</Label>
                    <RadioGroup
                      value={preferences.tastePreference}
                      onValueChange={v => setPreferences({ ...preferences, tastePreference: v as PlanPreferences['tastePreference'] })}
                      className="grid grid-cols-3 gap-2"
                    >
                      {TASTE_OPTIONS.map(opt => (
                        <div key={opt.value}>
                          <RadioGroupItem value={opt.value} id={`taste-${opt.value}`} className="peer sr-only" />
                          <Label
                            htmlFor={`taste-${opt.value}`}
                            className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 py-2 text-xs peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
                          >
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>外食频率</Label>
                  <RadioGroup
                    value={preferences.eatOutFrequency}
                    onValueChange={v => setPreferences({ ...preferences, eatOutFrequency: v as PlanPreferences['eatOutFrequency'] })}
                    className="grid grid-cols-3 gap-2"
                  >
                    {EAT_OUT_OPTIONS.map(opt => (
                      <div key={opt.value}>
                        <RadioGroupItem value={opt.value} id={`eatout-${opt.value}`} className="peer sr-only" />
                        <Label
                          htmlFor={`eatout-${opt.value}`}
                          className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 py-2 text-xs peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
                        >
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>烹饪能力</Label>
                  <RadioGroup
                    value={preferences.cookingSkill}
                    onValueChange={v => setPreferences({ ...preferences, cookingSkill: v as PlanPreferences['cookingSkill'] })}
                    className="grid grid-cols-3 gap-2"
                  >
                    {COOKING_OPTIONS.map(opt => (
                      <div key={opt.value}>
                        <RadioGroupItem value={opt.value} id={`cook-${opt.value}`} className="peer sr-only" />
                        <Label
                          htmlFor={`cook-${opt.value}`}
                          className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 py-2 text-xs peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
                        >
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>用餐时间习惯</Label>
                  <Textarea
                    placeholder="例如：早餐8点、午餐12点、训练后加餐、晚餐7点左右；或 习惯间歇性禁食16:8..."
                    value={preferences.mealTimes}
                    onChange={e => setPreferences({ ...preferences, mealTimes: e.target.value })}
                    className="resize-none h-20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 补剂 & 其他 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="size-4 text-primary" />
                  补剂 & 其他
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>家里现有的食材</Label>
                  <Textarea
                    placeholder="例如：燕麦片、蛋白粉、鸡蛋、冷冻鸡胸肉、橄榄油..."
                    value={preferences.pantryItems}
                    onChange={e => setPreferences({ ...preferences, pantryItems: e.target.value })}
                    className="resize-none h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>正在使用的补剂</Label>
                  <Input
                    placeholder="如：肌酸、乳清蛋白粉、鱼油、维生素..."
                    value={preferences.supplements}
                    onChange={e => setPreferences({ ...preferences, supplements: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>其他备注 / 特殊要求</Label>
                  <Textarea
                    placeholder="任何想告诉教练的都可以写在这里，比如：预算有限、没有厨房、素食、备赛期..."
                    value={preferences.additionalNotes}
                    onChange={e => setPreferences({ ...preferences, additionalNotes: e.target.value })}
                    className="resize-none h-24"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setActiveStep('basics')}>
                <ArrowLeft className="size-4 mr-2" />
                上一步
              </Button>
              <Button onClick={generatePlan}>
                <Sparkles className="size-4 mr-2" />
                生成定制计划
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 生成中 */}
        {activeStep === 'generating' && (
          <div className="py-10 text-center">
            <div className="size-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
              <Sparkles className="size-8 text-white animate-pulse" />
            </div>
            <h2 className="text-xl font-bold mb-2">AI 教练正在为你定制计划</h2>
            <p className="text-sm text-muted-foreground mb-8">
              正在结合你的身体数据、训练安排和饮食偏好，生成专属方案...
            </p>

            <Progress value={genProgress} className="max-w-xs mx-auto mb-3 h-2" />
            <p className="text-xs text-muted-foreground">{Math.round(genProgress)}%</p>

            {genContent && (
              <Card className="mt-8 text-left">
                <CardContent className="p-5 max-h-[50vh] overflow-y-auto">
                  <article className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {genContent}
                    </ReactMarkdown>
                  </article>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {/* 异常 step 兜底 */}
        {activeStep !== 'basics' && activeStep !== 'preferences' && activeStep !== 'generating' && (
          <div className="text-center py-16">
            <AlertCircle className="size-10 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">流程异常</h3>
            <p className="text-sm text-muted-foreground mb-5">生成流程出现异常，请重新开始</p>
            <Button onClick={() => { setActiveStep('basics'); setView('list'); }}>
              返回计划列表
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
