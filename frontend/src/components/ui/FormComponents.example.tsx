/**
 * Form Components Usage Examples
 * 
 * Demonstrates how to use all the new form components from the UI library.
 * This file serves as both documentation and a testing ground for the components.
 */

import React, { useState } from 'react';
import { 
  TextField, 
  TextArea, 
  Checkbox, 
  Select, 
  RadioGroup, 
  RadioButton,
  Button,
  type SelectOption
} from '@/components/ui';

export function FormComponentsExample() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    notifications: false,
    theme: null as string | null,
    priority: null as string | null,
    agreeToTerms: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const themeOptions: SelectOption[] = [
    { value: 'light', label: 'Light Mode' },
    { value: 'dark', label: 'Dark Mode' },
    { value: 'auto', label: 'System Default' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      console.log('Form submitted:', formData);
      alert('Form submitted successfully! Check console for data.');
    }
  };

  const clearErrors = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Form Components Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive example showcasing all form components from the UI library.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Text Input Examples */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Text Inputs
          </h2>
          
          <TextField
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, name: value }));
              clearErrors('name');
            }}
            error={errors.name}
            required
            description="This will be displayed on your profile"
          />

          <TextField
            type="email"
            label="Email Address"
            placeholder="your.email@example.com"
            value={formData.email}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, email: value }));
              clearErrors('email');
            }}
            error={errors.email}
            required
            autoComplete="email"
          />
        </div>

        {/* Textarea Example */}
        <TextArea
          label="Bio"
          placeholder="Tell us about yourself..."
          value={formData.bio}
          onChange={(value) => setFormData(prev => ({ ...prev, bio: value }))}
          rows={4}
          maxLength={500}
          description="Brief description that will appear on your profile"
        />

        {/* Select Example */}
        <Select
          label="Theme Preference"
          placeholder="Choose your preferred theme"
          options={themeOptions}
          value={formData.theme}
          onChange={(value) => setFormData(prev => ({ ...prev, theme: value }))}
          clearable
          description="Select how you'd like the interface to appear"
        />

        {/* Radio Group Example */}
        <RadioGroup
          name="priority"
          label="Priority Level"
          value={formData.priority}
          onChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
          description="Choose the importance level for notifications"
          orientation="horizontal"
        >
          <RadioButton
            value="low"
            label="Low"
            description="Only critical updates"
          />
          <RadioButton
            value="medium"
            label="Medium"
            description="Important updates"
          />
          <RadioButton
            value="high"
            label="High"
            description="All notifications"
          />
        </RadioGroup>

        {/* Checkbox Examples */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preferences
          </h2>

          <Checkbox
            checked={formData.notifications}
            onChange={(checked) => setFormData(prev => ({ ...prev, notifications: checked }))}
            label="Enable email notifications"
            description="Receive updates and announcements via email"
          />

          <Checkbox
            checked={formData.agreeToTerms}
            onChange={(checked) => {
              setFormData(prev => ({ ...prev, agreeToTerms: checked }));
              clearErrors('agreeToTerms');
            }}
            label="I agree to the terms and conditions"
            required
            error={errors.agreeToTerms}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFormData({
                name: '',
                email: '',
                bio: '',
                notifications: false,
                theme: null,
                priority: null,
                agreeToTerms: false
              });
              setErrors({});
            }}
          >
            Reset
          </Button>
          <Button type="submit" variant="primary">
            Submit Form
          </Button>
        </div>
      </form>

      {/* Form Data Display */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Current Form Data:
        </h3>
        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default FormComponentsExample; 