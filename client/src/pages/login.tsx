import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FaGoogle } from 'react-icons/fa';
import { useLocation } from 'wouter';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Redirect to NextAuth Google OAuth
      window.location.href = '/api/auth/signin/google';
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Company Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
            <div className="text-2xl font-bold text-purple-600">MPC</div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Marin Pest Control</h1>
          <p className="text-purple-200">Team Dashboard</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white">
              Sign in to your account
            </CardTitle>
            <CardDescription className="text-center text-purple-200">
              Use your Google account to access the team dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <FaGoogle className="w-5 h-5" />
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </Button>
            
            <div className="text-xs text-purple-200 text-center">
              Only authorized Marin Pest Control team members can access this dashboard.
              Contact your administrator if you need access.
            </div>
          </CardContent>
          
          <CardFooter className="text-center">
            <div className="w-full text-sm text-purple-200">
              Protected by enterprise-grade security
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}