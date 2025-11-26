#!/usr/bin/env node
import 'source-map-support/register.js'
import * as cdk from 'aws-cdk-lib'
import { StorageStack } from '../lib/stacks/storage-stack.js'
import { ApiStack } from '../lib/stacks/api-stack.js'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
}

const storageStack = new StorageStack(app, 'BasicBudgetStorage', {
  env,
  description: 'Basic Budget - DynamoDB tables',
})

new ApiStack(app, 'BasicBudgetApi', {
  env,
  description: 'Basic Budget - API Gateway and Lambda',
  tables: storageStack.tables,
})
