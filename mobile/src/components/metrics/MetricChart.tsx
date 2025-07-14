import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Title, Text } from 'react-native-paper';
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryBar,
  VictoryAxis,
  VictoryTheme,
  VictoryTooltip,
  VictoryLabel,
} from 'victory-native';

const { width } = Dimensions.get('window');
const chartWidth = width - 64; // Account for card padding

interface DataPoint {
  x: string | number;
  y: number;
  label?: string;
}

interface MetricChartProps {
  title: string;
  data: DataPoint[];
  type: 'line' | 'area' | 'bar';
  color?: string;
  height?: number;
  showTooltip?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
  currentValue?: number;
  previousValue?: number;
  unit?: string;
}

export const MetricChart: React.FC<MetricChartProps> = ({
  title,
  data,
  type,
  color = '#1976D2',
  height = 200,
  showTooltip = true,
  yAxisLabel,
  xAxisLabel,
  currentValue,
  previousValue,
  unit = '',
}) => {
  const calculateTrend = () => {
    if (currentValue !== undefined && previousValue !== undefined && previousValue !== 0) {
      const change = ((currentValue - previousValue) / previousValue) * 100;
      return {
        value: Math.abs(change),
        direction: change >= 0 ? 'up' : 'down',
        color: change >= 0 ? '#4CAF50' : '#F44336',
      };
    }
    return null;
  };

  const trend = calculateTrend();

  const renderChart = () => {
    const commonProps = {
      data,
      width: chartWidth,
      height,
      theme: VictoryTheme.material,
      padding: { left: 60, top: 20, right: 40, bottom: 60 },
    };

    switch (type) {
      case 'area':
        return (
          <VictoryChart {...commonProps}>
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => `${t}${unit}`}
              style={{
                tickLabels: { fontSize: 12, fill: '#757575' },
                grid: { stroke: '#E0E0E0', strokeWidth: 0.5 },
              }}
            />
            <VictoryAxis
              style={{
                tickLabels: { fontSize: 12, fill: '#757575', angle: -45 },
                grid: { stroke: '#E0E0E0', strokeWidth: 0.5 },
              }}
            />
            <VictoryArea
              style={{
                data: {
                  fill: color,
                  fillOpacity: 0.3,
                  stroke: color,
                  strokeWidth: 2,
                },
              }}
              animate={{
                duration: 1000,
                onLoad: { duration: 500 },
              }}
              labelComponent={showTooltip ? <VictoryTooltip /> : undefined}
            />
          </VictoryChart>
        );

      case 'bar':
        return (
          <VictoryChart {...commonProps}>
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => `${t}${unit}`}
              style={{
                tickLabels: { fontSize: 12, fill: '#757575' },
                grid: { stroke: '#E0E0E0', strokeWidth: 0.5 },
              }}
            />
            <VictoryAxis
              style={{
                tickLabels: { fontSize: 12, fill: '#757575', angle: -45 },
              }}
            />
            <VictoryBar
              style={{
                data: { fill: color },
              }}
              animate={{
                duration: 1000,
                onLoad: { duration: 500 },
              }}
              labelComponent={showTooltip ? <VictoryTooltip /> : undefined}
            />
          </VictoryChart>
        );

      default: // line
        return (
          <VictoryChart {...commonProps}>
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => `${t}${unit}`}
              style={{
                tickLabels: { fontSize: 12, fill: '#757575' },
                grid: { stroke: '#E0E0E0', strokeWidth: 0.5 },
              }}
            />
            <VictoryAxis
              style={{
                tickLabels: { fontSize: 12, fill: '#757575', angle: -45 },
                grid: { stroke: '#E0E0E0', strokeWidth: 0.5 },
              }}
            />
            <VictoryLine
              style={{
                data: { stroke: color, strokeWidth: 3 },
              }}
              animate={{
                duration: 1000,
                onLoad: { duration: 500 },
              }}
              labelComponent={showTooltip ? <VictoryTooltip /> : undefined}
            />
          </VictoryChart>
        );
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Title style={styles.title}>{title}</Title>
            {currentValue !== undefined && (
              <Text style={styles.currentValue}>
                {currentValue.toLocaleString()}{unit}
              </Text>
            )}
          </View>
          {trend && (
            <View style={styles.trendContainer}>
              <Text style={[styles.trendValue, { color: trend.color }]}>
                {trend.direction === 'up' ? '↗' : '↘'} {trend.value.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chartContainer}>
          {renderChart()}
        </View>

        {(yAxisLabel || xAxisLabel) && (
          <View style={styles.labelsContainer}>
            {yAxisLabel && (
              <Text style={styles.axisLabel}>{yAxisLabel}</Text>
            )}
            {xAxisLabel && (
              <Text style={styles.axisLabel}>{xAxisLabel}</Text>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  trendContainer: {
    alignItems: 'flex-end',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  axisLabel: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
});