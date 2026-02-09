'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import SplashScreen from '@/components/onboarding/SplashScreen';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import FeatureHighlights from '@/components/onboarding/FeatureHighlights';
import GetStarted from '@/components/onboarding/GetStarted';

type OnboardingStep = 'splash' | 'welcome' | 'features' | 'getStarted';

export default function OnboardingPage() {
    const [step, setStep] = useState<OnboardingStep>('splash');

    return (
        <div className="min-h-screen bg-black overflow-hidden">
            <AnimatePresence mode="wait">
                {step === 'splash' && (
                    <SplashScreen
                        key="splash"
                        onComplete={() => setStep('welcome')}
                    />
                )}

                {step === 'welcome' && (
                    <WelcomeScreen
                        key="welcome"
                        onContinue={() => setStep('features')}
                    />
                )}

                {step === 'features' && (
                    <FeatureHighlights
                        key="features"
                        onComplete={() => setStep('getStarted')}
                        onBack={() => setStep('welcome')}
                    />
                )}

                {step === 'getStarted' && (
                    <GetStarted
                        key="getStarted"
                        onBack={() => setStep('features')}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
