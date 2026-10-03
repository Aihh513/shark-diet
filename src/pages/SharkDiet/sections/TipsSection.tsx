import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Scale,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Flame,
  AlertCircle,
  Droplets,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default memo(function TipsSection() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-4">
      {/* 体重停滞调整指南 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="size-5 text-primary" />
            体重停滞调整指南
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l-2 border-border ml-3 space-y-5 py-1">
            <StepItem
              icon={<Scale className="size-4" />}
              title="连续 7 天体重不动"
              desc="先核查称重准确性：同一时间（晨起空腹排便后）、同一秤、同一穿着。"
              stepNo={1}
              color="bg-amber-500 border-amber-500"
            />
            <StepItem
              icon={<Flame className="size-4" />}
              title="仍不动 → 每日热量 -100 kcal"
              desc="优先从碳水扣，脂肪保持不动（保护睾酮水平）。"
              stepNo={2}
              color="bg-orange-500 border-orange-500"
            />
            <StepItem
              icon={<AlertTriangle className="size-4" />}
              title="再观察 7 天"
              desc="仍不动再降 100 kcal，每次调整后给身体 1 周时间适应。"
              stepNo={3}
              color="bg-rose-500 border-rose-500"
            />
            <StepItem
              icon={<RefreshCw className="size-4" />}
              title="连续两次仍不动 → 重算 TDEE"
              desc="可能体成分变化较大，用新体重重新计算基础代谢。"
              stepNo={4}
              color="bg-primary border-primary"
              last
            />
          </ol>
        </CardContent>
      </Card>

      {/* 关键规则提示 */}
      <Card>
        <CardHeader className="pb-2">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setExpanded(!expanded)}
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="size-5 text-primary" />
              关键规则提示
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 space-y-3">
                <RuleCard
                  icon={<Scale className="size-4 text-primary" />}
                  title="肉类按生重算营养"
                  desc="烹饪只会脱水，不会改变蛋白质总量。生重才是准确基准。"
                />
                <RuleCard
                  icon={<AlertTriangle className="size-4 text-rose-500" />}
                  title="休息日只砍碳水"
                  desc="脂肪必须维持目标量，保护睾酮水平，避免代谢下降。"
                />
                <RuleCard
                  icon={<AlertCircle className="size-4 text-amber-500" />}
                  title="外卖脂肪常被低估"
                  desc="预制食品标签脂肪含量普遍偏低，建议用营养 APP 实测对比。"
                />
                <RuleCard
                  icon={<Droplets className="size-4 text-blue-500" />}
                  title="钠过高会储水"
                  desc="高钠饮食导致水分潴留，掩盖线条，体重短期浮动属正常。"
                />
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
});

interface StepItemProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  stepNo: number;
  color: string;
  last?: boolean;
}

function StepItem({ icon, title, desc, stepNo, color, last }: StepItemProps) {
  return (
    <li className="ml-5">
      <span
        className={`absolute -left-[9px] flex size-4 items-center justify-center rounded-full text-white ring-4 ring-background ${color}`}
      />
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 size-6 rounded-full flex items-center justify-center shrink-0 text-white ${color.split(' ')[0]}`}
        >
          {icon}
        </div>
        <div className={last ? '' : ''}>
          <div className="text-sm font-semibold">
            步骤 {stepNo}：{title}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
    </li>
  );
}

function RuleCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
