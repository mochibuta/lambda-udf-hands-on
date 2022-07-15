#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'

import { LambdaUdfHandsOnStack } from '../lib/lambda-udf-hands-on-stack'

const app = new cdk.App()

new LambdaUdfHandsOnStack(app, 'LambdaUdfHandsOnStack', {})
