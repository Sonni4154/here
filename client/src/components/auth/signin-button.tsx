import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface SignInButtonProps {
  provider?: string;
  callbackUrl?: string;
  className?: string;
}

export function SignInButton({ 
  provider = "google", 
  callbackUrl = "/", 
  className 
}: SignInButtonProps) {
  const handleSignIn = () => {
    // Redirect to NextAuth signin
    window.location.href = `/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <Button 
      onClick={handleSignIn}
      className={className}
      variant="outline"
    >
      <LogIn className="w-4 h-4 mr-2" />
      Sign in with {provider.charAt(0).toUpperCase() + provider.slice(1)}
    </Button>
  );
}