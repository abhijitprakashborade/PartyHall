'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Star, ChevronRight, CalendarCheck, ShieldCheck,
  Sparkles, Music, Wifi, MonitorPlay, Flame,
  CheckCircle2, ArrowRight, Quote, Phone
} from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'

const packages = [
  { name: 'Silver', price: 1000, hours: 1, tag: null, color: 'from-gray-400 to-gray-600', items: ['Grandeur Decoration', 'Full HD Projector', 'Sony Dolby Atmos', 'Free WiFi', 'Light Box'] },
  { name: 'Gold', price: 1500, hours: 1, tag: 'Most Popular', color: 'from-yellow-400 to-amber-600', items: ['Grandeur Decoration', 'Full HD Projector', 'Sony Dolby Atmos', 'Free WiFi', 'Fog Entry', 'LED Letters'] },
  { name: 'Platinum', price: 2000, hours: 2, tag: null, color: 'from-blue-400 to-blue-700', items: ['All Gold items', '2-Hour Duration', 'Fog Entry', 'LED Letters'] },
  { name: 'Diamond', price: 2200, hours: 2, tag: null, color: 'from-cyan-400 to-cyan-700', items: ['All Platinum items', 'Light Box', 'Welcome Drinks'] },
  { name: 'Royal', price: 2500, hours: 2, tag: 'Best Value', color: 'from-purple-500 to-purple-800', items: ['All Diamond items', '½ Kg Cool Cake', 'Vanilla/Pineapple/Strawberry'] },
  { name: 'Imperial', price: 3000, hours: 3, tag: null, color: 'from-rose-500 to-rose-800', items: ['All Royal items', '3-Hour Duration', 'Photo Frame'] },
]

const amenities = [
  { icon: MonitorPlay, label: 'Full HD Projector', desc: '4K display experience' },
  { icon: Music, label: 'Sony 5.1 Dolby Atmos', desc: 'Cinema-grade sound system' },
  { icon: Wifi, label: 'Free High-Speed WiFi', desc: 'Stay connected' },
  { icon: Sparkles, label: 'Grandeur Decoration', desc: 'Luxurious setup included' },
]

const stats = [
  { value: '500+', label: 'Happy Celebrations' },
  { value: '50+', label: 'Partner Halls' },
  { value: '4.9★', label: 'Average Rating' },
  { value: '100%', label: 'Secure Payments' },
]

function CountUp({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    const duration = 2000
    const step = end / (duration / 16)
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + step, end)
      setCount(Math.floor(current))
      if (current >= end) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, end])

  return <span ref={ref}>{count}{suffix}</span>
}

