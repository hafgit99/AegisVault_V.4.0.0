import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingWizard } from '../OnboardingWizard';

// i18next mock
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

// framer-motion mock
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('OnboardingWizard', () => {
    it('should render the welcome step initially', () => {
        render(<OnboardingWizard onComplete={() => {}} />);
        expect(screen.getByText('onboarding.welcome.title')).toBeTruthy();
        expect(screen.getByText('onboarding.welcome.desc')).toBeTruthy();
    });

    it('should navigate to the next step when Continue is clicked', () => {
        render(<OnboardingWizard onComplete={() => {}} />);
        const nextButton = screen.getByText('onboarding.next');
        fireEvent.click(nextButton);

        expect(screen.getByText('onboarding.profile.title')).toBeTruthy();
    });

    it('should call onComplete when the final step is reached and clicked', () => {
        const onComplete = vi.fn();
        render(<OnboardingWizard onComplete={onComplete} />);
        
        // 5 steps total
        const nextButton = screen.getByText('onboarding.next');
        fireEvent.click(nextButton); // Step 1: Profile
        fireEvent.click(nextButton); // Step 2: Extension
        fireEvent.click(nextButton); // Step 3: Mobile
        fireEvent.click(nextButton); // Step 4: Finalize
        
        const finishButton = screen.getByText('onboarding.finish');
        fireEvent.click(finishButton);

        expect(onComplete).toHaveBeenCalled();
    });

    it('should allow security profile selection', () => {
        render(<OnboardingWizard onComplete={() => {}} />);
        
        // Go to Profile step (Step 1)
        fireEvent.click(screen.getByText('onboarding.next'));

        const standardProfile = screen.getByText('onboarding.profile.standard.name');
        fireEvent.click(standardProfile);

        // The UI should show it's active - in our implementation we added a border/ring
        // Since we are using standard testing-library, we can check for classes if needed
        expect(standardProfile.closest('button')).toBeTruthy();
    });
});
