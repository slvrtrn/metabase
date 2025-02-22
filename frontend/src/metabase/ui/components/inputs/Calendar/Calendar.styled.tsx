import type { MantineThemeOverride } from "@mantine/core";
import { getStylesRef, rem } from "@mantine/core";

export const getCalendarOverrides = (): MantineThemeOverride["components"] => ({
  Calendar: {
    defaultProps: {
      /**
       * Months have different number of day rows (4, 5 or 6). This causes date picker height to change when
       * navigating between months, and the "next" & "previous" buttons will shift their positions (metabase#39487).
       * This value should be the same as the default height of the calendar when 6 day rows are displayed.
       */
      mih: 314,
    },
  },
  Day: {
    styles: theme => ({
      day: {
        width: rem(40),
        height: rem(40),
        color: "var(--mb-color-text-primary)",
        fontSize: theme.fontSizes.md,
        lineHeight: rem(24),
        borderRadius: theme.radius.xs,

        "&:hover": {
          backgroundColor: "var(--mb-color-bg-light)",
        },
        "&[data-disabled]": {
          color: theme.fn.themeColor("bg-dark"),
        },
        "&[data-weekend]": {
          color: "var(--mb-color-text-primary)",
        },
        "&[data-outside]": {
          color: theme.fn.themeColor("bg-dark"),
        },
        "&[data-in-range]": {
          color: "var(--mb-color-text-hover)",
          borderRadius: 0,
          backgroundColor: "var(--mb-color-background-hover)",
          "&:hover": {
            backgroundColor: "var(--mb-color-background-hover)",
          },
        },
        "&[data-first-in-range]": {
          borderTopLeftRadius: theme.radius.xs,
          borderBottomLeftRadius: theme.radius.xs,
        },
        "&[data-last-in-range]": {
          borderTopRightRadius: theme.radius.xs,
          borderBottomRightRadius: theme.radius.xs,
        },
        "&[data-selected]": {
          color: theme.white,
          backgroundColor: "var(--mb-color-background-brand)",
          "&:hover": {
            backgroundColor: "var(--mb-color-background-brand)",
          },
        },
      },
    }),
  },
  WeekdaysRow: {
    styles: theme => ({
      weekday: {
        width: rem(40),
        height: rem(32),
        color: theme.fn.themeColor("text-light"),
        fontSize: theme.fontSizes.sm,
        lineHeight: rem(24),
        textAlign: "center",
        paddingBottom: 0,
      },
    }),
  },
  PickerControl: {
    styles: theme => ({
      pickerControl: {
        color: "var(--mb-color-text-primary)",
        fontSize: theme.fontSizes.md,
        lineHeight: rem(24),
        width: rem(80),
        height: rem(32),
        borderRadius: theme.radius.sm,

        "&:hover": {
          color: "var(--mb-color-text-hover)",
          backgroundColor: "var(--mb-color-background-hover)",
        },
        "&[data-disabled]": {
          color: theme.fn.themeColor("bg-dark"),
        },
        "&[data-weekend]": {
          color: theme.fn.themeColor("text-dark"),
        },
        "&[data-outside]": {
          color: theme.fn.themeColor("bg-dark"),
        },
        "&[data-in-range]": {
          color: "var(--mb-color-text-selected)",
          borderRadius: 0,
          backgroundColor: "var(--mb-color-background-selected)",
          "&:hover": {
            backgroundColor: "var(--mb-color-background-hover)",
          },
        },
        "&[data-selected]": {
          color: "var(--mb-color-text-selected)",
          backgroundColor: "var(--mb-color-background-selected)",
        },
      },
    }),
  },
  Month: {
    styles: () =>
      getListStyles({
        rowClass: "monthRow",
        cellClass: "monthCell",
        horizontalPadding: rem(1),
        verticalPadding: rem(1),
      }),
  },
  MonthsList: {
    styles: theme =>
      getListStyles({
        rowClass: "monthsListRow",
        cellClass: "monthsListCell",
        horizontalPadding: theme.spacing.sm,
        verticalPadding: theme.spacing.xs,
      }),
  },
  YearsList: {
    styles: theme =>
      getListStyles({
        rowClass: "yearsListRow",
        cellClass: "yearsListCell",
        horizontalPadding: theme.spacing.sm,
        verticalPadding: theme.spacing.xs,
      }),
  },
  CalendarHeader: {
    styles: theme => ({
      calendarHeader: {
        marginBottom: 0,
      },
      calendarHeaderLevel: {
        height: rem(32),
        color: "var(--mb-color-text-primary)",
        fontSize: theme.fontSizes.md,
        fontWeight: "bold",
        lineHeight: rem(24),

        "&:hover": {
          backgroundColor: "var(--mb-color-background-hover)",
        },
      },
      calendarHeaderControl: {
        width: rem(32),
        height: rem(32),
        borderRadius: theme.radius.xs,
        color: "var(--mb-color-text-primary)",
        "&:hover": {
          backgroundColor: "var(--mb-color-background-hover)",
        },
      },
    }),
  },
  MonthLevel: {
    styles: () => ({
      calendarHeader: {
        marginBottom: 0,
      },
    }),
  },
});

interface ListStylesParams {
  rowClass: string;
  cellClass: string;
  horizontalPadding: string;
  verticalPadding: string;
}

const getListStyles = ({
  rowClass,
  cellClass,
  horizontalPadding,
  verticalPadding,
}: ListStylesParams) => ({
  [cellClass]: {
    ref: getStylesRef(cellClass),

    "&[data-with-spacing]": {
      padding: 0,

      "&:not(:first-of-type)": {
        paddingLeft: horizontalPadding,
      },
      "&:not(:last-of-type)": {
        paddingRight: horizontalPadding,
      },
    },
  },
  [rowClass]: {
    [`&:not(:first-of-type) .${getStylesRef(cellClass)}`]: {
      paddingTop: verticalPadding,
    },
    [`&:not(:last-of-type) .${getStylesRef("monthCell")}`]: {
      paddingBottom: verticalPadding,
    },
  },
});
