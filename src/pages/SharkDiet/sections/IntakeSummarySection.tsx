import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useFoods } from '@/hooks/use-foods';
import type { FoodEntry, MacroValues, DietMode, DietParams } from '@/lib/macros';
import { calcMacros, calcFoodMacros, round1 } from '@/lib/macros';

interface IntakeSummarySectionProps {
  entries: FoodEntry[];
  params: DietParams;
  mode: DietMode;
}

export default memo(function IntakeSummarySection({
  entries,
  params,
  mode,
}: IntakeSummarySectionProps) {
  const { allFoods } = useFoods();
  const target = calcMacros(params, mode);

  const total = useMemo<MacroValues>(() => {
    let calories = 0;
    let carbs = 0;
    let protein = 0;
    let fat = 0;
    for (const e of entries) {
      const food = allFoods.find((f) => f.id === e.foodId);
      if (!food) continue;
      const m = calcFoodMacros(food, e.grams);
      calories += m.calories;
      carbs += m.carbs;
      protein += m.protein;
      fat += m.fat;
    }
    return { calories, carbs, protein, fat };
  }, [entries, allFoods]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChart className="size-5 text-primary" />
          摄入汇总
          <Badge
            variant="outline"
            className={`ml-auto font-normal ${
              mode === 'training'
                ? 'border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-950/30'
                : 'border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/30'
            }`}
          >
            {mode === 'training' ? '训练日目标' : '休息日目标'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 总热量 */}
        <div className="rounded-lg bg-muted/30 p-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-medium">总热量</span>
            <div className="text-right">
              <span className="text-2xl font-bold tabular-nums">
                {round1(total.calories)}
              </span>
              <span className="text-muted-foreground text-sm"> / {target.calories} kcal</span>
            </div>
          </div>
          <MacroBar
            current={total.calories}
            target={target.calories}
            color="bg-primary"
          />
        </div>

        {/* 三大宏量 */}
        <div className="space-y-3">
          <MacroItem
            label="碳水"
            current={total.carbs}
            target={target.carbs}
            color="bg-amber-500"
            unit="g"
          />
          <MacroItem
            label="蛋白质"
            current={total.protein}
            target={target.protein}
            color="bg-rose-500"
            unit="g"
          />
          <MacroItem
            label="脂肪"
            current={total.fat}
            target={target.fat}
            color="bg-emerald-500"
            unit="g"
          />
        </div>
      </CardContent>
    </Card>
  );
});

interface MacroItemProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit: string;
}

function MacroItem({ label, current, target, color, unit }: MacroItemProps) {
  const pct = target > 0 ? (current / target) * 100 : 0;
  const status = getStatus(pct);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${color}`} />
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} pct={pct} target={target} current={current} unit={unit} />
          <span className="tabular-nums text-muted-foreground text-xs">
            {round1(current)}/{target}
            {unit}
          </span>
        </div>
      </div>
      <MacroBar current={current} target={target} color={color} />
    </div>
  );
}

function MacroBar({
  current,
  target,
  color,
}: {
  current: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  // 超出部分用红色尾段
  const overflow = current > target ? ((current - target) / target) * 100 : 0;

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`absolute left-0 top-0 h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
      {overflow > 0 && (
        <div
          className="absolute top-0 h-full rounded-full bg-destructive transition-all"
          style={{ left: `${pct}%`, width: `${Math.min(overflow, 100 - pct)}%` }}
        />
      )}
    </div>
  );
}

type Status = 'ok' | 'low' | 'high';

function getStatus(pct: number): Status {
  if (pct < 80) return 'low';
  if (pct > 105) return 'high';
  return 'ok';
}

function StatusBadge({ status, pct, current, target, unit }: {
  status: Status;
  pct: number;
  current: number;
  target: number;
  unit: string;
}) {
  const diff = current - target;
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-500">
        <CheckCircle2 className="size-3.5" />
        达标
      </span>
    );
  }
  if (status === 'low') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-500">
        <AlertCircle className="size-3.5" />
        还差 {round1(Math.abs(diff))}
        {unit} ({Math.round(pct)}%)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
      <XCircle className="size-3.5" />
      超出 {round1(diff)}
      {unit} ({Math.round(pct)}%)
    </span>
  );
}
