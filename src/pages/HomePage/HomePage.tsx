import { useState, useEffect, useCallback } from 'react';
import { Fish, Github, Crown, Sparkles } from 'lucide-react';
import ParamsInputSection from '@/pages/SharkDiet/sections/ParamsInputSection';
import MacroTargetSection from '@/pages/SharkDiet/sections/MacroTargetSection';
import FoodCalculatorSection from '@/pages/SharkDiet/sections/FoodCalculatorSection';
import IntakeSummarySection from '@/pages/SharkDiet/sections/IntakeSummarySection';
import TipsSection from '@/pages/SharkDiet/sections/TipsSection';
import type { DietParams, DietMode, FoodEntry } from '@/lib/macros';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { useNavigate } from 'react-router-dom';

const STORAGE_PARAMS = 'shark_diet_params';
const STORAGE_MODE = 'shark_diet_mode';
const STORAGE_ENTRIES = 'shark_diet_entries';

const DEFAULT_PARAMS: DietParams = {
  height: 175,
  weight: 70,
  age: 25,
  gender: 'male',
  activityFactor: 1.375,
  goal: 'cut',
  deficit: 500,
  surplus: 300,
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = scopedStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<DietParams>(() =>
    loadFromStorage(STORAGE_PARAMS, DEFAULT_PARAMS),
  );
  const [mode, setMode] = useState<DietMode>(() =>
    loadFromStorage<'training' | 'rest'>(STORAGE_MODE, 'training'),
  );
  const [entries, setEntries] = useState<FoodEntry[]>(() =>
    loadFromStorage<FoodEntry[]>(STORAGE_ENTRIES, []),
  );

  // 持久化
  useEffect(() => {
    scopedStorage.setItem(STORAGE_PARAMS, JSON.stringify(params));
  }, [params]);

  useEffect(() => {
    scopedStorage.setItem(STORAGE_MODE, JSON.stringify(mode));
  }, [mode]);

  useEffect(() => {
    scopedStorage.setItem(STORAGE_ENTRIES, JSON.stringify(entries));
  }, [entries]);

  const handleModeChange = useCallback((m: DietMode) => setMode(m), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-background/70 backdrop-blur-md border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Fish className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">鲨鱼循环饮食计算器</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                基于赵师 & 粗人减脂模式
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
             <button
               onClick={() => navigate('/custom-plan')}
               className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm"
             >
               <Crown className="size-3" />
               <span className="font-medium">定制计划</span>
             </button>
           </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左栏：参数 + 目标 */}
          <div className="lg:col-span-2 space-y-6">
            <ParamsInputSection params={params} onChange={setParams} />
            <MacroTargetSection params={params} mode={mode} onModeChange={handleModeChange} />
          </div>

          {/* 右栏：食材 + 汇总 */}
          <div className="lg:col-span-3 space-y-6">
            <IntakeSummarySection entries={entries} params={params} mode={mode} />
            <FoodCalculatorSection entries={entries} onEntriesChange={setEntries} />
          </div>
        </div>

        {/* 底部：指南 + 规则 */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TipsSection />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>鲨鱼循环 · 让减脂更科学</p>
          <p className="flex items-center gap-1">
            <Github className="size-3" /> 数据本地存储，不上传服务器
          </p>
        </div>
      </footer>
    </div>
  );
}
