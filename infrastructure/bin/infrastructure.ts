#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BasicBudgetInfrastructureStack } from '../lib/basic-budget-infrastructure-stack';
import { getEnvironmentConfig } from '../config/environments';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environmentName = app.node.tryGetContext('environment') || 'dev';
const config = getEnvironmentConfig(environmentName);

// Set account if not specified in config
if (!config.account) {
  config.account = process.env.CDK_DEFAULT_ACCOUNT;
}

new BasicBudgetInfrastructureStack(app, `BasicBudgetInfrastructure-${config.environment}`, {
  stackName: `basic-budget-infrastructure-${config.environment}`,
  config,
  env: {
    account: config.account,
    region: config.region,
  },
  description: `Basic Budget Infrastructure for ${config.environment} environment`,
});