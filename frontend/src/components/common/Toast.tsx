import React, { useEffect, useState } from 'react';

/**
 * Toast - Notification component for OpsSight UI.
 * Shows a message and auto-hides after 4 seconds.
 * Uses Tailwind CSS for styling.
 */
const Toast: React.FC<{ message: string }> = ({ message }) => {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
      {message}
    </div>
  );
};

export default Toast; 