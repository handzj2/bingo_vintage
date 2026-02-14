'use client';

// FIX: Add this line to resolve the 'React' refers to a UMD global error
import React from 'react'; 
import { Bike, DollarSign, Home, AlertCircle } from 'lucide-react';
import { LoanType } from '@/lib/validations/loan-schema';

interface LoanTypeSelectorProps {
  selectedType: LoanType;
  onTypeChange: (type: LoanType) => void;
}

const loanTypes = [
  {
    id: 'bike' as LoanType,
    label: 'Bike Loan',
    description: 'Motorcycle financing',
    icon: Bike,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:border-blue-400',
  },
  {
    id: 'cash' as LoanType,
    label: 'Cash Loan',
    description: 'Personal cash advance',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverColor: 'hover:border-green-400',
  },
  // ... other types
];

export default function LoanTypeSelector({ selectedType, onTypeChange }: LoanTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loanTypes.map((type) => {
          const isSelected = selectedType === type.id;
          const Icon = type.icon;

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onTypeChange(type.id)}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                isSelected 
                  ? `${type.borderColor} ${type.bgColor} shadow-md` 
                  : `border-gray-100 bg-white ${type.hoverColor}`
              }`}
            >
              <div className={`p-3 rounded-full mb-3 ${isSelected ? 'bg-white' : type.bgColor}`}>
                <Icon className={`w-6 h-6 ${type.color}`} />
              </div>
              <span className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                {type.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {selectedType && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {/* The line that was crashing is now safe because of the React import */}
            {loanTypes.find(t => t.id === selectedType)?.icon && (
              React.createElement(loanTypes.find(t => t.id === selectedType)!.icon, {
                className: `w-5 h-5 mr-2 ${loanTypes.find(t => t.id === selectedType)?.color}`
              })
            )}
            <span className="text-sm font-medium">
              {loanTypes.find(t => t.id === selectedType)?.label} selected.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}