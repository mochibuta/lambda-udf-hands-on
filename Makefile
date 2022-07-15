ROLE_ARN=$(shell aws cloudformation describe-stacks --stack-name LambdaUdfHandsOnStack | jq -r '.Stacks[] | .Outputs[] | select(.OutputKey == "OutputInvokeRoleArn") | .OutputValue')
BUCKET_NAME=$(shell aws cloudformation describe-stacks --stack-name LambdaUdfHandsOnStack | jq -r '.Stacks[] | .Outputs[] | select(.OutputKey == "OutputDataBucketName") | .OutputValue')
FUNCTION_NAME=udf-pokemon-name-translate
.PHONY: up attach-role upload-dataset cleanup

up:
	npx cdk deploy

attach-role:
	aws redshift modify-cluster-iam-roles --cluster-identifier ${REDSHIFT_CLUSTER} --add-iam-roles ${ROLE_ARN}

upload-dataset:
	aws s3 cp ./dataset/pokemon.csv s3://${BUCKET_NAME}/pokemon.csv

cleanup:
	aws redshift  modify-cluster-iam-roles --remove-iam-roles ${ROLE_ARN} --cluster-identifier ${REDSHIFT_CLUSTER} > /dev/null
	npx cdk destroy -f