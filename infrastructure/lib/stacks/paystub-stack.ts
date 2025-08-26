import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';

export interface PaystubStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.Vpc;
}

export class PaystubStack extends cdk.Stack {
  public readonly processingQueue: sqs.Queue;
  public readonly deadLetterQueue: sqs.Queue;
  public readonly tempStorageBucket: s3.Bucket;
  public readonly lambdaFunction: lambda.Function;
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: PaystubStackProps) {
    super(scope, id, props);

    const { config, vpc } = props;

    // ECR repository for Go Lambda container
    this.repository = new ecr.Repository(this, 'PaystubProcessorRepo', {
      repositoryName: `basic-budget-paystub-${config.environment}`,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
        },
      ],
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // S3 bucket for temporary file storage
    this.tempStorageBucket = new s3.Bucket(this, 'TempStorageBucket', {
      bucketName: `basic-budget-paystub-temp-${config.environment}-${cdk.Aws.ACCOUNT_ID}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'DeleteTempFiles',
          expiration: cdk.Duration.days(1), // Clean up temp files after 1 day
          abortIncompleteMultipartUploadsAfter: cdk.Duration.days(1),
        },
      ],
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== 'prod',
      versioned: false,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: ['*'], // In production, restrict this to your domain
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    });

    // Dead Letter Queue
    this.deadLetterQueue = new sqs.Queue(this, 'PaystubDLQ', {
      queueName: `basic-budget-paystub-dlq-${config.environment}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // Main processing queue
    this.processingQueue = new sqs.Queue(this, 'PaystubProcessingQueue', {
      queueName: `basic-budget-paystub-processing-${config.environment}`,
      visibilityTimeout: cdk.Duration.minutes(15), // Should be at least 6x the Lambda timeout
      retentionPeriod: cdk.Duration.days(4),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: {
        queue: this.deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'PaystubLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        S3AccessPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
              ],
              resources: [`${this.tempStorageBucket.bucketArn}/*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [this.tempStorageBucket.bucketArn],
            }),
          ],
        }),
        SQSAccessPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
                'sqs:ChangeMessageVisibility',
              ],
              resources: [
                this.processingQueue.queueArn,
                this.deadLetterQueue.queueArn,
              ],
            }),
          ],
        }),
        TextractPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'textract:AnalyzeDocument',
                'textract:DetectDocumentText',
                'textract:AnalyzeExpense',
              ],
              resources: ['*'],
            }),
          ],
        }),
        ComprehendPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'comprehend:DetectEntities',
                'comprehend:DetectKeyPhrases',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Go Lambda function using container image
    this.lambdaFunction = new lambda.Function(this, 'PaystubProcessorFunction', {
      functionName: `basic-budget-paystub-processor-${config.environment}`,
      code: lambda.Code.fromEcrImage(this.repository, {
        tagOrDigest: 'latest',
      }),
      handler: lambda.Handler.FROM_IMAGE,
      runtime: lambda.Runtime.FROM_IMAGE,
      role: lambdaRole,
      timeout: cdk.Duration.minutes(2),
      memorySize: config.lambda.memorySize,
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        ENVIRONMENT: config.environment,
        TEMP_BUCKET_NAME: this.tempStorageBucket.bucketName,
        PROCESSING_QUEUE_URL: this.processingQueue.queueUrl,
        LOG_LEVEL: config.environment === 'prod' ? 'INFO' : 'DEBUG',
        AWS_REGION: cdk.Aws.REGION,
      },
      logGroup: new logs.LogGroup(this, 'PaystubLogGroup', {
        logGroupName: `/aws/lambda/basic-budget-paystub-processor-${config.environment}`,
        retention: config.monitoring.logRetentionDays,
        removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
      deadLetterQueueEnabled: true,
      reservedConcurrentExecutions: config.environment === 'prod' ? 10 : 2,
    });

    // SQS event source for Lambda
    this.lambdaFunction.addEventSource(new eventsources.SqsEventSource(this.processingQueue, {
      batchSize: 1, // Process one paystub at a time
      maxBatchingWindow: cdk.Duration.seconds(5),
      reportBatchItemFailures: true,
    }));

    // S3 event notification to SQS when files are uploaded
    this.tempStorageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(this.processingQueue),
      {
        prefix: 'uploads/',
        suffix: '.pdf',
      }
    );

    this.tempStorageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(this.processingQueue),
      {
        prefix: 'uploads/',
        suffix: '.png',
      }
    );

    this.tempStorageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(this.processingQueue),
      {
        prefix: 'uploads/',
        suffix: '.jpg',
      }
    );

    this.tempStorageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(this.processingQueue),
      {
        prefix: 'uploads/',
        suffix: '.jpeg',
      }
    );

    // API Lambda function for handling upload requests
    const uploadApiFunction = new lambda.Function(this, 'PaystubUploadApiFunction', {
      functionName: `basic-budget-paystub-upload-api-${config.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3();

        exports.handler = async (event) => {
          const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
          };

          if (event.httpMethod === 'OPTIONS') {
            return {
              statusCode: 200,
              headers: corsHeaders,
              body: '',
            };
          }

          try {
            const { fileName, fileType } = JSON.parse(event.body);
            const key = \`uploads/\${Date.now()}-\${fileName}\`;
            
            const params = {
              Bucket: process.env.TEMP_BUCKET_NAME,
              Key: key,
              ContentType: fileType,
              Expires: 300, // 5 minutes
            };

            const uploadUrl = s3.getSignedUrl('putObject', params);

            return {
              statusCode: 200,
              headers: corsHeaders,
              body: JSON.stringify({
                uploadUrl,
                key,
              }),
            };
          } catch (error) {
            console.error('Error generating upload URL:', error);
            return {
              statusCode: 500,
              headers: corsHeaders,
              body: JSON.stringify({ error: 'Internal server error' }),
            };
          }
        };
      `),
      environment: {
        TEMP_BUCKET_NAME: this.tempStorageBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant upload API function access to S3
    this.tempStorageBucket.grantPut(uploadApiFunction);

    // CloudWatch alarms for monitoring
    if (config.monitoring.enableDetailedMonitoring) {
      // Lambda function errors
      this.lambdaFunction.metricErrors().createAlarm(this, 'PaystubLambdaErrors', {
        threshold: 1,
        evaluationPeriods: 1,
        alarmDescription: 'Paystub processor Lambda function errors',
      });

      // DLQ message count
      this.deadLetterQueue.metricApproximateNumberOfVisibleMessages().createAlarm(this, 'PaystubDLQAlarm', {
        threshold: 1,
        evaluationPeriods: 1,
        alarmDescription: 'Messages in paystub processing dead letter queue',
      });

      // Lambda function duration
      this.lambdaFunction.metricDuration().createAlarm(this, 'PaystubLambdaDuration', {
        threshold: cdk.Duration.minutes(1).toMilliseconds(),
        evaluationPeriods: 2,
        alarmDescription: 'Paystub processor Lambda function taking too long',
      });
    }

    // IAM role for GitHub Actions deployment
    const deploymentRole = new iam.Role(this, 'PaystubDeploymentRole', {
      roleName: `basic-budget-paystub-deploy-${config.environment}`,
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
        ECRPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:GetAuthorizationToken',
                'ecr:PutImage',
                'ecr:InitiateLayerUpload',
                'ecr:UploadLayerPart',
                'ecr:CompleteLayerUpload',
              ],
              resources: [this.repository.repositoryArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ecr:GetAuthorizationToken'],
              resources: ['*'],
            }),
          ],
        }),
        LambdaUpdatePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:UpdateFunctionCode',
                'lambda:GetFunction',
              ],
              resources: [
                this.lambdaFunction.functionArn,
                uploadApiFunction.functionArn,
              ],
            }),
          ],
        }),
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'ProcessingQueueUrl', {
      value: this.processingQueue.queueUrl,
      description: 'Paystub processing queue URL',
      exportName: `basic-budget-${config.environment}-paystub-queue-url`,
    });

    new cdk.CfnOutput(this, 'TempBucketName', {
      value: this.tempStorageBucket.bucketName,
      description: 'Temporary storage bucket name',
      exportName: `basic-budget-${config.environment}-paystub-temp-bucket`,
    });

    new cdk.CfnOutput(this, 'PaystubLambdaArn', {
      value: this.lambdaFunction.functionArn,
      description: 'Paystub processor Lambda function ARN',
      exportName: `basic-budget-${config.environment}-paystub-lambda-arn`,
    });

    new cdk.CfnOutput(this, 'UploadApiLambdaArn', {
      value: uploadApiFunction.functionArn,
      description: 'Paystub upload API Lambda function ARN',
      exportName: `basic-budget-${config.environment}-paystub-upload-api-arn`,
    });

    new cdk.CfnOutput(this, 'ECRRepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'ECR repository URI',
      exportName: `basic-budget-${config.environment}-paystub-ecr-uri`,
    });

    new cdk.CfnOutput(this, 'PaystubDeploymentRoleArn', {
      value: deploymentRole.roleArn,
      description: 'GitHub Actions Paystub Deployment Role ARN',
      exportName: `basic-budget-${config.environment}-paystub-deploy-role`,
    });

    // Tags
    cdk.Tags.of(this).add('Stack', 'Paystub');
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}