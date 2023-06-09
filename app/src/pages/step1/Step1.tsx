import React from "react";
import { Box, Heading, HStack, Button, Collapse } from "@chakra-ui/react";
import { ArrowForwardIcon, ArrowBackIcon } from "@chakra-ui/icons";
import { observer } from "mobx-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { useInstallation, useStore } from "AppContext";
import { Layout } from "components/Layout";
import { OutlineButton } from "components/OutlineButton";
import { YesNoAnswer } from "models/steps/BaseStep";
import { CredentialsValidationException } from "api/validate-credentials";
import { CredentialsForm, ICredentialsFormInput } from "pages/step1/CredentialsForm";
import { RegionForm } from "pages/step1/RegionForm";
import { CredentialsError } from "pages/step1/CredentialsError";
import { InstructionSection } from "pages/step1/InstructionSection";
import { awsRegions } from "data/aws-regions";

export const Step1 = observer(() => {
  const installation = useInstallation();
  const step = installation.connectToAwsStep;
  const needsAssistance = step.needsAssistance;
  const navigate = useNavigate();
  const [stepException, setStepException] = React.useState<CredentialsValidationException | Error>();
  const appStore = useStore();

  const handleAnswer = (answer: YesNoAnswer) => () => {
    step.setNeedsAssistance(answer);
  };

  const handlePrevious = () => {
    navigate("/");
  };

  const onSubmit: SubmitHandler<ICredentialsFormInput> = async (values) => {
    setStepException(undefined);
    const accessKey = values.accessKeyId;
    const secretKey = values.secretAccessKey;
    const region = values.region;

    try {
      await step.connectToAws(accessKey, secretKey, region);
      step.markCompleted();

      navigate("/steps/2");
    } catch (err: any) {
      console.log(err);
      setStepException(err);
    }
  };

  React.useEffect(() => {
    step.markStarted();
    window.scrollTo(0, 0);
  }, [appStore, step]);

  const {
    handleSubmit,
    register,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ICredentialsFormInput>();

  const defaultRegion = awsRegions.find((r) => r.default);
  const regionDescription = `AWS has many data centers grouped by geographical regions. Select a region that is closest to your location. We will keep your data in the region you select. If you are not sure, you can select the ${
    defaultRegion?.label || "US East (N. Virginia)"
  } Region`;

  return (
    <Layout
      step={1}
      title="Connect to your AWS account"
      description="We need your AWS admin credentials, specifically the access keys, so that we can connect to your AWS account and provision the
        resources for the data lake."
      explanation="Access keys consist of two parts: an access key id and a secret access key. These access keys must be for a user with admin permissions."
      warning="If you haven't created access keys before, we will guide you through the process of obtaining the needed credentials."
    >
      <Box borderRadius="lg" boxShadow="base" bg="orange.50" mt={0} p={6}>
        <Box p={0}>
          <Heading size="md" pt="0px" pb="30px" color="orange.600" letterSpacing="-1px">
            Would you need assistance in creating AWS admin access and secret keys?
          </Heading>
          <Box textAlign="right" w="full" mb={4}>
            <OutlineButton id="step1-btn-need-assistance-yes" selected={needsAssistance === YesNoAnswer.Yes} onClick={handleAnswer(YesNoAnswer.Yes)}>
              Yes
            </OutlineButton>
            <OutlineButton
              id="step1-btn-need-assistance-no"
              selected={needsAssistance === YesNoAnswer.No}
              onClick={handleAnswer(YesNoAnswer.No)}
              ml={3}
            >
              No
            </OutlineButton>
          </Box>
        </Box>

        <Collapse in={needsAssistance === YesNoAnswer.Yes} animateOpacity>
          <Box pt={6}>
            <InstructionSection />
          </Box>
        </Collapse>
      </Box>

      <Collapse in={needsAssistance !== YesNoAnswer.MissingAnswer} animateOpacity>
        <CredentialsError exception={stepException} />

        <Box pt={6}>
          <CredentialsForm {...{ register, errors, isSubmitting, control }} />
        </Box>

        <Box pt={6}>
          <RegionForm {...{ register, errors, isSubmitting }} description={regionDescription} defaultRegion={installation.region} />
        </Box>
      </Collapse>

      <HStack justifyContent="space-between" p={3} pt={6} mb={12}>
        <Button colorScheme="orange" size="md" leftIcon={<ArrowBackIcon />} disabled={isSubmitting} variant="ghost" onClick={handlePrevious}>
          Previous
        </Button>

        <Button
          id="step1-btn-next"
          colorScheme="orange"
          size="md"
          loadingText="Connecting"
          rightIcon={<ArrowForwardIcon />}
          ml={3}
          isLoading={isSubmitting}
          disabled={needsAssistance === YesNoAnswer.MissingAnswer || isSubmitting}
          onClick={handleSubmit(onSubmit)}
        >
          Next
        </Button>
      </HStack>
    </Layout>
  );
});
