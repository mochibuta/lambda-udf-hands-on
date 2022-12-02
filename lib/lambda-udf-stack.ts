import * as path from 'path'

import { Duration, Stack, StackProps } from 'aws-cdk-lib'
import { Vpc } from 'aws-cdk-lib/aws-ec2'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'

export class LambdaUdfStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    functionName: string,
    props?: StackProps,
  ) {
    super(scope, id, props)

    const vpc = Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true })

    new NodejsFunction(this, 'UdfPokemonNameTranslate', {
      functionName,
      entry: path.resolve('@lambda/udf-pokemon-name-translate/index.ts'),
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(1),
      memorySize: 256,
      architecture: Architecture.ARM_64,
      bundling: { nodeModules: ['pokemon'] },
      vpc,
      allowPublicSubnet: true,
    })
  }
}
