import { cleanup, screen } from "@testing-library/react";
import { create } from "react-test-renderer";

import { render, CustomChakraProvider } from "test-utils";

import { StoreProvider } from "AppContext";

import { DataTableStatusInfo } from "pages/back-home/DataTableStatusInfo";

import * as metadataStore from "models/MetadataStore";

describe("BackHome -> DataTableStatusInfo component", () => {
  afterEach(cleanup);

  test("snapshot", () => {
    // @ts-ignore
    jest.spyOn(metadataStore, "useMetadataStore").mockImplementation(() => {
      return {
        isError: false,
        isReady: false,
        store: { selectedObjects: [{}] },
      };
    });

    const tree = create(
      <CustomChakraProvider>
        <StoreProvider>
          <DataTableStatusInfo />
        </StoreProvider>
      </CustomChakraProvider>
    ).toJSON();

    expect(tree).toMatchSnapshot();
  });

  test("render properly with error", () => {
    // @ts-ignore
    jest.spyOn(metadataStore, "useMetadataStore").mockImplementation(() => {
      return {
        isError: true,
        isReady: false,
        store: { selectedObjects: [{}, {}] },
      };
    });

    render(
      <StoreProvider>
        <DataTableStatusInfo />
      </StoreProvider>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  test("render properly with ready", () => {
    // @ts-ignore
    jest.spyOn(metadataStore, "useMetadataStore").mockImplementation(() => {
      return {
        isError: false,
        isReady: true,
        store: { selectedObjects: [{}, {}] },
      };
    });

    render(
      <StoreProvider>
        <DataTableStatusInfo />
      </StoreProvider>
    );

    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
    expect(screen.queryByText(/retrieving the data schema/i)).not.toBeInTheDocument();
  });

  test("render properly with no error and not ready", () => {
    // @ts-ignore
    jest.spyOn(metadataStore, "useMetadataStore").mockImplementation(() => {
      return {
        isError: false,
        isReady: false,
        store: { selectedObjects: [{}, {}] },
      };
    });

    render(
      <StoreProvider>
        <DataTableStatusInfo />
      </StoreProvider>
    );

    expect(screen.queryByText(/retrieving the data schema/i)).toBeInTheDocument();
  });
});
