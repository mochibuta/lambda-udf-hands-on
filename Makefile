BUCKET_NAME=$(shell aws cloudformation describe-stacks --stack-name RedshiftStack | jq -r '.Stacks[] | .Outputs[] | select(.OutputKey == "OutputDataBucketName") | .OutputValue')
SECRET_ID=$(shell aws cloudformation describe-stacks --stack-name RedshiftStack | jq -r '.Stacks[] | .Outputs[] | select(.OutputKey == "OutputRedshiftSecretId") | .OutputValue')
FUNCTION_NAME=udf-pokemon-name-translate
.PHONY: up upload-dataset describe-secret cleanup

up:
	npx cdk deploy

upload-dataset:
	aws s3 cp ./dataset/pokemon.csv s3://${BUCKET_NAME}/pokemon.csv

describe-secret:
	aws secretsmanager get-secret-value --secret-id ${SECRET_ID}

cleanup:
	npx cdk destroy -f --all