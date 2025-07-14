#!/usr/bin/env node

/**
 * Coverage Analysis Tool
 * 
 * Generates comprehensive test coverage reports and identifies coverage gaps.
 * Provides actionable insights for improving test coverage.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const COVERAGE_GOALS = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
};

const PRIORITY_AREAS = {
  'src/utils/': 'High - Core utilities used throughout the app',
  'src/components/ui/': 'High - Reusable UI components',
  'src/contexts/': 'High - Application state management',
  'src/hooks/': 'Medium - Custom React hooks',
  'src/components/': 'Medium - Application components',
  'src/pages/': 'Low - Page components (integration tests preferred)',
};

class CoverageAnalyzer {
  constructor() {
    this.coverageDir = path.join(__dirname, '..', 'coverage');
    this.reportPath = path.join(this.coverageDir, 'coverage-final.json');
    this.htmlReportPath = path.join(this.coverageDir, 'lcov-report', 'index.html');
  }

  /**
   * Run Jest with coverage and generate reports
   */
  async runCoverage() {
    console.log('🔍 Running test coverage analysis...\n');
    
    try {
      // Run Jest with coverage
      execSync('npm test -- --coverage --watchAll=false --passWithNoTests', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
    } catch (error) {
      // Coverage might fail thresholds but still generate reports
      console.log('⚠️  Coverage thresholds not met, but reports generated.\n');
    }
  }

  /**
   * Analyze coverage data and generate insights
   */
  analyzeCoverage() {
    if (!fs.existsSync(this.reportPath)) {
      console.error('❌ Coverage report not found. Run coverage first.');
      return;
    }

    const coverageData = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
    
    console.log('📊 COVERAGE ANALYSIS REPORT');
    console.log('=' .repeat(50));

    // Overall statistics
    const stats = this.calculateOverallStats(coverageData);
    this.printOverallStats(stats);

    // Priority area analysis
    this.analyzePriorityAreas(coverageData);

    // Identify coverage gaps
    this.identifyCoverageGaps(coverageData);

    // Generate recommendations
    this.generateRecommendations(coverageData);

    // Save summary for CI/CD tools
    this.saveCoverageSummary(stats);

    // Generate CI-friendly summary
    this.generateCISummary(coverageData);
  }

  /**
   * Calculate overall coverage statistics
   */
  calculateOverallStats(coverageData) {
    const files = Object.keys(coverageData);
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    files.forEach(file => {
      const data = coverageData[file];
      totalStatements += data.s ? Object.keys(data.s).length : 0;
      coveredStatements += data.s ? Object.values(data.s).filter(v => v > 0).length : 0;
      
      totalBranches += data.b ? Object.keys(data.b).length : 0;
      coveredBranches += data.b ? Object.values(data.b).flat().filter(v => v > 0).length : 0;
      
      totalFunctions += data.f ? Object.keys(data.f).length : 0;
      coveredFunctions += data.f ? Object.values(data.f).filter(v => v > 0).length : 0;
      
      totalLines += data.l ? Object.keys(data.l).length : 0;
      coveredLines += data.l ? Object.values(data.l).filter(v => v > 0).length : 0;
    });

    return {
      statements: totalStatements > 0 ? (coveredStatements / totalStatements * 100).toFixed(2) : 0,
      branches: totalBranches > 0 ? (coveredBranches / totalBranches * 100).toFixed(2) : 0,
      functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100).toFixed(2) : 0,
      lines: totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(2) : 0,
      fileCount: files.length,
    };
  }

  /**
   * Print overall statistics
   */
  printOverallStats(stats) {
    console.log('\n📈 OVERALL COVERAGE STATISTICS');
    console.log('-'.repeat(30));
    console.log(`Total Files Analyzed: ${stats.fileCount}`);
    console.log(`Statements: ${stats.statements}% ${this.getStatusEmoji(stats.statements)}`);
    console.log(`Branches: ${stats.branches}% ${this.getStatusEmoji(stats.branches)}`);
    console.log(`Functions: ${stats.functions}% ${this.getStatusEmoji(stats.functions)}`);
    console.log(`Lines: ${stats.lines}% ${this.getStatusEmoji(stats.lines)}`);
  }

  /**
   * Analyze coverage for priority areas
   */
  analyzePriorityAreas(coverageData) {
    console.log('\n🎯 PRIORITY AREA ANALYSIS');
    console.log('-'.repeat(30));

    Object.entries(PRIORITY_AREAS).forEach(([area, description]) => {
      const areaFiles = Object.keys(coverageData).filter(file => file.includes(area));
      
      if (areaFiles.length === 0) {
        console.log(`${area}: No files found`);
        return;
      }

      const areaStats = this.calculateAreaStats(coverageData, areaFiles);
      console.log(`\n${area} (${description})`);
      console.log(`  Files: ${areaFiles.length}`);
      console.log(`  Statements: ${areaStats.statements}% ${this.getStatusEmoji(areaStats.statements)}`);
      console.log(`  Functions: ${areaStats.functions}% ${this.getStatusEmoji(areaStats.functions)}`);
    });
  }

  /**
   * Calculate statistics for a specific area
   */
  calculateAreaStats(coverageData, files) {
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;

    files.forEach(file => {
      const data = coverageData[file];
      totalStatements += data.s ? Object.keys(data.s).length : 0;
      coveredStatements += data.s ? Object.values(data.s).filter(v => v > 0).length : 0;
      totalFunctions += data.f ? Object.keys(data.f).length : 0;
      coveredFunctions += data.f ? Object.values(data.f).filter(v => v > 0).length : 0;
    });

    return {
      statements: totalStatements > 0 ? (coveredStatements / totalStatements * 100).toFixed(2) : 0,
      functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100).toFixed(2) : 0,
    };
  }

  /**
   * Identify files with poor coverage
   */
  identifyCoverageGaps(coverageData) {
    console.log('\n🚨 COVERAGE GAPS (Files with <50% statement coverage)');
    console.log('-'.repeat(55));

    const gaps = [];
    
    Object.entries(coverageData).forEach(([file, data]) => {
      const statements = data.s || {};
      const total = Object.keys(statements).length;
      const covered = Object.values(statements).filter(v => v > 0).length;
      const percentage = total > 0 ? (covered / total * 100) : 0;

      if (percentage < 50 && total > 0) {
        gaps.push({
          file: file.replace(process.cwd(), '.'),
          percentage: percentage.toFixed(2),
          total,
          covered,
        });
      }
    });

    gaps.sort((a, b) => a.percentage - b.percentage);

    if (gaps.length === 0) {
      console.log('🎉 No files with critically low coverage found!');
    } else {
      gaps.slice(0, 10).forEach(gap => {
        console.log(`${gap.file}: ${gap.percentage}% (${gap.covered}/${gap.total})`);
      });
      
      if (gaps.length > 10) {
        console.log(`... and ${gaps.length - 10} more files`);
      }
    }
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(coverageData) {
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(20));

    const stats = this.calculateOverallStats(coverageData);
    
    if (stats.statements < 50) {
      console.log('🏗️  IMMEDIATE: Add basic unit tests for core utilities');
      console.log('   Priority: colors.ts, theme.ts, auth.ts');
    } else if (stats.statements < 70) {
      console.log('🧪 SHORT TERM: Expand component testing');
      console.log('   Focus: Button, StatusIndicator, UI components');
    } else if (stats.statements < 80) {
      console.log('🔍 MEDIUM TERM: Add integration and edge case tests');
    } else {
      console.log('✅ EXCELLENT: Maintain current coverage and add new features tests');
    }

    console.log('\n📁 SUGGESTED NEXT FILES TO TEST:');
    this.suggestFilesToTest(coverageData);

    console.log('\n📊 REPORTS GENERATED:');
    console.log(`HTML Report: ${this.htmlReportPath}`);
    console.log(`JSON Report: ${this.reportPath}`);
    console.log('\n💻 Run: open coverage/lcov-report/index.html');
  }

  /**
   * Suggest specific files that need testing
   */
  suggestFilesToTest(coverageData) {
    const untested = [];
    
    Object.entries(coverageData).forEach(([file, data]) => {
      const statements = data.s || {};
      const total = Object.keys(statements).length;
      const covered = Object.values(statements).filter(v => v > 0).length;
      const percentage = total > 0 ? (covered / total * 100) : 0;

      if (percentage === 0 && total > 5) { // Only suggest files with substantial code
        untested.push({
          file: file.replace(process.cwd(), '.'),
          lines: total,
        });
      }
    });

    untested
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 5)
      .forEach(item => {
        console.log(`   ${item.file} (${item.lines} lines)`);
      });
  }

  /**
   * Get status emoji based on coverage percentage
   */
  getStatusEmoji(percentage) {
    if (percentage >= 80) return '✅';
    if (percentage >= 60) return '⚠️';
    return '❌';
  }

  /**
   * Save coverage summary to JSON for CI/CD
   */
  saveCoverageSummary(stats) {
    const summary = {
      timestamp: new Date().toISOString(),
      overall: stats,
      passed: {
        statements: stats.statements >= COVERAGE_GOALS.statements,
        branches: stats.branches >= COVERAGE_GOALS.branches,
        functions: stats.functions >= COVERAGE_GOALS.functions,
        lines: stats.lines >= COVERAGE_GOALS.lines,
      },
    };

    const summaryPath = path.join(this.coverageDir, 'coverage-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Coverage summary saved: ${summaryPath}`);
  }

  /**
   * Generate CI-friendly analysis summary for GitHub Actions
   */
  generateCISummary(coverageData) {
    const stats = this.calculateOverallStats(coverageData);
    const reportsDir = './coverage-reports';
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Generate markdown summary for GitHub Actions
    const markdownSummary = `
## 🎯 Coverage Gap Analysis

**Files requiring immediate attention:**
${this.getCriticalGaps(coverageData)}

**Recommended next steps:**
${this.getRecommendationsText(stats)}

**Priority test areas:**
${this.getPriorityAreasText(coverageData)}
    `.trim();
    
    const summaryPath = path.join(reportsDir, 'analysis-summary.md');
    fs.writeFileSync(summaryPath, markdownSummary);
    console.log(`\n📄 CI summary saved: ${summaryPath}`);
  }

  /**
   * Get critical coverage gaps as formatted text
   */
  getCriticalGaps(coverageData) {
    const gaps = [];
    
    Object.entries(coverageData).forEach(([file, data]) => {
      const statements = data.s || {};
      const total = Object.keys(statements).length;
      const covered = Object.values(statements).filter(v => v > 0).length;
      const percentage = total > 0 ? (covered / total * 100) : 0;

      if (percentage < 50 && total > 0) {
        gaps.push({
          file: file.replace(process.cwd(), '.'),
          percentage: percentage.toFixed(1),
        });
      }
    });

    if (gaps.length === 0) {
      return '- ✅ No files with critically low coverage!';
    }

    return gaps
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 5)
      .map(gap => `- ❌ \`${gap.file}\`: ${gap.percentage}% coverage`)
      .join('\n');
  }

  /**
   * Get recommendations as formatted text
   */
  getRecommendationsText(stats) {
    if (stats.statements < 50) {
      return '- 🏗️ **IMMEDIATE**: Add basic unit tests for core utilities\n- 🎯 Focus on: colors.ts, theme.ts, auth.ts';
    } else if (stats.statements < 70) {
      return '- 🧪 **SHORT TERM**: Expand component testing\n- 🎯 Focus on: Button, StatusIndicator, UI components';
    } else if (stats.statements < 80) {
      return '- 🔍 **MEDIUM TERM**: Add integration and edge case tests\n- 🎯 Focus on: Complex workflows and error scenarios';
    } else {
      return '- ✅ **EXCELLENT**: Maintain current coverage and add tests for new features';
    }
  }

  /**
   * Get priority areas analysis as formatted text
   */
  getPriorityAreasText(coverageData) {
    const areas = [];
    
    Object.entries(PRIORITY_AREAS).forEach(([area, description]) => {
      const areaFiles = Object.keys(coverageData).filter(file => file.includes(area));
      
      if (areaFiles.length > 0) {
        const areaStats = this.calculateAreaStats(coverageData, areaFiles);
        const status = areaStats.statements >= 80 ? '✅' : 
                     areaStats.statements >= 60 ? '⚠️' : '❌';
        areas.push(`- ${status} **${area}**: ${areaStats.statements}% (${areaFiles.length} files)`);
      }
    });

    return areas.length > 0 ? areas.join('\n') : '- 📝 No priority areas analyzed yet';
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new CoverageAnalyzer();
  
  const command = process.argv[2];
  
  if (command === 'run') {
    analyzer.runCoverage().then(() => {
      analyzer.analyzeCoverage();
    });
  } else if (command === 'analyze') {
    analyzer.analyzeCoverage();
  } else {
    console.log('Usage: node coverage-analysis.js [run|analyze]');
    console.log('  run     - Run tests with coverage and analyze');
    console.log('  analyze - Analyze existing coverage data');
  }
}

module.exports = CoverageAnalyzer; 