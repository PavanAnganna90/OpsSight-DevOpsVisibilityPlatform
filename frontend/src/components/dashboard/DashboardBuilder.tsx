/**
 * OpsSight Custom Dashboard Builder - React Component
 * Drag-and-drop dashboard builder with real-time widgets and customizable layouts
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Plus, 
  Settings, 
  Eye, 
  Grid3X3, 
  BarChart3, 
  LineChart, 
  PieChart, 
  Gauge,
  AlertTriangle,
  Server,
  Activity,
  Clock,
  Download,
  Share,
  Trash2,
  Copy
} from 'lucide-react';

// Types
interface Widget {
  id: string;
  type: string;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, any>;
  dataSource: {
    type: string;
    query: Record<string, any>;
    refreshInterval: number;
  };
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  layout: {
    mode: string;
    columns: number;
  };
  theme: string;
}

// Widget Types Configuration
const WIDGET_TYPES = [
  {
    type: 'metric_card',
    name: 'Metric Card', 
    icon: Activity,
    description: 'Display a single metric value with trend',
    category: 'metrics',
    defaultSize: { width: 3, height: 2 }
  },
  {
    type: 'line_chart',
    name: 'Line Chart',
    icon: LineChart,
    description: 'Display metrics as a time series line chart',
    category: 'charts',
    defaultSize: { width: 6, height: 4 }
  },
  {
    type: 'bar_chart',
    name: 'Bar Chart',
    icon: BarChart3,
    description: 'Display metrics as bar chart',
    category: 'charts', 
    defaultSize: { width: 6, height: 4 }
  },
  {
    type: 'pie_chart',
    name: 'Pie Chart',
    icon: PieChart,
    description: 'Display proportional data as pie chart',
    category: 'charts',
    defaultSize: { width: 4, height: 4 }
  },
  {
    type: 'gauge',
    name: 'Gauge',
    icon: Gauge,
    description: 'Display metric as gauge/speedometer',
    category: 'metrics',
    defaultSize: { width: 3, height: 3 }
  },
  {
    type: 'alert_list',
    name: 'Alert List',
    icon: AlertTriangle,
    description: 'Display recent alerts and notifications',
    category: 'alerts',
    defaultSize: { width: 4, height: 6 }
  },
  {
    type: 'service_status',
    name: 'Service Status', 
    icon: Server,
    description: 'Display service health status',
    category: 'services',
    defaultSize: { width: 6, height: 3 }
  },
  {
    type: 'timeline',
    name: 'Timeline',
    icon: Clock,
    description: 'Display events in chronological order',
    category: 'events',
    defaultSize: { width: 8, height: 4 }
  }
];

// Widget Library Panel
const WidgetLibrary: React.FC<{
  onAddWidget: (widgetType: any) => void;
}> = ({ onAddWidget }) => {
  const categories = [...new Set(WIDGET_TYPES.map(w => w.category))];

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Widget Library</h3>
      
      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        
        {categories.map(category => (
          <TabsContent key={category} value={category} className="space-y-2">
            {WIDGET_TYPES.filter(w => w.category === category).map(widget => {
              const IconComponent = widget.icon;
              return (
                <Card 
                  key={widget.type}
                  className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onAddWidget(widget)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        {widget.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {widget.description}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {widget.category}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Widget Configuration Panel
const WidgetConfigPanel: React.FC<{
  widget: Widget | null;
  onUpdateWidget: (widget: Widget) => void;
  onClose: () => void;
}> = ({ widget, onUpdateWidget, onClose }) => {
  const [config, setConfig] = useState(widget?.config || {});
  const [dataSource, setDataSource] = useState(widget?.dataSource || {
    type: 'metrics',
    query: {},
    refreshInterval: 300
  });

  useEffect(() => {
    if (widget) {
      setConfig(widget.config);
      setDataSource(widget.dataSource);
    }
  }, [widget]);

  const handleSave = () => {
    if (widget) {
      onUpdateWidget({
        ...widget,
        config,
        dataSource
      });
    }
    onClose();
  };

  if (!widget) return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Widget Settings</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      <div className="space-y-4">
        {/* Basic Settings */}
        <div>
          <Label htmlFor="widget-title">Title</Label>
          <Input
            id="widget-title"
            value={widget.title}
            onChange={(e) => onUpdateWidget({
              ...widget,
              title: e.target.value
            })}
            className="mt-1"
          />
        </div>

        {/* Data Source Configuration */}
        <div>
          <Label>Data Source</Label>
          <Select
            value={dataSource.type}
            onValueChange={(value) => setDataSource({
              ...dataSource,
              type: value
            })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="metrics">Metrics</SelectItem>
              <SelectItem value="alerts">Alerts</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Refresh Interval */}
        <div>
          <Label>Refresh Interval (seconds)</Label>
          <Input
            type="number"
            value={dataSource.refreshInterval}
            onChange={(e) => setDataSource({
              ...dataSource,
              refreshInterval: parseInt(e.target.value)
            })}
            className="mt-1"
          />
        </div>

        {/* Widget-specific Configuration */}
        {widget.type === 'metric_card' && (
          <div className="space-y-3">
            <div>
              <Label>Format</Label>
              <Select
                value={config.format || 'number'}
                onValueChange={(value) => setConfig({
                  ...config,
                  format: value
                })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="bytes">Bytes</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {(widget.type === 'line_chart' || widget.type === 'bar_chart') && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-legend"
                checked={config.show_legend !== false}
                onChange={(e) => setConfig({
                  ...config,
                  show_legend: e.target.checked
                })}
              />
              <Label htmlFor="show-legend">Show Legend</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-grid"
                checked={config.show_grid !== false}
                onChange={(e) => setConfig({
                  ...config,
                  show_grid: e.target.checked
                })}
              />
              <Label htmlFor="show-grid">Show Grid</Label>
            </div>
          </div>
        )}

        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// Dashboard Canvas
const DashboardCanvas: React.FC<{
  widgets: Widget[];
  onUpdateWidget: (widget: Widget) => void;
  onDeleteWidget: (widgetId: string) => void;
  onSelectWidget: (widget: Widget) => void;
  selectedWidget: Widget | null;
}> = ({ widgets, onUpdateWidget, onDeleteWidget, onSelectWidget, selectedWidget }) => {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedWidget(null);
    // In a real implementation, you'd calculate new position based on drop coordinates
  };

  return (
    <div 
      className="flex-1 bg-gray-50 p-6 overflow-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="grid grid-cols-12 gap-4 min-h-screen">
        <div className="col-span-12 space-y-4">
          {widgets.map((widget, index) => (
            <div
              key={widget.id}
              draggable
              onDragStart={(e) => handleDragStart(e, widget.id)}
              className={`
                col-span-${widget.position.width}
                cursor-move
                ${draggedWidget === widget.id ? 'opacity-50' : ''}
                ${selectedWidget?.id === widget.id ? 'ring-2 ring-blue-500' : ''}
                transition-all duration-200
              `}
              onClick={() => onSelectWidget(widget)}
            >
              <WidgetPreview 
                widget={widget}
                onDelete={() => onDeleteWidget(widget.id)}
              />
            </div>
          ))}
          
          {widgets.length === 0 && (
            <div className="col-span-12 flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Empty Dashboard
                </h3>
                <p className="text-gray-500">
                  Click widgets from the library to start building your dashboard
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Widget Preview Component
const WidgetPreview: React.FC<{
  widget: Widget;
  onDelete: () => void;
}> = ({ widget, onDelete }) => {
  const widgetType = WIDGET_TYPES.find(w => w.type === widget.type);
  const IconComponent = widgetType?.icon || Activity;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-2 mb-3">
        <IconComponent className="h-4 w-4 text-blue-600" />
        <h4 className="font-medium text-sm">{widget.title}</h4>
      </div>
      
      <div className="bg-gray-100 rounded p-4 h-24 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <IconComponent className="h-6 w-6 mx-auto mb-1" />
          <p className="text-xs">{widgetType?.name} Preview</p>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Data: {widget.dataSource.type} • Refresh: {widget.dataSource.refreshInterval}s
      </div>
    </Card>
  );
};

// Main Dashboard Builder Component
export const DashboardBuilder: React.FC = () => {
  const [dashboard, setDashboard] = useState<Dashboard>({
    id: '',
    name: 'New Dashboard',
    description: '',
    widgets: [],
    layout: { mode: 'grid', columns: 12 },
    theme: 'light'
  });
  
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const addWidget = useCallback((widgetType: any) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: widgetType.type,
      title: `New ${widgetType.name}`,
      position: {
        x: 0,
        y: dashboard.widgets.length * 2,
        width: widgetType.defaultSize.width,
        height: widgetType.defaultSize.height
      },
      config: {},
      dataSource: {
        type: 'metrics',
        query: {},
        refreshInterval: 300
      }
    };

    setDashboard(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));
  }, [dashboard.widgets.length]);

  const updateWidget = useCallback((updatedWidget: Widget) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === updatedWidget.id ? updatedWidget : w
      )
    }));
  }, []);

  const deleteWidget = useCallback((widgetId: string) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId)
    }));
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }
  }, [selectedWidget]);

  const saveDashboard = async () => {
    try {
      // In a real app, this would make an API call
      console.log('Saving dashboard:', dashboard);
      setShowSaveDialog(false);
      // Show success message
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Dashboard Builder
            </h1>
            <Badge variant="outline">{dashboard.widgets.length} widgets</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {!isPreviewMode && (
          <WidgetLibrary onAddWidget={addWidget} />
        )}
        
        <DashboardCanvas
          widgets={dashboard.widgets}
          onUpdateWidget={updateWidget}
          onDeleteWidget={deleteWidget}
          onSelectWidget={setSelectedWidget}
          selectedWidget={selectedWidget}
        />
        
        {!isPreviewMode && selectedWidget && (
          <WidgetConfigPanel
            widget={selectedWidget}
            onUpdateWidget={updateWidget}
            onClose={() => setSelectedWidget(null)}
          />
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Dashboard</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="dashboard-name">Dashboard Name</Label>
              <Input
                id="dashboard-name"
                value={dashboard.name}
                onChange={(e) => setDashboard(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="dashboard-description">Description</Label>
              <Input
                id="dashboard-description"
                value={dashboard.description}
                onChange={(e) => setDashboard(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveDashboard}>
                Save Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardBuilder;