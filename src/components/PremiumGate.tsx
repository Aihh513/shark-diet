import { useState } from 'react';
import {
  Crown,
  Lock,
  Sparkles,
  Check,
  X,
  Loader2,
  ArrowRight,
  ChefHat,
  Dumbbell,
  Heart,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PAYMENT_PROVIDER_CONFIG } from '@/lib/membership';

interface PremiumGateProps {
  isPremium: boolean;
  loading: boolean;
  onActivate: () => Promise<boolean>;
  children: React.ReactNode;
}

export default function PremiumGate({ isPremium, loading, onActivate, children }: PremiumGateProps) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [activating, setActivating] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  // 未解锁：展示锁定态 + 解锁引导
  return (
    <>
      <LockedView onUnlock={() => setShowPaywall(true)} />
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Crown className="size-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">升级会员</DialogTitle>
                <DialogDescription>解锁教练级深度定制饮食计划</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {Object.entries(PAYMENT_PROVIDER_CONFIG.plans).map(([key, plan]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => {
                  toast.info('支付功能即将上线，敬请期待');
                }}
              >
                <div>
                  <div className="font-medium">{plan.label}</div>
                  <div className="text-xs text-muted-foreground">{plan.period}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">¥{(plan.price / 100).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs text-foreground dark:text-amber-100 leading-relaxed">
              💡 <strong>限时演示：</strong>支付功能开发中，点击下方按钮可体验完整会员功能。正式上线后将接入微信/支付宝支付。
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              className="w-full"
              disabled={activating}
              onClick={async () => {
                setActivating(true);
                const ok = await onActivate();
                setActivating(false);
                if (ok) {
                  setShowPaywall(false);
                  toast.success('会员已激活，开始定制你的专属饮食计划！');
                } else {
                  toast.error('激活失败，请稍后重试');
                }
              }}
            >
              {activating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  激活中...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  立即体验会员功能
                </>
              )}
            </Button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPaywall(false)}
            >
              暂不升级
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LockedView({ onUnlock }: { onUnlock: () => void }) {
  const navigate = useNavigate();

  const features = [
    {
      icon: ChefHat,
      title: '教练级餐单设计',
      desc: '结合你的食材偏好、训练安排，生成可执行的每日餐单',
    },
    {
      icon: Dumbbell,
      title: '训练日 / 休息日差异',
      desc: '鲨鱼循环碳周期深度定制，训练日充碳、休息日减脂',
    },
    {
      icon: Heart,
      title: '智能调整优化',
      desc: '不满意随时跟 AI 教练沟通调整，生成最适合你的版本',
    },
    {
      icon: Calendar,
      title: '每周复盘更新',
      desc: '记录执行情况，AI 给出下周调整建议，持续进步',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-background/70 backdrop-blur-md border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="size-4" />
            返回计算器
          </button>
          <Badge variant="outline" className="gap-1.5">
            <Crown className="size-3 text-amber-500" />
            会员功能
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Sparkles className="size-3.5" />
            会员专属
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            教练级深度定制饮食计划
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            不再是冰冷的数字计算。像请了一位私教营养师，结合你的训练、饮食、作息，生成一份真正可执行的个性化饮食方案。
          </p>
        </div>

        {/* 锁定卡片 */}
        <Card className="max-w-md mx-auto mb-12 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="size-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <Lock className="size-7 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">此功能为会员专属</h3>
            <p className="text-sm text-muted-foreground mb-5">
              升级会员，解锁 AI 教练级定制饮食计划
            </p>
            <Button size="lg" onClick={onUnlock}>
              <Crown className="size-4 mr-2" />
              升级会员解锁
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* 功能亮点 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <f.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{f.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 包含权益 */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-4 text-center">会员权益包含</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 max-w-xl mx-auto">
            {[
              '无限次 AI 定制饮食计划',
              '训练日 / 休息日差异化餐单',
              '食材偏好与禁忌定制',
              '智能多轮调整优化',
              '每周复盘与调整建议',
              '计划导出与分享',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-emerald-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
