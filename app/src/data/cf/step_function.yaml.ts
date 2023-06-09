export const yaml = `AWSTemplateFormatVersion: "2010-09-09"
Description: "Salesforce StepFunction Stack"
Metadata:
  "AWS::CloudFormation::Interface":
    ParameterGroups:
      - Label:
          default: "** REQUIRED FIELDS **"
        Parameters:
          - ParentVPCStack
          - ParentDataStack
          - ParentBucketStack
          - ConnectionName
          - InstallationId
      - Label:
          default: "Lambda Parameters"
        Parameters:
          - StepFunctionAssetZip
          - PullSchemaLambdaTimeout
          - PullSchemaLambdaMemory
          - UpdateFlowLambdaTimeout
          - UpdateFlowLambdaMemory
          - CleanupSQLLambdaTimeout
          - CleanupSQLLambdaMemory
          - StatusReportLambdaTimeout
          - StatusReportLambdaMemory
          - SetupSQLLambdaTimeout
          - SetupSQLLambdaMemory
          - ProcessImportLambdaTimeout
          - ProcessImportLambdaMemory
          - ListEntitiesLambdaTimeout
          - ListEntitiesLambdaMemory
          - FinalizeSQLLambdaTimeout
          - FinalizeSQLLambdaMemory
      - Label:
          default: "Import Workflow Step Function"
        Parameters:
          - ImportWorkflowCron
          - ImportWorkflowCronEnabled
          - SchemaChangeConcurrency
          - ImportConcurrency
Parameters:
  ParentVPCStack:
    Description: "Stack name of parent VPC stack."
    Type: String
    AllowedPattern: ".{3,}"
  ParentDataStack:
    Description: "The name of the Datastore stack."
    Type: String
    AllowedPattern: ".{3,}"
  ParentBucketStack:
    Description: "The name of the bucket stack."
    Type: String
    AllowedPattern: ".{3,}"
  ConnectionName:
    Description: "The name of the AppFlow connection which is connected to Salesforce."
    Type: String
    AllowedPattern: ".{3,}"
  InstallationId:
    Description: "The unique name for this system such that it will not conflict globally with any other installation of this system. Must only contain alphanumeric characters (no special punctuation such as _ , _ . & ! + = etc.)"
    Type: String
    AllowedPattern: "[a-z0-9]{8,}"
  ImportWorkflowCron:
    Description: "The cron expression for AWS EventBridge to execute the import workflow step function"
    Type: String
    Default: "cron(* * * * ? 2199)"
  ImportWorkflowCronEnabled:
    Description: "If the cron is enabled or not. Disable during initial hydration."
    Type: String
    AllowedValues: ["true", "false"]
    Default: "false"
  StepFunctionAssetZip:
    Description: "The source code for the Step Function Lambda zip file."
    Type: String
    Default: "assets/step-function-lambdas.zip"
  PullSchemaLambdaTimeout:
    Description: Maximum Lambda invocation runtime in seconds. (min 1 - 900 max)
    Default: 60
    Type: Number
  PullSchemaLambdaMemory:
    Description: Lambda memory in MB (min 128 - 10240 max).
    Default: 128
    Type: Number
  UpdateFlowLambdaTimeout:
    Description: Maximum Lambda invocation runtime in seconds. (min 1 - 900 max)
    Default: 60
    Type: Number
  UpdateFlowLambdaMemory:
    Description: Lambda memory in MB (min 128 - 10240 max).
    Default: 128
    Type: Number
  CleanupSQLLambdaTimeout:
    Description: Maximum Lambda invocation runtime in seconds. (min 1 - 900 max)
    Default: 60
    Type: Number
  CleanupSQLLambdaMemory:
    Description: Lambda memory in MB (min 128 - 10240 max).
    Default: 128
    Type: Number
  StatusReportLambdaTimeout:
    Description: Maximum Lambda invocation runtime in seconds. (min 1 - 900 max)
    Default: 60
    Type: Number
  StatusReportLambdaMemory:
    Description: Lambda memory in MB (min 128 - 10240 max).
    Default: 128
    Type: Number
  SetupSQLLambdaTimeout:
    Description: Maximum Lambda invocation runtime in seconds. (min 1 - 900 max)
    Default: 60
    Type: Number
  SetupSQLLambdaMemory:
    Description: Lambda memory in MB (min 128 - 10240 max).
    Default: 128
    Type: Number
  ProcessImportLambdaTimeout:
    Description: Maximum Lambda invocation runtime in seconds. (min 1 - 900 max)
    Default: 600
    Type: Number
  ProcessImportLambdaMemory:
    Description: Lambda memory in MB (min 128 - 10240 max).
    Default: 512
    Type: Number
  ListEntitiesLambdaTimeout:
    Description: Maximum Lambda invocation runtime in seconds. (min 1 - 900 max)
    Default: 60
    Type: Number
  ListEntitiesLambdaMemory:
    Description: Lambda memory in MB (min 128 - 10240 max).
    Default: 128
    Type: Number
  FinalizeSQLLambdaTimeout:
    Description: Maximum Lambda invocation runtime in seconds. (min 1 - 900 max)
    Default: 60
    Type: Number
  FinalizeSQLLambdaMemory:
    Description: Lambda memory in MB (min 128 - 10240 max).
    Default: 128
    Type: Number
  SchemaChangeConcurrency:
    Description: Concurrency rate at which the system will interact with AppFlow to pull and update the salesforce schema (will interact with salesforce behind to pull the new schema)
    Default: 5
    Type: Number
    MinValue: 1
    MaxValue: 30 # Don't want to get throttled, extremely large values will do this
  ImportConcurrency:
    Description: Concurrency rate at which the system will execute AppFlow flows to pull data from Salesforce.
    Default: 5
    Type: Number
    MinValue: 1
    MaxValue: 30 # Don't want to get throttled, extremely large values will do this
Conditions:
  IsImportWorkflowCronEnabled: !And
    - !Equals [!Ref ImportWorkflowCronEnabled, "true"]
    - !Not [!Equals [!Ref ImportWorkflowCronEnabled, "cron(* * * * ? 2199)"]]
Resources:
  ImportWorkflowCronRule:
    Type: AWS::Events::Rule
    Properties:
      Name: !Join
        - "_"
        - - sf
          - "import_workflow_cron"
          - !Ref InstallationId
      Description: "Rule to start execution of the step function to perform ingestion"
      ScheduleExpression: !Ref ImportWorkflowCron
      State: !If
        - IsImportWorkflowCronEnabled
        - "ENABLED"
        - "DISABLED"
      Targets:
        - Id: !Join
            - "_"
            - - sf
              - "import_workflow_cron"
              - !Ref InstallationId
          Arn: !Ref ImportWorkflow
          Input: "{}"
          RoleArn: !GetAtt ImportWorkflowCronRole.Arn
  ImportWorkflowCronRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "events.amazonaws.com"
      Policies:
        - PolicyName: "StartStepFunction"
          PolicyDocument:
            Statement:
              - Action:
                  - states:StartExecution
                Effect: Allow
                Resource: !Ref ImportWorkflow
  AccessSchemasManagedPolicy:
    Type: "AWS::IAM::ManagedPolicy"
    Properties:
      Description: Policy for accessing the schema files on S3
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: "S3"
            Action:
              - s3:GetObject
            Effect: "Allow"
            Resource:
              - !Sub
                - "arn:\${AWS::Partition}:s3:::\${BucketName}/schemas/*"
                - BucketName:
                    Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
          - Sid: "KMS"
            Action:
              - "kms:Decrypt"
              - "kms:GenerateDataKey"
            Effect: "Allow"
            Resource:
              - !Sub
                - "arn:\${AWS::Partition}:kms:\${AWS::Region}:\${AWS::AccountId}:key/\${KeyName}"
                - KeyName:
                    Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucketKey"
  WriteSchemasManagedPolicy:
    Type: "AWS::IAM::ManagedPolicy"
    Properties:
      Description: Policy for writing the schema files on S3
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: "S3"
            Action:
              - s3:PutObject
              - s3:DeleteObject
            Effect: "Allow"
            Resource:
              - !Sub
                - "arn:\${AWS::Partition}:s3:::\${BucketName}/schemas/*"
                - BucketName:
                    Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
          - Sid: "KMS"
            Action:
              - "kms:Encrypt"
            Effect: "Allow"
            Resource:
              - !Sub
                - "arn:\${AWS::Partition}:kms:\${AWS::Region}:\${AWS::AccountId}:key/\${KeyName}"
                - KeyName:
                    Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucketKey"
  AccessRDSManagedPolicy:
    Type: "AWS::IAM::ManagedPolicy"
    Properties:
      Description: Policy for accessing Aurora RDS
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: "SecretManagerAccess"
            Action:
              - "secretsmanager:GetSecretValue"
            Effect: "Allow"
            Resource: !Sub
              - "arn:\${AWS::Partition}:secretsmanager:\${AWS::Region}:\${AWS::AccountId}:secret:\${SecretNamePrefix}*"
              - SecretNamePrefix:
                  Fn::ImportValue: !Sub "\${ParentDataStack}-Secret"
          - Sid: "KMS"
            Action:
              - "kms:Encrypt"
              - "kms:Decrypt"
              - "kms:GenerateDataKey"
            Effect: "Allow"
            Resource:
              - !Sub
                - "arn:\${AWS::Partition}:kms:\${AWS::Region}:\${AWS::AccountId}:key/\${KeyName}"
                - KeyName:
                    Fn::ImportValue: !Sub "\${ParentDataStack}-SecretKey"
  PullSchemaLambda:
    Type: "AWS::Lambda::Function"
    Properties:
      Code:
        S3Bucket:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-AssetsBucket"
        S3Key: !Ref StepFunctionAssetZip
      Description: "Pulls the Salesforce schema from AppFlow and stores in S3"
      FunctionName: !Join
        - "_"
        - - sf
          - "pull_schema"
          - !Ref InstallationId
      Handler: dist/pullNewSchema.handler
      MemorySize: !Ref PullSchemaLambdaMemory
      Role: !GetAtt PullSchemaLambdaRole.Arn
      Runtime: nodejs14.x
      Timeout: !Ref PullSchemaLambdaTimeout
      Environment:
        Variables:
          METADATA_BUCKET:
            Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
          CONNECTION_NAME: !Ref ConnectionName
          METADATA_BUCKET_KEY:
            Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucketKey"
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W89
            reason: Cannot put lambda into VPC because then lambda cannot communicate with AppFlow (no VPC Endpoint available)
          - id: W92
            reason: ReservedConcurrentExecutions cannot be used because maximum invocations cannot be determined
          - id: W58
            reason: Permissions to write logs is in managed policy
  PullSchemaLambdaRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "lambda.amazonaws.com"
      ManagedPolicyArns:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-LambdaManagedPolicy"
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-VPCLambdaManagedPolicy"
        - !Ref AccessSchemasManagedPolicy
        - !Ref WriteSchemasManagedPolicy
      Policies:
        - PolicyName: "AppFlow"
          PolicyDocument:
            Statement:
              - Action:
                  - appflow:DescribeConnectorEntity
                Effect: Allow
                Resource: !Sub arn:\${AWS::Partition}:appflow:\${AWS::Region}:\${AWS::AccountId}:connectorprofile/\${ConnectionName}
  UpdateFlowLambda:
    Type: "AWS::Lambda::Function"
    Properties:
      Code:
        S3Bucket:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-AssetsBucket"
        S3Key: !Ref StepFunctionAssetZip
      Description: "Updates the AppFlow schema from the metadata stored in S3"
      FunctionName: !Join
        - "_"
        - - sf
          - "update_schema"
          - !Ref InstallationId
      Handler: dist/updateFlowSchema.handler
      MemorySize: !Ref UpdateFlowLambdaMemory
      Role: !GetAtt UpdateFlowLambdaRole.Arn
      Runtime: nodejs14.x
      Timeout: !Ref UpdateFlowLambdaTimeout
      Environment:
        Variables:
          METADATA_BUCKET:
            Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
          IMPORT_BUCKET: !Ref ImportDataBucket
          CONNECTION_NAME: !Ref ConnectionName
          APPFLOW_KMS_KEY_ARN: !GetAtt ImportDataBucketKey.Arn
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W89
            reason: Cannot put lambda into VPC because then lambda cannot communicate with AppFlow (no VPC Endpoint available)
          - id: W92
            reason: ReservedConcurrentExecutions cannot be used because maximum invocations cannot be determined
          - id: W58
            reason: Permissions to write logs is in managed policy
  UpdateFlowLambdaRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "lambda.amazonaws.com"
      ManagedPolicyArns:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-LambdaManagedPolicy"
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-VPCLambdaManagedPolicy"
        - !Ref AccessSchemasManagedPolicy
      Policies:
        - PolicyName: "AppFlow"
          PolicyDocument:
            Statement:
              - Action:
                  - appflow:DescribeFlow
                  - appflow:UpdateFlow
                  - appflow:CreateFlow
                Effect: Allow
                Resource: !Sub arn:\${AWS::Partition}:appflow:\${AWS::Region}:\${AWS::AccountId}:flow/*
        - PolicyName: "AppFlowProfile"
          PolicyDocument:
            Statement:
              - Action:
                  - appflow:UseConnectorProfile
                Effect: Allow
                Resource: !Sub arn:\${AWS::Partition}:appflow:\${AWS::Region}:\${AWS::AccountId}:connectorprofile/\${ConnectionName}
        - PolicyName: "CreateFlowS3Permissions"
          PolicyDocument:
            Statement:
              - Action:
                  - s3:ListAllMyBuckets
                  - s3:ListBucket
                  - s3:GetBucketLocation
                  - s3:GetBucketPolicy
                Effect: Allow
                Resource: "*"
        - PolicyName: "CreateFlowKMSPermissions"
          PolicyDocument:
            Statement:
              - Action:
                  - kms:ListKeys
                  - kms:DescribeKey
                  - kms:ListAliases
                  - kms:CreateGrant
                  - kms:ListGrants
                Effect: Allow
                Resource: !Sub arn:\${AWS::Partition}:kms:\${AWS::Region}:\${AWS::AccountId}:*
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W11
            reason: All S3 resources is equivalent to Resource *
  SetupSQLLambda:
    Type: "AWS::Lambda::Function"
    Properties:
      Code:
        S3Bucket:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-AssetsBucket"
        S3Key: !Ref StepFunctionAssetZip
      Description: "Updates the AppFlow schema from the metadata stored in S3"
      FunctionName: !Join
        - "_"
        - - sf
          - "setup_sql"
          - !Ref InstallationId
      Handler: dist/setupSQL.handler
      MemorySize: !Ref SetupSQLLambdaMemory
      Role: !GetAtt SetupSQLLambdaRole.Arn
      Runtime: nodejs14.x
      Timeout: !Ref SetupSQLLambdaTimeout
      VpcConfig:
        SecurityGroupIds:
          - Fn::ImportValue: !Sub "\${ParentDataStack}-LambdaSecurityGroup"
        SubnetIds: !Split
          - ","
          - Fn::ImportValue: !Sub "\${ParentVPCStack}-Subnets"
      Environment:
        Variables:
          METADATA_BUCKET:
            Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
          DB_SECRET_NAME:
            Fn::ImportValue: !Sub "\${ParentDataStack}-Secret"
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W92
            reason: ReservedConcurrentExecutions cannot be used because maximum invocations cannot be determined
          - id: W58
            reason: Permissions to write logs is in managed policy
  SetupSQLLambdaRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "lambda.amazonaws.com"
      ManagedPolicyArns:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-LambdaManagedPolicy"
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-VPCLambdaManagedPolicy"
        - !Ref AccessSchemasManagedPolicy
        - !Ref AccessRDSManagedPolicy
  StatusReportLambda:
    Type: "AWS::Lambda::Function"
    Properties:
      Code:
        S3Bucket:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-AssetsBucket"
        S3Key: !Ref StepFunctionAssetZip
      Description: "Reports the status of the import"
      FunctionName: !Join
        - "_"
        - - sf
          - "status_report"
          - !Ref InstallationId
      Handler: dist/statusReport.handler
      MemorySize: !Ref StatusReportLambdaMemory
      Role: !GetAtt StatusReportLambdaRole.Arn
      Runtime: nodejs14.x
      Timeout: !Ref StatusReportLambdaTimeout
      VpcConfig:
        SecurityGroupIds:
          - Fn::ImportValue: !Sub "\${ParentDataStack}-LambdaSecurityGroup"
        SubnetIds: !Split
          - ","
          - Fn::ImportValue: !Sub "\${ParentVPCStack}-Subnets"
      Environment:
        Variables:
          DB_SECRET_NAME:
            Fn::ImportValue: !Sub "\${ParentDataStack}-Secret"
          METADATA_BUCKET:
            Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
          METADATA_BUCKET_KEY:
            Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucketKey"
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W92
            reason: ReservedConcurrentExecutions cannot be used because maximum invocations cannot be determined
          - id: W58
            reason: Permissions to write logs is in managed policy
  StatusReportLambdaRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "lambda.amazonaws.com"
      ManagedPolicyArns:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-LambdaManagedPolicy"
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-VPCLambdaManagedPolicy"
        - !Ref AccessRDSManagedPolicy
      Policies:
        - PolicyName: "S3"
          PolicyDocument:
            Statement:
              - Action:
                  - s3:PutObject
                Effect: "Allow"
                Resource:
                  - !Sub
                    - "arn:\${AWS::Partition}:s3:::\${BucketName}/state/runs/*"
                    - BucketName:
                        Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
              - Action:
                  - "kms:Encrypt"
                  - "kms:GenerateDataKey"
                Effect: "Allow"
                Resource:
                  - !Sub
                    - "arn:\${AWS::Partition}:kms:\${AWS::Region}:\${AWS::AccountId}:key/\${KeyName}"
                    - KeyName:
                        Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucketKey"
  CleanupSQLLambda:
    Type: "AWS::Lambda::Function"
    Properties:
      Code:
        S3Bucket:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-AssetsBucket"
        S3Key: !Ref StepFunctionAssetZip
      Description: "Updates the AppFlow schema from the metadata stored in S3"
      FunctionName: !Join
        - "_"
        - - sf
          - "cleanup_sql"
          - !Ref InstallationId
      Handler: dist/cleanupSQL.handler
      MemorySize: !Ref CleanupSQLLambdaMemory
      Role: !GetAtt CleanupSQLLambdaRole.Arn
      Runtime: nodejs14.x
      Timeout: !Ref CleanupSQLLambdaTimeout
      VpcConfig:
        SecurityGroupIds:
          - Fn::ImportValue: !Sub "\${ParentDataStack}-LambdaSecurityGroup"
        SubnetIds: !Split
          - ","
          - Fn::ImportValue: !Sub "\${ParentVPCStack}-Subnets"
      Environment:
        Variables:
          DB_SECRET_NAME:
            Fn::ImportValue: !Sub "\${ParentDataStack}-Secret"
          CONNECTION_NAME: !Ref ConnectionName
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W92
            reason: ReservedConcurrentExecutions cannot be used because maximum invocations cannot be determined
          - id: W58
            reason: Permissions to write logs is in managed policy
  CleanupSQLLambdaRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "lambda.amazonaws.com"
      ManagedPolicyArns:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-LambdaManagedPolicy"
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-VPCLambdaManagedPolicy"
        - !Ref AccessRDSManagedPolicy
      Policies:
        - PolicyName: "AppFlow"
          PolicyDocument:
            Statement:
              - Action:
                  - appflow:DescribeFlowExecutionRecords
                Effect: Allow
                Resource: !Sub arn:\${AWS::Partition}:appflow:\${AWS::Region}:\${AWS::AccountId}:flow/*
  FilterS3ListingLambda:
    Type: "AWS::Lambda::Function"
    Properties:
      Code:
        S3Bucket:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-AssetsBucket"
        S3Key: !Ref StepFunctionAssetZip
      Description: "Filters the metadata files list stored in S3"
      FunctionName: !Join
        - "_"
        - - sf
          - "filter_s3_listing"
          - !Ref InstallationId
      Handler: dist/filterSchemaListing.handler
      MemorySize: 128
      Role: !GetAtt FilterS3ListingRole.Arn
      Runtime: nodejs14.x
      Timeout: 60
      Environment:
        Variables:
          CONNECTION_NAME: !Ref ConnectionName
          METADATA_BUCKET:
            Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
          METADATA_BUCKET_KEY:
            Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucketKey"
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W89
            reason: Cannot put lambda into VPC because then lambda cannot communicate with AppFlow (no VPC Endpoint available)
          - id: W92
            reason: ReservedConcurrentExecutions cannot be used because maximum invocations cannot be determined
          - id: W58
            reason: Permissions to write logs is in managed policy
  FilterS3ListingRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "lambda.amazonaws.com"
      ManagedPolicyArns:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-LambdaManagedPolicy"
        - !Ref WriteSchemasManagedPolicy
      Policies:
        - PolicyName: "AppFlow"
          PolicyDocument:
            Statement:
              - Action:
                  - appflow:ListConnectorEntities
                Effect: Allow
                Resource: !Sub arn:\${AWS::Partition}:appflow:\${AWS::Region}:\${AWS::AccountId}:connectorprofile/\${ConnectionName}
  ProcessImportLambda:
    Type: "AWS::Lambda::Function"
    Properties:
      Code:
        S3Bucket:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-AssetsBucket"
        S3Key: !Ref StepFunctionAssetZip
      Description: "Processes AppFlow exported data that is on S3 and imports into RDS"
      FunctionName: !Join
        - "_"
        - - sf
          - "process_import"
          - !Ref InstallationId
      Handler: dist/processImport.handler
      MemorySize: !Ref ProcessImportLambdaMemory
      Role: !GetAtt ProcessImportRole.Arn
      Runtime: nodejs14.x
      Timeout: !Ref ProcessImportLambdaTimeout
      VpcConfig:
        SecurityGroupIds:
          - Fn::ImportValue: !Sub "\${ParentDataStack}-LambdaSecurityGroup"
        SubnetIds: !Split
          - ","
          - Fn::ImportValue: !Sub "\${ParentVPCStack}-Subnets"
      Environment:
        Variables:
          METADATA_BUCKET:
            Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
          MAX_MEMORY_SIZE: !Ref ProcessImportLambdaMemory
          DB_SECRET_NAME:
            Fn::ImportValue: !Sub "\${ParentDataStack}-Secret"
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W92
            reason: ReservedConcurrentExecutions cannot be used because maximum invocations cannot be determined
          - id: W58
            reason: Permissions to write logs is in managed policy
  ProcessImportRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "lambda.amazonaws.com"
      ManagedPolicyArns:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-LambdaManagedPolicy"
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-VPCLambdaManagedPolicy"
        - !Ref AccessSchemasManagedPolicy
        - !Ref AccessRDSManagedPolicy
      Policies:
        - PolicyName: SQS
          PolicyDocument:
            Statement:
              - Action:
                  - sqs:ReceiveMessage
                  - sqs:DeleteMessage
                  - sqs:GetQueueAttributes
                Effect: Allow
                Resource: !GetAtt ProcessImportQueue.Arn
        - PolicyName: KMS
          PolicyDocument:
            Statement:
              - Action:
                  - kms:Encrypt
                  - kms:Decrypt
                  - kms:GenerateDataKey
                Effect: Allow
                Resource:
                  - !Sub
                    - "arn:\${AWS::Partition}:kms:\${AWS::Region}:\${AWS::AccountId}:key/\${KeyName}"
                    - KeyName: !Ref ProcessImportKey
                  - !Sub
                    - "arn:\${AWS::Partition}:kms:\${AWS::Region}:\${AWS::AccountId}:key/\${KeyName}"
                    - KeyName: !Ref ImportDataBucketKey
        - PolicyName: S3
          PolicyDocument:
            Statement:
              - Action:
                  - s3:GetObject
                Effect: "Allow"
                Resource:
                  - !Sub
                    - "arn:\${AWS::Partition}:s3:::\${BucketName}/data/*"
                    - BucketName: !Ref ImportDataBucket
  ProcessImportLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      KmsKeyId: !GetAtt LogGroupKey.Arn
      RetentionInDays: 365
      LogGroupName: !Join
        - ""
        - - "/aws/lambda/"
          - !Ref ProcessImportLambda
  LogGroupKey:
    Type: "AWS::KMS::Key"
    DeletionPolicy: Delete
    Properties:
      Enabled: true
      EnableKeyRotation: true
      Description: "Key used for encrypting the CloudWatch Log Group"
      KeyPolicy:
        Version: "2012-10-17"
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Join
                - ""
                - - "arn:aws:iam::"
                  - !Ref "AWS::AccountId"
                  - ":root"
            Action: "kms:*"
            Resource: "*"
          - Sid: Allow Cloudwatch Usage
            Effect: Allow
            Principal:
              Service: logs.amazonaws.com
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:GenerateDataKey
            Resource: "*"
  LogGroupKeyAlias:
    Type: "AWS::KMS::Alias"
    Properties:
      AliasName: !Join
        - ""
        - - "alias/"
          - !Join
            - "-"
            - - "sf"
              - "lambda-log-group"
              - !Ref InstallationId
      TargetKeyId: !Ref LogGroupKey
  FinalizeSQLLambda:
    Type: "AWS::Lambda::Function"
    Properties:
      Code:
        S3Bucket:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-AssetsBucket"
        S3Key: !Ref StepFunctionAssetZip
      Description: "Finalize the import into RDS"
      FunctionName: !Join
        - "_"
        - - sf
          - "finalize"
          - !Ref InstallationId
      Handler: dist/finalizeSQL.handler
      MemorySize: !Ref FinalizeSQLLambdaMemory
      Role: !GetAtt FinalizeSQLRole.Arn
      Runtime: nodejs14.x
      Timeout: !Ref FinalizeSQLLambdaTimeout
      VpcConfig:
        SecurityGroupIds:
          - Fn::ImportValue: !Sub "\${ParentDataStack}-LambdaSecurityGroup"
        SubnetIds: !Split
          - ","
          - Fn::ImportValue: !Sub "\${ParentVPCStack}-Subnets"
      Environment:
        Variables:
          DB_SECRET_NAME:
            Fn::ImportValue: !Sub "\${ParentDataStack}-Secret"
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W92
            reason: ReservedConcurrentExecutions cannot be used because maximum invocations cannot be determined
          - id: W58
            reason: Permissions to write logs is in managed policy
  FinalizeSQLRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "lambda.amazonaws.com"
      ManagedPolicyArns:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-LambdaManagedPolicy"
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-VPCLambdaManagedPolicy"
        - !Ref AccessRDSManagedPolicy
  ListEntitiesLambda:
    Type: "AWS::Lambda::Function"
    Properties:
      Code:
        S3Bucket:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-AssetsBucket"
        S3Key: !Ref StepFunctionAssetZip
      Description: "Finalize the import into RDS"
      FunctionName: !Join
        - "_"
        - - sf
          - "list_entities"
          - !Ref InstallationId
      Handler: dist/listEntities.handler
      MemorySize: !Ref ListEntitiesLambdaMemory
      Role: !GetAtt ListEntitiesRole.Arn
      Runtime: nodejs14.x
      Timeout: !Ref ListEntitiesLambdaTimeout
      Environment:
        Variables:
          CONNECTION_NAME: !Ref ConnectionName
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W89
            reason: Cannot put lambda into VPC because then lambda cannot communicate with AppFlow (no VPC Endpoint available)
          - id: W92
            reason: ReservedConcurrentExecutions cannot be used because maximum invocations cannot be determined
          - id: W58
            reason: Permissions to write logs is in managed policy
  ListEntitiesRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "lambda.amazonaws.com"
      ManagedPolicyArns:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-LambdaManagedPolicy"
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-VPCLambdaManagedPolicy"
        - !Ref AccessRDSManagedPolicy
      Policies:
        - PolicyName: "AppFlow"
          PolicyDocument:
            Statement:
              - Action:
                  - appflow:ListConnectorEntities
                Effect: Allow
                Resource: !Sub arn:\${AWS::Partition}:appflow:\${AWS::Region}:\${AWS::AccountId}:connectorprofile/\${ConnectionName}
  ProcessImportRecordMetric:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: !Ref ProcessImportLogGroup
      FilterPattern: '[date, uuid, level, p="Processed", n="number", o="of", r="records:", numberOfRecords]'
      MetricTransformations:
        - MetricNamespace: Salesforce
          MetricName: RecordsProcessed
          MetricValue: \$numberOfRecords
  ImportWorkflowRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action:
              - "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service:
                - "states.amazonaws.com"
      Policies:
        - PolicyName: InvokeLambdas
          PolicyDocument:
            Statement:
              - Action:
                  - lambda:InvokeFunction
                Effect: Allow
                Resource:
                  - !GetAtt PullSchemaLambda.Arn
                  - !GetAtt UpdateFlowLambda.Arn
                  - !GetAtt SetupSQLLambda.Arn
                  - !GetAtt StatusReportLambda.Arn
                  - !GetAtt CleanupSQLLambda.Arn
                  - !GetAtt FilterS3ListingLambda.Arn
                  - !GetAtt FinalizeSQLLambda.Arn
                  - !GetAtt ListEntitiesLambda.Arn
        - PolicyName: "AppFlow"
          PolicyDocument:
            Statement:
              - Action:
                  - appflow:StartFlow
                  - appflow:DescribeFlowExecutionRecords
                Effect: Allow
                Resource: !Sub "arn:\${AWS::Partition}:appflow:\${AWS::Region}:\${AWS::AccountId}:*"
        - PolicyName: "SQS"
          PolicyDocument:
            Statement:
              - Action:
                  - sqs:GetQueueUrl
                  - sqs:GetQueueAttributes
                Effect: Allow
                Resource:
                  - !GetAtt ProcessImportQueue.Arn
                  - !GetAtt ProcessImportDeadLetterQueue.Arn
              - Action:
                  - sqs:PurgeQueue
                Effect: Allow
                Resource:
                  - !GetAtt ProcessImportDeadLetterQueue.Arn
        - PolicyName: "S3"
          PolicyDocument:
            Statement:
              - Action:
                  - s3:ListBucket
                Effect: Allow
                Resource:
                  - !Sub
                    - "arn:\${AWS::Partition}:s3:::\${BucketName}"
                    - BucketName:
                        Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
                Condition:
                  StringLike:
                    s3:prefix:
                      - "schemas/*"
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W76
            reason: SPCM is barely over limit, complexity necessary to add all lambdas to invoke policy
  ProcessImportKey:
    Type: "AWS::KMS::Key"
    DeletionPolicy: Delete
    Properties:
      Enabled: true
      EnableKeyRotation: true
      Description: "Key used for encrypting the Import SQS queue"
      KeyPolicy:
        Version: "2012-10-17"
        Id: key-s3
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Join
                - ""
                - - "arn:aws:iam::"
                  - !Ref "AWS::AccountId"
                  - ":root"
            Action: "kms:*"
            Resource: "*"
          - Sid: Allow SQS Usage
            Effect: Allow
            Principal:
              Service: sqs.amazonaws.com
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:GenerateDataKey
            Resource: "*"
          - Sid: Allow S3 Usage
            Effect: Allow
            Principal:
              Service: s3.amazonaws.com
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:GenerateDataKey
            Resource: "*"
          - Sid: Allow lambda Usage
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:GenerateDataKey
            Resource: "*"
  ProcessImportKeyAlias:
    Type: "AWS::KMS::Alias"
    Properties:
      AliasName: !Join
        - ""
        - - "alias/"
          - !Join
            - "-"
            - - "sf"
              - "queue"
              - !Ref InstallationId
      TargetKeyId: !Ref ProcessImportKey
  ProcessImportQueue:
    Type: AWS::SQS::Queue
    Properties:
      KmsDataKeyReusePeriodSeconds: 86400 # Cache KMS calls for an entire day to lower cost on KMS calls (this is max)
      KmsMasterKeyId: !Ref ProcessImportKey
      MessageRetentionPeriod: 86400 # Keep for 1 day, don't want rolling over to next day, rather move to DLQ and alarm
      QueueName: !Join
        - "-"
        - - "sf"
          - "import"
          - !Ref InstallationId
      VisibilityTimeout: !Ref ProcessImportLambdaTimeout # Same as maximum lambda processing time
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt ProcessImportDeadLetterQueue.Arn
        maxReceiveCount: 5
  ProcessImportDeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      KmsMasterKeyId: !Ref ProcessImportKey
      MessageRetentionPeriod: 1209600 # 14 days (maximum)
      QueueName: !Join
        - "-"
        - - "sf"
          - "import-dlq"
          - !Ref InstallationId
  ProcessImportQueuePolicy:
    Type: AWS::SQS::QueuePolicy
    Properties:
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: "s3.amazonaws.com"
            Action: sqs:SendMessage
            Resource: !GetAtt ProcessImportQueue.Arn
            Condition:
              ArnLike:
                aws:SourceArn: !Sub
                  - "arn:aws:s3:::\${ImportDataBucketName}"
                  - ImportDataBucketName: !Join # Break circular dependnecy
                      - "-"
                      - - "sf"
                        - "import"
                        - !Ref InstallationId
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action:
              - sqs:ReceiveMessage
              - sqs:DeleteMessage
              - sqs:GetQueueAttributes
            Resource: !GetAtt ProcessImportQueue.Arn
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:GenerateDataKey
            Resource:
              - !Sub
                - "arn:\${AWS::Partition}:kms:\${AWS::Region}:\${AWS::AccountId}:key/\${KeyName}"
                - KeyName: !Ref ProcessImportKey
          - Sid: DenyUnencryptedConnections
            Action:
              - sqs:*
            Condition:
              Bool:
                "aws:SecureTransport": false
            Effect: Deny
            Principal: "*"
            Resource: !GetAtt ProcessImportQueue.Arn
      Queues:
        - !Ref ProcessImportQueue
  ProcessImportQueueLambda:
    Type: AWS::Lambda::EventSourceMapping
    Properties:
      BatchSize: 10
      EventSourceArn: !GetAtt ProcessImportQueue.Arn
      FunctionName: !Ref ProcessImportLambda
      FunctionResponseTypes:
        - ReportBatchItemFailures
  ImportDataBucketKey:
    Type: "AWS::KMS::Key"
    DeletionPolicy: Delete
    Properties:
      Enabled: true
      EnableKeyRotation: true
      Description: "Key used for encrypting the Import data bucket"
      KeyPolicy:
        Version: "2012-10-17"
        Id: key-s3
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Join
                - ""
                - - "arn:aws:iam::"
                  - !Ref "AWS::AccountId"
                  - ":root"
            Action: "kms:*"
            Resource: "*"
          - Sid: Allow AppFlow Usage
            Effect: Allow
            Principal:
              Service: appflow.amazonaws.com
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:GenerateDataKey
            Resource: "*"
  ImportDataBucketKeyAlias:
    Type: "AWS::KMS::Alias"
    Properties:
      AliasName: !Join
        - ""
        - - "alias/"
          - !Join
            - "-"
            - - "sf"
              - "import"
              - !Ref InstallationId
      TargetKeyId: !Ref ImportDataBucketKey
  ImportDataBucket:
    Type: "AWS::S3::Bucket"
    DependsOn:
      - ProcessImportQueue
      - ProcessImportQueuePolicy
    DeletionPolicy: Delete # When torn down needs to remove everything completely and leave no charges billed
    Properties:
      BucketName: !Join
        - "-"
        - - "sf"
          - "import"
          - !Ref InstallationId
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: "aws:kms"
              KMSMasterKeyID: !Ref ImportDataBucketKey
      VersioningConfiguration:
        Status: Enabled
      AccessControl: Private
      LoggingConfiguration:
        DestinationBucketName:
          Fn::ImportValue: !Sub "\${ParentBucketStack}-LoggingBucket"
        LogFilePrefix: !Join
          - ""
          - - !Join
              - "-"
              - - "sf"
                - "import"
                - !Ref InstallationId
            - "/"
      LifecycleConfiguration:
        Rules:
          - Id: ExpireImport
            Prefix: "data/"
            Status: Enabled
            ExpirationInDays: 1
            AbortIncompleteMultipartUpload:
              DaysAfterInitiation: 1
            NoncurrentVersionExpiration:
              NoncurrentDays: 1
          - Id: CleanOtherPrefixes
            Prefix: "/"
            Status: Enabled
            AbortIncompleteMultipartUpload:
              DaysAfterInitiation: 7
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      NotificationConfiguration:
        QueueConfigurations:
          - Event: s3:ObjectCreated:*
            Queue: !GetAtt ProcessImportQueue.Arn
  ImportDataBucketPolicy:
    Type: "AWS::S3::BucketPolicy"
    Properties:
      Bucket: !Ref ImportDataBucket
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: "DenyIncorrectEncryptionHeader"
            Effect: "Deny"
            Principal: "*"
            Action: "s3:PutObject"
            Resource: !Join ["/", [!GetAtt ImportDataBucket.Arn, "*"]]
            Condition:
              StringNotEquals:
                "s3:x-amz-server-side-encryption": "aws:kms"
          - Sid: DenyPublishingUnencryptedResources
            Action: "s3:PutObject"
            Condition:
              "Null":
                "s3:x-amz-server-side-encryption": true
            Effect: Deny
            Principal: "*"
            Resource: !Join ["/", [!GetAtt ImportDataBucket.Arn, "*"]]
          - Sid: DenyUnencryptedConnections
            Action:
              - "s3:GetObject"
              - "s3:PutObject"
            Condition:
              Bool:
                "aws:SecureTransport": false
            Effect: Deny
            Principal: "*"
            Resource: !Join ["/", [!GetAtt ImportDataBucket.Arn, "*"]]
          - Sid: "AllowAppFlowDestinationActions"
            Effect: Allow
            Principal:
              Service: "appflow.amazonaws.com"
            Action:
              - "s3:PutObject"
              - "s3:AbortMultipartUpload"
              - "s3:ListMultipartUploadParts"
              - "s3:ListBucketMultipartUploads"
              - "s3:GetBucketAcl"
              - "s3:PutObjectAcl"
            Resource:
              - !GetAtt ImportDataBucket.Arn
              - !Join ["/", [!GetAtt ImportDataBucket.Arn, "*"]]
            Condition:
              StringEquals:
                aws:SourceAccount: !Sub "\${AWS::AccountId}"
  ImportFailedAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Join
        - "-"
        - - "sf"
          - "import-failed-alarm"
          - !Ref InstallationId
      AlarmActions:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-SNSAlarmTopic"
      AlarmDescription: The data import from Salesforce to AWS has failed and needs investigation.
      ComparisonOperator: GreaterThanOrEqualToThreshold
      DatapointsToAlarm: 1
      EvaluationPeriods: 1
      Namespace: AWS/States
      MetricName: ExecutionsFailed
      Dimensions:
        - Name: StateMachineArn
          Value: !GetAtt ImportWorkflow.Arn
      Period: 300 # 5 minutes
      Statistic: Sum
      Threshold: 1
      TreatMissingData: ignore
      Unit: Count
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W28
            reason: Name of alarm used for identifying which installation ID it belogns to
  ImportAbortedAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Join
        - "-"
        - - "sf"
          - "import-aborted-alarm"
          - !Ref InstallationId
      AlarmActions:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-SNSAlarmTopic"
      AlarmDescription: The data import from Salesforce to AWS has been aborted and needs investigation.
      ComparisonOperator: GreaterThanOrEqualToThreshold
      DatapointsToAlarm: 1
      EvaluationPeriods: 1
      Namespace: AWS/States
      MetricName: ExecutionsAborted
      Dimensions:
        - Name: StateMachineArn
          Value: !GetAtt ImportWorkflow.Arn
      Period: 300 # 5 minutes
      Statistic: Sum
      Threshold: 1
      TreatMissingData: ignore
      Unit: Count
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W28
            reason: Name of alarm used for identifying which installation ID it belogns to
  ImportThrottledAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Join
        - "-"
        - - "sf"
          - "import-throttled-alarm"
          - !Ref InstallationId
      AlarmActions:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-SNSAlarmTopic"
      AlarmDescription: The data import from Salesforce to AWS has been throttled (and so therefore did not run) and needs investigation.
      ComparisonOperator: GreaterThanOrEqualToThreshold
      DatapointsToAlarm: 1
      EvaluationPeriods: 1
      Namespace: AWS/States
      MetricName: ExecutionThrottled
      Dimensions:
        - Name: StateMachineArn
          Value: !GetAtt ImportWorkflow.Arn
      Period: 300 # 5 minutes
      Statistic: Sum
      Threshold: 1
      TreatMissingData: ignore
      Unit: Count
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W28
            reason: Name of alarm used for identifying which installation ID it belogns to
  ImportTimedOutAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Join
        - "-"
        - - "sf"
          - "import-timeout-alarm"
          - !Ref InstallationId
      AlarmActions:
        - Fn::ImportValue: !Sub "\${ParentVPCStack}-SNSAlarmTopic"
      AlarmDescription: The data import from Salesforce to AWS has timed out (and so therefore did not complete) and needs investigation.
      ComparisonOperator: GreaterThanOrEqualToThreshold
      DatapointsToAlarm: 1
      EvaluationPeriods: 1
      Namespace: AWS/States
      MetricName: ExecutionsTimedOut
      Dimensions:
        - Name: StateMachineArn
          Value: !GetAtt ImportWorkflow.Arn
      Period: 300 # 5 minutes
      Statistic: Sum
      Threshold: 1
      TreatMissingData: ignore
      Unit: Count
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: W28
            reason: Name of alarm used for identifying which installation ID it belogns to
  ImportWorkflow:
    Type: "AWS::StepFunctions::StateMachine"
    Properties:
      StateMachineName: !Join
        - "_"
        - - sf
          - "import"
          - !Ref InstallationId
      StateMachineType: STANDARD
      RoleArn: !GetAtt ImportWorkflowRole.Arn
      Definition:
        Comment: Pulls latest schema information, updates AppFlow and ingests the data into RDS
        StartAt: ListMetadataFiles1
        TimeoutSeconds: 82800 # 86400 is 24 hours, 82800 is 23 hours
        States:
          ListMetadataFiles1:
            Type: Task
            Next: FilterMetadataFiles1
            Parameters:
              Bucket:
                Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
              Prefix: "schemas/"
            Resource: arn:aws:states:::aws-sdk:s3:listObjectsV2
            OutputPath: \$.Contents
          FilterMetadataFiles1:
            Type: Task
            Resource: arn:aws:states:::lambda:invoke
            OutputPath: \$.Payload
            Parameters:
              Payload:
                schemas.\$: \$
              FunctionName: !Ref FilterS3ListingLambda
            Retry:
              - ErrorEquals:
                  - Lambda.ServiceException
                  - Lambda.AWSLambdaException
                  - Lambda.SdkClientException
                IntervalSeconds: 2
                MaxAttempts: 6
                BackoffRate: 2
            Comment: Filters Schema metadata files
            Next: UpdateFlow
          UpdateFlow:
            Type: Map
            Iterator:
              StartAt: StatusReportPrepare
              States:
                StatusReportPrepare:
                  Type: Task
                  Resource: arn:aws:states:::lambda:invoke
                  OutputPath: \$.Payload
                  Parameters:
                    Payload:
                      s3.\$: \$
                      executionId.\$: "\$\$.Execution.Name"
                      importStage: "PREPARE"
                    FunctionName: !Ref StatusReportLambda
                  Retry:
                    - ErrorEquals:
                        - Lambda.ServiceException
                        - Lambda.AWSLambdaException
                        - Lambda.SdkClientException
                      IntervalSeconds: 2
                      MaxAttempts: 6
                      BackoffRate: 2
                  Next: PullNewSchema
                  Comment: >-
                    Start the preparing status in the metadata bucket for this object.
                PullNewSchema:
                  Type: Task
                  Resource: arn:aws:states:::lambda:invoke
                  OutputPath: \$.Payload
                  Parameters:
                    Payload.\$: \$
                    FunctionName: !Ref PullSchemaLambda
                  Retry:
                    - ErrorEquals:
                        - Lambda.ServiceException
                        - Lambda.AWSLambdaException
                        - Lambda.SdkClientException
                        - ConnectorServerException # Caused by AppFlow
                      IntervalSeconds: 2
                      MaxAttempts: 6
                      BackoffRate: 2
                  Comment: >-
                    Query AppFlow to gather the new schema for new/changed fields and
                    write to S3.
                  Next: UpdateFlowSchema
                UpdateFlowSchema:
                  Type: Task
                  Resource: arn:aws:states:::lambda:invoke
                  OutputPath: \$.Payload
                  Parameters:
                    Payload.\$: \$
                    FunctionName: !Ref UpdateFlowLambda
                  Retry:
                    - ErrorEquals:
                        - Lambda.ServiceException
                        - Lambda.AWSLambdaException
                        - Lambda.SdkClientException
                        - ConnectorServerException # Caused by AppFlow
                      IntervalSeconds: 2
                      MaxAttempts: 6
                      BackoffRate: 2
                  Comment: >-
                    Rewrite the AppFlow schema with the metadata from S3 and update the flow,
                    returning the flow S3 key.
                  End: true
            Next: PurgeAndRun
            MaxConcurrency: !Ref SchemaChangeConcurrency
          PurgeAndRun:
            Type: Parallel
            Next: WaitSqs
            Branches:
              - StartAt: GetDLQUrlForPurge
                States:
                  GetDLQUrlForPurge:
                    Next: PurgeQueue
                    Parameters:
                      QueueName: !GetAtt ProcessImportDeadLetterQueue.QueueName
                    Resource: arn:aws:states:::aws-sdk:sqs:getQueueUrl
                    Type: Task
                  PurgeQueue:
                    Type: Task
                    End: true
                    Parameters:
                      QueueUrl.\$: \$.QueueUrl
                    Resource: arn:aws:states:::aws-sdk:sqs:purgeQueue
              - StartAt: RunFlow
                States:
                  RunFlow:
                    Type: Map
                    Iterator:
                      StartAt: StatusReportBegin
                      States:
                        StatusReportBegin:
                          Type: Task
                          Resource: arn:aws:states:::lambda:invoke
                          OutputPath: \$.Payload
                          Parameters:
                            Payload:
                              s3.\$: \$
                              executionId.\$: "\$\$.Execution.Name"
                              importStage: "BEGIN"
                            FunctionName: !Ref StatusReportLambda
                          Retry:
                            - ErrorEquals:
                                - Lambda.ServiceException
                                - Lambda.AWSLambdaException
                                - Lambda.SdkClientException
                              IntervalSeconds: 2
                              MaxAttempts: 6
                              BackoffRate: 2
                          Next: SetupSQL
                          Comment: >-
                            Start the in progress status in the metadata bucket for this object.
                        SetupSQL:
                          Type: Task
                          Resource: arn:aws:states:::lambda:invoke
                          OutputPath: \$.Payload
                          Parameters:
                            Payload.\$: \$
                            FunctionName: !Ref SetupSQLLambda
                          Retry:
                            - ErrorEquals:
                                - Lambda.ServiceException
                                - Lambda.AWSLambdaException
                                - Lambda.SdkClientException
                              IntervalSeconds: 2
                              MaxAttempts: 6
                              BackoffRate: 2
                          Next: StartFlow
                          Comment: >-
                            Setup a temporary table with schema defined the same as in metadata
                            bucket.
                        StartFlow:
                          Type: Task
                          Parameters:
                            FlowName.\$: \$.flowName
                          OutputPath: \$
                          Resource: arn:aws:states:::aws-sdk:appflow:startFlow
                          Next: WaitForFlowStart
                          ResultPath: \$.Result
                        WaitForFlowStart: # To ensure DescribeFlowExecutionRecords does not fire too quickly, wait one time before first attempt
                          Type: Wait
                          Seconds: 60
                          Next: DescribeFlowExecutionRecords
                        DescribeFlowExecutionRecords:
                          Type: Task
                          Next: FlowDone?
                          Parameters:
                            FlowName.\$: \$.flowName
                            MaxResults: 1
                          Resource: arn:aws:states:::aws-sdk:appflow:describeFlowExecutionRecords
                          ResultSelector:
                            flowStatus.\$: \$.FlowExecutions[0].ExecutionStatus
                          ResultPath: \$.Result
                        FlowDone?:
                          Type: Choice
                          Choices:
                            - Or:
                              - Variable: \$.Result.flowStatus
                                StringEquals: Successful
                              - Variable: \$.Result.flowStatus
                                StringEquals: Error
                              Next: StatusReportImport
                          Default: WaitForFlowCompletion
                        WaitForFlowCompletion:
                          Type: Wait
                          Seconds: 60
                          Next: DescribeFlowExecutionRecords
                        StatusReportImport:
                          Type: Task
                          Resource: arn:aws:states:::lambda:invoke
                          OutputPath: \$.Payload
                          Parameters:
                            Payload:
                              flowName.\$: \$.flowName
                              flowStatus.\$: \$.Result.flowStatus
                              executionId.\$: "\$\$.Execution.Name"
                              importStage: "IMPORT"
                            FunctionName: !Ref StatusReportLambda
                          Retry:
                            - ErrorEquals:
                                - Lambda.ServiceException
                                - Lambda.AWSLambdaException
                                - Lambda.SdkClientException
                              IntervalSeconds: 2
                              MaxAttempts: 6
                              BackoffRate: 2
                          End: true
                          Comment: >-
                            Start the preparing status in the metadata bucket for this object.
                    MaxConcurrency: !Ref ImportConcurrency
                    End: true
          WaitSqs:
            Type: Wait
            Seconds: 60
            Next: GetQueueUrl
          GetQueueUrl:
            Type: Task
            Parameters:
              QueueName: !GetAtt ProcessImportQueue.QueueName
            Resource: arn:aws:states:::aws-sdk:sqs:getQueueUrl
            Next: GetQueueAttributes
          GetQueueAttributes:
            Type: Task
            Parameters:
              QueueUrl.\$: \$.QueueUrl
              AttributeNames:
                - All
            Resource: arn:aws:states:::aws-sdk:sqs:getQueueAttributes
            Next: QueueDrained?
          QueueDrained?:
            Type: Choice
            Choices:
              - And:
                  - Variable: \$.Attributes.ApproximateNumberOfMessagesNotVisible
                    StringEquals: "0"
                  - Variable: \$.Attributes.ApproximateNumberOfMessagesDelayed
                    StringEquals: "0"
                  - Variable: \$.Attributes.ApproximateNumberOfMessages
                    StringEquals: "0"
                Next: "GetQueueUrlDLQ"
            Default: WaitSqs
          GetQueueUrlDLQ:
            Type: Task
            Next: GetQueueAttributesDLQ
            Parameters:
              QueueName: !GetAtt ProcessImportDeadLetterQueue.QueueName
            Resource: arn:aws:states:::aws-sdk:sqs:getQueueUrl
          GetQueueAttributesDLQ:
            Type: Task
            Parameters:
              QueueUrl.\$: \$.QueueUrl
              AttributeNames:
                - All
            Resource: arn:aws:states:::aws-sdk:sqs:getQueueAttributes
            Next: ListMetadataFiles2
          # QueueEmpty?:
          #   Type: Choice
          #   Choices:
          #     - And:
          #         - Variable: \$.Attributes.ApproximateNumberOfMessagesNotVisible
          #           StringEquals: "0"
          #         - Variable: \$.Attributes.ApproximateNumberOfMessagesDelayed
          #           StringEquals: "0"
          #         - Variable: \$.Attributes.ApproximateNumberOfMessages
          #           StringEquals: "0"
          #       Next: "ListMetadataFiles2"
          #   Default: Fail # TODO: Go to error handlers
          # Fail:
          #   Type: Pass
          #   End: true
          ListMetadataFiles2:
            Type: Task
            Next: FilterMetadataFiles2
            Parameters:
              Bucket:
                Fn::ImportValue: !Sub "\${ParentBucketStack}-MetadataBucket"
              Prefix: "schemas/"
            Resource: arn:aws:states:::aws-sdk:s3:listObjectsV2
            OutputPath: \$.Contents
          FilterMetadataFiles2:
            Type: Task
            Resource: arn:aws:states:::lambda:invoke
            OutputPath: \$.Payload
            Parameters:
              Payload:
                schemas.\$: \$
              FunctionName: !Ref FilterS3ListingLambda
            Retry:
              - ErrorEquals:
                  - Lambda.ServiceException
                  - Lambda.AWSLambdaException
                  - Lambda.SdkClientException
                IntervalSeconds: 2
                MaxAttempts: 6
                BackoffRate: 2
            Comment: Filters Schema metadata files
            Next: CleanupSQLTables
          CleanupSQLTables:
            Type: Map
            Next: ListEntities
            MaxConcurrency: !Ref SchemaChangeConcurrency
            ResultSelector:
              schemas.\$: \$
            Iterator:
              StartAt: CleanupSQL
              States:
                CleanupSQL:
                  Type: Task
                  Resource: arn:aws:states:::lambda:invoke
                  OutputPath: \$.Payload
                  Parameters:
                    Payload.\$: \$
                    FunctionName: !Ref CleanupSQLLambda
                  Retry:
                    - ErrorEquals:
                        - Lambda.ServiceException
                        - Lambda.AWSLambdaException
                        - Lambda.SdkClientException
                      IntervalSeconds: 2
                      MaxAttempts: 6
                      BackoffRate: 2
                  Comment: Drop real table, rename temporary table to new name.
                  Next: DescribeFlowExecutionRecordsFinal
                DescribeFlowExecutionRecordsFinal:
                  Type: Task
                  Next: StatusReportCleanup
                  Parameters:
                    FlowName.\$: \$.flowName
                    MaxResults: 1
                  ResultPath: \$.flow
                  ResultSelector:
                    execution.\$: \$.FlowExecutions[0]
                  Resource: arn:aws:states:::aws-sdk:appflow:describeFlowExecutionRecords
                StatusReportCleanup:
                  Type: Task
                  Resource: arn:aws:states:::lambda:invoke
                  OutputPath: \$.Payload
                  Parameters:
                    Payload:
                      flowName.\$: \$.flowName
                      flow.\$: \$.flow.execution
                      executionId.\$: "\$\$.Execution.Name"
                      importStage: "CLEANUP"
                    FunctionName: !Ref StatusReportLambda
                  Retry:
                    - ErrorEquals:
                        - Lambda.ServiceException
                        - Lambda.AWSLambdaException
                        - Lambda.SdkClientException
                      IntervalSeconds: 2
                      MaxAttempts: 6
                      BackoffRate: 2
                  End: true
                  Comment: >-
                    Finish the status and gather metrics in the metadata bucket for this object.
          ListEntities:
            Type: Task
            Resource: arn:aws:states:::lambda:invoke
            OutputPath: \$.Result.Payload
            Parameters:
              FunctionName: !Ref ListEntitiesLambda
            Retry:
              - ErrorEquals:
                  - Lambda.ServiceException
                  - Lambda.AWSLambdaException
                  - Lambda.SdkClientException
                IntervalSeconds: 2
                MaxAttempts: 6
                BackoffRate: 2
            Comment: List Salesforce entities
            Next: FinalizeSQL
            ResultPath: \$.Result
          FinalizeSQL:
            Type: Task
            Resource: arn:aws:states:::lambda:invoke
            OutputPath: \$.Payload
            Parameters:
              Payload:
                objects.\$: \$
              FunctionName: !Ref FinalizeSQLLambda
            Retry:
              - ErrorEquals:
                  - Lambda.ServiceException
                  - Lambda.AWSLambdaException
                  - Lambda.SdkClientException
                IntervalSeconds: 2
                MaxAttempts: 6
                BackoffRate: 2
            Comment: Drop temporary use schemas
            End: true
Outputs:
  StackName:
    Description: "Stack name."
    Value: !Sub "\${AWS::StackName}"
  ImportWorkflow:
    Description: "Ingestion step function ARN which processes import of data into RDS."
    Value: !GetAtt ImportWorkflow.Arn
    Export:
      Name: !Sub "\${AWS::StackName}-ImportWorkflow"
  ImportWorkflowName:
    Description: "Ingestion step function name which processes import of data into RDS."
    Value: !GetAtt ImportWorkflow.Name
    Export:
      Name: !Sub "\${AWS::StackName}-ImportWorkflowName"
  ImportDataBucketName:
    Description: "The name of the import data bucket."
    Value: !Ref ImportDataBucket
    Export:
      Name: !Sub "\${AWS::StackName}-ImportDataBucket"
  ImportDataBucketKey:
    Description: "The KMS key of the import data bucket."
    Value: !Ref ImportDataBucketKey
    Export:
      Name: !Sub "\${AWS::StackName}-ImportDataBucketKey"
  ImportFailedAlarm:
    Description: Step function failed alarm ARN
    Value: !GetAtt ImportFailedAlarm.Arn
    Export:
      Name: !Sub "\${AWS::StackName}-ImportFailedAlarm"
  ImportAbortedAlarm:
    Description: Step function aborted alarm ARN
    Value: !GetAtt ImportAbortedAlarm.Arn
    Export:
      Name: !Sub "\${AWS::StackName}-ImportAbortedAlarm"
  ImportThrottledAlarm:
    Description: Step function throttled alarm ARN
    Value: !GetAtt ImportThrottledAlarm.Arn
    Export:
      Name: !Sub "\${AWS::StackName}-ImportThrottledAlarm"
  ImportTimedOutAlarm:
    Description: Step function timeout alarm ARN
    Value: !GetAtt ImportTimedOutAlarm.Arn
    Export:
      Name: !Sub "\${AWS::StackName}-ImportTimedOutAlarm"
`