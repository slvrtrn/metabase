import { H } from "e2e/support";
import { SAMPLE_DB_ID } from "e2e/support/cypress_data";
import { SAMPLE_DATABASE } from "e2e/support/cypress_sample_database";
import {
  ORDERS_COUNT_QUESTION_ID,
  ORDERS_DASHBOARD_ID,
} from "e2e/support/cypress_sample_instance_data";
import { createMockParameter } from "metabase-types/api/mocks";

const { ORDERS_ID, ORDERS, PRODUCTS, PRODUCTS_ID, PEOPLE, PEOPLE_ID } =
  SAMPLE_DATABASE;

describe("scenarios > dashboard > parameters", () => {
  const cards = [
    {
      card_id: ORDERS_COUNT_QUESTION_ID,
      row: 0,
      col: 0,
      size_x: 5,
      size_y: 4,
    },
    {
      card_id: ORDERS_COUNT_QUESTION_ID,
      row: 0,
      col: 5,
      size_x: 5,
      size_y: 4,
    },
  ];

  beforeEach(() => {
    H.restore();
    cy.signInAsAdmin();
  });

  it("one filter should search across multiple fields", () => {
    cy.intercept("GET", "/api/dashboard/**").as("dashboard");

    cy.createDashboard({ name: "my dash" }).then(({ body: { id } }) => {
      // add the same question twice
      H.updateDashboardCards({
        dashboard_id: id,
        cards,
      });

      H.visitDashboard(id);
    });

    H.editDashboard();

    // add a category filter
    H.setFilter("Text or Category", "Is");

    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("A single value").click();

    // connect it to people.name and product.category
    // (this doesn't make sense to do, but it illustrates the feature)
    H.selectDashboardFilter(H.getDashboardCard(0), "Name");

    H.selectDashboardFilter(H.getDashboardCard(1), "Category");

    H.saveDashboard();

    // confirm that typing searches both fields
    H.filterWidget().contains("Text").click();

    // After typing "Ga", you should see this name!
    H.popover().within(() => cy.findByPlaceholderText("Search").type("Ga"));
    cy.wait("@dashboard");
    H.popover().last().contains("Gabrielle Considine");

    // Continue typing a "d" and you see "Gadget"
    H.popover()
      .first()
      .within(() => cy.findByPlaceholderText("Search").type("d"));
    cy.wait("@dashboard");

    H.popover()
      .last()
      .within(() => {
        cy.findByText("Gadget").click();
      });

    H.popover()
      .first()
      .within(() => {
        cy.button("Add filter").click();
      });

    cy.location("search").should("eq", "?text=Gadget");
    cy.findAllByTestId("dashcard-container").first().should("contain", "0");
    cy.findAllByTestId("dashcard-container").last().should("contain", "4,939");
  });

  it("should be able to remove parameter (metabase#17933)", () => {
    // Mirrored issue in metabase-enterprise#275

    const questionDetails = {
      query: {
        "source-table": ORDERS_ID,
        limit: 5,
      },
    };

    const startsWith = {
      name: "Text starts with",
      slug: "text_starts_with",
      id: "1b9cd9f1",
      type: "string/starts-with",
      sectionId: "string",
    };

    const endsWith = {
      name: "Text ends with",
      slug: "text_ends_with",
      id: "88a1257c",
      type: "string/ends-with",
      sectionId: "string",
    };

    const dashboardDetails = {
      parameters: [startsWith, endsWith],
    };

    cy.createQuestionAndDashboard({ questionDetails, dashboardDetails }).then(
      ({ body: { id, card_id, dashboard_id } }) => {
        cy.request("PUT", `/api/dashboard/${dashboard_id}`, {
          dashcards: [
            {
              id,
              card_id,
              row: 0,
              col: 0,
              size_x: 16,
              size_y: 8,
              series: [],
              visualization_settings: {},
              parameter_mappings: [
                {
                  parameter_id: startsWith.id,
                  card_id,
                  target: [
                    "dimension",
                    [
                      "field",
                      PRODUCTS.CATEGORY,
                      {
                        "source-field": ORDERS.PRODUCT_ID,
                      },
                    ],
                  ],
                },
                {
                  parameter_id: endsWith.id,
                  card_id,
                  target: [
                    "dimension",
                    [
                      "field",
                      PRODUCTS.CATEGORY,
                      {
                        "source-field": ORDERS.PRODUCT_ID,
                      },
                    ],
                  ],
                },
              ],
            },
          ],
        });

        H.visitDashboard(dashboard_id);
        cy.findByTextEnsureVisible("Created At");
      },
    );

    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(startsWith.name).click();
    cy.findByPlaceholderText("Enter some text").type("G");
    // Make sure the dropdown list with values is not populated,
    // because it makes no sense for non-exact parameter string operators.
    // See: https://github.com/metabase/metabase/pull/15477
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("Gizmo").should("not.exist");
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("Gadget").should("not.exist");

    cy.button("Add filter").click();

    cy.location("search").should(
      "eq",
      `?${endsWith.slug}=&${startsWith.slug}=G`,
    );
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("37.65").should("not.exist");

    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(endsWith.name).click();
    cy.findByPlaceholderText("Enter some text").type("zmo");
    // Make sure the dropdown list with values is not populated,
    // because it makes no sense for non-exact parameter string operators.
    // See: https://github.com/metabase/metabase/pull/15477
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("Gizmo").should("not.exist");

    cy.button("Add filter").click();

    cy.location("search").should(
      "eq",
      `?${endsWith.slug}=zmo&${startsWith.slug}=G`,
    );
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("52.72").should("not.exist");

    // Remove filter (metabase#17933)
    cy.icon("pencil").click();
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(startsWith.name).find(".Icon-gear").click();

    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("Remove").click();
    cy.location("search").should("eq", `?${endsWith.slug}=zmo`);

    H.saveDashboard();

    cy.log(
      "There should only be one filter remaining and its value is preserved",
    );

    H.filterWidget().contains(new RegExp(`${endsWith.name}`, "i"));

    cy.location("search").should("eq", `?${endsWith.slug}=zmo`);
  });

  it("should handle mismatch between filter types (metabase#9299, metabase#16181)", () => {
    const questionDetails = {
      name: "16181",
      native: {
        query: "select count(*) from products where {{filter}}",
        "template-tags": {
          filter: {
            id: "0b004110-d64a-a413-5aa2-5a5314fc8fec",
            name: "filter",
            "display-name": "Native Filter",
            type: "dimension",
            dimension: ["field", PRODUCTS.CATEGORY, null],
            "widget-type": "string/=",
            default: null,
          },
        },
      },
      display: "scalar",
    };

    const matchingFilterType = {
      name: "Text",
      slug: "text",
      id: "d245671f",
      type: "string/=",
      sectionId: "string",
      default: "Gadget",
    };

    const dashboardDetails = {
      parameters: [matchingFilterType],
    };

    cy.createNativeQuestionAndDashboard({
      questionDetails,
      dashboardDetails,
    }).then(({ body: { id, card_id, dashboard_id } }) => {
      cy.request("PUT", `/api/dashboard/${dashboard_id}`, {
        dashcards: [
          {
            id,
            card_id,
            row: 0,
            col: 0,
            size_x: 11,
            size_y: 6,
            parameter_mappings: [
              {
                parameter_id: matchingFilterType.id,
                card_id,
                target: [
                  "dimension",
                  ["template-tag", "filter"],
                  { "stage-number": 0 },
                ],
              },
            ],
          },
        ],
      });

      H.visitDashboard(dashboard_id);
      cy.findByTestId("scalar-value").invoke("text").should("eq", "53");

      // Confirm you can't map wrong parameter type the native question's field filter (metabase#16181)
      H.editDashboard();

      H.setFilter("ID");

      cy.findByText(/Add a variable to this question/).should("be.visible");

      // Confirm that the correct parameter type is connected to the native question's field filter
      cy.findByText(matchingFilterType.name).find(".Icon-gear").click();

      H.getDashboardCard().within(() => {
        cy.findByText("Column to filter on");
        cy.findByText("Native Filter");
      });

      // Update the underlying question's query
      cy.request("PUT", `/api/card/${card_id}`, {
        dataset_query: {
          type: "native",
          native: {
            query: "select 1",
            "template-tags": {},
          },
          database: SAMPLE_DB_ID,
        },
      });

      // Upon visiting the dashboard again the filter preserves its value
      H.visitDashboard(dashboard_id);

      cy.location("search").should("eq", "?text=Gadget");
      H.filterWidget().contains("Gadget");

      // But the question should display the new value and is not affected by the filter
      cy.findByTestId("scalar-value").invoke("text").should("eq", "1");

      // Confirm that it is not possible to connect filter to the updated question anymore (metabase#9299)
      cy.icon("pencil").click();
      cy.findByText(matchingFilterType.name).find(".Icon-gear").click();
      cy.findByText(
        /A text variable in this card can only be connected to a text filter with Is operator/,
      ).should("be.visible");
    });
  });

  it("should handle multiple filters and allow multiple filter values without sending superfluous queries or limiting results (metabase#13150, metabase#15689, metabase#15695, metabase#16103, metabase#17139)", () => {
    const questionDetails = {
      name: "13150 (Products)",
      query: { "source-table": PRODUCTS_ID },
    };

    const parameters = [
      {
        name: "Title",
        slug: "title",
        id: "9f20a0d5",
        type: "string/=",
        sectionId: "string",
      },
      {
        name: "Category",
        slug: "category",
        id: "719fe1c2",
        type: "string/=",
        sectionId: "string",
      },
      {
        name: "Vendor",
        slug: "vendor",
        id: "a73b7c9",
        type: "string/=",
        sectionId: "string",
      },
    ];

    const [titleFilter, categoryFilter, vendorFilter] = parameters;

    const dashboardDetails = { parameters };

    cy.intercept(
      "POST",
      "/api/dashboard/*/dashcard/*/card/*/query",
      cy.spy().as("cardQueryRequest"),
    ).as("cardQuery");

    cy.intercept(
      "GET",
      `/api/dashboard/*/params/${categoryFilter.id}/values`,
      cy.spy().as("fetchAllCategories"),
    ).as("filterValues");

    cy.createQuestionAndDashboard({ questionDetails, dashboardDetails }).then(
      ({ body: { id, card_id, dashboard_id } }) => {
        cy.log("Connect all filters to the card");
        cy.request("PUT", `/api/dashboard/${dashboard_id}`, {
          dashcards: [
            {
              id,
              card_id,
              row: 0,
              col: 0,
              size_x: 19,
              size_y: 12,
              parameter_mappings: [
                {
                  parameter_id: titleFilter.id,
                  card_id,
                  target: ["dimension", ["field", PRODUCTS.TITLE, null]],
                },
                {
                  parameter_id: categoryFilter.id,
                  card_id,
                  target: ["dimension", ["field", PRODUCTS.CATEGORY, null]],
                },
                {
                  parameter_id: vendorFilter.id,
                  card_id,
                  target: ["dimension", ["field", PRODUCTS.VENDOR, null]],
                },
              ],
              visualization_settings: {},
            },
          ],
        });

        cy.visit(
          `/dashboard/${dashboard_id}?title=Awesome Concrete Shoes&category=Widget&vendor=McClure-Lockman`,
        );
      },
    );

    cy.wait("@cardQuery");
    // Multiple filters shouldn't affect the number of card query requests (metabase#13150)
    cy.get("@cardQueryRequest").should("have.been.calledOnce");

    // Open category dropdown
    H.filterWidget().contains("Widget").click();
    cy.wait("@filterValues");

    // Make sure all filters were fetched (should be cached after this)
    H.popover().within(() => {
      // Widget should be selected by default
      isFilterSelected("Widget", true);
      // Select one more filter (metabase#15689)
      cy.findByText("Gizmo").click();
      isFilterSelected("Gizmo", true);

      cy.findByText("Doohickey");
      cy.findByText("Gadget");
    });

    cy.get("@fetchAllCategories").should("have.been.calledOnce");

    cy.button("Update filter").click();
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("2 selections").click();

    // Even after we reopen the dropdown, it shouldn't send additional requests for values (metabase#16103)
    cy.get("@fetchAllCategories").should("have.been.calledOnce");

    // As a sanity check, make sure we can deselect the filter by clicking on it
    H.popover().within(() => {
      cy.findByText("Gizmo").click();
      isFilterSelected("Gizmo", false);
    });

    cy.button("Update filter").click();
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("2 selections").should("not.exist");
    H.filterWidget().contains("Widget");

    H.filterWidget().contains("Awesome Concrete Shoes").click();
    // Do not limit number of results (metabase#15695)
    // Prior to the issue being fixed, the cap was 100 results
    cy.findByPlaceholderText("Search the list").type("Syner");
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("Synergistic Wool Coat");

    cy.location("search").should(
      "eq",
      "?category=Widget&title=Awesome+Concrete+Shoes&vendor=McClure-Lockman",
    );
    cy.findAllByTestId("table-row").should("have.length", 1);

    // It should not reset previously defined filters when exiting 'edit' mode without making any changes (metabase#5332, metabase#17139)
    H.editDashboard();
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("Cancel").click();
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("You're editing this dashboard.").should("not.exist");

    cy.location("search").should(
      "eq",
      "?category=Widget&title=Awesome+Concrete+Shoes&vendor=McClure-Lockman",
    );
    cy.findAllByTestId("table-row").should("have.length", 1);
  });

  describe("when the user does not have self-service data permissions", () => {
    beforeEach(() => {
      H.visitDashboard(ORDERS_DASHBOARD_ID);
      cy.findByTextEnsureVisible("Created At");

      H.editDashboard();
      H.setFilter("ID");

      H.selectDashboardFilter(H.getDashboardCard(), "User ID");

      // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
      cy.findByText("Save").click();
      // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
      cy.findByText("You're editing this dashboard.").should("not.exist");

      cy.signIn("nodata");
      H.visitDashboard(ORDERS_DASHBOARD_ID);
    });

    it("should not see mapping options", () => {
      cy.icon("pencil").click();
      cy.findByTestId("edit-dashboard-parameters-widget-container")
        .find(".Icon-gear")
        .click();

      cy.icon("key");
    });
  });

  it("should be able to use linked filters to limit parameter choices", () => {
    const questionDetails = {
      query: {
        "source-table": PRODUCTS_ID,
      },
    };

    const parameter1Details = {
      id: "1b9cd9f1",
      name: "Category filter",
      slug: "category-filter",
      type: "string/=",
      sectionId: "string",
    };

    const parameter2Details = {
      id: "1b9cd9f2",
      name: "Vendor filter",
      slug: "vendor-filter",
      type: "string/=",
      sectionId: "string",
    };

    const dashboardDetails = {
      parameters: [parameter1Details, parameter2Details],
    };

    cy.createQuestionAndDashboard({ questionDetails, dashboardDetails }).then(
      ({ body: { dashboard_id } }) => {
        H.visitDashboard(dashboard_id);
      },
    );

    H.editDashboard();
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(parameter1Details.name).click();
    H.selectDashboardFilter(H.getDashboardCard(), "Category");
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(parameter2Details.name).click();
    H.selectDashboardFilter(H.getDashboardCard(), "Vendor");
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText("Linked filters").click();
    H.sidebar().findByRole("switch").parent().get("label").click();
    H.saveDashboard();

    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(parameter2Details.name).click();
    H.popover().within(() => {
      cy.findByText("Barrows-Johns").should("exist");
      cy.findByText("Balistreri-Ankunding").should("exist");
    });

    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(parameter1Details.name).click();
    H.popover().within(() => {
      cy.findByText("Gadget").click();
      cy.button("Add filter").click();
    });

    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(parameter2Details.name).click();
    H.popover().within(() => {
      cy.findByText("Barrows-Johns").should("exist");
      cy.findByText("Balistreri-Ankunding").should("not.exist");
    });
  });

  describe("when parameters are (dis)connected to dashcards", () => {
    beforeEach(() => {
      createDashboardWithCards({ cards }).then(dashboardId =>
        H.visitDashboard(dashboardId),
      );

      // create a disconnected filter + a default value
      H.editDashboard();
      H.setFilter("Date picker", "Relative Date");

      H.sidebar().findByText("Default value").next().click();
      H.popover().contains("Previous 7 days").click({ force: true });
      H.saveDashboard();

      const { interceptor } = H.spyRequestFinished("dashcardRequestSpy");

      cy.intercept(
        "POST",
        "/api/dashboard/*/dashcard/*/card/*/query",
        interceptor,
      );
    });

    it("should not fetch dashcard data when filter is disconnected", () => {
      cy.get("@dashcardRequestSpy").should("not.have.been.called");
    });

    it("should fetch dashcard data after save when parameter is mapped", () => {
      // Connect filter to 2 cards
      H.editDashboard();

      cy.findByTestId("edit-dashboard-parameters-widget-container")
        .findByText("All Options")
        .click();

      H.selectDashboardFilter(H.getDashboardCard(0), "Created At");
      H.selectDashboardFilter(H.getDashboardCard(1), "Created At");

      H.saveDashboard();

      cy.get("@dashcardRequestSpy").should("have.callCount", 2);
    });

    it("should fetch dashcard data when parameter mapping is removed", () => {
      cy.log("Connect filter to 1 card only");

      H.editDashboard();
      cy.findByTestId("edit-dashboard-parameters-widget-container")
        .findByText("All Options")
        .click();
      H.selectDashboardFilter(H.getDashboardCard(0), "Created At");

      H.saveDashboard();

      cy.get("@dashcardRequestSpy").should("have.callCount", 1);

      cy.log("Disconnect filter from the 1st card");

      H.editDashboard();

      cy.findByTestId("edit-dashboard-parameters-widget-container")
        .findByText("All Options")
        .click();

      H.disconnectDashboardFilter(H.getDashboardCard(0));
      H.saveDashboard();

      cy.get("@dashcardRequestSpy").should("have.callCount", 2);
    });

    it("should not fetch dashcard data when nothing changed on save", () => {
      H.editDashboard();
      H.saveDashboard({ awaitRequest: false });

      cy.get("@dashcardRequestSpy").should("have.callCount", 0);
    });
  });

  describe("preserve last used value", () => {
    beforeEach(() => {
      const textFilter = createMockParameter({
        name: "Text",
        slug: "string",
        id: "5aefc726",
        type: "string/=",
        sectionId: "string",
      });

      const peopleQuestionDetails = {
        query: { "source-table": PEOPLE_ID, limit: 5 },
      };

      cy.createDashboardWithQuestions({
        dashboardDetails: {
          parameters: [textFilter],
        },
        questions: [peopleQuestionDetails],
      }).then(({ dashboard, questions: cards }) => {
        const [peopleCard] = cards;

        H.updateDashboardCards({
          dashboard_id: dashboard.id,
          cards: [
            {
              card_id: peopleCard.id,
              parameter_mappings: [
                {
                  parameter_id: textFilter.id,
                  card_id: peopleCard.id,
                  target: ["dimension", ["field", PEOPLE.NAME, null]],
                },
              ],
            },
          ],
        });

        H.visitDashboard(dashboard.id);

        cy.wrap(dashboard.id).as("dashboardId");
      });
    });

    it("should retain the last used value for a dashboard filter", () => {
      cy.intercept("GET", "/api/**/items?pinned_state*").as("getPinnedItems");

      H.filterWidget().click();

      H.popover().within(() => {
        H.multiAutocompleteInput().type("Antwan Fisher");
        cy.button("Add filter").click();
      });

      H.getDashboardCard()
        .findByText("7750 Michalik Lane")
        .should("be.visible");

      cy.visit("/collection/root");
      cy.wait("@getPinnedItems");

      cy.get("@dashboardId").then(dashboardId => H.visitDashboard(dashboardId));

      H.filterWidget()
        .findByRole("listitem")
        .should("have.text", "Antwan Fisher");

      cy.log("verify filter resetting works");

      H.filterWidget().icon("close").click();
      H.getDashboardCard()
        .findByText("761 Fish Hill Road")
        .should("be.visible");
    });

    it("should allow resetting last used value", () => {
      H.filterWidget().click();

      H.popover().within(() => {
        H.multiAutocompleteInput().type("Antwan Fisher");
        cy.button("Add filter").click();
      });

      H.getDashboardCard()
        .findByText("7750 Michalik Lane")
        .should("be.visible");

      cy.log("reset filter values from url by visiting dashboard by id");

      cy.get("@dashboardId").then(dashboardId => H.visitDashboard(dashboardId));

      H.filterWidget().icon("close").click();

      H.getDashboardCard()
        .findByText("761 Fish Hill Road")
        .should("be.visible");

      cy.log("verify filter value is not specified after reload");

      cy.get("@dashboardId").then(dashboardId => H.visitDashboard(dashboardId));

      H.getDashboardCard()
        .findByText("761 Fish Hill Road")
        .should("be.visible");
    });
  });
});

function isFilterSelected(filter, bool) {
  cy.findByLabelText(filter).should(
    `${bool === false ? "not." : ""}be.checked`,
  );
}

function createDashboardWithCards({
  dashboardName = "my dash",
  cards = [],
} = {}) {
  return cy
    .createDashboard({ name: dashboardName })
    .then(({ body: { id } }) => {
      H.updateDashboardCards({
        dashboard_id: id,
        cards,
      });

      cy.wrap(id).as("dashboardId");
    });
}
