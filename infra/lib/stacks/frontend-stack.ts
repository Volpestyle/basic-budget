import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import type { Construct } from 'constructs'

interface FrontendStackProps extends cdk.StackProps {
  /**
   * Path to the built frontend assets (relative to the infra directory).
   * Defaults to the SvelteKit static build output at ../apps/web/build.
   */
  assetsPath?: string
}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket
  public readonly distribution: cloudfront.Distribution
  public readonly cloudFrontUrl: string

  constructor(scope: Construct, id: string, props?: FrontendStackProps) {
    super(scope, id, props)

    const assetsPath = props?.assetsPath ?? '../apps/web/build'

    // Private S3 bucket for static assets (accessed only via CloudFront)
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    })

    // Deploy built assets to S3 and invalidate CloudFront
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(assetsPath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    })

    this.cloudFrontUrl = `https://${this.distribution.domainName}`

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.bucket.bucketName,
    })

    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: this.distribution.domainName,
    })

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: this.cloudFrontUrl,
    })
  }
}
