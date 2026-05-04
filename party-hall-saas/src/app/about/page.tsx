'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import { Users, MapPin, Star, Shield, Phone, Mail } from 'lucide-react'

const STATS = [
    { label: 'Party Halls Listed', value: '200+' },
    { label: 'Events Hosted', value: '5,000+' },
    { label: 'Cities Covered', value: '20+' },
    { label: 'Happy Customers', value: '10,000+' },
]

const VALUES = [
    {
        icon: <Shield className="w-6 h-6 text-purple-400" />,
        title: 'Trusted & Verified',
        desc: 'Every hall is reviewed and verified by our team before going live, so you always book with confidence.',
    },
    {
        icon: <Star className="w-6 h-6 text-yellow-400" />,
        title: 'Premium Experience',
        desc: 'From discovery to booking confirmation, we obsess over every detail to make your event perfect.',
    },
    {
        icon: <Users className="w-6 h-6 text-pink-400" />,
        title: 'Community First',
        desc: 'We empower local hall owners and connect them with the right customers — everyone wins.',
    },
    {
        icon: <MapPin className="w-6 h-6 text-emerald-400" />,
        title: 'Hyper-Local',
        desc: 'Search by pincode and find venues near you. No booking fees — we keep things simple and fair.',
    },
]

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Navbar />

            {/* Hero */}
            <section className="pt-28 pb-20 px-4 text-center max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
                        About PartyHub
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        PartyHub is India&apos;s easiest way to find and book premium party halls for birthdays, weddings,
                        corporate events, and every celebration in between.
                    </p>
                </motion.div>
            </section>

            {/* Stats */}
            <section className="py-14 bg-gray-900/60 border-y border-gray-800">
                <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {STATS.map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                        >
                            <div className="text-4xl font-black text-purple-400 mb-1">{s.value}</div>
                            <div className="text-sm text-gray-400">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Our Story */}
            <section className="py-20 px-4 max-w-3xl mx-auto">
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                    <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
                    <p className="text-gray-400 leading-relaxed text-lg text-center">
                        PartyHub was born out of frustration. Finding a party hall meant calling dozens of venues, 
                        negotiating blindly, and hoping for the best. We built PartyHub to change that — a platform 
                        where customers can browse real photos, transparent pricing, and instant availability, while 
                        hall owners get a powerful dashboard to manage their business online.
                    </p>
                </motion.div>
            </section>

            {/* Values */}
            <section className="py-16 bg-gray-900/40 px-4">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">What We Stand For</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {VALUES.map((v, i) => (
                            <motion.div
                                key={v.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex gap-4"
                            >
                                <div className="mt-1 flex-shrink-0">{v.icon}</div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">{v.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact */}
            <section className="py-20 px-4 text-center max-w-xl mx-auto">
                <h2 className="text-3xl font-bold mb-4">Get In Touch</h2>
                <p className="text-gray-400 mb-8">Have questions, partnership inquiries, or feedback? We&apos;d love to hear from you.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="mailto:hello@partyhub.in"
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
                    >
                        <Mail className="w-4 h-4" /> hello@partyhub.in
                    </a>
                    <a
                        href="tel:+919999999999"
                        className="flex items-center gap-2 px-6 py-3 border border-gray-700 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
                    >
                        <Phone className="w-4 h-4" /> +91 99999 99999
                    </a>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 bg-gradient-to-r from-purple-900/60 to-pink-900/60 text-center px-4">
                <h2 className="text-3xl font-bold mb-4">Ready to celebrate?</h2>
                <p className="text-gray-300 mb-8">Find your perfect party hall in minutes.</p>
                <Link
                    href="/halls"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                >
                    Browse Halls →
                </Link>
            </section>

            <footer className="py-8 text-center text-gray-600 text-sm border-t border-gray-900">
                © {new Date().getFullYear()} PartyHub. Made with ❤️ in India.
            </footer>
        </div>
    )
}
