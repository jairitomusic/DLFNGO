import { cleanup, screen } from "@testing-library/react";
import { create } from "react-test-renderer";

import { render, CustomChakraProvider } from "test-utils";

import { StoreProvider } from "AppContext";

import { EmptyMessage } from "pages/home/detected-installations/EmptyMessage";

import * as detectedInstallationStore from "models/useDetectedInstallationStore";

const mockOnCancel = jest.fn();

describe("DetectedInstallations -> EmptyMessage component", () => {
  afterEach(cleanup);

  test("snapshot", () => {
    const tree = create(
      <CustomChakraProvider>
        <StoreProvider>
          <EmptyMessage onCancel={mockOnCancel} />
        </StoreProvider>
      </CustomChakraProvider>
    ).toJSON();

    expect(tree).toMatchSnapshot();
  });

  test("render properly with an error", () => {
    // @ts-ignore
    jest.spyOn(detectedInstallationStore, "useDetectedInstallationStore").mockImplementation(() => {
      return {
        isError: true,
        isLoading: false,
        isReloading: false,
        isReady: true,
      };
    });

    render(
      <StoreProvider>
        <EmptyMessage onCancel={mockOnCancel} />
      </StoreProvider>
    );

    expect(screen.findByRole("body")).toBeTruthy();
    expect(screen.queryByText(/no data lakes/i)).not.toBeInTheDocument();
  });

  test("render properly with loading", () => {
    // @ts-ignore
    jest.spyOn(detectedInstallationStore, "useDetectedInstallationStore").mockImplementation(() => {
      return {
        isError: false,
        isLoading: true,
        isReloading: false,
        isReady: true,
      };
    });

    render(
      <StoreProvider>
        <EmptyMessage onCancel={mockOnCancel} />
      </StoreProvider>
    );

    expect(screen.findByRole("body")).toBeTruthy();
    expect(screen.queryByText(/no data lakes/i)).not.toBeInTheDocument();
  });

  test("render properly with reloading", () => {
    // @ts-ignore
    jest.spyOn(detectedInstallationStore, "useDetectedInstallationStore").mockImplementation(() => {
      return {
        isError: false,
        isLoading: false,
        isReloading: true,
        isReady: true,
      };
    });

    render(
      <StoreProvider>
        <EmptyMessage onCancel={mockOnCancel} />
      </StoreProvider>
    );

    expect(screen.findByRole("body")).toBeTruthy();
    expect(screen.queryByText(/no data lakes/i)).not.toBeInTheDocument();
  });

  test("render properly with not ready", () => {
    // @ts-ignore
    jest.spyOn(detectedInstallationStore, "useDetectedInstallationStore").mockImplementation(() => {
      return {
        isError: false,
        isLoading: false,
        isReloading: false,
        isReady: false,
      };
    });

    render(
      <StoreProvider>
        <EmptyMessage onCancel={mockOnCancel} />
      </StoreProvider>
    );

    expect(screen.findByRole("body")).toBeTruthy();
    expect(screen.queryByText(/no data lakes/i)).not.toBeInTheDocument();
  });

  test("render properly with empty store", () => {
    // @ts-ignore
    jest.spyOn(detectedInstallationStore, "useDetectedInstallationStore").mockImplementation(() => {
      return {
        isError: false,
        isReady: true,
        isLoading: false,
        isReloading: false,
        store: { empty: false },
      };
    });

    render(
      <StoreProvider>
        <EmptyMessage onCancel={mockOnCancel} />
      </StoreProvider>
    );

    expect(screen.findByRole("body")).toBeTruthy();
    expect(screen.queryByText(/no data lakes/i)).not.toBeInTheDocument();
  });

  test("render properly with empty message", () => {
    // @ts-ignore
    jest.spyOn(detectedInstallationStore, "useDetectedInstallationStore").mockImplementation(() => {
      return {
        isError: false,
        isReady: true,
        isLoading: false,
        isReloading: false,
        store: {
          empty: true,
          credentials: {
            accountId: "mock-account-id",
          },
        },
      };
    });

    render(
      <StoreProvider>
        <EmptyMessage onCancel={mockOnCancel} />
      </StoreProvider>
    );

    expect(screen.findByRole("body")).toBeTruthy();
    expect(screen.queryByText(/no data lakes/i)).toBeInTheDocument();
    expect(screen.queryByText(/ok/i)).toBeInTheDocument();
  });
});
