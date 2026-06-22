'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  isEdit?:      boolean;
  clientId?:    number;
  onSuccess?:   () => void;
}

interface ClientFormData {
  first_name:           string;
  last_name:            string;
  phone:                string;
  email:                string;
  nin:                  string;
  date_of_birth:        string;
  gender:               string;
  marital_status:       string;
  occupation:           string;
  monthly_income:       string;
  employment_status:    string;
  address:              string;
  alt_phone:            string;
  employer_name:        string;
  business_name:        string;
  next_of_kin_name:     string;
  next_of_kin_phone:    string;
  next_of_kin_relationship: string;
  bank_name:            string;
  account_number:       string;
}

const EMPTY: ClientFormData = {
  first_name: '', last_name: '', phone: '', email: '', nin: '',
  date_of_birth: '', gender: 'male', marital_status: 'single',
  occupation: '', monthly_income: '', employment_status: 'employed',
  address: '', alt_phone: '', employer_name: '', business_name: '',
  next_of_kin_name: '', next_of_kin_phone: '', next_of_kin_relationship: '',
  bank_name: '', account_number: '',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const select = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';

export default function ClientForm({ initialData, isEdit, clientId, onSuccess }: ClientFormProps) {
  const router  = useRouter();
  const [form, setForm]     = useState<ClientFormData>({ ...EMPTY, ...initialData });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [step, setStep]     = useState(0);

  const steps = ['Personal', 'Employment', 'Next of Kin', 'Bank'];

  const set = (field: keyof ClientFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Step 0's required fields are unmounted when viewing other steps,
    // so the browser's native `required` validation never sees them.
    // Validate explicitly here regardless of which step is showing.
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      setError('First name, last name, and phone are required (Personal step).');
      setStep(0);
      return;
    }

    setLoading(true);

    // Strip id from the body — it's already in the URL (/clients/:id).
    // Sending it in the payload too caused the backend to misidentify
    // this as a new entity and INSERT instead of UPDATE.
    // (id isn't on ClientFormData, but initialData can carry it through
    // the {...EMPTY, ...initialData} spread above, so cast before omitting.)
    const { id: _omitId, ...formWithoutId } = form as ClientFormData & { id?: unknown };
    const payload = {
      ...formWithoutId,
      monthly_income: Number(form.monthly_income) || 0,
    };

    const res = isEdit && clientId
      ? await api.patch(`/clients/${clientId}`, payload)
      : await api.post('/clients', payload);

    setLoading(false);
    if (res.success) {
      if (onSuccess) onSuccess();
      else router.push('/dashboard/clients');
    } else {
      setError(res.message ?? 'Failed to save client');
    }
  };

  // Enter/Tab inside an <input> submits the form natively when only one
  // type="submit" button exists in the DOM — which is exactly what happens
  // on the last step (Bank), since the Next button is swapped out for Submit.
  // Block Enter everywhere except when the focused element IS the submit button.
  const blockEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return; // allow newlines in textareas
    if (target.getAttribute('type') === 'submit') return; // allow real submit clicks
    e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={blockEnterSubmit} className="space-y-6">
      {/* Step tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {steps.map((s, i) => (
          <button key={s} type="button" onClick={() => {
            if (i > 0 && (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim())) {
              setError('First name, last name, and phone are required before continuing.');
              setStep(0);
              return;
            }
            setError('');
            setStep(i);
          }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              step === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Step 0: Personal */}
      {step === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name" required><input required value={form.first_name} onChange={set('first_name')} className={input} /></Field>
          <Field label="Last Name"  required><input required value={form.last_name}  onChange={set('last_name')}  className={input} /></Field>
          <Field label="Phone"      required><input required value={form.phone}       onChange={set('phone')}       className={input} /></Field>
          <Field label="Alt Phone">         <input         value={form.alt_phone}    onChange={set('alt_phone')}   className={input} /></Field>
          <Field label="Email">             <input type="email" value={form.email}   onChange={set('email')}       className={input} /></Field>
          <Field label="NIN">               <input         value={form.nin}          onChange={set('nin')}         className={input} /></Field>
          <Field label="Date of Birth">     <input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} className={input} /></Field>
          <Field label="Gender">
            <select value={form.gender} onChange={set('gender')} className={select}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Marital Status">
            <select value={form.marital_status} onChange={set('marital_status')} className={select}>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </Field>
          <Field label="Address" required>
            <textarea required value={form.address} onChange={set('address')} rows={2} className={input} />
          </Field>
        </div>
      )}

      {/* Step 1: Employment */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Employment Status">
            <select value={form.employment_status} onChange={set('employment_status')} className={select}>
              <option value="employed">Employed</option>
              <option value="self_employed">Self Employed</option>
              <option value="business_owner">Business Owner</option>
              <option value="unemployed">Unemployed</option>
            </select>
          </Field>
          <Field label="Occupation"><input value={form.occupation} onChange={set('occupation')} className={input} /></Field>
          <Field label="Monthly Income (UGX)"><input type="number" min="0" value={form.monthly_income} onChange={set('monthly_income')} className={input} /></Field>
          <Field label="Employer Name"><input value={form.employer_name} onChange={set('employer_name')} className={input} /></Field>
          <Field label="Business Name"><input value={form.business_name} onChange={set('business_name')} className={input} /></Field>
        </div>
      )}

      {/* Step 2: Next of Kin */}
      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Next of Kin Name"><input value={form.next_of_kin_name} onChange={set('next_of_kin_name')} className={input} /></Field>
          <Field label="Next of Kin Phone"><input value={form.next_of_kin_phone} onChange={set('next_of_kin_phone')} className={input} /></Field>
          <Field label="Relationship"><input value={form.next_of_kin_relationship} onChange={set('next_of_kin_relationship')} className={input} /></Field>
        </div>
      )}

      {/* Step 3: Bank */}
      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Bank Name"><input value={form.bank_name} onChange={set('bank_name')} className={input} /></Field>
          <Field label="Account Number"><input value={form.account_number} onChange={set('account_number')} className={input} /></Field>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50" disabled={step === 0}>
          Previous
        </button>
        {step < steps.length - 1 ? (
          <button type="button" onClick={() => {
            if (step === 0 && (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim())) {
              setError('First name, last name, and phone are required before continuing.');
              return;
            }
            setError('');
            setStep(s => s + 1);
          }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Next
          </button>
        ) : (
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Update Client' : 'Create Client'}
          </button>
        )}
      </div>
    </form>
  );
}
