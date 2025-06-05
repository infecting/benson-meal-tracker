// src/app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { DollarSign, Clock, SparkleIcon} from "lucide-react";
// import Marquee from "../../components/Marquee"; // did not work out in time, potentially revisit this for //benson memorial center text later on...

export default function LandingPage() {
  return (
    <main className="relative w-full min-h-screen bg-[#FFF8F8] overflow-hidden">

      {/* ========== Hero Section ========== */}
      <section className="relative flex flex-col-reverse lg:flex-row items-center justify-between px-6 py-12 lg:py-20">
        {/* Left: headline + CTA */}
        <div className="order-2 lg:order-1 lg:w-1/2 flex flex-col items-start lg:pl-12">
          <h1 className="max-w-3xl text-[#860329] text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            We made ordering from Benson easier because college life is already hard enough.
          </h1>
          <p className="mb-8 text-gray-700 text-lg md:text-xl max-w-2xl">
            College life is hectic—don’t let long dining lines slow you down. Let Benson Bites handle your orders so you can grab your meal on your schedule.
          </p>
          <div className="flex space-x-4">
            <Link
              href="/login"
              className="px-6 py-3 bg-[#A32035] hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Right: hero image */}
        <div className="order-1 lg:order-2 lg:w-1/2 flex justify-center mb-8 lg:mb-0">
          <Image
            src="/hero.gif"
            alt="Student grabbing food from Benson"
            width={576}
            height={443}
            className="object-contain"
          />
        </div>
      </section>



      {/* ========== Campus Quote ========== */}
      <section className="px-6 py-12">
        <blockquote className="mx-auto max-w-3xl text-center italic text-[#860329] text-xl md:text-2xl">
          “The hub of campus life, the Benson Memorial Center offers many
          services, including dining and conference facilities and a number of
          student organizations. It was built in 1963 to serve the steadily
          growing student population.”
        </blockquote>
      </section>


      {/* ========== Why Benson Bites? ========== */}
      <section className="bg-[#B30738] px-6 py-16 text-center">
        <h2 className="text-white text-5xl md:text-6xl font-bold mb-6">
          why benson bites?
        </h2>
        <p className="mx-auto max-w-4xl text-[#FFF8F8] text-lg md:text-xl font-normal mb-8">
          Benson Bites lets you order food ahead from SCU’s Benson Center,
          so you can skip the lines and eat on your own time. Built by students
          for students, it’s designed to make campus dining less stressful and way more convenient.
        </p>
        <div className="mx-auto w-full max-w-[750px]">
          <Image
            src="/banner.gif"
            alt="Snail :)"
            width={750}
            height={100}
            className="mx-auto"
          />
        </div>
      </section>


      {/* ========== Feature Cards ========== */}
      <section className="px-6 py-16">
        <h3 className="text-3xl md:text-4xl font-bold text-center text-[#860329] mb-12">
          Features That Make Life Easier
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Card 1 */}
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center">
            <Clock size={80} className="text-red-700 mb-4" />
            <h4 className="font-semibold text-xl mb-2">Scheduled Ordering</h4>
            <p className="text-gray-600">
              Place your order and forget about it, let us take care of getting your food when you want it.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center">
          <DollarSign size={80} className="text-red-700 mb-4" />
            <h4 className="font-semibold text-xl mb-2">Pick Up The Tab</h4>
            <p className="text-gray-600">
              Share your order with friends to let them cover the cost. Perfect for communally using points before they expire!
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center">
            <SparkleIcon size={80} className="text-red-700 mb-4" />
            <h4 className="font-semibold text-xl mb-2">Clean Layout</h4>
            <p className="text-gray-600">
              A simple, intuitive interface that makes ordering food a breeze. No more reliance on the standard app.
            </p>
          </div>
        </div>
      </section>


      {/* ========== Large Red Separator (decorative) ========== */}
      <section className="w-full h-[5px] bg-[#B30738]">
        {/* You could overlay a subtle pattern or leave it solid */}
      </section>


      {/* ========== Footer ========== */}
      <footer className="bg-[#B30738] px-6 py-6">
        <div className="mx-auto max-w-2xl text-center space-y-1">
          <p className="text-white text-2xl md:text-lg">
            Made with 🤍 by SCU Students for SCU Students
          </p>
          <p className="text-white text-2xl md:text-lg">
            © 2025 Benson Bites • Santa Clara University Dining Services
          </p>
        </div>
      </footer>

    </main>
  );
}
