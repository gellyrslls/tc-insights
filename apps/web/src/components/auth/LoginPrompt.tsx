import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Filter, Shield, TrendingUp } from "lucide-react";
import SignInButton from "./SignInButton";

export function LoginPrompt() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* TC Logo placeholder */}
            <div className="w-12 h-12 bg-tc-red flex items-center justify-center text-white font-bold text-xl">
              TC
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-[#333333] mb-4">
              TC Insights
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Streamlining Social Media Analytics & Reporting for Today&apos;s
              Carolinian
            </p>
            <div className="space-y-4">
              <SignInButton className="text-lg px-10 w-xs h-auto bg-tc-red hover:bg-tc-darkred" />
              <p className="text-sm text-gray-500">
                <Shield className="inline h-4 w-4 mr-1" />
                Restricted to authorized @usc.edu.ph accounts
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="mr-2 h-5 w-5 text-tc-red" />
                  Performance Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  View ranked posts by composite scores across Facebook and
                  Instagram platforms.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Filter className="mr-2 h-5 w-5 text-tc-red" />
                  Smart Filtering
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Filter by platform, time periods, or custom date ranges to
                  focus your analysis.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Clock className="mr-2 h-5 w-5 text-tc-red" />
                  Automated Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  One-click data refresh pulls the latest metrics from social
                  platforms.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Start Guide */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Quick Start Guide</CardTitle>
              <CardDescription className="-mt-1">
                Here&apos;s how to get started:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-8 h-8 bg-tc-red text-white rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    1
                  </div>
                  <h4 className="font-medium mb-1">Sign In</h4>
                  <p className="text-sm text-gray-600">
                    Use your @usc.edu.ph Google account
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-8 h-8 bg-tc-red text-white rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    2
                  </div>
                  <h4 className="font-medium mb-1">View Dashboard</h4>
                  <p className="text-sm text-gray-600">
                    See top performing posts
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-8 h-8 bg-tc-red text-white rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    3
                  </div>
                  <h4 className="font-medium mb-1">Apply Filters</h4>
                  <p className="text-sm text-gray-600">
                    Filter by platform or time period
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-8 h-8 bg-tc-red text-white rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    4
                  </div>
                  <h4 className="font-medium mb-1">Add Insights</h4>
                  <p className="text-sm text-gray-600">
                    Click posts to add insights
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ---  Access Notice --- */}
          <Card className="border-tc-red/20 bg-tc-red/5">
            <CardContent className="pt-1">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-tc-red mt-0.5" />
                <div>
                  <h4 className="font-medium text-tc-red mb-1">
                    Access Requirements
                  </h4>
                  <p className="text-sm text-gray-700">
                    This platform is restricted to authorized Online Managers
                    and Editors.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-tc-red text-white mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p>© 2025 Today&apos;s Carolinian. Internal use only.</p>
            <p>Built for Online Managers & Editors</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
