import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2'
import {
  CompositePrincipal,
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam'
import { CfnNamespace, CfnWorkgroup } from 'aws-cdk-lib/aws-redshiftserverless'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export class RedshiftStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    functionName: string,
    props?: StackProps,
  ) {
    super(scope, id, props)

    const bucket = new Bucket(this, 'DataBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    const vpc = Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true })

    const namespaceRole = new Role(this, 'RedshiftNamespaceRole', {
      roleName: 'RedshiftServerlessRole',
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('sagemaker.amazonaws.com'),
        new ServicePrincipal('redshift.amazonaws.com'),
        new ServicePrincipal('redshift-serverless.amazonaws.com'),
      ),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonRedshiftAllCommandsFullAccess',
        ),
      ],
      inlinePolicies: {
        invokeFunction: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['lambda:InvokeFunction'],
              resources: [
                `arn:aws:lambda:${props?.env?.region}:${props?.env?.account}:function:${functionName}`,
              ],
              effect: Effect.ALLOW,
            }),
          ],
        }),
      },
    })

    bucket.grantReadWrite(namespaceRole)

    const secret = new Secret(this, 'RedshiftServerlessAdminCredentials', {
      secretName: `/hands-on/redshift-serverless`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        excludeCharacters: '\'"\\/@',
      },
    })

    const securityGroup = new SecurityGroup(this, 'RedshiftSecurityGroup', {
      allowAllOutbound: false,
      vpc,
    })

    const namespaceName = 'udf-hands-on'
    const cfnNamespace = new CfnNamespace(this, 'RedshiftNamespace', {
      dbName: 'dev',
      iamRoles: [namespaceRole.roleArn],
      logExports: ['userlog', 'connectionlog', 'useractivitylog'],
      namespaceName: namespaceName,
      adminUserPassword: secret.secretValueFromJson('password').unsafeUnwrap(),
      adminUsername: secret.secretValueFromJson('username').unsafeUnwrap(),
    })

    const cfnWorkgroup = new CfnWorkgroup(this, 'RedshiftServerlessWorkgroup', {
      baseCapacity: 32,
      configParameters: [
        {
          parameterKey: 'search_path',
          parameterValue: '$user',
        },
        {
          parameterKey: 'enable_user_activity_logging',
          parameterValue: 'true',
        },
        {
          parameterKey: 'datestyle',
          parameterValue: 'ISO,MDY',
        },
        {
          parameterKey: 'query_group',
          parameterValue: 'adhoc',
        },
        {
          parameterKey: 'max_query_execution_time',
          parameterValue: '3600',
        },
      ],
      enhancedVpcRouting: false,
      namespaceName: namespaceName,
      publiclyAccessible: false,
      securityGroupIds: [securityGroup.securityGroupId],
      subnetIds: vpc.publicSubnets.map((s) => {
        return s.subnetId
      }),
      workgroupName: namespaceName,
    })

    cfnWorkgroup.addDependsOn(cfnNamespace)

    new CfnOutput(this, 'OutputDataBucketName', {
      exportName: 'DataBucketName',
      value: bucket.bucketName,
    })

    new CfnOutput(this, 'OutputRedshiftSecretId', {
      exportName: 'RedshiftSecretId',
      value: secret.secretName,
    })
  }
}
