// src/app/faq/page.tsx
"use client";

import FAQItem from "../../../components/FAQItem"; // ← adjusted import
import Image from "next/image";
import Link from "next/link";

const faqs = [
  {
    question: "What is Benson Bites?",
    answer:
      "Benson Bites is an alternative ordering platform that lets SCU students order from Benson dining, along with many quality of life features not found within the standard application.",
  },
  {
    question: "How do I place an order?",
    answer:
      "Once you log in with your SCU credentials, browse available locations, customize your items in the menu, and click submit.",
  },
  {
    question: "What is wrapped?",
    answer:
      "Yes, as long as the vendor hasn’t started preparing your food. Go to “My Orders” and click the edit or cancel button next to your pending order if it's still within the editable window.",
  },
  {
    question: "Is there a schedule option?",
    answer:
      "...",
  },
  {
    question: "Can I come up with more filler text?",
    answer:
      "Yes. All payments go through encrypted third-party processors. Benson Bites does not store your payment information on our servers.",
  },
  {
    question: "Question question question question question?",
    answer:
      "Use the “Report Issue” button in the footer, or email us directly at support@bensonbites.scu.edu. We’ll do our best to address bugs quickly!",
  },
];

export default function FAQPage() {
  return (
    <main className="flex-1 p-6 bg-[#FFF8F8] min-h-screen">
      {/* Page title */}
      <h1 className="text-4xl font-bold text-[#860329] mb-4">
        Frequently Asked Questions
      </h1>
      <p className="mb-8 text-gray-700 max-w-2xl">
        Here are answers to some common questions about using Benson Bites.
        Click any question below to expand.
      </p>

      {/* Accordion list */}
      <div className="max-w-3xl space-y-2">
        {faqs.map((faq, idx) => (
          <FAQItem key={idx} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </main>
  );
}
