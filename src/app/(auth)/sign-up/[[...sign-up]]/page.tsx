import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="ko-sans min-h-screen bg-stone-50 flex items-center justify-center">
      <SignUp
        appearance={{ elements: { socialButtonsBlockButton: { display: 'none' }, dividerRow: { display: 'none' } } }}
        fallbackRedirectUrl="/onboarding"
        signInUrl="/sign-in"
      />
    </div>
  );
}
