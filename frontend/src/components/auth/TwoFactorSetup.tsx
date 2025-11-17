/**
 * Two-Factor Authentication Setup Component
 * 
 * Comprehensive 2FA/MFA implementation:
 * - TOTP (Time-based One-Time Password) support
 * - QR code generation for authenticator apps
 * - Backup codes generation
 * - SMS-based authentication
 * - Hardware token support (WebAuthn)
 * - Recovery options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';

export interface TwoFactorMethod {
  id: string;
  type: 'totp' | 'sms' | 'webauthn' | 'backup';
  name: string;
  enabled: boolean;
  verified: boolean;
  lastUsed?: Date;
  metadata?: Record<string, any>;
}

interface TwoFactorSetupProps {
  userId: string;
  onComplete: (methods: TwoFactorMethod[]) => void;
  onCancel: () => void;
  existingMethods?: TwoFactorMethod[];
}

interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  verified: boolean;
}

interface SMSSetup {
  phoneNumber: string;
  verified: boolean;
  verificationCode?: string;
}

interface WebAuthnSetup {
  credentialId?: string;
  verified: boolean;
  deviceName?: string;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  userId,
  onComplete,
  onCancel,
  existingMethods = [],
}) => {
  const [activeTab, setActiveTab] = useState<'totp' | 'sms' | 'webauthn'>('totp');
  const [totpSetup, setTotpSetup] = useState<TOTPSetup | null>(null);
  const [smsSetup, setSmsSetup] = useState<SMSSetup>({ phoneNumber: '', verified: false });
  const [webauthnSetup, setWebauthnSetup] = useState<WebAuthnSetup>({ verified: false });
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<TwoFactorMethod[]>(existingMethods);
  
  const { addToast } = useToast();

  useEffect(() => {
    // Initialize TOTP setup if not already configured
    if (activeTab === 'totp' && !totpSetup && !methods.find(m => m.type === 'totp' && m.enabled)) {
      initializeTOTP();
    }
  }, [activeTab, totpSetup, methods]);

  const initializeTOTP = async () => {
    try {
      setLoading(true);
      
      // Generate TOTP secret
      const response = await fetch('/api/auth/totp/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) throw new Error('Failed to setup TOTP');
      
      const data = await response.json();
      setTotpSetup(data);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Failed to setup TOTP',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyTOTP = async () => {
    if (!totpSetup || !verificationCode) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          secret: totpSetup.secret,
          code: verificationCode,
        }),
      });
      
      if (!response.ok) throw new Error('Invalid verification code');
      
      const newMethod: TwoFactorMethod = {
        id: 'totp-' + Date.now(),
        type: 'totp',
        name: 'Authenticator App',
        enabled: true,
        verified: true,
      };
      
      setMethods(prev => [...prev.filter(m => m.type !== 'totp'), newMethod]);
      setTotpSetup(prev => prev ? { ...prev, verified: true } : null);
      
      addToast({
        type: 'success',
        title: 'TOTP Enabled',
        description: 'Two-factor authentication has been successfully enabled',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Invalid code',
      });
    } finally {
      setLoading(false);
    }
  };

  const setupSMS = async () => {
    if (!smsSetup.phoneNumber) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/sms/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          phoneNumber: smsSetup.phoneNumber,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to setup SMS');
      
      addToast({
        type: 'info',
        title: 'Verification Code Sent',
        description: 'Please check your phone for the verification code',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Failed to setup SMS',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifySMS = async () => {
    if (!smsSetup.verificationCode) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          phoneNumber: smsSetup.phoneNumber,
          code: smsSetup.verificationCode,
        }),
      });
      
      if (!response.ok) throw new Error('Invalid verification code');
      
      const newMethod: TwoFactorMethod = {
        id: 'sms-' + Date.now(),
        type: 'sms',
        name: `SMS (${smsSetup.phoneNumber})`,
        enabled: true,
        verified: true,
        metadata: { phoneNumber: smsSetup.phoneNumber },
      };
      
      setMethods(prev => [...prev.filter(m => m.type !== 'sms'), newMethod]);
      setSmsSetup(prev => ({ ...prev, verified: true }));
      
      addToast({
        type: 'success',
        title: 'SMS Authentication Enabled',
        description: 'SMS two-factor authentication has been successfully enabled',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Invalid code',
      });
    } finally {
      setLoading(false);
    }
  };

  const setupWebAuthn = async () => {
    if (!navigator.credentials) {
      addToast({
        type: 'error',
        title: 'Not Supported',
        description: 'WebAuthn is not supported in this browser',
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Get challenge from server
      const challengeResponse = await fetch('/api/auth/webauthn/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (!challengeResponse.ok) throw new Error('Failed to get challenge');
      
      const { challenge, user } = await challengeResponse.json();
      
      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
          rp: {
            name: 'OpsSight',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email,
            displayName: user.name,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'direct',
        },
      }) as PublicKeyCredential;
      
      if (!credential) throw new Error('Failed to create credential');
      
      // Send credential to server for verification
      const verifyResponse = await fetch('/api/auth/webauthn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          credentialId: credential.id,
          response: {
            clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
            attestationObject: btoa(String.fromCharCode(...new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject))),
          },
        }),
      });
      
      if (!verifyResponse.ok) throw new Error('Failed to verify credential');
      
      const newMethod: TwoFactorMethod = {
        id: 'webauthn-' + credential.id,
        type: 'webauthn',
        name: `Security Key (${webauthnSetup.deviceName || 'Device'})`,
        enabled: true,
        verified: true,
        metadata: { credentialId: credential.id },
      };
      
      setMethods(prev => [...prev.filter(m => m.type !== 'webauthn'), newMethod]);
      setWebauthnSetup({ verified: true, credentialId: credential.id });
      
      addToast({
        type: 'success',
        title: 'Security Key Added',
        description: 'Hardware security key has been successfully registered',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Failed to setup security key',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/backup-codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) throw new Error('Failed to generate backup codes');
      
      const { codes } = await response.json();
      
      const newMethod: TwoFactorMethod = {
        id: 'backup-' + Date.now(),
        type: 'backup',
        name: 'Backup Codes',
        enabled: true,
        verified: true,
        metadata: { codes, generated: new Date() },
      };
      
      setMethods(prev => [...prev.filter(m => m.type !== 'backup'), newMethod]);
      
      addToast({
        type: 'success',
        title: 'Backup Codes Generated',
        description: 'Save these codes in a secure location',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate backup codes',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeMethod = async (methodId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/2fa/remove/${methodId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to remove method');
      
      setMethods(prev => prev.filter(m => m.id !== methodId));
      
      addToast({
        type: 'success',
        title: 'Method Removed',
        description: 'Two-factor authentication method has been removed',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Removal Failed',
        description: error instanceof Error ? error.message : 'Failed to remove method',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (methods.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Methods Configured',
        description: 'Please configure at least one two-factor authentication method',
      });
      return;
    }
    
    onComplete(methods);
  };

  const renderTOTPSetup = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Authenticator App
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Use an app like Google Authenticator, Authy, or 1Password
        </p>
      </div>

      {totpSetup && !totpSetup.verified && (
        <>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
            <div className="text-center mb-4">
              <QRCodeSVG
                value={totpSetup.qrCodeUrl}
                size={200}
                className="mx-auto"
              />
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Or enter this code manually:
              </p>
              <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm font-mono">
                {totpSetup.secret}
              </code>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={6}
            />
          </div>

          <Button
            onClick={verifyTOTP}
            disabled={loading || verificationCode.length !== 6}
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Verify and Enable'}
          </Button>
        </>
      )}

      {totpSetup?.verified && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 dark:text-green-200 font-medium">
              Authenticator app successfully configured
            </span>
          </div>
        </div>
      )}

      {totpSetup?.backupCodes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Backup Codes
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            Save these codes in a secure location. Each can only be used once.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {totpSetup.backupCodes.map((code, index) => (
              <code key={index} className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded text-sm">
                {code}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSMSSetup = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          SMS Authentication
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Receive verification codes via text message
        </p>
      </div>

      {!smsSetup.verified && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={smsSetup.phoneNumber}
              onChange={(e) => setSmsSetup(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {smsSetup.verificationCode !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={smsSetup.verificationCode}
                onChange={(e) => setSmsSetup(prev => ({ 
                  ...prev, 
                  verificationCode: e.target.value.replace(/\D/g, '').slice(0, 6)
                }))}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
              />
            </div>
          )}

          <div className="space-y-3">
            {smsSetup.verificationCode === undefined ? (
              <Button
                onClick={setupSMS}
                disabled={loading || !smsSetup.phoneNumber}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            ) : (
              <Button
                onClick={verifySMS}
                disabled={loading || !smsSetup.verificationCode || smsSetup.verificationCode.length !== 6}
                className="w-full"
              >
                {loading ? 'Verifying...' : 'Verify and Enable'}
              </Button>
            )}
          </div>
        </>
      )}

      {smsSetup.verified && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 dark:text-green-200 font-medium">
              SMS authentication successfully configured
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderWebAuthnSetup = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Security Key
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Use a hardware security key or your device's built-in authenticator
        </p>
      </div>

      {!webauthnSetup.verified && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Device Name (Optional)
            </label>
            <input
              type="text"
              value={webauthnSetup.deviceName || ''}
              onChange={(e) => setWebauthnSetup(prev => ({ ...prev, deviceName: e.target.value }))}
              placeholder="My Security Key"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <Button
            onClick={setupWebAuthn}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Setting up...' : 'Add Security Key'}
          </Button>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Supported Devices
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Hardware security keys (YubiKey, Titan, etc.)</li>
              <li>• Built-in biometric authenticators (Face ID, Touch ID, Windows Hello)</li>
              <li>• Platform authenticators</li>
            </ul>
          </div>
        </>
      )}

      {webauthnSetup.verified && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 dark:text-green-200 font-medium">
              Security key successfully registered
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderConfiguredMethods = () => {
    const enabledMethods = methods.filter(m => m.enabled);
    
    if (enabledMethods.length === 0) return null;

    return (
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configured Methods
        </h3>
        <div className="space-y-3">
          {enabledMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {method.name}
                  </span>
                  {method.lastUsed && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Last used: {method.lastUsed.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeMethod(method.id)}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Two-Factor Authentication Setup
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add an extra layer of security to your account by enabling two-factor authentication.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'totp', label: 'Authenticator App', icon: '📱' },
            { id: 'sms', label: 'SMS', icon: '💬' },
            { id: 'webauthn', label: 'Security Key', icon: '🔑' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {activeTab === 'totp' && renderTOTPSetup()}
        {activeTab === 'sms' && renderSMSSetup()}
        {activeTab === 'webauthn' && renderWebAuthnSetup()}
      </div>

      {/* Backup Codes */}
      <div className="mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Backup Codes
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate backup codes in case you lose access to your primary 2FA method
              </p>
            </div>
            <Button
              onClick={generateBackupCodes}
              variant="outline"
              disabled={loading}
            >
              Generate Codes
            </Button>
          </div>
        </div>
      </div>

      {/* Configured Methods */}
      {renderConfiguredMethods()}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleComplete} disabled={loading}>
          Complete Setup
        </Button>
      </div>
    </div>
  );
};

export default TwoFactorSetup;