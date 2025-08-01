import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Clock, FileText, Users, Search, Calculator, Shield, Calendar } from "lucide-react";
import marinLogo from "@assets/IMG_2539_1754017041686.jpg";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-6 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={marinLogo} 
              alt="Marin Pest Control" 
              className="w-10 h-10 rounded-lg object-cover"
            />
            <span className="text-xl font-semibold text-foreground">TimeSync Pro</span>
          </div>
          <Button onClick={handleLogin} className="bg-primary hover:bg-primary/90">
            Employee Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <img 
              src={marinLogo} 
              alt="Marin Pest Control" 
              className="w-32 h-32 rounded-2xl object-cover shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-6">
            Marin Pest Control
            <span className="text-muted-foreground"> Employee Dashboard</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Clock your hours, manage schedules, submit timesheets, track materials, and sync with Google Calendar. 
            All integrated with QuickBooks for seamless billing and payroll.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
          >
            Access Dashboard
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Employee Tools & Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center border-border bg-card">
              <CardHeader>
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-card-foreground">Time Tracking</CardTitle>
                <CardDescription>
                  Clock in/out, track hours by project, and submit timesheets for approval
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-border bg-card">
              <CardHeader>
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-card-foreground">Schedule Management</CardTitle>
                <CardDescription>
                  View your schedule, manage tasks, and sync with Google Calendar
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-border bg-card">
              <CardHeader>
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-card-foreground">Material Tracking</CardTitle>
                <CardDescription>
                  Log materials, receipts, and expenses for accurate project billing
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-border bg-card">
              <CardHeader>
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-card-foreground">Customer Management</CardTitle>
                <CardDescription>
                  Search customer information, add notes, and track project history
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-border bg-card">
              <CardHeader>
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-card-foreground">Advanced Search</CardTitle>
                <CardDescription>
                  Find invoices, customers, and project data with powerful search tools
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-border bg-card">
              <CardHeader>
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Calculator className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-card-foreground">QuickBooks Sync</CardTitle>
                <CardDescription>
                  Automatic synchronization with QuickBooks for billing and payroll
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-card-foreground mb-6">
            Ready to manage your work efficiently?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Access your personalized dashboard with scheduling, time tracking, and more
          </p>
          <div className="space-y-4">
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign in with Google
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Or use your employee email and password to login
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-background border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src={marinLogo} 
              alt="Marin Pest Control" 
              className="w-8 h-8 rounded object-cover"
            />
            <span className="text-lg font-semibold text-foreground">TimeSync Pro</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 Marin Pest Control. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}