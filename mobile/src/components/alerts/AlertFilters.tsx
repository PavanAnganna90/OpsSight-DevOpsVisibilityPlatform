import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip, Searchbar, Menu, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface AlertFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSeverity: string[];
  onSeverityChange: (severity: string[]) => void;
  selectedStatus: string[];
  onStatusChange: (status: string[]) => void;
  selectedSource: string[];
  onSourceChange: (source: string[]) => void;
  availableSources: string[];
}

export const AlertFilters: React.FC<AlertFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedSeverity,
  onSeverityChange,
  selectedStatus,
  onStatusChange,
  selectedSource,
  onSourceChange,
  availableSources,
}) => {
  const [showSeverityMenu, setShowSeverityMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);

  const severityOptions = [
    { label: 'Critical', value: 'critical', color: '#D32F2F' },
    { label: 'High', value: 'high', color: '#F57C00' },
    { label: 'Medium', value: 'medium', color: '#FBC02D' },
    { label: 'Low', value: 'low', color: '#388E3C' },
  ];

  const statusOptions = [
    { label: 'Active', value: 'active', color: '#F44336' },
    { label: 'Acknowledged', value: 'acknowledged', color: '#FF9800' },
    { label: 'Resolved', value: 'resolved', color: '#4CAF50' },
  ];

  const toggleSeverity = (severity: string) => {
    if (selectedSeverity.includes(severity)) {
      onSeverityChange(selectedSeverity.filter(s => s !== severity));
    } else {
      onSeverityChange([...selectedSeverity, severity]);
    }
  };

  const toggleStatus = (status: string) => {
    if (selectedStatus.includes(status)) {
      onStatusChange(selectedStatus.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatus, status]);
    }
  };

  const toggleSource = (source: string) => {
    if (selectedSource.includes(source)) {
      onSourceChange(selectedSource.filter(s => s !== source));
    } else {
      onSourceChange([...selectedSource, source]);
    }
  };

  const clearAllFilters = () => {
    onSearchChange('');
    onSeverityChange([]);
    onStatusChange([]);
    onSourceChange([]);
  };

  const hasActiveFilters = searchQuery || selectedSeverity.length > 0 || selectedStatus.length > 0 || selectedSource.length > 0;

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search alerts..."
        onChangeText={onSearchChange}
        value={searchQuery}
        style={styles.searchbar}
        iconColor="#1976D2"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {/* Severity Filter */}
        <Menu
          visible={showSeverityMenu}
          onDismiss={() => setShowSeverityMenu(false)}
          anchor={
            <Chip
              mode={selectedSeverity.length > 0 ? 'flat' : 'outlined'}
              onPress={() => setShowSeverityMenu(true)}
              style={[styles.filterChip, selectedSeverity.length > 0 && styles.activeFilter]}
              textStyle={selectedSeverity.length > 0 ? styles.activeFilterText : undefined}
            >
              Severity {selectedSeverity.length > 0 && `(${selectedSeverity.length})`}
            </Chip>
          }
        >
          {severityOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => toggleSeverity(option.value)}
              title={option.label}
              leadingIcon={selectedSeverity.includes(option.value) ? 'check' : undefined}
            />
          ))}
        </Menu>

        {/* Status Filter */}
        <Menu
          visible={showStatusMenu}
          onDismiss={() => setShowStatusMenu(false)}
          anchor={
            <Chip
              mode={selectedStatus.length > 0 ? 'flat' : 'outlined'}
              onPress={() => setShowStatusMenu(true)}
              style={[styles.filterChip, selectedStatus.length > 0 && styles.activeFilter]}
              textStyle={selectedStatus.length > 0 ? styles.activeFilterText : undefined}
            >
              Status {selectedStatus.length > 0 && `(${selectedStatus.length})`}
            </Chip>
          }
        >
          {statusOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => toggleStatus(option.value)}
              title={option.label}
              leadingIcon={selectedStatus.includes(option.value) ? 'check' : undefined}
            />
          ))}
        </Menu>

        {/* Source Filter */}
        {availableSources.length > 0 && (
          <Menu
            visible={showSourceMenu}
            onDismiss={() => setShowSourceMenu(false)}
            anchor={
              <Chip
                mode={selectedSource.length > 0 ? 'flat' : 'outlined'}
                onPress={() => setShowSourceMenu(true)}
                style={[styles.filterChip, selectedSource.length > 0 && styles.activeFilter]}
                textStyle={selectedSource.length > 0 ? styles.activeFilterText : undefined}
              >
                Source {selectedSource.length > 0 && `(${selectedSource.length})`}
              </Chip>
            }
          >
            {availableSources.map((source) => (
              <Menu.Item
                key={source}
                onPress={() => toggleSource(source)}
                title={source}
                leadingIcon={selectedSource.includes(source) ? 'check' : undefined}
              />
            ))}
          </Menu>
        )}

        {hasActiveFilters && (
          <Button
            mode="text"
            onPress={clearAllFilters}
            style={styles.clearButton}
            labelStyle={styles.clearButtonText}
          >
            Clear All
          </Button>
        )}
      </ScrollView>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersScroll}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {selectedSeverity.map((severity) => (
            <Chip
              key={`severity-${severity}`}
              mode="flat"
              onClose={() => toggleSeverity(severity)}
              style={styles.activeFilterChip}
              textStyle={styles.activeFilterChipText}
            >
              {severity}
            </Chip>
          ))}
          {selectedStatus.map((status) => (
            <Chip
              key={`status-${status}`}
              mode="flat"
              onClose={() => toggleStatus(status)}
              style={styles.activeFilterChip}
              textStyle={styles.activeFilterChipText}
            >
              {status}
            </Chip>
          ))}
          {selectedSource.map((source) => (
            <Chip
              key={`source-${source}`}
              mode="flat"
              onClose={() => toggleSource(source)}
              style={styles.activeFilterChip}
              textStyle={styles.activeFilterChipText}
            >
              {source}
            </Chip>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchbar: {
    marginBottom: 12,
    elevation: 1,
  },
  filtersScroll: {
    marginBottom: 8,
  },
  filtersContent: {
    paddingRight: 16,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  activeFilter: {
    backgroundColor: '#E3F2FD',
  },
  activeFilterText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  clearButton: {
    marginLeft: 8,
  },
  clearButtonText: {
    color: '#F44336',
    fontSize: 12,
  },
  activeFiltersScroll: {
    marginTop: 4,
  },
  activeFiltersContent: {
    paddingRight: 16,
  },
  activeFilterChip: {
    marginRight: 6,
    backgroundColor: '#1976D2',
    height: 28,
  },
  activeFilterChipText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
});