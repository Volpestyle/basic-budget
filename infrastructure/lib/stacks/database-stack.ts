import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface DatabaseStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: rds.DatabaseCluster;
  public readonly proxy: rds.DatabaseProxy;
  public readonly secret: secretsmanager.Secret;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: `basic-budget-${props.config.environment}-vpc`,
      cidr: '10.0.0.0/16',
      maxAzs: props.config.database.multiAz ? 3 : 2,
      natGateways: props.config.environment === 'prod' ? 2 : 1,
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
          cidrMask: 24,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true
    });

    // VPC Flow Logs for security monitoring
    if (props.config.monitoring.enableDetailedMonitoring) {
      const flowLogGroup = new logs.LogGroup(this, 'VpcFlowLogsGroup', {
        logGroupName: `/aws/vpc/flowlogs/${props.config.environment}`,
        retention: props.config.monitoring.retentionDays as logs.RetentionDays,
        removalPolicy: props.config.environment === 'prod' 
          ? cdk.RemovalPolicy.RETAIN 
          : cdk.RemovalPolicy.DESTROY
      });

      new ec2.FlowLog(this, 'VpcFlowLogs', {
        resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
        destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup)
      });
    }

    // Database credentials secret
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: `basic-budget/${props.config.environment}/database`,
      description: `Database credentials for ${props.config.environment} environment`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          username: 'postgres',
          dbname: 'basicbudget' 
        }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        passwordLength: 32
      }
    });

    // Database security group
    this.securityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS Aurora cluster',
      allowAllOutbound: false
    });

    // Lambda security group (for API and processors)
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true
    });

    // Allow Lambda to connect to database
    this.securityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda functions to connect to database'
    );

    // RDS Subnet Group
    const subnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      description: 'Subnet group for Aurora cluster',
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }
    });

    // Parameter Group for performance optimization
    const parameterGroup = new rds.ParameterGroup(this, 'DatabaseParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3
      }),
      description: `Parameter group for ${props.config.environment} Aurora cluster`,
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'log_statement': 'all',
        'log_duration': '1',
        'log_min_duration_statement': '1000', // Log queries taking more than 1 second
        'max_connections': props.config.environment === 'prod' ? '200' : '100'
      }
    });

    // Aurora Serverless v2 Cluster
    this.cluster = new rds.DatabaseCluster(this, 'DatabaseCluster', {
      clusterIdentifier: `basic-budget-${props.config.environment}-cluster`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3
      }),
      credentials: rds.Credentials.fromSecret(this.secret),
      writer: rds.ClusterInstance.serverlessV2('writer', {
        scaleWithWriter: true,
        autoMinorVersionUpgrade: true
      }),
      readers: props.config.database.multiAz ? [
        rds.ClusterInstance.serverlessV2('reader1', {
          scaleWithWriter: true,
          autoMinorVersionUpgrade: true
        })
      ] : [],
      serverlessV2MinCapacity: props.config.database.minCapacity,
      serverlessV2MaxCapacity: props.config.database.maxCapacity,
      vpc: this.vpc,
      securityGroups: [this.securityGroup],
      subnetGroup,
      parameterGroup,
      backup: {
        retention: cdk.Duration.days(props.config.database.backupRetention),
        preferredWindow: '03:00-04:00'
      },
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: props.config.monitoring.retentionDays as logs.RetentionDays,
      monitoringInterval: props.config.database.enablePerformanceInsights 
        ? cdk.Duration.seconds(60) 
        : undefined,
      monitoringRole: props.config.database.enablePerformanceInsights 
        ? new cdk.aws_iam.Role(this, 'MonitoringRole', {
            assumedBy: new cdk.aws_iam.ServicePrincipal('monitoring.rds.amazonaws.com'),
            managedPolicies: [
              cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonRDSEnhancedMonitoringRole')
            ]
          })
        : undefined,
      deletionProtection: props.config.environment === 'prod',
      removalPolicy: props.config.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY
    });

    // RDS Proxy for connection pooling
    this.proxy = new rds.DatabaseProxy(this, 'DatabaseProxy', {
      proxyTarget: rds.ProxyTarget.fromCluster(this.cluster),
      secrets: [this.secret],
      vpc: this.vpc,
      securityGroups: [this.securityGroup],
      debugLogging: props.config.environment !== 'prod',
      idleClientTimeout: cdk.Duration.minutes(30),
      maxConnectionsPercent: 100,
      maxIdleConnectionsPercent: 50,
      requireTLS: true
    });

    // CloudWatch Alarms for database monitoring
    if (props.config.monitoring.enableDetailedMonitoring) {
      const cpuAlarm = new cdk.aws_cloudwatch.Alarm(this, 'DatabaseCPUAlarm', {
        metric: new cdk.aws_cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'CPUUtilization',
          dimensionsMap: {
            DBClusterIdentifier: this.cluster.clusterIdentifier
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 80,
        evaluationPeriods: 2,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'Database CPU utilization is high'
      });

      const connectionAlarm = new cdk.aws_cloudwatch.Alarm(this, 'DatabaseConnectionAlarm', {
        metric: new cdk.aws_cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'DatabaseConnections',
          dimensionsMap: {
            DBClusterIdentifier: this.cluster.clusterIdentifier
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 80,
        evaluationPeriods: 2,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'Database connection count is high'
      });
    }

    // SSM Parameters for other stacks to reference
    new cdk.aws_ssm.StringParameter(this, 'VpcIdParameter', {
      parameterName: `/basic-budget/${props.config.environment}/vpc-id`,
      stringValue: this.vpc.vpcId
    });

    new cdk.aws_ssm.StringParameter(this, 'DatabaseEndpointParameter', {
      parameterName: `/basic-budget/${props.config.environment}/database-endpoint`,
      stringValue: this.cluster.clusterEndpoint.hostname
    });

    new cdk.aws_ssm.StringParameter(this, 'DatabaseProxyEndpointParameter', {
      parameterName: `/basic-budget/${props.config.environment}/database-proxy-endpoint`,
      stringValue: this.proxy.endpoint
    });

    new cdk.aws_ssm.StringParameter(this, 'LambdaSecurityGroupParameter', {
      parameterName: `/basic-budget/${props.config.environment}/lambda-security-group-id`,
      stringValue: lambdaSecurityGroup.securityGroupId
    });

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      exportName: `basic-budget-${props.config.environment}-vpc-id`
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
      exportName: `basic-budget-${props.config.environment}-db-endpoint`
    });

    new cdk.CfnOutput(this, 'DatabaseProxyEndpoint', {
      value: this.proxy.endpoint,
      exportName: `basic-budget-${props.config.environment}-db-proxy-endpoint`
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.secret.secretArn,
      exportName: `basic-budget-${props.config.environment}-db-secret-arn`
    });

    // Apply tags
    Object.entries(props.config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}