export interface EnvironmentConfig {
  environment: string;
  account?: string;
  region: string;
  domainName?: string;
  certificateArn?: string;
  database: {
    minCapacity: number;
    maxCapacity: number;
    enableDataAPI: boolean;
  };
  lambda: {
    timeout: number;
    memorySize: number;
  };
  monitoring: {
    enableDetailedMonitoring: boolean;
    logRetentionDays: number;
  };
  tags: Record<string, string>;
}

export const environments: Record<string, EnvironmentConfig> = {
  dev: {
    environment: 'dev',
    region: 'us-east-1',
    database: {
      minCapacity: 0.5,
      maxCapacity: 2,
      enableDataAPI: true,
    },
    lambda: {
      timeout: 30,
      memorySize: 512,
    },
    monitoring: {
      enableDetailedMonitoring: false,
      logRetentionDays: 7,
    },
    tags: {
      Environment: 'development',
      Project: 'basic-budget',
      CostCenter: 'development',
    },
  },
  staging: {
    environment: 'staging',
    region: 'us-east-1',
    database: {
      minCapacity: 0.5,
      maxCapacity: 4,
      enableDataAPI: true,
    },
    lambda: {
      timeout: 60,
      memorySize: 1024,
    },
    monitoring: {
      enableDetailedMonitoring: true,
      logRetentionDays: 14,
    },
    tags: {
      Environment: 'staging',
      Project: 'basic-budget',
      CostCenter: 'staging',
    },
  },
  prod: {
    environment: 'prod',
    region: 'us-east-1',
    // domainName: 'basic-budget.com', // Uncomment and set your domain
    // certificateArn: 'arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID', // Uncomment and set your certificate ARN
    database: {
      minCapacity: 1,
      maxCapacity: 16,
      enableDataAPI: true,
    },
    lambda: {
      timeout: 60,
      memorySize: 1024,
    },
    monitoring: {
      enableDetailedMonitoring: true,
      logRetentionDays: 30,
    },
    tags: {
      Environment: 'production',
      Project: 'basic-budget',
      CostCenter: 'production',
    },
  },
};

export function getEnvironmentConfig(environmentName: string): EnvironmentConfig {
  const config = environments[environmentName];
  if (!config) {
    throw new Error(`Environment ${environmentName} not found`);
  }
  return config;
}