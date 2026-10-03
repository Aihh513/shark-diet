import { memo, useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Trash2,
  Plus,
  UtensilsCrossed,
  Search,
  ChevronDown,
  Check,
  Pencil,
  RotateCcw,
  Info,
  Star,
  Square,
  CheckSquare,
  X,
  Loader2,
  Sparkles,
  Globe,
} from 'lucide-react';
import { FOOD_CATEGORIES, type IFood } from '@/data/foods';
import { useFoods, type CustomFood } from '@/hooks/use-foods';
import type { FoodEntry } from '@/lib/macros';
import { calcFoodMacros, round1 } from '@/lib/macros';
import { useNutritionSearch } from '@/lib/nutrition-search';
import { useHasBackend } from '@/lib/backend';
import { toast } from 'sonner';
import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';

const AI_NUTRITION_PLUGIN_ID = 'food_nutrition_recognition_1';

interface FoodCalculatorSectionProps {
  entries: FoodEntry[];
  onEntriesChange: (entries: FoodEntry[]) => void;
}

const WEIGHT_LABEL: Record<IFood['weightType'], { label: string; className: string }> = {
  raw: { label: '生重', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  cooked: { label: '熟重', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  dry: { label: '干重', className: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
  other: { label: '可食部', className: 'bg-muted text-muted-foreground' },
};

export default memo(function FoodCalculatorSection({
  entries,
  onEntriesChange,
}: FoodCalculatorSectionProps) {
  const {
    allFoods,
    customFoods,
    addCustomFood,
    updateCustomFood,
    removeCustomFood,
    overrideBuiltIn,
    resetOverride,
    isOverridden,
  } = useFoods();

  const [selectedFoodId, setSelectedFoodId] = useState<string>(allFoods[0]?.id ?? '1');
  const [grams, setGrams] = useState<number>(100);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);

  // 权威营养库搜索
  const hasBackend = useHasBackend();
  const [searchTab, setSearchTab] = useState<'local' | 'authority'>('local');
  const nutritionSearch = useNutritionSearch();

  // 批量管理
  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // 自定义食物弹窗
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<IFood | null>(null);
  const [formName, setFormName] = useState('');
  const [formCarbs, setFormCarbs] = useState<number>(0);
  const [formProtein, setFormProtein] = useState<number>(0);
  const [formFat, setFormFat] = useState<number>(0);
  const [formWeightType, setFormWeightType] = useState<IFood['weightType']>('other');
  const [formNote, setFormNote] = useState('');

  // AI 营养识别状态
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiResult, setIsAiResult] = useState(false); // 当前数值是否来自AI识别

  // 如果选中的食物被移除，回退到第一个
  useEffect(() => {
    if (!allFoods.find((f) => f.id === selectedFoodId) && allFoods.length > 0) {
      setSelectedFoodId(allFoods[0].id);
    }
  }, [allFoods, selectedFoodId]);

  const filteredFoods = useMemo(() => {
    if (!keyword.trim()) return allFoods;
    const k = keyword.toLowerCase();
    return allFoods.filter(
      (f) =>
        f.name.toLowerCase().includes(k) ||
        FOOD_CATEGORIES.find((c) => c.key === f.category)?.label.toLowerCase().includes(k),
    );
  }, [keyword, allFoods]);

  // 切换到权威营养库时自动触发搜索
  useEffect(() => {
    if (searchTab === 'authority' && hasBackend && keyword.trim()) {
      nutritionSearch.search(keyword);
    }
  }, [keyword, searchTab, hasBackend, nutritionSearch]);

  // 按分类分组（自定义始终在最前）
  const groupedFoods = useMemo(() => {
    const groups: Record<string, IFood[]> = {};
    for (const food of filteredFoods) {
      if (!groups[food.category]) groups[food.category] = [];
      groups[food.category].push(food);
    }
    return groups;
  }, [filteredFoods]);

  const selectedFood = allFoods.find((f) => f.id === selectedFoodId) ?? allFoods[0];
  const previewMacros = selectedFood ? calcFoodMacros(selectedFood, grams) : { calories: 0, carbs: 0, protein: 0, fat: 0 };

  const handleSelect = (id: string) => {
    setSelectedFoodId(id);
    setOpen(false);
  };

  // 从权威营养库选择食物：自动添加为自定义食物并选中
  const handleAddFromAuthority = async (result: {
    id: string;
    name: string;
    carbs: number;
    protein: number;
    fat: number;
    source: string;
    brand?: string;
    category?: string;
  }) => {
    const newFood = addCustomFood({
      name: result.brand ? `${result.brand} ${result.name}` : result.name,
      carbs: Number(result.carbs.toFixed(1)),
      protein: Number(result.protein.toFixed(1)),
      fat: Number(result.fat.toFixed(1)),
      weightType: 'other',
      note: `来源：${result.source === 'usda' ? 'USDA FoodData Central' : 'Open Food Facts'}${result.category ? ` · ${result.category}` : ''}`,
    });
    setSelectedFoodId(newFood.id);
    setOpen(false);
    toast.success('已从权威营养库添加', {
      description: newFood.name,
    });
  };

  const handleAdd = () => {
    if (!selectedFood || grams <= 0) return;
    const newEntry: FoodEntry = {
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      foodId: selectedFoodId,
      grams,
    };
    onEntriesChange([...entries, newEntry]);
    toast.success(`已添加 ${selectedFood.name} ${grams}g`);
  };

  const handleRemove = (id: string, name: string) => {
    onEntriesChange(entries.filter((e) => e.id !== id));
    // 批量选中状态同步移除
    if (checkedIds.has(id)) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    toast.info(`已移除 ${name}`, {
      action: {
        label: '撤销',
        onClick: () => {
          const target = entries.find((e) => e.id === id);
          if (target) onEntriesChange([...entries, target]);
        },
      },
    });
  };

  // 一键清空全部
  const handleClearAll = () => {
    if (entries.length === 0) return;
    const snapshot = [...entries];
    onEntriesChange([]);
    setCheckedIds(new Set());
    setSelectMode(false);
    toast.success(`已清空全部 ${snapshot.length} 条食物`, {
      action: {
        label: '撤销',
        onClick: () => {
          onEntriesChange(snapshot);
        },
      },
    });
  };

  // 批量删除所选
  const handleBulkRemove = () => {
    if (checkedIds.size === 0) return;
    const toRemove = entries.filter((e) => checkedIds.has(e.id));
    const remaining = entries.filter((e) => !checkedIds.has(e.id));
    onEntriesChange(remaining);
    setCheckedIds(new Set());
    if (remaining.length === 0) setSelectMode(false);
    toast.success(`已删除 ${toRemove.length} 条食物`, {
      action: {
        label: '撤销',
        onClick: () => {
          onEntriesChange(entries);
        },
      },
    });
  };

  // 全选 / 取消全选
  const allChecked =
    entries.length > 0 && entries.every((e) => checkedIds.has(e.id));
  const handleToggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(entries.map((e) => e.id)));
    }
  };

  // 单条勾选切换
  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 退出多选模式
  const exitSelectMode = () => {
    setSelectMode(false);
    setCheckedIds(new Set());
  };

  const handleGramsChange = (id: string, value: number) => {
    onEntriesChange(entries.map((e) => (e.id === id ? { ...e, grams: value } : e)));
  };

  // 打开新增自定义食物对话框
  const openNewCustom = () => {
    setEditingFood(null);
    setFormName('');
    setFormCarbs(0);
    setFormProtein(0);
    setFormFat(0);
    setFormWeightType('other');
    setFormNote('');
    setIsAiLoading(false);
    setIsAiResult(false);
    setCustomDialogOpen(true);
  };

  // 打开编辑（自定义食物 / 内置食物覆盖）
  const openEdit = (food: IFood, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingFood(food);
    setFormName(food.name);
    setFormCarbs(food.carbs);
    setFormProtein(food.protein);
    setFormFat(food.fat);
    setFormWeightType(food.weightType);
    setFormNote((food as CustomFood).note ?? '');
    setIsAiLoading(false);
    setIsAiResult(false);
    setCustomDialogOpen(true);
  };

  // AI 智能识别食物营养成分
  const handleAiRecognize = async () => {
    const name = formName.trim();
    if (!name) {
      toast.error('请先输入食物名称');
      return;
    }
    if (isAiLoading) return;

    setIsAiLoading(true);
    try {
      const result = (await capabilityClient
        .load(AI_NUTRITION_PLUGIN_ID)
        .call('textToJson', {
          food_name: name,
        })) as { carbohydrate: number; protein: number; fat: number };

      const carbs = Number(result.carbohydrate) ?? 0;
      const protein = Number(result.protein) ?? 0;
      const fat = Number(result.fat) ?? 0;

      // 合理性校验：都为 0 或为 NaN 视为识别失败
      if (isNaN(carbs) || isNaN(protein) || isNaN(fat) || (carbs === 0 && protein === 0 && fat === 0)) {
        throw new Error('返回数据无效');
      }

      setFormCarbs(Number(carbs.toFixed(1)));
      setFormProtein(Number(protein.toFixed(1)));
      setFormFat(Number(fat.toFixed(1)));
      setIsAiResult(true);
      toast.success('AI 识别完成，已填入参考值', {
        description: '建议以实物包装或营养 APP 实测为准',
      });
    } catch (error) {
      logger.error('AI营养识别失败:', String(error));
      toast.error('识别失败，请手动填写或重试', {
        description: 'AI 暂时无法获取该食物的营养数据',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // 删除自定义食物：点击立即删除，不弹确认框，toast 给 undo 机会
  const handleDeleteCustom = (food: IFood) => {
    // 1. 立即执行删除
    removeCustomFood(food.id);

    // 2. 如果当前选中的正是被删的食物，切到列表第一个
    const remaining = allFoods.filter((f) => f.id !== food.id);
    if (selectedFoodId === food.id && remaining.length > 0) {
      setSelectedFoodId(remaining[0].id);
    }

    // 3. toast 提示 + undo
    toast.success(`已删除「${food.name}」`, {
      description: '自定义食物已从列表移除',
      action: {
        label: '撤销',
        onClick: () => {
          // 撤销：重新加回来
          addCustomFood({
            name: food.name,
            carbs: food.carbs,
            protein: food.protein,
            fat: food.fat,
            weightType: food.weightType,
            note: (food as CustomFood).note,
          });
        },
      },
    });
  };

  // 恢复内置默认
  const handleResetBuiltIn = (foodId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    resetOverride(foodId);
    toast.success('已恢复默认值');
  };

  // 提交自定义 / 编辑
  const handleSubmitCustom = () => {
    if (!formName.trim()) {
      toast.error('请输入食物名称');
      return;
    }
    if (formCarbs < 0 || formProtein < 0 || formFat < 0) {
      toast.error('宏量数值不能为负');
      return;
    }

    if (editingFood) {
      if (editingFood.category === 'custom') {
        // 编辑自定义食物
        updateCustomFood(editingFood.id, {
          name: formName.trim(),
          carbs: Number(formCarbs),
          protein: Number(formProtein),
          fat: Number(formFat),
          weightType: formWeightType,
          note: formNote.trim() || undefined,
        });
        toast.success('已更新自定义食物');
      } else {
        // 覆盖内置食物
        overrideBuiltIn(editingFood.id, {
          carbs: Number(formCarbs),
          protein: Number(formProtein),
          fat: Number(formFat),
          name: formName.trim() !== editingFood.name ? formName.trim() : undefined,
        });
        toast.success('已保存自定义数值');
      }
    } else {
      // 新增自定义食物
      const newFood = addCustomFood({
        name: formName.trim(),
        carbs: Number(formCarbs),
        protein: Number(formProtein),
        fat: Number(formFat),
        weightType: formWeightType,
        note: formNote.trim() || undefined,
      });
      setSelectedFoodId(newFood.id);
      toast.success('已添加自定义食物');
    }
    setCustomDialogOpen(false);
  };

  // 计算每行宏量
  const entriesWithMacros = entries.map((e) => {
    const food = allFoods.find((f) => f.id === e.foodId);
    return {
      entry: e,
      food: food ?? null,
      macros: food ? calcFoodMacros(food, e.grams) : null,
    };
  });

  const hasCustom = customFoods.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UtensilsCrossed className="size-5 text-primary" />
          食材计算器
          <Badge variant="secondary" className="ml-auto font-normal">
            {entries.length} 项 · {allFoods.length} 种食物
            {hasCustom && <span className="ml-1 text-primary">（含 {customFoods.length} 自定）</span>}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 添加行 */}
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          {/* 食物选择：Popover + 分组列表 */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">食物（按分类浏览 / 搜索）</label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between bg-background font-normal"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {selectedFood?.category === 'custom' && <Star className="size-3.5 text-amber-500 shrink-0 fill-amber-500" />}
                    <span className="truncate">{selectedFood?.name ?? '请选择食物'}</span>
                    {selectedFood && (
                      <span
                        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                          WEIGHT_LABEL[selectedFood.weightType].className
                        }`}
                      >
                        {WEIGHT_LABEL[selectedFood.weightType].label}
                      </span>
                    )}
                    {selectedFood && isOverridden(selectedFood.id) && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                        已自定义
                      </span>
                    )}
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] p-0" align="start">
                 {/* 搜索框 */}
                 <div className="relative p-2 border-b border-border">
                   <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                   <Input
                     type="search"
                     placeholder="搜索食物..."
                     value={keyword}
                     onChange={(e) => setKeyword(e.target.value)}
                     className="pl-8 h-9"
                     autoFocus
                   />
                 </div>

                 {/* Tab 切换 */}
                 {hasBackend && (
                   <div className="flex border-b border-border">
                     <button
                       type="button"
                       onClick={() => setSearchTab('local')}
                       className={`flex-1 h-8 text-xs transition-colors ${
                         searchTab === 'local'
                           ? 'text-primary border-b-2 border-primary font-medium'
                           : 'text-muted-foreground hover:text-foreground'
                       }`}
                     >
                       本地食物库
                     </button>
                     <button
                       type="button"
                       onClick={() => {
                         setSearchTab('authority');
                         if (keyword.trim()) nutritionSearch.search(keyword);
                       }}
                       className={`flex-1 h-8 text-xs transition-colors flex items-center justify-center gap-1 ${
                         searchTab === 'authority'
                           ? 'text-primary border-b-2 border-primary font-medium'
                           : 'text-muted-foreground hover:text-foreground'
                       }`}
                     >
                       <Globe className="size-3" />
                       权威营养库
                     </button>
                   </div>
                 )}

                 <ScrollArea className="h-[360px]">
                   {!hasBackend || searchTab === 'local' ? (
                     <>
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      无匹配食物
                    </div>
                  ) : (
                    <div className="p-1">
                      {FOOD_CATEGORIES.map((cat, catIdx) => {
                        const foods = groupedFoods[cat.key];
                        if (!foods || foods.length === 0) return null;
                        const isLastVisible =
                          catIdx ===
                          [...FOOD_CATEGORIES].reverse().findIndex((c) => groupedFoods[c.key]?.length > 0);
                        return (
                          <div key={cat.key} className="mb-1.5 last:mb-0">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sticky top-0 bg-popber z-10">
                              <span>{cat.icon}</span>
                              <span>{cat.label}</span>
                              <span className="text-[10px] text-muted-foreground/70 ml-auto">
                                {foods.length} 种
                              </span>
                            </div>
                            {/* 自定义分类：空状态 */}
                            {cat.key === 'custom' && !hasCustom && (
                              <div className="px-2.5 py-3 text-center text-xs text-muted-foreground border border-dashed border-border rounded-sm mx-1 mb-1">
                                还没有自定义食物
                                <br />
                                点击下方按钮添加你的专属食物
                              </div>
                            )}
                             {foods.map((food) => {
                               const overridden = isOverridden(food.id);
                               return (
                                 <div
                                   key={food.id}
                                   className={`flex items-center gap-1 px-1.5 py-1 rounded-sm hover:bg-accent/60 transition-colors ${
                                     selectedFoodId === food.id ? 'bg-accent/50' : ''
                                   }`}
                                 >
                                   {/* 选中按钮：文字 + 标签区域 */}
                                   <button
                                     type="button"
                                     onClick={() => handleSelect(food.id)}
                                     className="flex-1 flex items-center gap-2 text-left text-sm min-w-0 py-0.5"
                                   >
                                     <span className="truncate flex-1">{food.name}</span>
                                     <span
                                       className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                                         WEIGHT_LABEL[food.weightType].className
                                       }`}
                                     >
                                       {WEIGHT_LABEL[food.weightType].label}
                                     </span>
                                     <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums w-14 text-right">
                                       蛋白 {food.protein}g
                                     </span>
                                     {selectedFoodId === food.id && (
                                       <Check className="size-3.5 text-primary shrink-0" />
                                     )}
                                   </button>

                                   {/* 操作按钮区：用原生 button，彻底绕开 shadcn Button 的 elevate 伪元素 */}
                                   <div className="shrink-0 flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
                                     {food.category === 'custom' ? (
                                       <>
                                          <button
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              openEdit(food);
                                            }}
                                            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent-foreground/5 active:scale-90 transition-all cursor-pointer"
                                            aria-label="编辑"
                                            title="编辑"
                                          >
                                            <Pencil className="size-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              handleDeleteCustom(food);
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                            }}
                                            className="h-8 w-8 flex items-center justify-center rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all cursor-pointer"
                                            aria-label="删除"
                                            title="点击删除该自定义食物"
                                          >
                                            <Trash2 className="size-4" />
                                          </button>
                                       </>
                                     ) : (
                                       <>
                                         <button
                                           type="button"
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             e.preventDefault();
                                             openEdit(food);
                                           }}
                                           className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent-foreground/5 transition-colors"
                                           aria-label="编辑宏量"
                                           title="编辑宏量"
                                         >
                                           <Pencil className="size-3.5" />
                                         </button>
                                         {overridden && (
                                           <button
                                             type="button"
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               e.preventDefault();
                                               handleResetBuiltIn(food.id, e);
                                             }}
                                             className="h-7 w-7 flex items-center justify-center rounded-md text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                             aria-label="恢复默认"
                                             title="恢复默认值"
                                           >
                                             <RotateCcw className="size-3.5" />
                                           </button>
                                         )}
                                       </>
                                     )}
                                   </div>

                                   {overridden && food.category !== 'custom' && (
                                     <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                                       已改
                                     </span>
                                   )}
                                 </div>
                               );
                             })}
                            {!isLastVisible && <Separator className="my-1" />}
                          </div>
                        );
                      })}
                    </div>
                     </>
                   ) : (
                     // 权威营养库搜索结果
                     <div className="p-1">
                       {nutritionSearch.loading ? (
                         <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                           <Loader2 className="size-4 animate-spin" />
                           正在搜索权威营养库...
                         </div>
                       ) : nutritionSearch.error ? (
                         <div className="py-8 text-center text-sm">
                           <p className="text-destructive">搜索失败</p>
                           <p className="text-xs text-muted-foreground mt-1">{nutritionSearch.error}</p>
                           <p className="text-xs text-muted-foreground mt-3">
                             可切换到「本地食物库」手动添加
                           </p>
                         </div>
                       ) : nutritionSearch.results.length === 0 ? (
                         <div className="py-8 text-center text-sm text-muted-foreground">
                           {keyword.trim() ? '未找到匹配的权威数据' : '输入关键词搜索 USDA / Open Food Facts'}
                         </div>
                       ) : (
                         <div className="space-y-0.5">
                           <div className="px-2.5 py-1.5 text-[10px] text-muted-foreground flex items-center gap-2">
                             <span>来自 {nutritionSearch.sources.usda + nutritionSearch.sources.openfoodfacts} 条结果</span>
                             <span className="text-[9px]">
                               (USDA {nutritionSearch.sources.usda} · OFF {nutritionSearch.sources.openfoodfacts})
                             </span>
                           </div>
                           {nutritionSearch.results.map((item) => (
                             <div
                               key={item.id}
                               className="flex items-start gap-2 px-2 py-2 rounded-sm hover:bg-accent/60 cursor-pointer transition-colors"
                               onClick={() => handleAddFromAuthority(item)}
                             >
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-1.5">
                                   <span className="text-sm font-medium truncate">{item.name}</span>
                                   <span
                                     className={`shrink-0 text-[9px] px-1 py-0.5 rounded ${
                                       item.source === 'usda'
                                         ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                         : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                     }`}
                                   >
                                     {item.source === 'usda' ? 'USDA' : 'OFF'}
                                   </span>
                                 </div>
                                 {item.brand && (
                                   <div className="text-[11px] text-muted-foreground truncate">{item.brand}</div>
                                 )}
                                 <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                                   碳水 {item.carbs}g · 蛋白 {item.protein}g · 脂肪 {item.fat}g
                                 </div>
                               </div>
                               <Plus className="size-4 shrink-0 text-muted-foreground mt-1" />
                             </div>
                           ))}
                           <div className="px-2.5 py-2 text-[10px] text-muted-foreground border-t border-border/50 mt-1">
                             数据来源：USDA FoodData Central & Open Food Facts · 点击即添加为自定义食物
                           </div>
                         </div>
                       )}
                     </div>
                   )}
                </ScrollArea>

                {/* 底部：新增自定义食物按钮 */}
                <div className="border-t border-border p-2">
                  <Button
                    variant="outline"
                    className="w-full h-9 text-sm"
                    onClick={openNewCustom}
                  >
                    <Plus className="size-4 mr-1" />
                    添加自定义食物
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 items-end">
            <div className="w-24 space-y-1.5">
              <label className="text-xs text-muted-foreground">克数</label>
              <Input
                type="number"
                value={grams}
                min={1}
                onChange={(e) => setGrams(Number(e.target.value) || 0)}
                className="bg-background"
              />
            </div>
            <div className="flex-1 text-xs text-muted-foreground pb-2">
              每 100g：碳水 {selectedFood?.carbs ?? 0}g · 蛋白 {selectedFood?.protein ?? 0}g · 脂肪{' '}
              {selectedFood?.fat ?? 0}g
            </div>
            <Button onClick={handleAdd} className="shrink-0">
              <Plus className="size-4 mr-1" /> 添加
            </Button>
          </div>
          {selectedFood && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {selectedFood.name} ({WEIGHT_LABEL[selectedFood.weightType].label}) · {grams}g
                {isOverridden(selectedFood.id) && (
                  <span className="ml-1 text-purple-600 dark:text-purple-400">（已自定义）</span>
                )}
              </span>
              <span className="tabular-nums font-medium text-foreground">
                ≈ {round1(previewMacros.calories)} kcal
              </span>
            </div>
          )}
        </div>

        {/* 列表操作栏 */}
        {entriesWithMacros.length > 0 && (
          <div className="flex items-center justify-between mb-3 pt-1">
            <div className="text-xs text-muted-foreground tabular-nums">
              共 {entriesWithMacros.length} 项食物
            </div>
            {selectMode ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleToggleAll}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md hover:bg-accent transition-colors"
                >
                  {allChecked ? (
                    <CheckSquare className="size-4 text-primary" />
                  ) : (
                    <Square className="size-4 text-muted-foreground" />
                  )}
                  <span>{allChecked ? '取消全选' : '全选'}</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (checkedIds.size === 0) return;
                    handleBulkRemove();
                  }}
                  disabled={checkedIds.size === 0}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all ${
                    checkedIds.size === 0
                      ? 'text-muted-foreground opacity-50 cursor-not-allowed'
                      : 'text-destructive hover:bg-destructive/10 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Trash2 className="size-3.5" />
                  <span>删除所选 ({checkedIds.size})</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    exitSelectMode();
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-accent transition-colors"
                >
                  <X className="size-3.5" />
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelectMode(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <CheckSquare className="size-3.5" />
                  多选
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleClearAll();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  清空全部
                </button>
              </div>
            )}
          </div>
        )}

        {/* 列表 */}
        {entriesWithMacros.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            还没有添加食物，选择食物并输入克数开始记录
          </div>
        ) : (
          <div className="space-y-2">
            {entriesWithMacros.map(({ entry, food, macros }) => {
              if (!food || !macros) return null;
              return (
                <FoodRow
                  key={entry.id}
                  food={food}
                  grams={entry.grams}
                  macros={macros}
                  overridden={isOverridden(food.id)}
                  selectMode={selectMode}
                  checked={checkedIds.has(entry.id)}
                  onToggleCheck={() => handleToggleCheck(entry.id)}
                  onGramsChange={(v) => handleGramsChange(entry.id, v)}
                  onRemove={() => handleRemove(entry.id, food.name)}
                />
              );
            })}
          </div>
        )}
      </CardContent>

      {/* 自定义食物对话框 */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFood
                ? editingFood.category === 'custom'
                  ? '编辑自定义食物'
                  : '自定义食物宏量'
                : '添加自定义食物'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              每 100g 可食部的宏量营养数据
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>食物名称</Label>
              <Input
                placeholder="如：我的蛋白粉、肯德基帕尼尼"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (isAiResult) setIsAiResult(false);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAiRecognize}
                disabled={isAiLoading || !formName.trim()}
                className="w-full mt-2 h-9"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    AI 识别中...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 mr-1.5 text-primary" />
                    AI 智能识别营养
                  </>
                )}
              </Button>
            </div>

            {/* AI 估算提示条 */}
            {isAiResult && (
              <div className="flex items-start gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 p-2.5">
                <Sparkles className="size-3.5 text-violet-600 dark:text-violet-300 shrink-0 mt-0.5" />
                <p className="text-[11px] text-foreground dark:text-violet-100 leading-relaxed">
                  以上为 AI 估算参考值，建议以实物包装或营养 APP 实测为准；可手动微调后保存。
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-amber-600 dark:text-amber-500">碳水 (g)</Label>
                <Input
                  type="number"
                  value={formCarbs}
                  min={0}
                  step={0.1}
                  onChange={(e) => setFormCarbs(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-rose-600 dark:text-rose-500">蛋白质 (g)</Label>
                <Input
                  type="number"
                  value={formProtein}
                  min={0}
                  step={0.1}
                  onChange={(e) => setFormProtein(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-600 dark:text-emerald-500">脂肪 (g)</Label>
                <Input
                  type="number"
                  value={formFat}
                  min={0}
                  step={0.1}
                  onChange={(e) => setFormFat(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>重量类型</Label>
              <RadioGroup
                value={formWeightType}
                onValueChange={(v) => setFormWeightType(v as IFood['weightType'])}
                className="grid grid-cols-4 gap-2"
              >
                {(['raw', 'cooked', 'dry', 'other'] as const).map((t) => (
                  <div key={t}>
                    <RadioGroupItem value={t} id={`weight-${t}`} className="peer sr-only" />
                    <Label
                      htmlFor={`weight-${t}`}
                      className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 py-2 text-xs peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
                    >
                      {WEIGHT_LABEL[t].label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="品牌、购买渠道、实测来源等"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="h-16 resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3">
                <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-foreground dark:text-amber-100 leading-relaxed">
                  预制食品（外卖、肯德基、麦当劳等）和补剂（蛋白粉、肌酸等）品牌间差异大，建议用营养 APP 扫码实测后手动录入。
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3">
                <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-foreground dark:text-blue-100 leading-relaxed">
                  不知道宏量数值也没关系，可先添加占位，之后在食物列表中点击 <span className="font-medium">铅笔图标</span> 随时补全。
                </p>
              </div>
            </div>

            {/* 实时预览 */}
            <div className="flex items-center justify-between text-xs bg-muted/40 rounded-md px-3 py-2">
              <span className="text-muted-foreground">
                100g 约 <span className="font-medium text-foreground">{round1(formCarbs * 4 + formProtein * 4 + formFat * 9)}</span> kcal
              </span>
              <span className="text-muted-foreground">
                碳水 {formCarbs}g · 蛋白 {formProtein}g · 脂肪 {formFat}g
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {editingFood && editingFood.category !== 'custom' && (
              <Button
                variant="outline"
                onClick={() => {
                  resetOverride(editingFood.id);
                  setCustomDialogOpen(false);
                  toast.success('已恢复默认值');
                }}
                className="mr-auto"
              >
                <RotateCcw className="size-3.5 mr-1" />
                恢复默认
              </Button>
            )}
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitCustom}>
              {editingFood ? '保存修改' : '添加食物'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});

interface FoodRowProps {
  food: IFood;
  grams: number;
  macros: { calories: number; carbs: number; protein: number; fat: number };
  overridden: boolean;
  selectMode?: boolean;
  checked?: boolean;
  onToggleCheck?: () => void;
  onGramsChange: (grams: number) => void;
  onRemove: () => void;
}

function FoodRow({
  food,
  grams,
  macros,
  overridden,
  selectMode = false,
  checked = false,
  onToggleCheck,
  onGramsChange,
  onRemove,
}: FoodRowProps) {
  const weightInfo = WEIGHT_LABEL[food.weightType];
  return (
    <div
      className={`rounded-lg border bg-card p-3 transition-colors ${
        checked
          ? 'border-primary/50 bg-primary/[0.02]'
          : 'border-border hover:border-primary/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {/* 复选框：多选模式下显示 */}
        {selectMode && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onToggleCheck?.();
            }}
            onClick={(e) => e.preventDefault()}
            className="h-5 w-5 shrink-0 flex items-center justify-center cursor-pointer"
            aria-label={checked ? '取消选择' : '选择'}
          >
            {checked ? (
              <CheckSquare className="size-5 text-primary" />
            ) : (
              <Square className="size-5 text-muted-foreground/60" />
            )}
          </button>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {food.category === 'custom' && (
            <Star className="size-3.5 text-amber-500 shrink-0 fill-amber-500" />
          )}
          <span className="font-medium text-sm truncate">{food.name}</span>
          <span
            className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${weightInfo.className}`}
          >
            {weightInfo.label}
          </span>
          {overridden && food.category !== 'custom' && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
              已自定义
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="number"
            value={grams}
            min={1}
            onChange={(e) => onGramsChange(Number(e.target.value) || 0)}
            className="w-20 h-8 text-sm text-right tabular-nums"
          />
          <span className="text-xs text-muted-foreground w-4">g</span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onRemove();
            }}
            onClick={(e) => {
              e.preventDefault();
            }}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all cursor-pointer"
            aria-label="删除该条食物"
            title="删除该条食物"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <div className="text-amber-600 dark:text-amber-500 font-semibold tabular-nums">
            {round1(macros.carbs)}
          </div>
          <div className="text-muted-foreground text-[10px]">碳水 g</div>
        </div>
        <div>
          <div className="text-rose-600 dark:text-rose-500 font-semibold tabular-nums">
            {round1(macros.protein)}
          </div>
          <div className="text-muted-foreground text-[10px]">蛋白 g</div>
        </div>
        <div>
          <div className="text-emerald-600 dark:text-emerald-500 font-semibold tabular-nums">
            {round1(macros.fat)}
          </div>
          <div className="text-muted-foreground text-[10px]">脂肪 g</div>
        </div>
        <div>
          <div className="font-semibold tabular-nums">{round1(macros.calories)}</div>
          <div className="text-muted-foreground text-[10px]">kcal</div>
        </div>
      </div>
    </div>
  );
}
