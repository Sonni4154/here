import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  callbackUrl?: string;
  className?: string;
}

export function SignOutButton({ 
  callbackUrl = "/", 
  className 
}: SignOutButtonProps) {
  const handleSignOut = () => {
    // Redirect to NextAuth signout
    window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <Button 
      onClick={handleSignOut}
      className={className}
      variant="ghost"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sign out
    </Button>
  );
}