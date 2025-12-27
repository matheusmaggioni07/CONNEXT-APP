export function generateFallbackCode(prompt: string): string {
  const businessType = prompt.toLowerCase()

  // Simple, clean React code that actually works
  return `"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Menu, X } from "lucide-react"
import { useState } from "react"

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#0a0e27] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-[#0a0e27]/80 backdrop-blur-md z-50 border-b border-[#ec4899]/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-[#ec4899] to-[#ff6b35] bg-clip-text text-transparent">
            Connext
          </div>
          <div className="hidden md:flex gap-8">
            <a href="#" className="hover:text-[#ec4899]">Features</a>
            <a href="#" className="hover:text-[#ec4899]">About</a>
            <a href="#" className="hover:text-[#ec4899]">Contact</a>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0e27] px-4 py-3 space-y-2">
            <a href="#" className="block py-2 hover:text-[#ec4899]">Features</a>
            <a href="#" className="block py-2 hover:text-[#ec4899]">About</a>
            <a href="#" className="block py-2 hover:text-[#ec4899]">Contact</a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 min-h-screen flex items-center">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-[#ec4899] via-[#ff6b35] to-[#ec4899] bg-clip-text text-transparent">
              ${prompt || "Professional Website"}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-[#ec4899]/80 mb-8">
            Create stunning experiences for your business
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button className="bg-gradient-to-r from-[#ec4899] to-[#ff6b35] text-white font-bold px-8 py-6 text-lg">
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button className="border border-[#ec4899]/30 bg-transparent text-white font-bold px-8 py-6 text-lg hover:bg-[#ec4899]/10">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-[#0a0e27]/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-[#ec4899] to-[#ff6b35] bg-clip-text text-transparent">
              Why Choose Us
            </span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Fast Performance", description: "Lightning-quick loading times" },
              { title: "Secure", description: "Enterprise-grade security" },
              { title: "Scalable", description: "Grows with your business" }
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-br from-[#ec4899]/10 to-[#ff6b35]/10 border border-[#ec4899]/20 p-8 rounded-xl hover:border-[#ec4899]/50 transition-all">
                <CheckCircle2 className="w-12 h-12 text-[#ec4899] mb-4" />
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-[#ec4899]/80">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-[#ec4899]/20 to-[#ff6b35]/20 border-t border-[#ec4899]/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl text-[#ec4899]/80 mb-8">Join thousands of happy customers today</p>
          <Button className="bg-gradient-to-r from-[#ec4899] via-[#ff6b35] to-[#ec4899] text-white font-bold px-10 py-6 text-lg">
            Start Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0e27]/80 border-t border-[#ec4899]/20 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#ec4899]/80">© 2025 Connext. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}`
}
