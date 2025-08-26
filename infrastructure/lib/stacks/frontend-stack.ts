import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';

export interface FrontendStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly bucketDeployment?: s3deploy.BucketDeployment;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { config } = props;

    // S3 Bucket for hosting the React app
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `basic-budget-frontend-${config.environment}-${cdk.Aws.ACCOUNT_ID}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false, // We'll use OAC instead
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== 'prod',
      versioned: config.environment === 'prod',
      lifecycleRules: config.environment === 'prod' ? [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
          noncurrentVersionsToRetain: 5,
        },
      ] : undefined,
    });

    // Origin Access Control for secure S3 access
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      description: `OAC for ${config.environment} basic-budget frontend`,
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin('placeholder-api-domain.com'), // Will be updated after API stack
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(1),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(1),
        },
      ],
      priceClass: config.environment === 'prod' 
        ? cloudfront.PriceClass.PRICE_CLASS_ALL 
        : cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      comment: `Basic Budget ${config.environment} Frontend Distribution`,
      defaultRootObject: 'index.html',
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      domainNames: config.domainName ? [`${config.environment === 'prod' ? '' : config.environment + '.'}${config.domainName}`] : undefined,
      certificate: config.certificateArn ? cdk.aws_certificatemanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        config.certificateArn
      ) : undefined,
    });

    // Grant CloudFront access to S3 bucket
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      actions: ['s3:GetObject'],
      resources: [`${this.bucket.bucketArn}/*`],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.distribution.distributionId}`,
        },
      },
    }));

    // IAM role for GitHub Actions deployment
    const deploymentRole = new iam.Role(this, 'FrontendDeploymentRole', {
      roleName: `basic-budget-frontend-deploy-${config.environment}`,
      assumedBy: new iam.WebIdentityPrincipal(
        `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com`,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': 'repo:*/basic-budget:*', // Update with your GitHub repo
          },
        }
      ),
      inlinePolicies: {
        S3DeploymentPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
              ],
              resources: [
                this.bucket.bucketArn,
                `${this.bucket.bucketArn}/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudfront:CreateInvalidation',
                'cloudfront:GetInvalidation',
                'cloudfront:ListInvalidations',
              ],
              resources: [`arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.distribution.distributionId}`],
            }),
          ],
        }),
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'Frontend S3 Bucket Name',
      exportName: `basic-budget-${config.environment}-frontend-bucket`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `basic-budget-${config.environment}-distribution-id`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `basic-budget-${config.environment}-distribution-domain`,
    });

    new cdk.CfnOutput(this, 'DeploymentRoleArn', {
      value: deploymentRole.roleArn,
      description: 'GitHub Actions Deployment Role ARN',
      exportName: `basic-budget-${config.environment}-frontend-deploy-role`,
    });

    // Tags
    cdk.Tags.of(this).add('Stack', 'Frontend');
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }

  public updateApiOrigin(apiDomainName: string): void {
    // This method can be called after the API stack is created to update the CloudFront behavior
    // In practice, you would need to update the distribution configuration
    // For now, this serves as a placeholder for the pattern
  }
}