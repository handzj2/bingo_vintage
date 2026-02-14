// src/components/loan/ClientSearch.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, User, Check, AlertCircle, Phone, Mail } from 'lucide-react';
import { debounce } from 'lodash';

interface Client {
  id: number;
  full_name: string;
  phone_number: string;
  email?: string;
  id_number: string;
  kyc_status: 'verified' | 'pending' | 'rejected';
  credit_score?: number;
  total_active_loans?: number;
}

interface ClientSearchProps {
  onSelect: (client: Client) => void;
  selectedClient: Client | null;
}

export default function ClientSearch({ onSelect, selectedClient }: ClientSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Mock API call (replace with actual API)
  const searchClients = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setClients([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Replace with actual API call
        const response = await fetch(`/api/clients?search=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (response.ok) {
          setClients(data.clients || []);
        } else {
          setError(data.error || 'Failed to search clients');
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
    searchClients(searchQuery);
  }, [searchQuery, searchClients]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return Check;
      case 'pending': return AlertCircle;
      case 'rejected': return AlertCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="space-y-4">
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
            placeholder="Search clients by name, phone, or ID number..."
            className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {showDropdown && (searchQuery || isLoading) && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Searching clients...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-600">
                <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                {error}
              </div>
            ) : clients.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No clients found
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {clients.map((client) => {
                  const StatusIcon = getStatusIcon(client.kyc_status);
                  return (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(client);
                          setSearchQuery('');
                          setShowDropdown(false);
                        }}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900">
                                  {client.full_name}
                                </p>
                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(client.kyc_status)}`}>
                                  <StatusIcon className="w-3 h-3 inline mr-1" />
                                  {client.kyc_status}
                                </span>
                              </div>
                              <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {client.phone_number}
                                </span>
                                <span>ID: {client.id_number}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {client.credit_score && (
                              <div className="text-sm">
                                <span className="font-medium">Score: </span>
                                <span className={client.credit_score > 700 ? 'text-green-600' : 
                                                 client.credit_score > 500 ? 'text-yellow-600' : 'text-red-600'}>
                                  {client.credit_score}
                                </span>
                              </div>
                            )}
                            {client.total_active_loans !== undefined && (
                              <div className="text-xs text-gray-500 mt-1">
                                {client.total_active_loans} active loan(s)
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {selectedClient && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="ml-3">
                <h4 className="text-lg font-semibold text-gray-900">
                  {selectedClient.full_name}
                </h4>
                <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {selectedClient.phone_number}
                  </span>
                  {selectedClient.email && (
                    <span className="flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      {selectedClient.email}
                    </span>
                  )}
                  <span>ID: {selectedClient.id_number}</span>
                </div>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => {
                onSelect(null as any);
                setSearchQuery('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">KYC Status: </span>
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedClient.kyc_status)}`}>
                {selectedClient.kyc_status.toUpperCase()}
              </span>
            </div>
            {selectedClient.credit_score && (
              <div>
                <span className="font-medium">Credit Score: </span>
                <span className={selectedClient.credit_score > 700 ? 'text-green-600 font-medium' : 
                               selectedClient.credit_score > 500 ? 'text-yellow-600 font-medium' : 'text-red-600 font-medium'}>
                  {selectedClient.credit_score}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}