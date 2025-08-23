import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';

export default function AuthErrorPage() {
  const [, setLocation] = useLocation();

  const handleRetryLogin = () => {
    setLocation('/login');
  };

  const handleGoHome = () => {
    setLocation('/');
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
        </div>

        {/* Error Card */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-white">
              Authentication Error
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center text-purple-200">
              <p className="mb-4">
                We couldn't sign you in. This could be because:
              </p>
              <ul className="text-sm space-y-2 text-left max-w-sm mx-auto">
                <li>• Your Google account is not authorized for this system</li>
                <li>• There was a temporary connection issue</li>
                <li>• Your session expired during sign-in</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={handleRetryLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Try Again
              </Button>
              
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Go to Homepage
              </Button>
            </div>
            
            <div className="text-xs text-purple-200 text-center">
              If you continue to have issues, please contact your system administrator.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}