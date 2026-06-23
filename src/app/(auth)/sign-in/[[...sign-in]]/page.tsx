import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="ko-sans min-h-screen bg-stone-50 flex items-center justify-center">
      <SignIn
        forceRedirectUrl="/"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
