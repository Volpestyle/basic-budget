import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';

export interface MonitoringStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  apiLambdaArn: string;
  paystubLambdaArn: string;
  databaseClusterIdentifier: string;
  cloudFrontDistributionId: string;
}

export class MonitoringStack extends cdk.Stack {
  public readonly alertTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { config, apiLambdaArn, paystubLambdaArn, databaseClusterIdentifier, cloudFrontDistributionId } = props;

    // SNS topic for alerts
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `basic-budget-alerts-${config.environment}`,
      displayName: `Basic Budget Alerts - ${config.environment}`,
    });

    // Email subscription for alerts (add your email address)
    // this.alertTopic.addSubscription(new subscriptions.EmailSubscription('your-email@example.com'));

    // CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'ApplicationDashboard', {
      dashboardName: `basic-budget-${config.environment}`,
    });

    this.createApplicationMetrics(config, apiLambdaArn, paystubLambdaArn, databaseClusterIdentifier, cloudFrontDistributionId);
    this.createAlarms(config, apiLambdaArn, paystubLambdaArn, databaseClusterIdentifier);
    this.createLogInsights(config);
  }

  private createApplicationMetrics(
    config: EnvironmentConfig,
    apiLambdaArn: string,
    paystubLambdaArn: string,
    databaseClusterIdentifier: string,
    cloudFrontDistributionId: string
  ) {
    const apiLambdaName = apiLambdaArn.split(':')[6];
    const paystubLambdaName = paystubLambdaArn.split(':')[6];

    // API Lambda metrics
    const apiInvocations = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Invocations',
      dimensionsMap: { FunctionName: apiLambdaName },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const apiErrors = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensionsMap: { FunctionName: apiLambdaName },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const apiDuration = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Duration',
      dimensionsMap: { FunctionName: apiLambdaName },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // Paystub Lambda metrics
    const paystubInvocations = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Invocations',
      dimensionsMap: { FunctionName: paystubLambdaName },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const paystubErrors = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensionsMap: { FunctionName: paystubLambdaName },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    // Database metrics
    const dbConnections = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'DatabaseConnections',
      dimensionsMap: { DBClusterIdentifier: databaseClusterIdentifier },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const dbCpuUtilization = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'CPUUtilization',
      dimensionsMap: { DBClusterIdentifier: databaseClusterIdentifier },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // CloudFront metrics
    const cloudfrontRequests = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: 'Requests',
      dimensionsMap: { DistributionId: cloudFrontDistributionId },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const cloudfrontErrorRate = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: '4xxErrorRate',
      dimensionsMap: { DistributionId: cloudFrontDistributionId },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(
      // API Lambda widgets
      new cloudwatch.GraphWidget({
        title: 'API Lambda Invocations & Errors',
        left: [apiInvocations],
        right: [apiErrors],
        period: cdk.Duration.minutes(5),
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Lambda Duration',
        left: [apiDuration],
        period: cdk.Duration.minutes(5),
        width: 12,
        height: 6,
      }),

      // Paystub Lambda widgets
      new cloudwatch.GraphWidget({
        title: 'Paystub Processing',
        left: [paystubInvocations],
        right: [paystubErrors],
        period: cdk.Duration.minutes(5),
        width: 12,
        height: 6,
      }),

      // Database widgets
      new cloudwatch.GraphWidget({
        title: 'Database Connections & CPU',
        left: [dbConnections],
        right: [dbCpuUtilization],
        period: cdk.Duration.minutes(5),
        width: 12,
        height: 6,
      }),

      // CloudFront widgets
      new cloudwatch.GraphWidget({
        title: 'CloudFront Requests & Errors',
        left: [cloudfrontRequests],
        right: [cloudfrontErrorRate],
        period: cdk.Duration.minutes(5),
        width: 12,
        height: 6,
      })
    );

    // Custom metrics widget
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Error Rate Overview',
        left: [
          apiErrors.with({ statistic: 'Sum' }),
          paystubErrors.with({ statistic: 'Sum' }),
        ],
        period: cdk.Duration.minutes(5),
        width: 24,
        height: 6,
      })
    );
  }

  private createAlarms(
    config: EnvironmentConfig,
    apiLambdaArn: string,
    paystubLambdaArn: string,
    databaseClusterIdentifier: string
  ) {
    const apiLambdaName = apiLambdaArn.split(':')[6];
    const paystubLambdaName = paystubLambdaArn.split(':')[6];

    // API Lambda alarms
    new cloudwatch.Alarm(this, 'ApiLambdaErrorRate', {
      alarmName: `basic-budget-api-error-rate-${config.environment}`,
      alarmDescription: 'API Lambda function error rate is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: { FunctionName: apiLambdaName },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: config.environment === 'prod' ? 5 : 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic));

    new cloudwatch.Alarm(this, 'ApiLambdaDuration', {
      alarmName: `basic-budget-api-duration-${config.environment}`,
      alarmDescription: 'API Lambda function duration is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Duration',
        dimensionsMap: { FunctionName: apiLambdaName },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: config.lambda.timeout * 1000 * 0.8, // 80% of timeout in milliseconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic));

    // Paystub Lambda alarms
    new cloudwatch.Alarm(this, 'PaystubLambdaErrorRate', {
      alarmName: `basic-budget-paystub-error-rate-${config.environment}`,
      alarmDescription: 'Paystub processing Lambda function error rate is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: { FunctionName: paystubLambdaName },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: config.environment === 'prod' ? 3 : 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic));

    // Database alarms
    new cloudwatch.Alarm(this, 'DatabaseCpuUtilization', {
      alarmName: `basic-budget-db-cpu-${config.environment}`,
      alarmDescription: 'Database CPU utilization is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'CPUUtilization',
        dimensionsMap: { DBClusterIdentifier: databaseClusterIdentifier },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic));

    new cloudwatch.Alarm(this, 'DatabaseConnections', {
      alarmName: `basic-budget-db-connections-${config.environment}`,
      alarmDescription: 'Database connection count is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'DatabaseConnections',
        dimensionsMap: { DBClusterIdentifier: databaseClusterIdentifier },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic));

    // Cost alarm (only for production)
    if (config.environment === 'prod') {
      new cloudwatch.Alarm(this, 'MonthlyCostAlarm', {
        alarmName: `basic-budget-monthly-cost-${config.environment}`,
        alarmDescription: 'Monthly AWS cost is approaching budget limit',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Billing',
          metricName: 'EstimatedCharges',
          dimensionsMap: { Currency: 'USD' },
          statistic: 'Maximum',
          period: cdk.Duration.hours(6),
        }),
        threshold: 100, // Adjust based on your budget
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic));
    }
  }

  private createLogInsights(config: EnvironmentConfig) {
    // Create log groups for centralized logging
    new logs.LogGroup(this, 'ApplicationLogGroup', {
      logGroupName: `/aws/basic-budget/${config.environment}/application`,
      retention: config.monitoring.logRetentionDays,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'SecurityLogGroup', {
      logGroupName: `/aws/basic-budget/${config.environment}/security`,
      retention: config.monitoring.logRetentionDays,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Log insights queries can be added here if needed
    // These would be useful for debugging and monitoring
  }
}