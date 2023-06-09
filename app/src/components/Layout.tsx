import React from "react";
import { observer } from "mobx-react";
import { Box, Container, Heading, Stack, Text, useTheme } from "@chakra-ui/react";

import { useColorScheme } from "models/useColorScheme";

import { useInstallation } from "AppContext";

import { CurvedBox } from "./CurvedBox";
import { Header } from "./Header";
import { StepsIndicator } from "./StepsIndicator";

interface ILayout {
  step: number;
  title: string;
  description?: string;
  explanation?: string;
  warning?: string;
  children: React.ReactNode;
}

export const Layout = observer(({ step, title, description, explanation, warning, children }: ILayout) => {
  const theme = useTheme();
  const installation = useInstallation();
  const { tone } = useColorScheme();

  return (
    <Box id={`step${step}`}>
      <CurvedBox bgGradient={theme.gradients.bgLight} />

      <Header />

      <Box position="relative">
        <CurvedBox />

        {step > 0 && (
          <Box bg={tone(400)} w="full" position="relative">
            <Container maxW="container.md" pt="15px" pb="15px">
              <StepsIndicator current={step} />
            </Container>
          </Box>
        )}
      </Box>

      <Container maxW="container.md" pt="0px" position="relative">
        <Heading display="inline-block" size="lg" pt="16px" pb="30px" color={tone(50)} letterSpacing="-1px">
          {title}
        </Heading>

        {(step === 0 || step > 3) && (
          <Box sx={{ mt: 4 }} float="right" fontSize="small" textAlign="right" color={tone(100)}>
            <Text>Region: {installation.region}</Text>
            <Text>Installation ID: {installation.id}</Text>
          </Box>
        )}

        {description && (
          <Box color={tone(50)} mb={4}>
            <Stack direction="row" spacing="8px" align="left" justifyContent="space-between">
              <Box mb={6}>
                <Box>{description}</Box>
                {explanation && <Box sx={{ mt: 2 }}>{explanation}</Box>}
                {warning && <Box sx={{ mt: 2 }}>{warning}</Box>}
              </Box>
            </Stack>
          </Box>
        )}

        {children}
      </Container>
    </Box>
  );
});
