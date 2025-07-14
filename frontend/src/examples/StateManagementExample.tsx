/**
 * State Management Example
 * 
 * Comprehensive demonstration of the enhanced state management system including:
 * - Form state management with validation
 * - Persistent state across page refreshes
 * - Server state with React Query
 * - Integration with UI components
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TextField, 
  TextArea, 
  Checkbox, 
  Select, 
  RadioGroup, 
  RadioButton,
  Button,
  StatusIndicator,
  type SelectOption 
} from '@/components/ui';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useStateStore, createPersistentState } from '@/lib/state-store';

// Example form data interface
interface UserProfileForm {
  name: string;
  email: string;
  bio: string;
  preferences: {
    notifications: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
  role: 'admin' | 'user' | 'viewer';
}

// Example validation functions
const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

const validateName = (name: string): string | null => {
  if (name.length < 2) {
    return 'Name must be at least 2 characters long';
  }
  return null;
};

// Persistent state for user preferences
type UserPreferencesType = {
  theme: 'auto' | 'light' | 'dark';
  notifications: boolean;
  language: string;
  autoSave: boolean;
};

const userPreferencesState = createPersistentState<UserPreferencesType>({
  key: 'userPreferences',
  defaultValue: {
    theme: 'auto' as const,
    notifications: true,
    language: 'en',
    autoSave: false
  },
  validator: (value: any): value is UserPreferencesType => {
    return (
      value &&
      typeof value === 'object' &&
      ['light', 'dark', 'auto'].includes(value.theme) &&
      typeof value.notifications === 'boolean' &&
      typeof value.language === 'string'
    );
  }
});

/**
 * Form State Management Example
 */
function FormStateExample() {
  const [formData, setFormData] = useState<UserProfileForm>({
    name: '',
    email: '',
    bio: '',
    preferences: {
      notifications: true,
      theme: 'auto',
      language: 'en'
    },
    role: 'user'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Using our useLocalStorage hook for form persistence
  const { value: draftData, setValue: saveDraft } = useLocalStorage('form-draft', {
    defaultValue: {},
    syncAcrossTabs: true
  });

  // Auto-save draft every 5 seconds when form is dirty
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(formData).length > 0) {
        saveDraft(formData);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [formData, saveDraft]);

  const validateField = (fieldName: keyof UserProfileForm | string, value: any): string | null => {
    switch (fieldName) {
      case 'name':
        return validateName(value);
      case 'email':
        return validateEmail(value);
      case 'bio':
        return value.length > 500 ? 'Bio must be 500 characters or less' : null;
      default:
        return null;
    }
  };

  const handleFieldChange = <T,>(fieldName: string, value: T) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value
    }));

    // Validate field
    const error = validateField(fieldName, value);
    setErrors((prev: any) => ({
      ...prev,
      [fieldName]: error || ''
    }));
  };

  const handleNestedFieldChange = (parentField: string, childField: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [parentField]: {
        ...prev[parentField as keyof UserProfileForm] as any,
        [childField]: value
      }
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate all fields
      const newErrors: Record<string, string> = {};
      Object.entries(formData).forEach(([key, value]) => {
        const error = validateField(key, value);
        if (error) newErrors[key] = error;
      });

      setErrors(newErrors);

      if (Object.keys(newErrors).length === 0) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Form submitted:', formData);
        
        // Clear draft on successful submission
        saveDraft({});
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeOptions: SelectOption[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' }
  ];

  const languageOptions: SelectOption[] = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Form State Management Example
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Demonstrates validation, auto-save, and persistence features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextField
          label="Full Name"
          value={formData.name}
          onChange={(value) => handleFieldChange('name', value)}
          error={errors.name}
          required
          placeholder="Enter your full name"
        />

        <TextField
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(value) => handleFieldChange('email', value)}
          error={errors.email}
          required
          placeholder="Enter your email"
        />
      </div>

      <TextArea
        label="Bio"
        value={formData.bio}
        onChange={(value) => handleFieldChange('bio', value)}
        error={errors.bio}
        placeholder="Tell us about yourself..."
        description="Optional. Maximum 500 characters."
      />

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preferences</h3>
        
        <Checkbox
          label="Enable notifications"
          checked={formData.preferences.notifications}
          onChange={(checked) => handleNestedFieldChange('preferences', 'notifications', checked)}
          description="Receive email notifications about important updates"
        />

        <Select
          label="Theme"
          value={formData.preferences.theme}
          onChange={(value) => handleNestedFieldChange('preferences', 'theme', value)}
          options={themeOptions}
          placeholder="Select theme"
        />

        <Select
          label="Language"
          value={formData.preferences.language}
          onChange={(value) => handleNestedFieldChange('preferences', 'language', value)}
          options={languageOptions}
          placeholder="Select language"
        />
      </div>

      <RadioGroup
        label="Role"
        value={formData.role}
        onChange={(value) => handleFieldChange('role', value)}
        name="role"
        required
      >
        <RadioButton value="admin" label="Administrator" />
        <RadioButton value="user" label="User" />
        <RadioButton value="viewer" label="Viewer" />
      </RadioGroup>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-500">
          {Object.keys(draftData).length > 0 && (
            <span className="flex items-center">
              <StatusIndicator status="success" size="sm" className="mr-2" />
              Draft saved
            </span>
          )}
        </div>
        
        <div className="space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData({
                name: '',
                email: '',
                bio: '',
                preferences: { notifications: true, theme: 'auto', language: 'en' },
                role: 'user'
              });
              setErrors({});
              saveDraft({});
            }}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          
          <Button
            type="submit"
            disabled={isSubmitting || Object.keys(errors).some(key => errors[key])}
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * Persistent State Example
 */
