import { useState, useEffect, useCallback, useRef } from 'react';
import { createInitialState, stepPhase, getPhaseDuration } from './simulation';
import type { SimulationState } from './types';
import Arena from './components/Arena';
import Sidebar from './components/Sidebar';

export default function App() {
  const [state, setState] = useState<SimulationState>(createInitialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = useCallback(() => {
    setState(prev => stepPhase(prev));
  }, []);

  const toggleRun = useCallback(() => {
    setState(prev => ({ ...prev, running: !prev.running }));
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(createInitialState());
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, speed }));
  }, []);

  // Auto-advance when running
  useEffect(() => {
    if (!state.running) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const duration = getPhaseDuration(state.phase, state.speed);
    timerRef.current = setTimeout(() => {
      setState(prev => {
        if (!prev.running) return prev;
        return stepPhase(prev);
      });
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.running, state.phase, state.speed, state.taskIndex]);

  return (
    <div className="h-screen flex">
      {/* Arena - main view */}
      <div className="flex-1 h-full">
        <Arena state={state} />
      </div>

      {/* Sidebar - controls, roster, log */}
      <div className="w-80 h-full flex-shrink-0">
        <Sidebar
          state={state}
          onToggleRun={toggleRun}
          onStep={step}
          onReset={reset}
          onSpeedChange={setSpeed}
        />
      </div>
    </div>
  );
}
