'use client';

import React from 'react';
import { Bike, DollarSign } from 'lucide-react';

interface LoanTypeSelectorProps {
  selected: string;
  onSelect: (type: string) => void;
}

const loanTypes = [
  {
    id: 'cash',
    label: 'Cash Loan',
    description: 'Personal cash advance',
    icon: DollarSign,
    color:       'text-blue-600',
    bgColor:     'bg-blue-50',
    borderColor: 'border-blue-200',
    activeText:  'text-blue-700',
  },
  {
    id: 'bike',
    label: 'Bike Loan',
    description: 'Motorcycle financing',
    icon: Bike,
    color:       'text-orange-600',
    bgColor:     'bg-orange-50',
    borderColor: 'border-orange-200',
    activeText:  'text-orange-700',
  },
];

export default function LoanTypeSelector({ selected, onSelect }: LoanTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-700">Select Loan Type</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loanTypes.map((type) => {
          const isSelected = selected === type.id;
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onSelect(type.id)}
              className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
                isSelected
                  ? `${type.borderColor} ${type.bgColor} shadow-md`
                  : 'border-gray-100 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`p-3 rounded-full mb-3 ${isSelected ? 'bg-white shadow-sm' : type.bgColor}`}>
                <Icon className={`w-6 h-6 ${type.color}`} />
              </div>
              <span className={`font-bold text-sm ${isSelected ? type.activeText : 'text-gray-500'}`}>
                {type.label}
              </span>
              <span className="text-xs text-gray-400 mt-1">{type.description}</span>
              {isSelected && (
                <span className={`mt-2 text-xs font-black uppercase tracking-wider ${type.activeText}`}>
                  ✓ Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
