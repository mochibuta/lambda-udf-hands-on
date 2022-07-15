import * as path from 'path'

import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib'
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

export class LambdaUdfHandsOnStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const bucket = new Bucket(this, 'DataBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    const udfPokemonNameTranslate = new NodejsFunction(
      this,
      'UdfPokemonNameTranslate',
      {
        functionName: 'udf-pokemon-name-translate',
        entry: path.resolve('@lambda/udf-pokemon-name-translate/index.ts'),
        runtime: Runtime.NODEJS_16_X,
        handler: 'handler',
        logRetention: RetentionDays.ONE_DAY,
        timeout: Duration.minutes(1),
        memorySize: 256,
        architecture: Architecture.ARM_64,
        bundling: { nodeModules: ['pokemon'] },
      },
    )

    /**
     * stack削除時にlogGroupが残ってしまうためremovalPolicyを設定して手動で作成する
     * https://github.com/aws/aws-cdk/issues/11549#issuecomment-1161767950
     */
    new LogGroup(this, `LogGroupLambdaFunction ${id}`, {
      retention: RetentionDays.ONE_DAY,
      logGroupName: `/aws/lambda/${udfPokemonNameTranslate.functionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const udfInvokeRole = new Role(this, 'RoleUdfInvoke', {
      roleName: 'RedshiftUdfInvokeRole',
      assumedBy: new ServicePrincipal('redshift.amazonaws.com'),
    })

    udfInvokeRole.addToPolicy(
      new PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [udfPokemonNameTranslate.functionArn],
        effect: Effect.ALLOW,
      }),
    )

    new CfnOutput(this, 'OutputDataBucketName', {
      exportName: 'DataBucketName',
      value: bucket.bucketName,
    })

    new CfnOutput(this, 'OutputInvokeRoleArn', {
      exportName: 'UdfInvokeRoleArn',
      value: udfInvokeRole.roleArn,
    })
  }
}
