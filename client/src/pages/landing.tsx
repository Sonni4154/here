import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FileText, Users, Search, Calculator, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="p-6 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">Marin Pest Control Dashboard</span>
          </div>
          <Button onClick={handleLogin} className="bg-slate-800 hover:bg-slate-700">
            Employee Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-6">
            Marin Pest Control
            <span className="text-slate-600"> Employee Dashboard</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Clock your hours, submit time sheets, manage materials, and track project expenses. 
            All integrated with QuickBooks for seamless invoicing.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-slate-800 hover:bg-slate-700 text-lg px-8 py-3"
          >
            Access Dashboard
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Employee Tools & Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center border-slate-200">
              <CardHeader>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-slate-700" />
                </div>
                <CardTitle>Time Tracking</CardTitle>
                <CardDescription>
                  Clock in/out, track hours by project, and submit timesheets for approval
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-slate-200">
              <CardHeader>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-slate-700" />
                </div>
                <CardTitle>Material Tracking</CardTitle>
                <CardDescription>
                  Log materials, receipts, and expenses for accurate project billing
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-slate-200">
              <CardHeader>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-slate-700" />
                </div>
                <CardTitle>Customer Lookup</CardTitle>
                <CardDescription>
                  Search and view customer information and project history
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-slate-200">
              <CardHeader>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-slate-700" />
                </div>
                <CardTitle>Invoice Search</CardTitle>
                <CardDescription>
                  Find and review invoices, payments, and billing status
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-slate-200">
              <CardHeader>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Calculator className="w-6 h-6 text-slate-700" />
                </div>
                <CardTitle>QuickBooks Sync</CardTitle>
                <CardDescription>
                  Automatic synchronization with QuickBooks for billing and payroll
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-slate-200">
              <CardHeader>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-slate-700" />
                </div>
                <CardTitle>Secure Access</CardTitle>
                <CardDescription>
                  Role-based access with secure authentication for employee data
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to track your time and materials?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Start logging hours and expenses today
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            variant="secondary"
            className="bg-white text-slate-800 hover:bg-slate-100 text-lg px-8 py-3"
          >
            Access Your Dashboard
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">TimeSync Pro</span>
          </div>
          <p className="text-slate-400">
            © 2024 TimeSync Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
