import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';

export interface DatabaseStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: rds.DatabaseCluster;
  public readonly secret: secretsmanager.Secret;
  public readonly proxy: rds.DatabaseProxy;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config } = props;

    // VPC for the database and Lambda functions
    this.vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: `basic-budget-vpc-${config.environment}`,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      natGateways: config.environment === 'prod' ? 2 : 1,
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Database credentials secret
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: `basic-budget-db-${config.environment}`,
      description: 'Database credentials for Basic Budget',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'postgres',
          dbname: 'basic_budget',
        }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\ \'',
        passwordLength: 32,
      },
    });

    // Security group for Aurora cluster
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Aurora PostgreSQL cluster',
      allowAllOutbound: false,
    });

    // Security group for Lambda functions
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // Security group for RDS Proxy
    const proxySecurityGroup = new ec2.SecurityGroup(this, 'ProxySecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS Proxy',
      allowAllOutbound: true,
    });

    // Allow Lambda to connect to RDS Proxy
    proxySecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Lambda to RDS Proxy'
    );

    // Allow RDS Proxy to connect to Aurora
    dbSecurityGroup.addIngressRule(
      proxySecurityGroup,
      ec2.Port.tcp(5432),
      'RDS Proxy to Aurora'
    );

    // Subnet group for Aurora
    const subnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      description: 'Subnet group for Aurora PostgreSQL',
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // Aurora Serverless v2 cluster
    this.cluster = new rds.DatabaseCluster(this, 'Database', {
      clusterIdentifier: `basic-budget-${config.environment}`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      serverlessV2MinCapacity: config.database.minCapacity,
      serverlessV2MaxCapacity: config.database.maxCapacity,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: false,
        enablePerformanceInsights: config.monitoring.enableDetailedMonitoring,
        performanceInsightRetention: config.monitoring.enableDetailedMonitoring
          ? rds.PerformanceInsightRetention.DEFAULT
          : undefined,
      }),
      readers: config.environment === 'prod' ? [
        rds.ClusterInstance.serverlessV2('reader', {
          scaleWithWriter: true,
          publiclyAccessible: false,
          enablePerformanceInsights: config.monitoring.enableDetailedMonitoring,
        }),
      ] : undefined,
      credentials: rds.Credentials.fromSecret(this.secret),
      vpc: this.vpc,
      securityGroups: [dbSecurityGroup],
      subnetGroup,
      defaultDatabaseName: 'basic_budget',
      backup: {
        retention: config.environment === 'prod' ? cdk.Duration.days(7) : cdk.Duration.days(1),
        preferredWindow: '03:00-04:00',
      },
      preferredMaintenanceWindow: 'Sun:04:00-Sun:05:00',
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: config.monitoring.logRetentionDays,
      deletionProtection: config.environment === 'prod',
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.SNAPSHOT : cdk.RemovalPolicy.DESTROY,
      storageEncrypted: true,
      monitoringInterval: config.monitoring.enableDetailedMonitoring ? cdk.Duration.seconds(60) : undefined,
    });

    // Enable Data API if configured
    if (config.database.enableDataAPI) {
      (this.cluster.node.defaultChild as rds.CfnDBCluster).enableHttpEndpoint = true;
    }

    // IAM role for RDS Proxy
    const proxyRole = new iam.Role(this, 'ProxyRole', {
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
      inlinePolicies: {
        SecretsManagerPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
              ],
              resources: [this.secret.secretArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'kms:Decrypt',
              ],
              resources: ['*'],
              conditions: {
                StringEquals: {
                  'kms:ViaService': `secretsmanager.${cdk.Aws.REGION}.amazonaws.com`,
                },
              },
            }),
          ],
        }),
      },
    });

    // RDS Proxy for connection pooling
    this.proxy = new rds.DatabaseProxy(this, 'DatabaseProxy', {
      proxyTarget: rds.ProxyTarget.fromCluster(this.cluster),
      secrets: [this.secret],
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [proxySecurityGroup],
      role: proxyRole,
      dbProxyName: `basic-budget-proxy-${config.environment}`,
      debugLogging: config.environment !== 'prod',
      idleClientTimeout: cdk.Duration.minutes(30),
      maxConnectionsPercent: 100,
      maxIdleConnectionsPercent: 50,
      requireTLS: true,
    });

    // CloudWatch alarms for monitoring
    if (config.monitoring.enableDetailedMonitoring) {
      // High CPU alarm
      this.cluster.metricCPUUtilization().createAlarm(this, 'HighCPUAlarm', {
        threshold: 80,
        evaluationPeriods: 2,
        alarmDescription: 'Aurora CPU utilization is too high',
      });

      // High connection count alarm
      this.cluster.metricDatabaseConnections().createAlarm(this, 'HighConnectionsAlarm', {
        threshold: 80,
        evaluationPeriods: 2,
        alarmDescription: 'Aurora connection count is too high',
      });

      // Low freeable memory alarm
      this.cluster.metricFreeableMemory().createAlarm(this, 'LowMemoryAlarm', {
        threshold: 1000000000, // 1 GB in bytes
        evaluationPeriods: 2,
        comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        alarmDescription: 'Aurora freeable memory is too low',
      });
    }

    // VPC Endpoints for cost optimization (avoid NAT Gateway charges for AWS services)
    if (config.environment === 'prod') {
      // S3 Gateway endpoint
      this.vpc.addGatewayEndpoint('S3Endpoint', {
        service: ec2.GatewayVpcEndpointAwsService.S3,
        subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      });

      // DynamoDB Gateway endpoint
      this.vpc.addGatewayEndpoint('DynamoDBEndpoint', {
        service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      });

      // Interface endpoints for other services
      const interfaceEndpoints = [
        ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        ec2.InterfaceVpcEndpointAwsService.LAMBDA,
      ];

      interfaceEndpoints.forEach((service, index) => {
        this.vpc.addInterfaceEndpoint(`InterfaceEndpoint${index}`, {
          service,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          privateDnsEnabled: true,
        });
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `basic-budget-${config.environment}-vpc-id`,
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
      description: 'Aurora cluster endpoint',
      exportName: `basic-budget-${config.environment}-db-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabaseProxyEndpoint', {
      value: this.proxy.endpoint,
      description: 'RDS Proxy endpoint',
      exportName: `basic-budget-${config.environment}-proxy-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.secret.secretArn,
      description: 'Database credentials secret ARN',
      exportName: `basic-budget-${config.environment}-db-secret-arn`,
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: lambdaSecurityGroup.securityGroupId,
      description: 'Security group for Lambda functions',
      exportName: `basic-budget-${config.environment}-lambda-sg-id`,
    });

    // Tags
    cdk.Tags.of(this).add('Stack', 'Database');
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}