function PersistentStateExample() {
  const preferences = userPreferencesState.getValue();
  
  const updatePreference = <K extends keyof typeof preferences>(
    key: K, 
    value: typeof preferences[K]
  ) => {
    userPreferencesState.setValue((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Persistent State Example
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        These preferences persist across browser sessions and tabs.
      </p>

      <div className="space-y-4">
        <Select
          label="Theme Preference"
          value={preferences.theme}
          onChange={(value) => updatePreference('theme', value as any)}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'auto', label: 'Auto' }
          ]}
        />

        <Checkbox
          label="Enable notifications"
          checked={preferences.notifications}
          onChange={(checked) => updatePreference('notifications', checked)}
        />

        <Checkbox
          label="Auto-save drafts"
          checked={preferences.autoSave}
          onChange={(checked) => updatePreference('autoSave', checked)}
        />

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Current State:</h4>
          <pre className="text-sm text-gray-600 dark:text-gray-400">
            {JSON.stringify(preferences, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * Server State Example with React Query
 */
function ServerStateExample() {
  const queryClient = useQueryClient();
  const stateStore = useStateStore();

  // Example query
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        { id: 3, name: 'Bob Wilson', email: 'bob@example.com' }
      ];
    }
  });

  // Example mutation
  const addUserMutation = useMutation({
    mutationFn: async (newUser: { name: string; email: string }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now(), ...newUser };
    },
    onSuccess: () => {
      // Invalidate users query to refetch
      stateStore.server.invalidateQueries(['users']);
      alert('User added successfully!');
    }
  });

  const [newUserForm, setNewUserForm] = useState({ name: '', email: '' });

  const handleAddUser = (event: React.FormEvent) => {
    event.preventDefault();
    if (newUserForm.name && newUserForm.email) {
      addUserMutation.mutate(newUserForm);
      setNewUserForm({ name: '', email: '' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Server State Example
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Demonstrates React Query integration with our state store.
      </p>

      {/* Add User Form */}
      <form onSubmit={handleAddUser} className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Add New User</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <TextField
            label="Name"
            value={newUserForm.name}
            onChange={(value) => setNewUserForm((prev: any) => ({ ...prev, name: value }))}
            required
          />
          <TextField
            label="Email"
            type="email"
            value={newUserForm.email}
            onChange={(value) => setNewUserForm((prev: any) => ({ ...prev, email: value }))}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={!newUserForm.name || !newUserForm.email || addUserMutation.isPending}
          isLoading={addUserMutation.isPending}
        >
          Add User
        </Button>
      </form>

      {/* Users List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Users</h3>
          <Button
            variant="outline"
            onClick={() => stateStore.server.invalidateQueries(['users'])}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <StatusIndicator status="info" size="lg" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <StatusIndicator status="error" size="lg" />
            <p className="mt-2 text-red-600 dark:text-red-400">
              Failed to load users: {(error as Error).message}
            </p>
          </div>
        )}

        {users && (
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="p-3 border rounded-lg">
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Example Component
 */
export default function StateManagementExample() {
  const [currentExample, setCurrentExample] = useState<'form' | 'persistent' | 'server'>('form');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            State Management System Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Comprehensive demonstration of our enhanced state management system featuring
            form state, persistent state, and server state management.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow">
            {[
              { key: 'form', label: 'Form State' },
              { key: 'persistent', label: 'Persistent State' },
              { key: 'server', label: 'Server State' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCurrentExample(key as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentExample === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Example Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          {currentExample === 'form' && <FormStateExample />}
          {currentExample === 'persistent' && <PersistentStateExample />}
          {currentExample === 'server' && <ServerStateExample />}
        </div>
      </div>
    </div>
  );
} 