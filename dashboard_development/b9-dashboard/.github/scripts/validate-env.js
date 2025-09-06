#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * 
 * This script validates that all required environment variables are set
 * and properly formatted for deployment.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Required environment variables with validation rules
const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    required: true,
    validate: (value) => {
      if (!value.startsWith('https://')) {
        return 'Must start with https://';
      }
      if (!value.includes('.supabase.co')) {
        return 'Must be a valid Supabase URL';
      }
      return null;
    }
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    required: true,
    validate: (value) => {
      if (value.length < 100) {
        return 'Supabase anonymous key seems too short';
      }
      if (!value.startsWith('eyJ')) {
        return 'Should be a valid JWT token';
      }
      return null;
    }
  },
  'VERCEL_TOKEN': {
    required: process.env.NODE_ENV === 'production',
    validate: (value) => {
      if (value && value.length < 20) {
        return 'Vercel token seems too short';
      }
      return null;
    }
  },
  'VERCEL_ORG_ID': {
    required: process.env.NODE_ENV === 'production',
    validate: (value) => {
      if (value && !/^team_[a-zA-Z0-9]+$/.test(value) && !/^[a-zA-Z0-9]+$/.test(value)) {
        return 'Should be a valid Vercel organization ID';
      }
      return null;
    }
  },
  'VERCEL_PROJECT_ID': {
    required: process.env.NODE_ENV === 'production',
    validate: (value) => {
      if (value && !/^prj_[a-zA-Z0-9]+$/.test(value)) {
        return 'Should be a valid Vercel project ID (starts with prj_)';
      }
      return null;
    }
  }
};

// Optional environment variables
const optionalVars = {
  'DASHBOARD_REFRESH_INTERVAL': {
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1000) {
        return 'Should be a number >= 1000 (milliseconds)';
      }
      return null;
    },
    default: '30000'
  },
  'ENABLE_NOTIFICATIONS': {
    validate: (value) => {
      if (!['true', 'false'].includes(value.toLowerCase())) {
        return 'Should be "true" or "false"';
      }
      return null;
    },
    default: 'false'
  },
  'NODE_ENV': {
    validate: (value) => {
      if (!['development', 'production', 'test'].includes(value)) {
        return 'Should be "development", "production", or "test"';
      }
      return null;
    },
    default: 'development'
  }
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function validateEnvironmentVariables() {
  log('🔍 Validating environment variables...', 'bold');
  console.log();

  let hasErrors = false;
  let hasWarnings = false;

  // Check required variables
  log('Required Variables:', 'bold');
  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    
    if (!value) {
      if (config.required) {
        logError(`${varName} is required but not set`);
        hasErrors = true;
      } else {
        logWarning(`${varName} is not set (optional in this environment)`);
        hasWarnings = true;
      }
      continue;
    }

    if (config.validate) {
      const error = config.validate(value);
      if (error) {
        logError(`${varName}: ${error}`);
        hasErrors = true;
        continue;
      }
    }

    logSuccess(`${varName} is valid`);
  }

  console.log();
  log('Optional Variables:', 'bold');
  
  // Check optional variables
  for (const [varName, config] of Object.entries(optionalVars)) {
    const value = process.env[varName];
    
    if (!value) {
      if (config.default) {
        logInfo(`${varName} not set, using default: ${config.default}`);
      } else {
        logInfo(`${varName} not set (optional)`);
      }
      continue;
    }

    if (config.validate) {
      const error = config.validate(value);
      if (error) {
        logWarning(`${varName}: ${error}`);
        hasWarnings = true;
        continue;
      }
    }

    logSuccess(`${varName} is valid`);
  }

  return { hasErrors, hasWarnings };
}

function checkEnvironmentFiles() {
  log('\n📁 Checking environment files...', 'bold');
  
  const files = ['.env.local', '.env.example', 'env.example'];
  const projectRoot = process.cwd();
  
  for (const file of files) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`${file} exists`);
    } else {
      if (file === 'env.example' || file === '.env.example') {
        logInfo(`${file} not found (optional)`);
      } else {
        logWarning(`${file} not found`);
      }
    }
  }
}

function generateEnvironmentReport() {
  log('\n📊 Environment Report:', 'bold');
  console.log();
  
  const report = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'development',
    variables: {}
  };

  // Add non-sensitive environment variables to report
  for (const varName of Object.keys({ ...requiredVars, ...optionalVars })) {
    const value = process.env[varName];
    if (value) {
      // Mask sensitive values
      if (varName.includes('KEY') || varName.includes('TOKEN') || varName.includes('SECRET')) {
        report.variables[varName] = value.substring(0, 8) + '...';
      } else {
        report.variables[varName] = value;
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

function main() {
  log('🚀 B9 Dashboard Environment Validation', 'bold');
  log('=====================================', 'blue');

  const { hasErrors, hasWarnings } = validateEnvironmentVariables();
  checkEnvironmentFiles();
  
  if (process.argv.includes('--report')) {
    generateEnvironmentReport();
  }

  console.log();
  log('Summary:', 'bold');
  
  if (hasErrors) {
    logError('Environment validation failed! Please fix the errors above.');
    process.exit(1);
  } else if (hasWarnings) {
    logWarning('Environment validation completed with warnings.');
    logInfo('The application should work, but please review the warnings above.');
  } else {
    logSuccess('All environment variables are valid!');
  }

  log('\n💡 Tips:', 'bold');
  log('- Use .env.local for local development secrets');
  log('- Add new environment variables to both env.example and this validation script');
  log('- Never commit actual secrets to version control');
  log('- Verify environment variables in Vercel dashboard before deploying');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironmentVariables,
  requiredVars,
  optionalVars
};