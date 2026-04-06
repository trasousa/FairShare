import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LandingPage } from './components/LandingPage';
import { Onboarding } from './components/Onboarding';
import { UserSelector } from './components/UserSelector';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { CurrentUserId } from './types';

const Root = () => {
    const [view, setView] = useState<'LANDING' | 'ONBOARDING' | 'USER_SELECT' | 'APP'>('LANDING');
    const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUserId | null>(null);

    const handleSelectInstance = (id: string) => {
        setActiveInstanceId(id);
        setView('USER_SELECT');
    };

    const handleUserSelected = (userId: CurrentUserId) => {
        setCurrentUser(userId);
        setView('APP');
    };

    const handleCreateNew = () => {
        setView('ONBOARDING');
    };

    const handleOnboardingComplete = (id: string) => {
        setActiveInstanceId(id);
        setView('USER_SELECT');
    };

    const handleExitApp = () => {
        setActiveInstanceId(null);
        setCurrentUser(null);
        setView('LANDING');
    };

    if (view === 'APP' && activeInstanceId && currentUser) {
        return (
            <ErrorBoundary componentName="App">
                <App instanceId={activeInstanceId} currentUser={currentUser} onExit={handleExitApp} />
            </ErrorBoundary>
        );
    }

    if (view === 'USER_SELECT' && activeInstanceId) {
        return (
            <ErrorBoundary componentName="UserSelector">
                <UserSelector
                    instanceId={activeInstanceId}
                    onSelect={handleUserSelected}
                    onBack={() => { setActiveInstanceId(null); setView('LANDING'); }}
                />
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
