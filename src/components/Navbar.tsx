import Link from 'next/link';
import { Menu } from 'lucide-react';

export function Navbar() {
    return (
        <nav className="fixed top-0 w-full bg-[#0A0A0A]/70 backdrop-blur-xl z-50 border-b border-white/10 supports-[backdrop-filter]:bg-[#0A0A0A]/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                <span className="text-white font-bold text-xl drop-shadow-md">T</span>
                            </div>
                            <span className="font-extrabold text-2xl tracking-tight text-white">
                                trendcast<span className="text-blue-500">.io</span>
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex space-x-8 items-center">
                        <Link href="#features" className="text-gray-300 hover:text-white font-medium transition-colors">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-gray-300 hover:text-white font-medium transition-colors">
                            Pricing
                        </Link>
                        <Link href="#testimonials" className="text-gray-300 hover:text-white font-medium transition-colors">
                            Testimonials
                        </Link>
                        <Link href="/dashboard/crm" className="text-gray-300 hover:text-white font-medium transition-colors flex items-center gap-1">
                            CRM Login
                        </Link>
                        <Link
                            href="#pricing"
                            className="bg-white text-black px-5 py-2.5 rounded-full font-semibold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:-translate-y-0.5"
                        >
                            Book Demo
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button className="text-gray-300 hover:text-white focus:outline-none">
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
