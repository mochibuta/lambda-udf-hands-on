#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'

import { LambdaUdfStack } from '../lib/lambda-udf-stack'
import { RedshiftStack } from '../lib/redshift-stack'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
}

const udfFunctionName = 'udf-pokemon-name-translate'

new RedshiftStack(app, 'RedshiftStack', udfFunctionName, { env })
new LambdaUdfStack(app, 'LambdaUdfStack', udfFunctionName, { env })
