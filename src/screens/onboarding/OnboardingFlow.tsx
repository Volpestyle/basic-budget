import React, { useState } from 'react';
import { AnimatePresence, MotiView } from 'moti';
import { OnboardingCycleScreen } from './OnboardingCycleScreen';
import { OnboardingIncomeScreen } from './OnboardingIncomeScreen';
import type { CycleType, WeekDay, MoneyCents } from '../../types/domain';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingResult) => void;
}

export interface OnboardingResult {
  cycleType: CycleType;
  weekStart: WeekDay;
  incomeCents: MoneyCents;
  categories: { name: string; icon: string; color: string; kind: 'need' | 'want' }[];
}

type Step = 'cycle' | 'income';

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('cycle');
  const [cycleType, setCycleType] = useState<CycleType>('monthly');
  const [weekStart, setWeekStart] = useState<WeekDay>(1);

  const handleCycleNext = (ct: CycleType, ws: WeekDay) => {
    setCycleType(ct);
    setWeekStart(ws);
    setStep('income');
  };

  const handleIncomeComplete = (
    incomeCents: MoneyCents,
    categories: { name: string; icon: string; color: string; kind: 'need' | 'want' }[],
  ) => {
    onComplete({ cycleType, weekStart, incomeCents, categories });
  };

  return (
    <AnimatePresence exitBeforeEnter>
      {step === 'cycle' && (
        <MotiView
          key="cycle"
          from={{ opacity: 0, translateX: -30 }}
          animate={{ opacity: 1, translateX: 0 }}
          exit={{ opacity: 0, translateX: -30 }}
          transition={{ type: 'timing', duration: 300 }}
          style={{ flex: 1 }}
        >
          <OnboardingCycleScreen onNext={handleCycleNext} />
        </MotiView>
      )}
      {step === 'income' && (
        <MotiView
          key="income"
          from={{ opacity: 0, translateX: 30 }}
          animate={{ opacity: 1, translateX: 0 }}
          exit={{ opacity: 0, translateX: 30 }}
          transition={{ type: 'timing', duration: 300 }}
          style={{ flex: 1 }}
        >
          <OnboardingIncomeScreen
            cycleType={cycleType}
            onComplete={handleIncomeComplete}
            onBack={() => setStep('cycle')}
          />
        </MotiView>
      )}
    </AnimatePresence>
  );
}
