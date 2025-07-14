'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LoadingSpinner } from '../ui/LoadingStates';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface OpsCopilotProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_COMMANDS = [
  { label: 'What caused the spike yesterday?', category: 'analysis' },
  { label: 'Show deployment trends', category: 'metrics' },
  { label: 'Check cost optimization opportunities', category: 'cost' },
  { label: 'Rollback last failed deploy', category: 'action' },
  { label: 'Show system health summary', category: 'health' },
  { label: 'Predict resource needs', category: 'prediction' },
];

const SUGGESTED_RESPONSES = {
  analysis: [
    "Traffic spike due to marketing campaign launch at 2 PM EST",
    "Memory leak detected in payment service v2.3.1",
    "Database query timeout increased due to missing index"
  ],
  cost: [
    "Found 3 unused load balancers saving $340/month",
    "Auto-scaling policy can be optimized to save 25%",
    "Spot instances recommended for dev environments"
  ],
  health: [
    "All critical services: ✅ Healthy",
    "⚠️ API latency above threshold (p99: 1.2s)",
    "🔄 2 deployments in progress"
  ]
};

export const OpsCopilot: React.FC<OpsCopilotProps> = ({ className = '', isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your OpsCopilot. I can help you analyze system performance, troubleshoot issues, optimize costs, and predict resource needs. What would you like to know?",
      timestamp: new Date(),
      suggestions: ['System Health', 'Cost Analysis', 'Recent Issues', 'Predictions']
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const simulateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('spike') || lowerMessage.includes('yesterday')) {
      return "I found a significant traffic spike yesterday at 2:47 PM EST. Analysis shows it was triggered by a marketing campaign launch. The spike reached 340% of normal traffic levels. Here's what happened:\n\n• Campaign went live on social media\n• Payment service response time increased by 200ms\n• Auto-scaling kicked in after 3 minutes\n• No service degradation occurred\n\nRecommendation: Consider pre-scaling before scheduled campaigns.";
    }
    
    if (lowerMessage.includes('cost') || lowerMessage.includes('optimization')) {
      return "Cost optimization analysis complete! I found several opportunities:\n\n💰 **Immediate savings ($1,240/month)**:\n• 3 unused Application Load Balancers ($340/month)\n• Over-provisioned RDS instances ($420/month)\n• Idle Elastic IPs ($480/month)\n\n🎯 **Optimization opportunities**:\n• Switch dev/staging to Spot instances (25% savings)\n• Implement auto-shutdown for non-prod environments\n• Optimize data transfer with CloudFront\n\nShould I create a cost optimization plan?";
    }
    
    if (lowerMessage.includes('health') || lowerMessage.includes('summary')) {
      return "System Health Summary 🏥\n\n✅ **All Critical Services Healthy**\n\n📊 **Current Status**:\n• API Gateway: 99.9% uptime\n• Database: 45ms avg response time\n• Cache hit ratio: 94%\n• Active deployments: 2 in progress\n\n⚠️ **Attention Needed**:\n• API latency p99: 1.2s (threshold: 1s)\n• Memory usage trending up 15% this week\n• SSL cert expires in 12 days\n\nWould you like me to dive deeper into any area?";
    }
    
    if (lowerMessage.includes('rollback') || lowerMessage.includes('deploy')) {
      return "🔄 Deployment Analysis:\n\n**Last Failed Deploy**: payment-service v2.3.1\n• Failed at: 14:32 EST\n• Reason: Database migration timeout\n• Impact: 3 minutes downtime\n• Status: Auto-rolled back\n\n**Available Actions**:\n1. Roll back to v2.2.9 (stable)\n2. Retry with hotfix v2.3.2\n3. View detailed error logs\n\nWhich action would you like me to execute?";
    }
    
    if (lowerMessage.includes('predict') || lowerMessage.includes('resource')) {
      return "🔮 Resource Prediction (Next 30 days):\n\n**CPU Usage**: Expected 23% increase\n• Peak: Black Friday (Nov 24)\n• Recommended: Scale up 2 additional instances\n\n**Memory**: Stable, trending +2%/week\n• Current: 67% average utilization\n• Action: No immediate scaling needed\n\n**Storage**: 85GB growth expected\n• Database: 60GB (normal growth)\n• Logs: 25GB (consider cleanup policy)\n\n**Cost Impact**: +$340/month if no optimization\n\nShall I prepare auto-scaling policies for Black Friday?";
    }
    
    return "I understand you're asking about: " + userMessage + "\n\nBased on current system data, I can help you with:\n• Performance analysis and troubleshooting\n• Cost optimization recommendations\n• Deployment and rollback assistance\n• Resource usage predictions\n• Security and compliance insights\n\nCould you be more specific about what you'd like to analyze?";
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const response = simulateAIResponse(input.trim());
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date(),
        suggestions: ['Follow up', 'More details', 'Run analysis', 'Create ticket']
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleQuickCommand = (command: string) => {
    setInput(command);
    handleSendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <div className="w-full max-w-4xl h-[80vh] bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">OpsCopilot</h2>
              <p className="text-sm text-slate-400">AI Operations Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
            aria-label="Close OpsCopilot"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ height: 'calc(80vh - 200px)' }}>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-cyan-600' : 'bg-slate-800'} rounded-2xl p-4`}>
                <div className="text-white whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                {message.suggestions && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickCommand(suggestion)}
                        className="px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-xs transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl p-4">
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-slate-400 text-sm">OpsCopilot is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Commands */}
        <div className="px-6 py-3 border-t border-slate-700">
          <div className="flex flex-wrap gap-2">
            {QUICK_COMMANDS.map((cmd, index) => (
              <button
                key={index}
                onClick={() => handleQuickCommand(cmd.label)}
                className="px-3 py-1 bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-6 border-t border-slate-700">
          <div className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about system performance, costs, deployments..."
              className="flex-1 px-4 py-3 bg-slate-800/60 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 