export default function LandingPage() {
  const [activePackage, setActivePackage] = useState(1)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-party-gradient">
        {/* Animated background orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-900/20 rounded-full blur-3xl" />
          {/* Star particles - fixed positions to avoid SSR hydration mismatch */}
          {[
            { left: 8, top: 15, delay: 0, dur: 2.5 },
            { left: 23, top: 42, delay: 0.5, dur: 3.2 },
            { left: 47, top: 8, delay: 1.1, dur: 2.1 },
            { left: 62, top: 65, delay: 0.3, dur: 3.8 },
            { left: 78, top: 22, delay: 1.8, dur: 2.7 },
            { left: 91, top: 50, delay: 0.7, dur: 2.3 },
            { left: 15, top: 78, delay: 2.1, dur: 3.5 },
            { left: 36, top: 30, delay: 1.4, dur: 2.9 },
            { left: 55, top: 85, delay: 0.9, dur: 2.2 },
            { left: 72, top: 10, delay: 2.4, dur: 3.1 },
            { left: 85, top: 70, delay: 0.2, dur: 2.8 },
            { left: 5, top: 55, delay: 1.6, dur: 3.4 },
            { left: 42, top: 90, delay: 0.8, dur: 2.6 },
            { left: 68, top: 38, delay: 2.0, dur: 3.0 },
            { left: 90, top: 88, delay: 1.3, dur: 2.4 },
            { left: 28, top: 18, delay: 0.4, dur: 3.7 },
            { left: 52, top: 55, delay: 1.9, dur: 2.0 },
            { left: 74, top: 75, delay: 0.6, dur: 3.3 },
            { left: 18, top: 62, delay: 2.2, dur: 2.5 },
            { left: 96, top: 33, delay: 1.0, dur: 3.6 },
          ].map((star, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-40 animate-pulse"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.dur}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/90 text-sm font-medium mb-6 backdrop-blur-sm"
              >
                <Flame className="w-4 h-4 text-yellow-400" />
                <span>Premium Party Halls Available Now</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold font-heading text-white leading-tight mb-5"
              >
                Make Every{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-300">
                  Celebration
                </span>{' '}
                Magical
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-lg text-white/70 mb-8 leading-relaxed max-w-xl"
              >
                Experience birthdays, anniversaries & special moments in our premium party hall.
                6 curated packages, Sony Dolby Atmos sound, HD projector & instant booking.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4"
              >
                <Link
                  href="/halls"
                  className="group inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-2xl text-base sm:text-lg hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-1 transition-all duration-300 btn-glow"
                >
                  <CalendarCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Book Your Slot
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="#packages"
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl text-base sm:text-lg hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                >
                  View Packages
                </Link>
              </motion.div>

              {/* Quick stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center gap-6 mt-10"
              >
                <div className="flex -space-x-3">
                  {['🎂', '🎉', '🎊', '🎁'].map((emoji, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-purple-900 flex items-center justify-center text-sm">
                      {emoji}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-yellow-400 text-sm">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    <span className="text-white/70 ml-1 text-sm">4.9/5</span>
                  </div>
                  <p className="text-white/60 text-xs">500+ Happy Celebrations</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Hero Right: Package Preview Card */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="glass rounded-3xl p-8 border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-bold text-xl">Popular Package</h3>
                    <span className="px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded-full text-xs font-bold border border-yellow-400/30">
                      ⭐ Most Popular
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 mb-6">
                    <div className="text-white/70 text-sm mb-1">Gold Package</div>
                    <div className="text-4xl font-bold text-white mb-1">₹1,500</div>
                    <div className="text-white/60 text-sm">1 Hour • Up to 10 People</div>
                  </div>
                  <div className="space-y-3">
                    {['Grandeur Decoration', 'Full HD Projector', 'Sony Dolby Atmos', 'Fog Entry', 'LED Letters of Name'].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-white/80 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <Link href="/halls" className="block mt-6 text-center py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/20">
                    Book This Package →
                  </Link>
                </div>
                {/* Floating badge */}
                <motion.div
                  animate={{ y: [-8, 8, -8] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -right-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
                >
                  ✓ Instant Confirmation
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40"
        >
          <span className="text-xs">Scroll to explore</span>
          <div className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white/40 rounded-full animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <section className="py-12 bg-gray-950 dark:bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== AMENITIES ===== */}
      <section className="py-24 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm uppercase tracking-wider">Included in Every Package</span>
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-gray-900 dark:text-white mt-3 mb-4">
              Premium Amenities, Always
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Every booking includes our signature amenities — no hidden charges, no compromises.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {amenities.map((amenity, i) => (
              <motion.div
                key={amenity.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-hover group p-8 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-500 bg-white dark:bg-gray-800 hover:shadow-xl hover:shadow-purple-500/10 text-center transition-colors duration-300"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <amenity.icon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{amenity.label}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{amenity.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PACKAGES ===== */}
      <section id="packages" className="py-24 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm uppercase tracking-wider">Choose Your Experience</span>
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-gray-900 dark:text-white mt-3 mb-4">
              6 Curated Packages
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">From ₹1,000 to ₹3,000 — something perfect for every celebration</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {packages.map((pkg, i) => (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`card-hover relative bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border-2 transition-all duration-300 ${pkg.tag ? 'border-purple-500 shadow-xl shadow-purple-500/20' : 'border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-500'
                  }`}
              >
                {pkg.tag && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold rounded-full">
                    {pkg.tag}
                  </div>
                )}
                <div className={`h-3 bg-gradient-to-r ${pkg.color}`} />
                <div className="p-7">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{pkg.name}</h3>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
                      ₹{pkg.price.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mb-5">
                    {pkg.hours} Hour{pkg.hours > 1 ? 's' : ''} • Up to 10 People
                  </p>
                  <div className="space-y-2.5 mb-6">
                    {pkg.items.map((item) => (
                      <div key={item} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/halls"
                    className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${pkg.tag
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300'
                      }`}
                  >
                    Book {pkg.name} Package →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl text-center"
          >
            <p className="text-amber-800 dark:text-amber-300 font-medium text-sm">
              🎁 <strong>Add-ons available:</strong> Extra Person (₹200), Cold Fire Entry (₹500), Bubble Entry (₹200)
              & Photography packages from ₹1,000
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-gray-900 dark:text-white mb-4">
              Book in 4 Simple Steps
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', icon: '📅', title: 'Pick a Date & Slot', desc: 'Choose from available time slots on the live calendar' },
              { step: '02', icon: '🎁', title: 'Select Package', desc: 'Compare our 6 packages and add extras you love' },
              { step: '03', icon: '💳', title: 'Pay Securely', desc: 'Razorpay checkout — UPI, card, net banking' },
              { step: '04', icon: '🎉', title: 'Get Confirmed', desc: 'SMS confirmation + QR code for hall check-in' },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                {i < 3 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-purple-200 to-purple-50" />
                )}
                <div className="relative inline-flex w-16 h-16 mx-auto mb-4 items-center justify-center text-3xl bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-100">
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== IMPORTANT NOTES ===== */}
      <section className="py-16 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-bold mb-2">Important Notes</h2>
            <p className="text-gray-400">Please read before booking</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'Decor picture will be sent a day before your slot',
              'No Poppers, Snow Sprays, Threading Sprays, or Fireworks',
              'Advance Payments Are Non-Refundable',
              'Alcohol is strictly not allowed on premises',
            ].map((note, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl"
              >
                <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-gray-300 text-sm">{note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-24 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto px-4 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6">
            Ready to Create Memories?
          </h2>
          <p className="text-purple-200 text-lg mb-8">
            Book your party hall in minutes. Instant confirmation, secure payment, unforgettable celebration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/halls" className="px-10 py-4 bg-white text-purple-700 font-bold rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-lg">
              🎉 Book Now
            </Link>
            <a href="tel:+919999999999" className="inline-flex items-center gap-2 px-8 py-4 border border-white/30 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all text-lg">
              <Phone className="w-5 h-5" />
              Call Us
            </a>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
