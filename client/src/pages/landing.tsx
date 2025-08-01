import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderSync, DollarSign, Users, FileText, BarChart3, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FolderSync className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">BusinessSync Pro</span>
          </div>
          <Button onClick={handleLogin} className="bg-primary hover:bg-blue-600">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Streamline Your Business with
            <span className="text-primary"> Integrated CRM</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Connect QuickBooks, JotForm, and Google Workspace in one powerful dashboard. 
            Manage customers, create invoices, and sync data seamlessly.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-primary hover:bg-blue-600 text-lg px-8 py-3"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Everything you need to manage your business
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FolderSync className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>QuickBooks Integration</CardTitle>
                <CardDescription>
                  Two-way sync with QuickBooks for customers, invoices, and products
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>
                  Comprehensive CRM with customer profiles and interaction history
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Invoice Creation</CardTitle>
                <CardDescription>
                  Create professional invoices that sync automatically with QuickBooks
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Reporting & Analytics</CardTitle>
                <CardDescription>
                  Real-time insights and reports from your QuickBooks data
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
                <CardTitle>JotForm Integration</CardTitle>
                <CardDescription>
                  Convert form submissions into invoices and customers automatically
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Secure & Reliable</CardTitle>
                <CardDescription>
                  Enterprise-grade security with OAuth authentication and data encryption
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to streamline your business operations?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of businesses already using BusinessSync Pro
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            variant="secondary"
            className="bg-white text-primary hover:bg-slate-100 text-lg px-8 py-3"
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <FolderSync className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">BusinessSync Pro</span>
          </div>
          <p className="text-slate-400">
            © 2024 BusinessSync Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
