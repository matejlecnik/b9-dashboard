import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { promises as fs } from 'fs';
import path from 'path';

interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  successRate: number;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
  metrics: TestMetrics;
}

interface PerformanceMetric {
  testName: string;
  duration: number;
  browser: string;
  status: string;
}

export class CustomTestReporter implements Reporter {
  private startTime: number = 0;
  private testSuites: Map<string, TestSuite> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private failures: Array<{ test: TestCase; result: TestResult }> = [];
  private outputDir: string = 'test-reports';

  onBegin() {
    this.startTime = Date.now();
    console.log('🧪 Starting comprehensive test suite...');
  }

  onTestBegin(test: TestCase) {
    const suiteName = test.parent.title || 'Unknown Suite';
    
    if (!this.testSuites.has(suiteName)) {
      this.testSuites.set(suiteName, {
        name: suiteName,
        tests: [],
        metrics: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          duration: 0,
          successRate: 0
        }
      });
    }
    
    const suite = this.testSuites.get(suiteName)!;
    suite.tests.push(test);
    suite.metrics.totalTests++;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const suiteName = test.parent.title || 'Unknown Suite';
    const suite = this.testSuites.get(suiteName)!;
    
    suite.metrics.duration += result.duration;
    
    switch (result.status) {
      case 'passed':
        suite.metrics.passedTests++;
        break;
      case 'failed':
        suite.metrics.failedTests++;
        this.failures.push({ test, result });
        break;
      case 'skipped':
        suite.metrics.skippedTests++;
        break;
    }
    
    suite.metrics.successRate = (suite.metrics.passedTests / suite.metrics.totalTests) * 100;
    
    // Collect performance metrics
    const browser = test.parent.project()?.name || 'unknown';
    this.performanceMetrics.push({
      testName: test.title,
      duration: result.duration,
      browser,
      status: result.status
    });
    
    // Log test completion
    const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    console.log(`${statusIcon} ${test.title} (${result.duration}ms)`);
  }

  async onEnd(result: FullResult) {
    const totalDuration = Date.now() - this.startTime;
    
    await this.ensureOutputDirectory();
    
    // Generate comprehensive reports
    await Promise.all([
      this.generateSummaryReport(result, totalDuration),
      this.generatePerformanceReport(),
      this.generateFailureAnalysisReport(),
      this.generateJSONReport(result, totalDuration),
      this.generateMarkdownReport(result, totalDuration)
    ]);
    
    // Log final summary
    this.logFinalSummary(result, totalDuration);
  }

  private async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create output directory:', error);
    }
  }

  private async generateSummaryReport(result: FullResult, totalDuration: number) {
    const summary = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      status: result.status,
      testSuites: Array.from(this.testSuites.values()).map(suite => ({
        name: suite.name,
        totalTests: suite.metrics.totalTests,
        passed: suite.metrics.passedTests,
        failed: suite.metrics.failedTests,
        skipped: suite.metrics.skippedTests,
        successRate: Math.round(suite.metrics.successRate * 100) / 100,
        duration: suite.metrics.duration
      })),
      overallMetrics: {
        totalTests: Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.totalTests, 0),
        totalPassed: Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.passedTests, 0),
        totalFailed: Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.failedTests, 0),
        totalSkipped: Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.skippedTests, 0),
        overallSuccessRate: this.calculateOverallSuccessRate()
      }
    };

    await this.writeJsonFile('test-summary.json', summary);
  }

  private async generatePerformanceReport() {
    const performanceReport = {
      timestamp: new Date().toISOString(),
      metrics: this.performanceMetrics,
      analysis: {
        slowestTests: this.performanceMetrics
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 10),
        fastestTests: this.performanceMetrics
          .sort((a, b) => a.duration - b.duration)
          .slice(0, 10),
        averageDuration: this.calculateAverageDuration(),
        browserComparison: this.generateBrowserComparison(),
        performanceThresholds: this.checkPerformanceThresholds()
      }
    };

    await this.writeJsonFile('performance-report.json', performanceReport);
  }

  private async generateFailureAnalysisReport() {
    if (this.failures.length === 0) {
      await this.writeJsonFile('failure-analysis.json', { 
        message: 'No failures detected! 🎉',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const failureAnalysis = {
      timestamp: new Date().toISOString(),
      totalFailures: this.failures.length,
      failures: this.failures.map(({ test, result }) => ({
        testName: test.title,
        suiteName: test.parent.title,
        browser: test.parent.project()?.name,
        duration: result.duration,
        error: result.error?.message,
        stackTrace: result.error?.stack,
        screenshots: result.attachments
          ?.filter(att => att.name === 'screenshot')
          .map(att => att.path),
        videos: result.attachments
          ?.filter(att => att.name === 'video')
          .map(att => att.path)
      })),
      patterns: this.analyzeFailurePatterns(),
      recommendations: this.generateFailureRecommendations()
    };

    await this.writeJsonFile('failure-analysis.json', failureAnalysis);
  }

  private async generateJSONReport(result: FullResult, totalDuration: number) {
    const jsonReport = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        status: result.status,
        environment: {
          ci: process.env.CI === 'true',
          node: process.version,
          os: process.platform
        }
      },
      summary: {
        total: Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.totalTests, 0),
        passed: Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.passedTests, 0),
        failed: Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.failedTests, 0),
        skipped: Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.skippedTests, 0),
        successRate: this.calculateOverallSuccessRate()
      },
      suites: Array.from(this.testSuites.values()),
      performance: this.performanceMetrics,
      failures: this.failures.length > 0 ? this.failures : null
    };

    await this.writeJsonFile('detailed-results.json', jsonReport);
  }

  private async generateMarkdownReport(result: FullResult, totalDuration: number) {
    const overallSuccessRate = this.calculateOverallSuccessRate();
    const totalTests = Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.totalTests, 0);
    const passedTests = Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.passedTests, 0);
    const failedTests = Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.failedTests, 0);

    const markdown = `# Test Results Report

## 📊 Summary

- **Total Tests**: ${totalTests}
- **Passed**: ${passedTests} ✅
- **Failed**: ${failedTests} ❌
- **Success Rate**: ${overallSuccessRate.toFixed(2)}%
- **Duration**: ${(totalDuration / 1000).toFixed(2)}s
- **Timestamp**: ${new Date().toISOString()}

## 🎯 Test Suites

${Array.from(this.testSuites.values()).map(suite => `
### ${suite.name}

