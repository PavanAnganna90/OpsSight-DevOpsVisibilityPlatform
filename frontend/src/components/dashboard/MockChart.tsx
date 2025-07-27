import React from 'react';

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
    tension?: number;
    borderWidth?: number;
  }>;
}

interface ChartProps {
  data: ChartData;
  options?: any;
}

// Mock Line Chart
export const Line: React.FC<ChartProps> = ({ data, options }) => {
  const dataset = data.datasets[0];
  const maxValue = Math.max(...dataset.data);
  const minValue = Math.min(...dataset.data);
  
  return (
    <div className="w-full h-full bg-gray-50 rounded-lg border flex flex-col items-center justify-center p-4">
      <div className="text-lg font-semibold text-gray-700 mb-2">{dataset.label}</div>
      <div className="flex items-center space-x-2 mb-4">
        <div className="text-sm text-gray-500">Current:</div>
        <div className="text-xl font-bold text-blue-600">
          {dataset.data[dataset.data.length - 1]?.toFixed(1)}
        </div>
      </div>
      <div className="flex items-end space-x-1 h-24">
        {dataset.data.slice(-10).map((value, index) => {
          const height = ((value - minValue) / (maxValue - minValue)) * 100;
          return (
            <div
              key={index}
              className="bg-blue-500 w-3 rounded-t opacity-80"
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${value.toFixed(1)}`}
            />
          );
        })}
      </div>
      <div className="text-xs text-gray-400 mt-2">Last 10 minutes</div>
    </div>
  );
};

// Mock Bar Chart
export const Bar: React.FC<ChartProps> = ({ data, options }) => {
  const dataset = data.datasets[0];
  const maxValue = Math.max(...dataset.data);
  
  return (
    <div className="w-full h-full bg-gray-50 rounded-lg border flex flex-col items-center justify-center p-4">
      <div className="text-lg font-semibold text-gray-700 mb-2">{dataset.label}</div>
      <div className="flex items-center space-x-2 mb-4">
        <div className="text-sm text-gray-500">Total:</div>
        <div className="text-xl font-bold text-orange-600">
          {dataset.data.reduce((a, b) => a + b, 0).toFixed(0)}
        </div>
      </div>
      <div className="flex items-end space-x-1 h-24">
        {dataset.data.slice(-10).map((value, index) => {
          const height = (value / maxValue) * 100;
          return (
            <div
              key={index}
              className="bg-orange-500 w-4 rounded-t"
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${value.toFixed(0)}`}
            />
          );
        })}
      </div>
      <div className="text-xs text-gray-400 mt-2">Last 10 minutes</div>
    </div>
  );
};

// Mock Doughnut Chart
export const Doughnut: React.FC<ChartProps> = ({ data, options }) => {
  const dataset = data.datasets[0];
  const total = dataset.data.reduce((a, b) => a + b, 0);
  
  return (
    <div className="w-full h-full bg-gray-50 rounded-lg border flex flex-col items-center justify-center p-4">
      <div className="text-lg font-semibold text-gray-700 mb-4">Service Health</div>
      <div className="grid grid-cols-3 gap-4 w-full">
        {data.labels.map((label, index) => {
          const value = dataset.data[index];
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
          const colors = ['bg-green-500', 'bg-yellow-500', 'bg-red-500'];
          
          return (
            <div key={index} className="text-center">
              <div className={`${colors[index]} w-8 h-8 rounded-full mx-auto mb-2`} />
              <div className="text-sm font-medium text-gray-700">{label}</div>
              <div className="text-lg font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{percentage}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};