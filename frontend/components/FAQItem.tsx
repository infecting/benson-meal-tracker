"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface FAQItemProps {
  question: string;
  answer: string;
}

export default function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-300">
      {/* Question header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex justify-between items-center py-4 text-left focus:outline-none"
      >
        <span className="text-lg font-medium text-gray-800">{question}</span>
        <span className="ml-2">
          {isOpen ? (
            <ChevronUp size={20} className="text-gray-600" />
          ) : (
            <ChevronDown size={20} className="text-gray-600" />
          )}
        </span>
      </button>

      {/* Answer panel */}
      {isOpen && (
        <div className="pb-4 pl-2 pr-6 text-gray-700">
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}
