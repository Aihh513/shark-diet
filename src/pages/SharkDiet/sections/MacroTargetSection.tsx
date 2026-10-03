import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dumbbell, Moon, Flame, Zap } from 'lucide-react';
import type { DietMode, MacroValues, DietParams } from '@/lib/macros';
import { calcBMR, calcTDEE, calcMacros } from '@/lib/macros';

interface MacroTargetSectionProps {
  params: DietParams;
  mode: DietMode;
  onModeChange: (mode: DietMode) => void;
}

export default memo(function MacroTargetSection({ params, mode, onModeChange }: MacroTargetSectionProps) {
  const bmr = Math.round(calcBMR(params));
  const tdee = Math.round(calcTDEE(params));
  const macros = calcMacros(params, mode);
  const trainingMacros = calcMacros(params, 'training');
  const restMacros = calcMacros(params, 'rest');
  const carbsDiff = trainingMacros.carbs - restMacros.carbs;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            宏量目标
          </CardTitle>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && onModeChange(v as DietMode)}
            className="border border-border rounded-md p-0.5 bg-muted/30"
          >
            <ToggleGroupItem
              value="training"
              aria-label="训练日"
              className={`gap-1.5 text-sm data-[state=on]:bg-orange-500 data-[state=on]:text-white data-[state=on]:shadow-sm hover:data-[state=off]:bg-transparent`}
            >
              <Dumbbell className="size-4" />
              训练日
            </ToggleGroupItem>
            <ToggleGroupItem
              value="rest"
              aria-label="休息日"
              className="gap-1.5 text-sm data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:shadow-sm hover:data-[state=off]:bg-transparent"
            >
              <Moon className="size-4" />
              休息日
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 热量三数字 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/40 py-3">
            <div className="text-xs text-muted-foreground">BMR</div>
            <div className="text-xl font-bold tabular-nums mt-0.5">{bmr}</div>
            <div className="text-[10px] text-muted-foreground">基础代谢 kcal</div>
          </div>
          <div className="rounded-lg bg-muted/40 py-3">
            <div className="text-xs text-muted-foreground">TDEE</div>
            <div className="text-xl font-bold tabular-nums mt-0.5">{tdee}</div>
            <div className="text-[10px] text-muted-foreground">总消耗 kcal</div>
          </div>
          <div
            className={`rounded-lg py-3 ${
              mode === 'training'
                ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
            }`}
          >
            <div className="text-xs opacity-80">目标摄入</div>
            <div className="text-xl font-bold tabular-nums mt-0.5">{macros.calories}</div>
            <div className="text-[10px] opacity-80">kcal/天</div>
          </div>
        </div>

        {/* 宏量三栏 */}
        <div className="space-y-3">
          <MacroRow
            label="碳水"
            value={macros.carbs}
            unit="g"
            color="bg-amber-500"
            hint={
              mode === 'training'
                ? `休息日 ${restMacros.carbs} g（↓${carbsDiff} g）`
                : `训练日 ${trainingMacros.carbs} g（↑${carbsDiff} g）`
            }
          />
          <MacroRow label="蛋白质" value={macros.protein} unit="g" color="bg-rose-500" />
          <MacroRow label="脂肪" value={macros.fat} unit="g" color="bg-emerald-500" />
        </div>

        <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
          <Flame className="size-3 inline mr-1 -mt-0.5" />
          配比 5:3:2 · 碳水 50% · 蛋白 30% · 脂肪 20%
          {mode === 'rest' && ' · 休息日碳水 ↓15%'}
        </div>
      </CardContent>
    </Card>
  );
});

interface MacroRowProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  hint?: string;
}

function MacroRow({ label, value, unit, color, hint }: MacroRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`size-2 rounded-full ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-right">
        <div className="text-base font-semibold tabular-nums">
          {value}
          <span className="text-xs text-muted-foreground font-normal ml-0.5">{unit}</span>
        </div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}
