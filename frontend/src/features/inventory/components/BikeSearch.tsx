// src/components/loan/BikeSearch.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Bike as BikeIcon, Check, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { debounce } from 'lodash';

interface Bike {
  id: number;
  make: string;
  model: string;
  year: number;
  color: string;
  engine_cc: number;
  registration_number: string;
  purchase_price: number;
  purchase_date: string;
  status: 'available' | 'on_loan' | 'sold' | 'maintenance';
  current_value: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
}

interface BikeSearchProps {
  onSelect: (bike: Bike) => void;
  selectedBike: Bike | null;
}

export default function BikeSearch({ onSelect, selectedBike }: BikeSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filters, setFilters] = useState({
    status: 'available' as Bike['status'],
    minPrice: 0,
    maxPrice: 10000000,
  });

  // Mock API call (replace with actual API)
  const searchBikes = useCallback(
    debounce(async (query: string, filters: any) => {
      setIsLoading(true);
      setError(null);

      try {
        // Replace with actual API call
        const response = await fetch(
          `/api/bikes/available?search=${encodeURIComponent(query)}&status=${filters.status}`
        );
        const data = await response.json();
        
        if (response.ok) {
          setBikes(data.bikes || []);
        } else {
          setError(data.error || 'Failed to search bikes');
        }
      } catch (err) {
        setError('Network error. Please try again.');
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchBikes(searchQuery, filters);
  }, [searchQuery, filters, searchBikes]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'on_loan': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex items-center">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search bikes by make, model, or registration..."
            className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap gap-3">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as Bike['status'] })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="available">Available</option>
            <option value="on_loan">On Loan</option>
            <option value="maintenance">Maintenance</option>
            <option value="sold">Sold</option>
          </select>
          
          <input
            type="number"
            placeholder="Min Price (KES)"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          <input
            type="number"
            placeholder="Max Price (KES)"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Dropdown Results */}
        {showDropdown && (searchQuery || isLoading) && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Searching bikes...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-600">
                <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                {error}
              </div>
            ) : bikes.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No bikes found matching your criteria
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {bikes.map((bike) => (
                  <li key={bike.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(bike);
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      disabled={bike.status !== 'available'}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                              <BikeIcon className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="flex items-center">
                              <h4 className="text-sm font-semibold text-gray-900">
                                {bike.make} {bike.model} ({bike.year})
                              </h4>
                              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(bike.status)}`}>
                                {bike.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="mt-1 space-y-1 text-sm text-gray-600">
                              <div className="flex items-center space-x-4">
                                <span>Reg: {bike.registration_number}</span>
                                <span>{bike.engine_cc}cc</span>
                                <span className={getConditionColor(bike.condition)}>
                                  Condition: {bike.condition}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="flex items-center">
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  {formatPrice(bike.current_value)}
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Purchased: {new Date(bike.purchase_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {bike.status === 'available' ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Selected Bike Display */}
      {selectedBike && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BikeIcon className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  {selectedBike.make} {selectedBike.model}
                </h4>
                <div className="mt-1 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span>Year: {selectedBike.year}</span>
                    <span>Reg: {selectedBike.registration_number}</span>
                    <span>{selectedBike.engine_cc}cc • {selectedBike.color}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-medium">
                      Value: {formatPrice(selectedBike.current_value)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getConditionColor(selectedBike.condition)} bg-white`}>
                      {selectedBike.condition.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => onSelect(null as any)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Remove
            </button>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <div className="font-medium text-gray-700">Purchase Price</div>
              <div className="text-lg font-semibold text-green-600">
                {formatPrice(selectedBike.purchase_price)}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="font-medium text-gray-700">Current Value</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatPrice(selectedBike.current_value)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}