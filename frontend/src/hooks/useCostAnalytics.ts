'use client';

import { useState, useEffect, useCallback } from 'react';
import { CostData, CostBreakdown, OptimizationRecommendation, CostAnomaly, BudgetAlert } from '@/types/cost';
import { useToast } from '@/contexts/ToastContext';

export function useCostAnalytics() {
  const [costData, setCostData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { addToast } = useToast();

  // Generate mock cost data
  const generateMockData = useCallback((): CostData => {
    const services = [
      { name: 'EC2 Instances', category: 'compute' as const },
      { name: 'RDS Database', category: 'database' as const },
      { name: 'S3 Storage', category: 'storage' as const },
      { name: 'CloudFront CDN', category: 'networking' as const },
      { name: 'EKS Cluster', category: 'compute' as const },
      { name: 'Lambda Functions', category: 'compute' as const },
      { name: 'CloudWatch', category: 'monitoring' as const },
      { name: 'WAF & Shield', category: 'security' as const }
    ];

    const environments = ['production', 'staging', 'development', 'testing'] as const;
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1'];

    // Generate cost breakdown
    const breakdown: CostBreakdown[] = services.map((service, i) => {
      const baseAmount = Math.random() * 5000 + 500;
      const trend = ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as const;
      const percentageChange = trend === 'stable' ? 0 : (Math.random() * 30 + 5) * (trend === 'up' ? 1 : -1);
      
      return {
        category: service.category,
        service: service.name,
        region: regions[Math.floor(Math.random() * regions.length)],
        environment: environments[Math.floor(Math.random() * environments.length)],
        amount: baseAmount,
        percentage: 0, // Will calculate after
        trend,
        percentageChange,
        unit: service.category === 'compute' ? 'hour' : service.category === 'storage' ? 'gb' : 'request',
        usage: {
          current: Math.random() * 1000 + 100,
          previous: Math.random() * 1000 + 100,
          unit: service.category === 'compute' ? 'vcpu-hours' : service.category === 'storage' ? 'gb' : 'requests'
        },
        tags: {
          team: ['platform', 'frontend', 'backend', 'data'][Math.floor(Math.random() * 4)],
          project: ['opssight', 'monitoring', 'analytics'][Math.floor(Math.random() * 3)]
        }
      };
    });

    // Calculate percentages
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
    breakdown.forEach(item => {
      item.percentage = (item.amount / total) * 100;
    });

    // Generate historical data
    const historical = Array.from({ length: 90 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (89 - i));
      
      const dailyTotal = total * (0.8 + Math.random() * 0.4) / 30; // Daily average with variation
      const categories = breakdown.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + (item.amount * (0.8 + Math.random() * 0.4) / 30);
        return acc;
      }, {} as Record<string, number>);

      return {
        date: date.toISOString().split('T')[0],
        total: dailyTotal,
        categories,
        events: Math.random() > 0.9 ? [{
          type: ['deployment', 'scaling', 'optimization'][Math.floor(Math.random() * 3)] as const,
          description: 'Automated scaling event',
          impact: Math.random() * 100 - 50,
          timestamp: date.toISOString()
        }] : undefined
      };
    });

    // Generate optimization recommendations
    const recommendations: OptimizationRecommendation[] = [
      {
        id: 'opt-1',
        category: 'rightsizing',
        title: 'Rightsize EC2 instances in staging',
        description: 'Several EC2 instances in staging environment are consistently under-utilized (< 20% CPU)',
        impact: { monthly: 850, yearly: 10200, percentage: 15 },
        effort: 'low',
        risk: 'low',
        priority: 8,
        service: 'EC2 Instances',
        environment: 'staging',
        implementation: {
          steps: [
            'Analyze CPU and memory utilization patterns',
            'Identify instances with < 20% average utilization',
            'Resize to smaller instance types',
            'Monitor performance post-resize'
          ],
          estimatedTime: '2-4 hours',
          requirements: ['AWS CLI access', 'CloudWatch metrics review']
        },
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'opt-2',
        category: 'unused_resources',
        title: 'Remove unused EBS volumes',
        description: 'Found 12 unattached EBS volumes that are incurring storage costs',
        impact: { monthly: 240, yearly: 2880, percentage: 4 },
        effort: 'low',
        risk: 'medium',
        priority: 6,
        service: 'EBS Storage',
        implementation: {
          steps: [
            'List all unattached EBS volumes',
            'Verify volumes are not needed for backups',
            'Create snapshots if needed',
            'Delete unused volumes'
          ],
          estimatedTime: '1-2 hours',
          requirements: ['Storage admin access', 'Backup verification']
        },
        status: 'pending',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'opt-3',
        category: 'reserved_instances',
        title: 'Purchase Reserved Instances for production',
        description: 'Production workloads running 24/7 would benefit from Reserved Instance pricing',
        impact: { monthly: 1200, yearly: 14400, percentage: 25 },
        effort: 'medium',
        risk: 'low',
        priority: 9,
        service: 'EC2 Instances',
        environment: 'production',
        implementation: {
          steps: [
            'Analyze production instance usage patterns',
            'Calculate ROI for 1-year vs 3-year reservations',
            'Purchase appropriate Reserved Instances',
            'Monitor utilization and adjust as needed'
          ],
          estimatedTime: '4-8 hours',
          requirements: ['Finance approval', 'Usage pattern analysis']
        },
        status: 'pending',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Generate cost anomalies
    const anomalies: CostAnomaly[] = [
      {
        id: 'anom-1',
        type: 'spike',
        severity: 'high',
        service: 'Lambda Functions',
        category: 'compute',
        environment: 'production',
        detection: {
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          value: 450,
          expected: 120,
          deviation: 275,
          confidence: 95
        },
        impact: {
          amount: 330,
          duration: '6 hours'
        },
        possibleCauses: [
          'Increased request volume',
          'Memory misconfiguration causing timeouts',
          'Recursive function calls',
          'DDoS attack or bot traffic'
        ],
        investigation: {
          status: 'investigating',
          assignee: 'platform-team@opssight.com',
          notes: 'Analyzing CloudWatch logs for unusual patterns'
        }
      },
      {
        id: 'anom-2',
        type: 'unusual_pattern',
        severity: 'medium',
        service: 'S3 Storage',
        category: 'storage',
        detection: {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          value: 180,
          expected: 150,
          deviation: 20,
          confidence: 78
        },
        impact: {
          amount: 30,
          duration: '24 hours'
        },
        possibleCauses: [
          'Large backup upload',
          'Log retention policy changes',
          'Data migration in progress'
        ],
        investigation: {
          status: 'resolved',
          notes: 'Confirmed as scheduled database backup upload'
        }
      }
    ];

    // Generate budget alerts
    const budgetAlerts: BudgetAlert[] = [
      {
        id: 'alert-1',
        type: 'threshold',
        severity: 'warning',
        title: 'Monthly budget 80% reached',
        description: 'Current month spending has reached 80% of allocated budget',
        threshold: 8000,
        current: 6400,
        percentage: 80,
        scope: 'total',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        acknowledged: false
      },
      {
        id: 'alert-2',
        type: 'forecast',
        severity: 'critical',
        title: 'Compute category forecast exceeds budget',
        description: 'Forecasted spending for compute resources will exceed monthly budget by $500',
        threshold: 3000,
        current: 3500,
        percentage: 117,
        scope: 'category',
        target: 'compute',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        acknowledged: false
      }
    ];

    const currentTotal = total;
    const trend = Math.random() > 0.5 ? 'up' : 'down';
    const percentageChange = Math.random() * 15 + 2;

    return {
      current: {
        total: currentTotal,
        breakdown,
        trend,
        percentageChange: trend === 'up' ? percentageChange : -percentageChange
      },
      forecast: {
        nextMonth: currentTotal * (1 + (Math.random() * 0.2 - 0.1)),
        nextQuarter: currentTotal * 3 * (1 + (Math.random() * 0.3 - 0.15)),
        nextYear: currentTotal * 12 * (1 + (Math.random() * 0.4 - 0.2)),
        confidence: Math.floor(Math.random() * 20 + 75)
      },
      budget: {
        monthly: 8000,
        quarterly: 24000,
        yearly: 96000,
        remaining: {
          monthly: 8000 - currentTotal,
          quarterly: 24000 - (currentTotal * 3),
          yearly: 96000 - (currentTotal * 12)
        },
        alerts: budgetAlerts
      },
      historical,
      optimization: recommendations,
      anomalies
    };
  }, []);

  // Load cost data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        const data = generateMockData();
        setCostData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load cost analytics data');
        console.error('Error loading cost data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [generateMockData, selectedTimeRange]);

  // Action functions
  const implementOptimization = useCallback(async (recommendationId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCostData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          optimization: prev.optimization.map(opt =>
            opt.id === recommendationId
              ? { ...opt, status: 'in_progress', updatedAt: new Date().toISOString() }
              : opt
          )
        };
      });

      addToast({
        type: 'success',
        title: 'Optimization Started',
        description: 'Cost optimization implementation has begun',
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Implementation Failed',
        description: 'Could not start optimization implementation',
        duration: 5000
      });
    }
  }, [addToast]);

  const dismissOptimization = useCallback(async (recommendationId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCostData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          optimization: prev.optimization.map(opt =>
            opt.id === recommendationId
              ? { ...opt, status: 'dismissed', updatedAt: new Date().toISOString() }
              : opt
          )
        };
      });

      addToast({
        type: 'info',
        title: 'Recommendation Dismissed',
        description: 'Optimization recommendation has been dismissed',
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Dismiss',
        description: 'Could not dismiss recommendation',
        duration: 5000
      });
    }
  }, [addToast]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCostData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          budget: {
            ...prev.budget,
            alerts: prev.budget.alerts.map(alert =>
              alert.id === alertId
                ? { ...alert, acknowledged: true }
                : alert
            )
          }
        };
      });

      addToast({
        type: 'success',
        title: 'Alert Acknowledged',
        description: 'Budget alert has been acknowledged',
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Acknowledge',
        description: 'Could not acknowledge alert',
        duration: 5000
      });
    }
  }, [addToast]);

  const updateBudget = useCallback(async (period: 'monthly' | 'quarterly' | 'yearly', amount: number) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setCostData(prev => {
        if (!prev) return prev;
        const newBudget = { ...prev.budget };
        newBudget[period] = amount;
        
        // Recalculate remaining budgets
        newBudget.remaining = {
          monthly: newBudget.monthly - prev.current.total,
          quarterly: newBudget.quarterly - (prev.current.total * 3),
          yearly: newBudget.yearly - (prev.current.total * 12)
        };

        return {
          ...prev,
          budget: newBudget
        };
      });

      addToast({
        type: 'success',
        title: 'Budget Updated',
        description: `${period} budget has been updated successfully`,
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Budget Update Failed',
        description: 'Could not update budget',
        duration: 5000
      });
    }
  }, [addToast]);

  return {
    costData,
    loading,
    error,
    selectedTimeRange,
    setSelectedTimeRange,
    implementOptimization,
    dismissOptimization,
    acknowledgeAlert,
    updateBudget,
    refreshData: () => {
      const data = generateMockData();
      setCostData(data);
    }
  };
}