# Development

Development of the system has two parts, the front-end static single page application written in React and the back-end cloud formation stacks and step function lambdas. Each have their own respective ways of reaching a quick feedback loop for changes to the system and are described here.

### Setup

To setup the system to run locally, place AWS credentials into a file in `app/.env.local` (the starting period is important to make this a hidden file). The file should look like this: (Note you'll need to keep reading to get some of these values)

```javascript
REACT_APP_LOCAL_DEV=true
REACT_APP_ASSET_WEBSITE_URL=https://<YOUR_AMPLIFY_ENVIRONMENT>.<AMPLIFY_RANDOM_HOSTNAME>.amplifyapp.com
REACT_APP_ACCESS_KEY=<AWS_ACCESS_KEY>
REACT_APP_SECRET_KEY=<AWS_SECRET_KEY>
```

See building below, once built use the `app/amplify.zip` in AWS Amplify to create a new application. Go to `New App`, and select `Host web app`. On the next screen select `Deploy without Git provider` (customers don't necessarily need to do this, this is for development only) and click `Continue`. Give the application a name and an environment name or leave them blank and let Amplify pick for you. Drag and drop the generated `app/amplify.zip` file into the appropriate box and click `Save and deploy`. Once deployment is completed you can use the URL in the `.env.local` file. To update the application, visit it in the AWS Amplify console and drag the new zip file to the environment and wait for the deployment to complete.

When the system is running locally, the `.env.local` will be what the system uses for credentials so you don't need to put them in every time the page refreshes. This is also where development environment variables are set such as the `LOCAL_DEV` environment variables. It's important to note that the actual environment variables name must be `REACT_APP_<NAME_OF_ENV_VAR>` but then inside the code can be accessed like `process.env.NAME_OF_ENV_VAR`. React does this to prevent leaking external environment variables accidentally into the application.

### Building, Cleaning and Running

To build the system, at the root of the project execute the `build.sh` file to execute each of the respective `npm` projects in the correct order. Running `clean.sh` should clean any build artifacts generated by this process, with the exception of the `node_modules` folders in each project which remain.

Starting the system, or launching the Web UI, can be done by running the `start.sh` script or by running `yarn start` from within the `app/` folder (as this is all the script does anyhow).

The build process will do the following:

- Build the `infra/custom_resources/`'s `npm` project by running `yarn install`. This outputs a `infra/custom_resources/dist` folder which is then zipped up and placed into `infra/assets/`.
- Build the `infra/lambdas/`'s `npm` project by running `yarn install`. This outputs a `infra/lambdas/dist` folder which is then zipped up and placed into `infra/assets/`.
- Build the UI Amplify asset by building the `app/`'s `npm` project by running `yarn install`. This process does the following:
  - Copy the `infra/cf/*.yaml` into `app/public/cf/`.
  - Copy the `infra/assets/*.zip` into `app/public/assets/`.
  - Generate the `src/data/cf/*.ts` files from the `app/public/cf/*.yaml` files.
  - Move the `app/.env.local` up a level to the root of the project so it is not included into the build.
  - Run `react-scripts` to build the production asset into the `app/build/` folder.
  - Zip up the asset from `app/build/` and store at `app/amplify.zip`

This `amplify.zip` file must then be given to Amplify, either through a 1-click install or directly (manually) in order to facilitate deployment of the statically hosted web application.

## Front-end Development

The front-end code is located within the `app/` folder and is a separate `npm` project. The `app/.env.local` file contains the information needed to run the project locally including credentials which are automatically picked up by the application code.

### General Development Flow

To start the UI web server, change to the `app/` folder and run `yarn start`. Or, alternatively, from the root of the project run the `start.sh` script.

React will perform hot code updates to changes to the UI or styling but will require a page refresh when other code it doesn't know how to hot code reload changes. This allows for minor tweaking and changing of source code for visual asthetics to be very quick. When the page reloads it should only be 1 or two clicks to get back to where the user left off due to the resume feature.

### CloudFormation Files

It is important to know how the CloudFormation files are used in the UI to prevent confusion around the templates being cached in various locations. Each of the CloudFormation template files are included as part of the source code as a string through running the `app/scripts/copy-cf.ts` file which is run during the build process. Prior to running this script, the `app/public/cf/*` folder is generated by copying the infrastructure from `infra/cf/*` into `app/public/cf/*` via the `app/package.json` script called `copy-assets`.

When the `app/scripts/copy-cf.ts` runs, it copies the `app/public/cf/*.yaml` and makes them into a `*.ts` file which exports the template as a string. The biggest limitation to this is that CloudFormation won't allow inline templates over 50kb in size, which some of the templates are already bigger than. To get around this, the buckets template is done as an inlined template but all others will refer to the `assets` bucket created from the buckets template. The `assets` bucket will come already populated with the data from the `app/public/cf/*` and `app/public/assets/*` files as folders within the bucket which came from Amplify. This is done through a CloudFormation custom resource lambda which will execute once when the buckets are setup, pulling the files from Amplify into the bucket for CloudFormation to use.

This means there are 4 locations where CloudFormation template changes can be cached. When changing both the back-end and the front-end at the same time this can lead to confusion. The long way this gets updated is the following: Template files in `infra/cf/` are changed and then within the `app/` folder `yarn copy-assets` needs to be run in order to copy them to `app/public/cf/`, then `app/scripts/copy-cf.ts` needs to run to make them into typescript files. At this point, the code will be rebuild automatically if `yarn start` is running in the `app` folder and the localhost should refresh. However, the quickest way to do this is to restart the `yarn start` process since all of this happens when the localhost web server starts up. This should be how the buckets template is updated. For the other templates, this process will not produce any changes. To change the other templates, upload the `infra/cf/` templates to the `assets` bucket directly and then rerun the UI to apply those changes. You may have to delete broken stacks or change the `localStorage` to rollback a stack to `NOT_STARTED` (see Local Storage below).

### Local Storage

In order to retry a particular stage or screen, you'll need to edit the `localStorage` data stored in the browser and perform a refresh. Since the `localStorage` data is quite large and cumbersome, it is recommended to get a browser extension which makes editing this JSON data easier such as the [Chrome Swoosh Cookie and Local Storage Specialist](https://chrome.google.com/webstore/detail/swoosh-cookie-and-local-s/giompennnhheakjcnobejbnjgbbkmdnd?hl=en) extension or something similar. Firebug in Firefox has the ability to edit local storage but it only lets you edit it as a single line it can be difficult to make changes. For examle to retry any failed CloudFormation with a new template (see CloudFormation Files above) the easiest way is to remove the `deploymentOperations` key from the JSON. When the system tries to recreate stacks which already exist, it will catch the exception generated and check it 10 seconds later to see if it is in the completed state. This makes each stack which is already done take only 10 seconds. Following it will retry the one being developed.

### Adding a new Stack or other Operation

The file `app/src/models/operations/Operation.tsx` provides the base for all other operations the UI needs to carry out. On top of that is built the `SequentialOperations` model in order to perform a list of operations as a single operation. Additionally, the `ProvisionStack` operation model handles provisioning new stacks. If you are adding a new stack, you need to create a new model which is of type `ProvisionStack` (see other stacks for how to do this). However, if you need to create your own, you can use the regular `Operation` model. Once created, edit the `app/src/models/Installation.tsx` file inside the actions to add a new operation to the `deploymentOperations`. To rerun in the UI, edit the `localStorage` (details above) by removing all `deploymentOperations` so the UI will repopulate them with your new operation.

## Back-end Development

### General Development Flow

Back-end changes should be made in isolation with the UI so that the template is known to work before attempting to use it from the UI. It will slow down development by using the UI to execute the CloudFormation due to overhead of updating the UI with new template files.

The best way to make changes to the backend infrastructure is to manually update the CloudFormation stack with the new template file. Just go to the stack, and do an Update by using "Replacing current template" and "Upload a template file". Once the CloudFormation is successful, see the above information about updating the template files for the local build.

**NOTE: Uploading any files to any of the buckets in the system requires overriding the encryption key used to be the one intended for that bucket. The system does not allow uploads which do not specify an encryption key and the encryption key must be the one generated for the bucket. To upload, open the "Properties" section of the S3 upload screen, choose "Specify an encryption key", then "Override default encryption bucket settings", and "Choose from your AWS KMS keys". Finally search for the bucket name (like assets or metadata, etc.) and choose the one with your installation ID.**

#### Updating Lambda Code

There are two kinds of lambdas used by the system: Step Function lambdas and CloudFormation custom resource lambdas. Each must be updated and run differently.

The step function consists of several lambdas which perform actions for that portion of the step function's actions at that time. To update them, from within the `infra/lambdas/` folder, run `yarn install` to generate a new lambda artifact zip file then run `upload.sh` passing in the installation ID. The whole process can be done as a single line as follows: (from within the `infra/lambdas/` directory)

```bash
yarn install && ./upload.sh i5qfek5ak072
```

To rerun the step function lambda, either use Lambda's testing functionality or invoke the step function again. No parameters are required to be input into the step function (you can leave the "Comment" field, it will just ignore it).

#### Updating & Testing Custom Resources

CloudFormation custom resource lambdas can be difficult to develop due to the 1 hour time CloudFormation waits when something goes wrong (or 2 hours if it decides to roll back). There is one inline lambda inside the buckets template which will copy the `assets/custom_resources.zip` into the `assets` bucket for the system. The inline lambda can be updated through the buckets template but beware there are no dependencies allowed for this kind of inline lambda. When that lambda is complete, there is another custom resource lambda which is part of the zip file. All new custom resource lambdas can be put into this zip file to allow for Typescript compilation and dependencies which may be needed. The inline lambda in the buckets template is done this way in order to bootstrap the system for custom resources.

To update and test a custom resource within the `custom_resources` package:

- Run `yarn install` to generate a new lambda zip file and then visit the lambda in the AWS console and upload the zip file directly to the lambda. Using S3 is not necessary at this time since the zip file is relatively small.
- Inside the `infra/cf/*` YAML file which has the custom resource, comment out the CloudFormation resource which starts with `Custom::`, it will be called `Custom::<NameOfCustomResource>` where the name of the custom resource can be anything the creator wants. After commenting it out, execute the CloudFormation by updating the stack. This will remove the custom resource, calling the lambda and issuing a "delete" command to it.
- Inside the `infra/cf/*` YAML file which has the custom resource, uncomment the `Custom::` resource and execute the CloudFormation again. This will perform the normal flow of execution.

If creating a new custom resource, it is best to work with a copy of an already working custom resource and just remove the inner portions which do the more specific logic. The reason for this is because if there is a syntax error, or if there is a crash, there is no guarantee that CloudFormation will get a response from the lambda because CloudFormation is waiting for the lambda to write to the S3 file given to it. It will retry it a few times with several minutes in between, but after that it will wait an hour before the stack can be changed again. If it attempts to roll back the change, it may try to invoke the custom resource again to "delete" it causing it to wait another hour. This is a huge productivity loss since your choices are to either wait it out or generate a new installation. If you're fast enough, you can look in the CloudWatch logs to fix the issue so it doesn't crash and then CloudFormation may invoke the lambda again allowing it to inform CloudFormation of the result (success or not) but this can be difficult. For this reason it is recommended to be watching in CloudWatch to see if the custom resource is successful while developing a custom resource.

### Adding a new Asset

To introduce a new asset in either the `assets/` or `cf/` folder, or another folder entirely, update the buckets inline lambda to include the filename and folder in the constants at the top of the inline lambda. In order for this to work, you must have updated the Amplify app mentioned within your `app/.env.local` file since the buckets inline lambda cannot fetch from your localhost. You may request any file available from within the Amplify application and the lambda will copy it to the bucket. From that point, you may use the asset in any template file.
