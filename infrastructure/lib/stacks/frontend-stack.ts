import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface FrontendStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  certificateArn?: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly oai: cloudfront.OriginAccessIdentity;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // S3 Bucket for hosting React application
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `basic-budget-${props.config.environment}-frontend`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: props.config.environment === 'prod',
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: props.config.environment === 'prod',
          noncurrentVersionExpiration: cdk.Duration.days(30)
        }
      ],
      removalPolicy: props.config.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.config.environment !== 'prod'
    });

    // Origin Access Identity for secure CloudFront access
    this.oai = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: `OAI for Basic Budget ${props.config.environment} frontend`
    });

    // Bucket policy to allow CloudFront access
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [this.bucket.arnForObjects('*')],
      principals: [this.oai.grantPrincipal]
    }));

    // Security headers function for CloudFront
    const securityHeadersFunction = new cloudfront.Function(this, 'SecurityHeadersFunction', {
      functionName: `basic-budget-${props.config.environment}-security-headers`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var response = event.response;
          var headers = response.headers;
          
          // Security headers
          headers['strict-transport-security'] = { value: 'max-age=31536000; includeSubDomains' };
          headers['x-content-type-options'] = { value: 'nosniff' };
          headers['x-frame-options'] = { value: 'DENY' };
          headers['x-xss-protection'] = { value: '1; mode=block' };
          headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
          headers['content-security-policy'] = { 
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.${props.config.domainName || 'localhost'};" 
          };
          
          return response;
        }
      `)
    });

    // Cache behaviors for different content types
    const cacheBehaviors: Record<string, cloudfront.BehaviorOptions> = {
      '/static/*': {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: this.oai
        }),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true
      },
      '/assets/*': {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: this.oai
        }),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true
      },
      '*.js': {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: this.oai
        }),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true
      },
      '*.css': {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: this.oai
        }),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true
      }
    };

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `Basic Budget ${props.config.environment} distribution`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: this.oai
        }),
        cachePolicy: new cloudfront.CachePolicy(this, 'SPACachePolicy', {
          cachePolicyName: `basic-budget-${props.config.environment}-spa`,
          comment: 'Cache policy for SPA',
          defaultTtl: cdk.Duration.hours(24),
          maxTtl: cdk.Duration.days(365),
          minTtl: cdk.Duration.seconds(0),
          headerBehavior: cloudfront.CacheHeaderBehavior.none(),
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
          cookieBehavior: cloudfront.CacheCookieBehavior.none()
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        functionAssociations: [
          {
            function: securityHeadersFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE
          }
        ]
      },
      additionalBehaviors: cacheBehaviors,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5)
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5)
        }
      ],
      priceClass: props.config.cloudFront.priceClass as cloudfront.PriceClass,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: props.config.cloudFront.enableLogging,
      logBucket: props.config.cloudFront.enableLogging 
        ? new s3.Bucket(this, 'LogsBucket', {
            bucketName: `basic-budget-${props.config.environment}-logs`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            lifecycleRules: [
              {
                id: 'DeleteLogs',
                enabled: true,
                expiration: cdk.Duration.days(90)
              }
            ],
            removalPolicy: props.config.environment === 'prod' 
              ? cdk.RemovalPolicy.RETAIN 
              : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: props.config.environment !== 'prod'
          })
        : undefined,
      logFilePrefix: 'cloudfront-logs/',
      domainNames: props.config.domainName ? [props.config.domainName] : undefined,
      certificate: props.certificateArn 
        ? certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn)
        : undefined,
      sslSupportMethod: props.certificateArn 
        ? cloudfront.SSLMethod.SNI 
        : undefined
    });

    // Route 53 DNS records if domain is configured
    if (props.config.domainName) {
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.config.domainName.split('.').slice(-2).join('.')
      });

      new route53.ARecord(this, 'ARecord', {
        zone: hostedZone,
        recordName: props.config.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(this.distribution)
        )
      });

      new route53.AaaaRecord(this, 'AAAARecord', {
        zone: hostedZone,
        recordName: props.config.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(this.distribution)
        )
      });
    }

    // Build and deploy script for CI/CD
    const buildBucket = new s3.Bucket(this, 'BuildArtifactsBucket', {
      bucketName: `basic-budget-${props.config.environment}-build-artifacts`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteBuildArtifacts',
          enabled: true,
          expiration: cdk.Duration.days(30)
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // CloudWatch Real User Monitoring if in production
    if (props.config.environment === 'prod') {
      const rumApp = new cdk.aws_rum.CfnAppMonitor(this, 'RUMMonitor', {
        name: `basic-budget-${props.config.environment}`,
        domain: props.config.domainName || this.distribution.distributionDomainName,
        appMonitorConfiguration: {
          allowCookies: false,
          enableXRay: props.config.monitoring.enableXRay,
          sessionSampleRate: 0.1, // 10% sampling for cost optimization
          telemetries: ['errors', 'performance', 'http']
        }
      });
    }

    // CloudWatch Alarms for monitoring
    if (props.config.monitoring.enableDetailedMonitoring) {
      // CloudFront 4XX errors
      new cdk.aws_cloudwatch.Alarm(this, 'CloudFront4XXErrorAlarm', {
        alarmName: `cloudfront-4xx-errors-${props.config.environment}`,
        metric: new cdk.aws_cloudwatch.Metric({
          namespace: 'AWS/CloudFront',
          metricName: '4xxErrorRate',
          dimensionsMap: {
            DistributionId: this.distribution.distributionId
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 5, // 5%
        evaluationPeriods: 2,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING
      });

      // CloudFront 5XX errors
      new cdk.aws_cloudwatch.Alarm(this, 'CloudFront5XXErrorAlarm', {
        alarmName: `cloudfront-5xx-errors-${props.config.environment}`,
        metric: new cdk.aws_cloudwatch.Metric({
          namespace: 'AWS/CloudFront',
          metricName: '5xxErrorRate',
          dimensionsMap: {
            DistributionId: this.distribution.distributionId
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 1, // 1%
        evaluationPeriods: 2,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING
      });

      // CloudFront origin latency
      new cdk.aws_cloudwatch.Alarm(this, 'CloudFrontLatencyAlarm', {
        alarmName: `cloudfront-latency-${props.config.environment}`,
        metric: new cdk.aws_cloudwatch.Metric({
          namespace: 'AWS/CloudFront',
          metricName: 'OriginLatency',
          dimensionsMap: {
            DistributionId: this.distribution.distributionId
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 5000, // 5 seconds
        evaluationPeriods: 3,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }

    // SSM Parameters
    new cdk.aws_ssm.StringParameter(this, 'DistributionIdParameter', {
      parameterName: `/basic-budget/${props.config.environment}/distribution-id`,
      stringValue: this.distribution.distributionId
    });

    new cdk.aws_ssm.StringParameter(this, 'FrontendBucketParameter', {
      parameterName: `/basic-budget/${props.config.environment}/frontend-bucket`,
      stringValue: this.bucket.bucketName
    });

    new cdk.aws_ssm.StringParameter(this, 'BuildArtifactsBucketParameter', {
      parameterName: `/basic-budget/${props.config.environment}/build-artifacts-bucket`,
      stringValue: buildBucket.bucketName
    });

    // Outputs
    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      exportName: `basic-budget-${props.config.environment}-distribution-id`
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      exportName: `basic-budget-${props.config.environment}-distribution-domain`
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.bucket.bucketName,
      exportName: `basic-budget-${props.config.environment}-frontend-bucket`
    });

    new cdk.CfnOutput(this, 'BuildArtifactsBucketName', {
      value: buildBucket.bucketName,
      exportName: `basic-budget-${props.config.environment}-build-artifacts-bucket`
    });

    if (props.config.domainName) {
      new cdk.CfnOutput(this, 'WebsiteURL', {
        value: `https://${props.config.domainName}`,
        exportName: `basic-budget-${props.config.environment}-website-url`
      });
    } else {
      new cdk.CfnOutput(this, 'WebsiteURL', {
        value: `https://${this.distribution.distributionDomainName}`,
        exportName: `basic-budget-${props.config.environment}-website-url`
      });
    }

    // Apply tags
    Object.entries(props.config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}