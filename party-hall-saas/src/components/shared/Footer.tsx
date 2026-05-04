import Link from 'next/link'
import { PartyPopper, Instagram, Phone, Mail, MapPin } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-gray-950 text-gray-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link href="/" className="flex items-center gap-2.5 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                                <PartyPopper className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">
                                Party<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Hub</span>
                            </span>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                            Premium party hall booking platform. Make every celebration magical with our curated packages, world-class amenities, and instant booking system.
                        </p>
                        <div className="flex items-center gap-3 mt-6">
                            <a href="https://instagram.com" className="w-9 h-9 bg-white/5 hover:bg-pink-500/20 rounded-lg flex items-center justify-center transition-colors hover:text-pink-400">
                                <Instagram className="w-4 h-4" />
                            </a>
                            <a href="tel:+91XXXXXXXXXX" className="w-9 h-9 bg-white/5 hover:bg-green-500/20 rounded-lg flex items-center justify-center transition-colors hover:text-green-400">
                                <Phone className="w-4 h-4" />
                            </a>
                            <a href="mailto:hello@partyhub.in" className="w-9 h-9 bg-white/5 hover:bg-blue-500/20 rounded-lg flex items-center justify-center transition-colors hover:text-blue-400">
                                <Mail className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Packages */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Packages</h4>
                        <ul className="space-y-2.5 text-sm">
                            {['Silver – ₹1,000', 'Gold – ₹1,500', 'Platinum – ₹2,000', 'Diamond – ₹2,200', 'Royal – ₹2,500', 'Imperial – ₹3,000'].map((pkg) => (
                                <li key={pkg}>
                                    <Link href="/halls" className="hover:text-purple-400 transition-colors">{pkg}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2.5 text-sm">
                            {[
                                { href: '/halls', label: 'Book Now' },
                                { href: '/account/orders', label: 'My Bookings' },
                                { href: '/partner/register', label: 'Become a Partner' },
                                { href: '/admin', label: 'Admin Login' },
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="hover:text-purple-400 transition-colors">{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6">
                            <h4 className="text-white font-semibold mb-3 text-sm">Important Notes</h4>
                            <div className="text-xs space-y-1">
                                <p>• No Alcohol Allowed</p>
                                <p>• No Fireworks or Snow Sprays</p>
                                <p>• Advance is Non-Refundable</p>
                                <p>• Decor preview sent day before</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                    <p>© {new Date().getFullYear()} PartyHub. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="hover:text-purple-400 transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-purple-400 transition-colors">Terms of Service</Link>
                        <Link href="/refund-policy" className="hover:text-purple-400 transition-colors">Refund Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
