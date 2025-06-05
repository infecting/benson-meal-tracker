// src/app/faq/page.tsx
"use client";

import FAQItem from "../../../components/FAQItem"; // ← adjusted import

const faqs = [
  {
    question: "What is Benson Bites?",
    answer:
      "Benson Bites is an alternative ordering platform that lets SCU students order from Benson dining, along with many quality of life features not found within the standard application.",
  },
  {
    question: "How do I place an order?",
    answer:
      "Once you log in with your SCU credentials, browse available locations, customize your items in the menu, and click order item.",
  },
  {
    question: "What is wrapped?",
    answer:
      "Similar to Spotify Wrapped, Benson Bites Wrapped is a personalized summary of your dining habits at Benson. It shows you how many meals you’ve ordered, your most popular items/locations, and more.",
  },
  {
    question: "Can I schedule orders in advance?",
    answer:
      "Yes! You can schedule orders for pickup at a later time. Just select the date and time when placing your order.",
  },
  {
    question: "How does the request feature work?",
    answer:
      "When you are purchasing an item, you can select to generate a request link. This will let you share the order with someone who may still have points remaining, allowing them to pay for the item. This is useful for making the most of your points before they expire at the end of the semester.",
  },
  {
    question: "Where can I see my Benson Bites order history?",
    answer:
      "Within My Orders, you can view all of your past orders. This includes the date, time, and items ordered. You can also find the QR codes for each order, which can be scanned at Benson for pickup.",
  },
  {
    question: "Why did my order fail?",
    answer:
      "Double check that you have enough funds within your account to make a purchase, and that the item you are trying to order is available at the time you are ordering it.",
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