- **Tests**: ${suite.metrics.totalTests}
- **Passed**: ${suite.metrics.passedTests}
- **Failed**: ${suite.metrics.failedTests}
- **Success Rate**: ${suite.metrics.successRate.toFixed(2)}%
- **Duration**: ${(suite.metrics.duration / 1000).toFixed(2)}s
`).join('')}

## ⚡ Performance Metrics

### Slowest Tests
${this.performanceMetrics
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 5)
  .map(test => `- ${test.testName}: ${test.duration}ms (${test.browser})`)
  .join('\n')}

### Average Duration
- ${this.calculateAverageDuration().toFixed(0)}ms

${failedTests > 0 ? `
## ❌ Failures

${this.failures.map(({ test, result }) => `
### ${test.title}
- **Suite**: ${test.parent.title}
- **Error**: ${result.error?.message || 'Unknown error'}
- **Duration**: ${result.duration}ms
`).join('')}
` : '## 🎉 All Tests Passed!'}

## 🔍 Recommendations

${this.generateMarkdownRecommendations()}

---
*Report generated on ${new Date().toISOString()}*
`;

    await this.writeFile('test-report.md', markdown);
  }

  private calculateOverallSuccessRate(): number {
    const totalTests = Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.totalTests, 0);
    const passedTests = Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.passedTests, 0);
    return totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  }

  private calculateAverageDuration(): number {
    if (this.performanceMetrics.length === 0) return 0;
    const totalDuration = this.performanceMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalDuration / this.performanceMetrics.length;
  }

  private generateBrowserComparison() {
    const browserStats = new Map<string, { total: number; passed: number; avgDuration: number }>();
    
    this.performanceMetrics.forEach(metric => {
      if (!browserStats.has(metric.browser)) {
        browserStats.set(metric.browser, { total: 0, passed: 0, avgDuration: 0 });
      }
      
      const stats = browserStats.get(metric.browser)!;
      stats.total++;
      if (metric.status === 'passed') stats.passed++;
      stats.avgDuration += metric.duration;
    });
    
    const comparison: Record<string, any> = {};
    browserStats.forEach((stats, browser) => {
      comparison[browser] = {
        successRate: (stats.passed / stats.total) * 100,
        averageDuration: stats.avgDuration / stats.total,
        totalTests: stats.total
      };
    });
    
    return comparison;
  }

  private checkPerformanceThresholds() {
    const thresholds = {
      pageLoad: 3000,
      interaction: 100,
      api: 1500
    };
    
    const violations = this.performanceMetrics
      .filter(metric => {
        if (metric.testName.includes('load') && metric.duration > thresholds.pageLoad) return true;
        if (metric.testName.includes('interaction') && metric.duration > thresholds.interaction) return true;
        if (metric.testName.includes('api') && metric.duration > thresholds.api) return true;
        return false;
      });
    
    return {
      thresholds,
      violations: violations.length,
      violatingTests: violations.map(v => ({ name: v.testName, duration: v.duration }))
    };
  }

  private analyzeFailurePatterns() {
    const patterns: Record<string, number> = {};
    
    this.failures.forEach(({ result }) => {
      const errorMessage = result.error?.message || 'Unknown error';
      const errorType = this.categorizeError(errorMessage);
      patterns[errorType] = (patterns[errorType] || 0) + 1;
    });
    
    return patterns;
  }

  private categorizeError(errorMessage: string): string {
    if (errorMessage.includes('timeout')) return 'Timeout';
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) return 'Network';
    if (errorMessage.includes('element not found') || errorMessage.includes('locator')) return 'Element Not Found';
    if (errorMessage.includes('expect')) return 'Assertion Failure';
    if (errorMessage.includes('navigation')) return 'Navigation Error';
    return 'Other';
  }

  private generateFailureRecommendations(): string[] {
    const recommendations: string[] = [];
    const patterns = this.analyzeFailurePatterns();
    
    if (patterns['Timeout']) {
      recommendations.push('Consider increasing timeout values or optimizing page load performance');
    }
    
    if (patterns['Network']) {
      recommendations.push('Check network stability and API endpoint availability');
    }
    
    if (patterns['Element Not Found']) {
      recommendations.push('Review element selectors and ensure they are stable across test runs');
    }
    
    if (patterns['Assertion Failure']) {
      recommendations.push('Review test expectations and ensure they match actual application behavior');
    }
    
    if (this.calculateAverageDuration() > 2000) {
      recommendations.push('Consider optimizing test performance - average duration is above 2 seconds');
    }
    
    return recommendations;
  }

  private generateMarkdownRecommendations(): string {
    const recommendations = this.generateFailureRecommendations();
    
    if (recommendations.length === 0) {
      return '✨ All tests are performing well! No specific recommendations at this time.';
    }
    
    return recommendations.map(rec => `- ${rec}`).join('\n');
  }

  private logFinalSummary(result: FullResult, totalDuration: number) {
    const overallSuccessRate = this.calculateOverallSuccessRate();
    const totalTests = Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.totalTests, 0);
    const passedTests = Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.passedTests, 0);
    const failedTests = Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.metrics.failedTests, 0);

    console.log('\n' + '='.repeat(50));
    console.log('🧪 TEST SUITE COMPLETE');
    console.log('='.repeat(50));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${overallSuccessRate.toFixed(2)}%`);
    console.log(`⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`📁 Reports saved to: ${this.outputDir}/`);
    
    if (overallSuccessRate === 100) {
      console.log('🎉 All tests passed! Excellent work!');
    } else if (overallSuccessRate >= 90) {
      console.log('🎯 Great job! Most tests passed.');
    } else if (overallSuccessRate >= 75) {
      console.log('⚠️  Some issues detected. Review failed tests.');
    } else {
      console.log('🚨 Many tests failed. Immediate attention required.');
    }
    
    console.log('='.repeat(50) + '\n');
  }

  private async writeJsonFile(filename: string, data: any) {
    await this.writeFile(filename, JSON.stringify(data, null, 2));
  }

  private async writeFile(filename: string, content: string) {
    try {
      await fs.writeFile(path.join(this.outputDir, filename), content, 'utf8');
    } catch (error) {
      console.warn(`Could not write ${filename}:`, error);
    }
  }
}