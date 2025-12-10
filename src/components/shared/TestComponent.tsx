import React from 'react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Input from '@/components/ui/Input';

const TestComponent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Test Component</h1>
          <p className="text-lg text-gray-600">Showcasing Tailwind CSS and Shadcn UI components</p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🎨</span>
                Colors & Gradients
              </CardTitle>
              <CardDescription>
                Beautiful color combinations and gradients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-red-500 rounded-full"></div>
                <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                <div className="w-8 h-8 bg-green-500 rounded-full"></div>
                <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
              </div>
              <div className="h-2 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded"></div>
            </CardContent>
          </Card>

          {/* Card 2 */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📐</span>
                Layout & Spacing
              </CardTitle>
              <CardDescription>
                Responsive grid and spacing utilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-200 p-2 text-xs text-center rounded">Grid Item</div>
                <div className="bg-gray-300 p-2 text-xs text-center rounded">Grid Item</div>
                <div className="bg-gray-400 p-2 text-xs text-center rounded">Grid Item</div>
                <div className="bg-gray-500 p-2 text-xs text-center rounded text-white">Grid Item</div>
              </div>
              <div className="space-y-2">
                <div className="h-1 bg-blue-200 rounded"></div>
                <div className="h-2 bg-blue-300 rounded"></div>
                <div className="h-3 bg-blue-400 rounded"></div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3 */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Interactive Elements
              </CardTitle>
              <CardDescription>
                Buttons, badges, and form elements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
              <div className="space-y-2">
                <Button className="w-full">Primary Button</Button>
                <Button variant="secondary" className="w-full">Secondary Button</Button>
                <Button variant="outline-primary" className="w-full">Outline Button</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Typography Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📝</span>
              Typography Showcase
            </CardTitle>
            <CardDescription>
              Different text sizes and styles using Cairo font
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900">Heading 1 - Large Title</h1>
              <h2 className="text-3xl font-semibold text-gray-800">Heading 2 - Subtitle</h2>
              <h3 className="text-2xl font-medium text-gray-700">Heading 3 - Section Title</h3>
              <p className="text-lg text-gray-600">Large paragraph text for better readability</p>
              <p className="text-base text-gray-600">Regular paragraph text content</p>
              <p className="text-sm text-gray-500">Small text for captions or secondary information</p>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Form Elements
            </CardTitle>
            <CardDescription>
              Input fields and form controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input placeholder="Enter your name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="Enter your email" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter your message"
              />
            </div>
          </CardContent>
        </Card>

        {/* Animation & Effects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Animations & Effects
            </CardTitle>
            <CardDescription>
              Hover effects, transitions, and animations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="w-16 h-16 bg-blue-500 rounded-lg hover:bg-blue-600 hover:scale-110 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"></div>
              <div className="w-16 h-16 bg-green-500 rounded-lg hover:bg-green-600 hover:rotate-12 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"></div>
              <div className="w-16 h-16 bg-purple-500 rounded-lg hover:bg-purple-600 hover:-rotate-12 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"></div>
              <div className="w-16 h-16 bg-red-500 rounded-lg hover:bg-red-600 hover:scale-125 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"></div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-gray-500">Built with Tailwind CSS and Shadcn UI</p>
          <p className="text-sm text-gray-400 mt-2">Font: Cairo</p>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;