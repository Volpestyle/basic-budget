import * as cdk from 'aws-cdk-lib';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as guardduty from 'aws-cdk-lib/aws-guardduty';
import * as config from 'aws-cdk-lib/aws-config';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';

export interface SecurityStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  cloudFrontDistributionId?: string;
}

export class SecurityStack extends cdk.Stack {
  public readonly webAcl: waf.CfnWebACL;
  public readonly cloudTrail: cloudtrail.Trail;
  public readonly encryptionKey: kms.Key;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    const { config, cloudFrontDistributionId } = props;

    // Create KMS key for encryption
    this.createEncryptionKey(config);

    // Create WAF Web ACL
    this.createWebAcl(config);

    // Create CloudTrail for audit logging
    this.createCloudTrail(config);

    // Enable GuardDuty (only in production)
    if (config.environment === 'prod') {
      this.enableGuardDuty(config);
    }

    // Create AWS Config rules for compliance
    this.createConfigRules(config);

    // Associate WAF with CloudFront if provided
    if (cloudFrontDistributionId) {
      this.associateWafWithCloudFront(cloudFrontDistributionId);
    }
  }

  private createEncryptionKey(config: EnvironmentConfig) {
    this.encryptionKey = new kms.Key(this, 'EncryptionKey', {
      alias: `basic-budget-${config.environment}-key`,
      description: `Basic Budget encryption key for ${config.environment} environment`,
      enableKeyRotation: true,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            sid: 'Enable IAM User Permissions',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
          new iam.PolicyStatement({
            sid: 'Allow CloudWatch Logs',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal(`logs.${cdk.Aws.REGION}.amazonaws.com`)],
            actions: [
              'kms:Encrypt',
              'kms:Decrypt',
              'kms:ReEncrypt*',
              'kms:GenerateDataKey*',
              'kms:DescribeKey',
            ],
            resources: ['*'],
          }),
          new iam.PolicyStatement({
            sid: 'Allow S3 Service',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
            actions: [
              'kms:Encrypt',
              'kms:Decrypt',
              'kms:ReEncrypt*',
              'kms:GenerateDataKey*',
              'kms:DescribeKey',
            ],
            resources: ['*'],
          }),
        ],
      }),
    });
  }

  private createWebAcl(config: EnvironmentConfig) {
    // Rate limiting rule
    const rateLimitRule: waf.CfnWebACL.RuleProperty = {
      name: 'RateLimitRule',
      priority: 1,
      statement: {
        rateBasedStatement: {
          limit: config.environment === 'prod' ? 2000 : 1000, // Requests per 5-minute period
          aggregateKeyType: 'IP',
        },
      },
      action: { block: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRule',
      },
    };

    // AWS managed rule for common attacks
    const coreRuleSet: waf.CfnWebACL.RuleProperty = {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 2,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
          excludedRules: [
            { name: 'SizeRestrictions_BODY' }, // Allow larger payloads for file uploads
            { name: 'GenericRFI_BODY' },
          ],
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CommonRuleSetMetric',
      },
    };

    // AWS managed rule for known bad inputs
    const knownBadInputsRule: waf.CfnWebACL.RuleProperty = {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      priority: 3,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'KnownBadInputsRuleSetMetric',
      },
    };

    // IP reputation rule
    const ipReputationRule: waf.CfnWebACL.RuleProperty = {
      name: 'AWSManagedRulesAmazonIpReputationList',
      priority: 4,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesAmazonIpReputationList',
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'IpReputationListMetric',
      },
    };

    // Geo-blocking rule (customize as needed)
    const geoBlockingRule: waf.CfnWebACL.RuleProperty = {
      name: 'GeoBlockingRule',
      priority: 5,
      statement: {
        geoMatchStatement: {
          countryCodes: ['CN', 'RU', 'KP'], // Block specific countries if needed
        },
      },
      action: { block: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'GeoBlockingRule',
      },
    };

    this.webAcl = new waf.CfnWebACL(this, 'WebAcl', {
      name: `basic-budget-waf-${config.environment}`,
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      description: `WAF for Basic Budget ${config.environment} environment`,
      rules: [
        rateLimitRule,
        coreRuleSet,
        knownBadInputsRule,
        ipReputationRule,
        ...(config.environment === 'prod' ? [geoBlockingRule] : []),
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `BasicBudgetWAF-${config.environment}`,
      },
      tags: [
        { key: 'Environment', value: config.environment },
        { key: 'Project', value: 'basic-budget' },
      ],
    });
  }

  private createCloudTrail(config: EnvironmentConfig) {
    // S3 bucket for CloudTrail logs
    const cloudTrailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `basic-budget-cloudtrail-${config.environment}-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'CloudTrailLogRetention',
          expiration: cdk.Duration.days(config.environment === 'prod' ? 2555 : 90), // 7 years for prod, 3 months for others
          noncurrentVersionExpiration: cdk.Duration.days(30),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== 'prod',
    });

    // CloudWatch Log Group for CloudTrail
    const cloudTrailLogGroup = new logs.LogGroup(this, 'CloudTrailLogGroup', {
      logGroupName: `/aws/cloudtrail/basic-budget-${config.environment}`,
      retention: config.monitoring.logRetentionDays,
      encryptionKey: this.encryptionKey,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // IAM role for CloudTrail to write to CloudWatch Logs
    const cloudTrailLogRole = new iam.Role(this, 'CloudTrailLogRole', {
      assumedBy: new iam.ServicePrincipal('cloudtrail.amazonaws.com'),
      inlinePolicies: {
        CloudWatchLogsPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:PutLogEvents',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
              ],
              resources: [cloudTrailLogGroup.logGroupArn],
            }),
          ],
        }),
      },
    });

    this.cloudTrail = new cloudtrail.Trail(this, 'CloudTrail', {
      trailName: `basic-budget-trail-${config.environment}`,
      bucket: cloudTrailBucket,
      cloudWatchLogGroup: cloudTrailLogGroup,
      cloudWatchLogsRole: cloudTrailLogRole,
      encryptionKey: this.encryptionKey,
      enableFileValidation: true,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: config.environment === 'prod',
      sendToCloudWatchLogs: true,
      eventRules: [
        {
          readWriteType: cloudtrail.ReadWriteType.ALL,
          includeManagementEvents: true,
          includeDataEvents: config.environment === 'prod' ? [
            {
              bucket: cloudTrailBucket,
              objectPrefix: '',
            },
          ] : undefined,
        },
      ],
    });
  }

  private enableGuardDuty(config: EnvironmentConfig) {
    new guardduty.CfnDetector(this, 'GuardDutyDetector', {
      enable: true,
      findingPublishingFrequency: 'FIFTEEN_MINUTES',
      dataSources: {
        s3Logs: { enable: true },
        kubernetes: {
          auditLogs: { enable: true },
        },
        malwareProtection: {
          scanEc2InstanceWithFindings: { ebsVolumes: true },
        },
      },
      tags: [
        { key: 'Environment', value: config.environment },
        { key: 'Project', value: 'basic-budget' },
      ],
    });
  }

  private createConfigRules(config: EnvironmentConfig) {
    if (config.environment !== 'prod') {
      return; // Only create Config rules in production
    }

    // Configuration recorder
    const configRole = new iam.Role(this, 'ConfigRole', {
      assumedBy: new iam.ServicePrincipal('config.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/ConfigRole'),
      ],
    });

    // S3 bucket for Config
    const configBucket = new s3.Bucket(this, 'ConfigBucket', {
      bucketName: `basic-budget-config-${config.environment}-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'ConfigLogRetention',
          expiration: cdk.Duration.days(2555), // 7 years
          noncurrentVersionExpiration: cdk.Duration.days(90),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Grant Config service permissions to the bucket
    configBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('config.amazonaws.com')],
      actions: [
        's3:GetBucketAcl',
        's3:ListBucket',
      ],
      resources: [configBucket.bucketArn],
      conditions: {
        StringEquals: {
          'AWS:SourceAccount': cdk.Aws.ACCOUNT_ID,
        },
      },
    }));

    configBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('config.amazonaws.com')],
      actions: ['s3:PutObject'],
      resources: [`${configBucket.bucketArn}/AWSLogs/${cdk.Aws.ACCOUNT_ID}/Config/*`],
      conditions: {
        StringEquals: {
          's3:x-amz-acl': 'bucket-owner-full-control',
          'AWS:SourceAccount': cdk.Aws.ACCOUNT_ID,
        },
      },
    }));

    new config.CfnConfigurationRecorder(this, 'ConfigRecorder', {
      name: `basic-budget-config-recorder-${config.environment}`,
      roleArn: configRole.roleArn,
      recordingGroup: {
        allSupported: true,
        includeGlobalResourceTypes: true,
      },
    });

    new config.CfnDeliveryChannel(this, 'ConfigDeliveryChannel', {
      name: `basic-budget-config-delivery-${config.environment}`,
      s3BucketName: configBucket.bucketName,
      configSnapshotDeliveryProperties: {
        deliveryFrequency: 'TwentyFour_Hours',
      },
    });

    // Example Config rules
    new config.CfnConfigRule(this, 'S3BucketSSLRequestsOnlyRule', {
      configRuleName: 's3-bucket-ssl-requests-only',
      source: {
        owner: 'AWS',
        sourceIdentifier: 'S3_BUCKET_SSL_REQUESTS_ONLY',
      },
    });

    new config.CfnConfigRule(this, 'RootAccessKeyCheckRule', {
      configRuleName: 'root-access-key-check',
      source: {
        owner: 'AWS',
        sourceIdentifier: 'ROOT_ACCESS_KEY_CHECK',
      },
    });
  }

  private associateWafWithCloudFront(distributionId: string) {
    new waf.CfnWebACLAssociation(this, 'WebAclAssociation', {
      resourceArn: `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${distributionId}`,
      webAclArn: this.webAcl.attrArn,
    });
  }
}