import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LandingPage } from './components/LandingPage';
import { Onboarding } from './components/Onboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

const Root = () => {
    const [view, setView] = useState<'LANDING' | 'ONBOARDING' | 'APP'>('LANDING');
    const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);

    const handleSelectInstance = (id: string) => {
        setActiveInstanceId(id);
        setView('APP');
    };

    const handleCreateNew = () => {
        setView('ONBOARDING');
    };

    const handleOnboardingComplete = (id: string) => {
        setActiveInstanceId(id);
        setView('APP');
    };

    const handleExitApp = () => {
        setActiveInstanceId(null);
        setView('LANDING');
    };

    if (view === 'APP' && activeInstanceId) {
        return (
            <ErrorBoundary componentName="App">
                <App instanceId={activeInstanceId} onExit={handleExitApp} />
            </ErrorBoundary>
        );
    }

    if (view === 'ONBOARDING') {
        return (
            <ErrorBoundary componentName="Onboarding">
                <Onboarding onComplete={handleOnboardingComplete} onCancel={() => setView('LANDING')} />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary componentName="LandingPage">
            <LandingPage onSelectInstance={handleSelectInstance} onCreateNew={handleCreateNew} />
        </ErrorBoundary>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <Root />
    </ToastProvider>
  </React.StrictMode>
);