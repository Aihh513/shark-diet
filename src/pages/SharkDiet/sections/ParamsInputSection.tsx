import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Ruler, Scale, Calendar, Activity, Target, Flame } from 'lucide-react';
import type { DietParams } from '@/lib/macros';

interface ParamsInputSectionProps {
  params: DietParams;
  onChange: (params: DietParams) => void;
}

const ACTIVITY_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: '1.2', label: '久坐', desc: '几乎不运动' },
  { value: '1.375', label: '轻度活动', desc: '每周 1-3 次' },
  { value: '1.55', label: '中度活动', desc: '每周 3-5 次' },
  { value: '1.725', label: '高度活动', desc: '每周 6-7 次' },
];

export default memo(function ParamsInputSection({ params, onChange }: ParamsInputSectionProps) {
  const set = <K extends keyof DietParams>(key: K, value: DietParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="size-5 text-primary" />
          个人参数
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 身高体重年龄 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Ruler className="size-3" /> 身高 (cm)
            </Label>
            <Input
              type="number"
              value={params.height}
              min={100}
              max={250}
              onChange={(e) => set('height', Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Scale className="size-3" /> 体重 (kg)
            </Label>
            <Input
              type="number"
              value={params.weight}
              min={30}
              max={200}
              onChange={(e) => set('weight', Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" /> 年龄
            </Label>
            <Input
              type="number"
              value={params.age}
              min={10}
              max={100}
              onChange={(e) => set('age', Number(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* 性别 */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">性别</Label>
          <RadioGroup
            value={params.gender}
            onValueChange={(v) => set('gender', v as DietParams['gender'])}
            className="grid grid-cols-2 gap-2"
          >
            <div>
              <RadioGroupItem value="male" id="male" className="peer sr-only" />
              <Label
                htmlFor="male"
                className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-sm peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
              >
                男性
              </Label>
            </div>
            <div>
              <RadioGroupItem value="female" id="female" className="peer sr-only" />
              <Label
                htmlFor="female"
                className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-sm peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
              >
                女性
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 活动系数 */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="size-3" /> 活动系数
          </Label>
          <Select
            value={String(params.activityFactor)}
            onValueChange={(v) => set('activityFactor', Number(v) as DietParams['activityFactor'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="font-medium">{opt.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {opt.value} · {opt.desc}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 目标 */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Target className="size-3" /> 目标
          </Label>
          <RadioGroup
            value={params.goal}
            onValueChange={(v) => set('goal', v as DietParams['goal'])}
            className="grid grid-cols-3 gap-2"
          >
            {(['cut', 'maintain', 'bulk'] as const).map((g) => (
              <div key={g}>
                <RadioGroupItem value={g} id={`goal-${g}`} className="peer sr-only" />
                <Label
                  htmlFor={`goal-${g}`}
                  className="flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 py-2 text-sm peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary hover:bg-muted/50 transition-colors"
                >
                  {g === 'cut' ? '减脂' : g === 'maintain' ? '维持' : '增肌'}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* 缺口 / 盈余 */}
        {params.goal === 'cut' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Flame className="size-3" /> 减脂缺口 (kcal，默认 500)
            </Label>
            <Input
              type="number"
              value={params.deficit}
              min={0}
              max={1500}
              onChange={(e) => set('deficit', Number(e.target.value) || 0)}
            />
          </div>
        )}
        {params.goal === 'bulk' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Flame className="size-3" /> 增肌盈余 (kcal，默认 300)
            </Label>
            <Input
              type="number"
              value={params.surplus}
              min={0}
              max={1000}
              onChange={(e) => set('surplus', Number(e.target.value) || 0)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});
