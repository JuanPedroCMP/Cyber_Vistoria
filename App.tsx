import React, { useState, useEffect } from 'react';
import { InspectionData, AppStep } from './types';
import { SetupScreen } from './components/SetupScreen';
import { InspectionScreen } from './components/InspectionScreen';
import { ReportScreen } from './components/ReportScreen';

/**
 * A custom hook to persist state to localStorage.
 * This prevents data loss if the browser tab is suspended or closed,
 * which is common on mobile devices when using the camera.
 */
function usePersistentState<T>(key: string, initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = window.localStorage.getItem(key);
            if (storedValue && storedValue !== 'null') {
                return JSON.parse(storedValue);
            }
            return initialState;
        } catch (error) {
            console.error(`Error reading from localStorage key “${key}”:`, error);
            return initialState;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error(`Error writing to localStorage key “${key}”:`, error);
        }
    }, [key, state]);

    return [state, setState];
}

interface AppState {
  step: AppStep;
  data: InspectionData | null;
}

const App: React.FC = () => {
  const [appState, setAppState] = usePersistentState<AppState>('inspectionAppState', {
    step: AppStep.Setup,
    data: null,
  });

  const handleSetupComplete = (data: InspectionData) => {
    setAppState({ step: AppStep.Inspection, data: data });
  };

  const handleUpdateInspection = (data: InspectionData) => {
    setAppState(prev => ({ ...prev, data: data }));
  };
  
  const handleFinishInspection = () => {
    setAppState(prev => ({ ...prev, step: AppStep.Report }));
  };

  const handleBackToSetup = () => {
    setAppState({ step: AppStep.Setup, data: null });
    // Clear localStorage for the next inspection
    try {
        window.localStorage.removeItem('inspectionAppState');
    } catch (e) {
        console.error("Failed to remove item from localStorage", e);
    }
  }

  const renderStep = () => {
    switch (appState.step) {
      case AppStep.Setup:
        return <SetupScreen onSetupComplete={handleSetupComplete} />;
      case AppStep.Inspection:
        if (appState.data) {
          return <InspectionScreen inspectionData={appState.data} onUpdateInspection={handleUpdateInspection} onFinishInspection={handleFinishInspection} />;
        }
        // Fallback to setup if data is missing
        return <SetupScreen onSetupComplete={handleSetupComplete} />;
      case AppStep.Report:
         if (appState.data) {
          return <ReportScreen inspectionData={appState.data} onBackToSetup={handleBackToSetup} onUpdateInspection={handleUpdateInspection} />;
        }
         // Fallback to setup if data is missing
        return <SetupScreen onSetupComplete={handleSetupComplete} />;
      default:
        return <SetupScreen onSetupComplete={handleSetupComplete} />;
    }
  };

  return <div className="font-sans">{renderStep()}</div>;
};

export default App;