import type React from "react";
import { useCallback, useState } from "react";
import { push } from "react-router-redux";
import { t } from "ttag";

import { getCollectionName } from "metabase/collections/utils";
import { EllipsifiedCollectionPath } from "metabase/common/components/EllipsifiedPath/EllipsifiedCollectionPath";
import { useLocale } from "metabase/common/hooks/use-locale/use-locale";
import EntityItem from "metabase/components/EntityItem";
import { SortableColumnHeader } from "metabase/components/ItemsTable/BaseItemsTable";
import {
  ItemNameCell,
  MaybeItemLink,
  TBody,
  Table,
} from "metabase/components/ItemsTable/BaseItemsTable.styled";
import { Columns } from "metabase/components/ItemsTable/Columns";
import type { ResponsiveProps } from "metabase/components/ItemsTable/utils";
import Link from "metabase/core/components/Link";
import { useDispatch } from "metabase/lib/redux";
import * as Urls from "metabase/lib/urls";
import { Box, FixedSizeIcon, Flex, Icon, Skeleton } from "metabase/ui";
import { Repeat } from "metabase/ui/components/feedback/Skeleton/Repeat";
import { SortDirection, type SortingOptions } from "metabase-types/api/sorting";

import type { MetricResult } from "../types";
import { getIcon } from "../utils";

import { EllipsifiedWithMarkdownTooltip } from "./EllipsifiedWithMarkdownTooltip";
import { getMetricDescription, sortMetrics } from "./utils";

type MetricsTableProps = {
  metrics?: MetricResult[];
  skeleton?: boolean;
};

const DEFAULT_SORTING_OPTIONS: SortingOptions = {
  sort_column: "name",
  sort_direction: SortDirection.Asc,
};

export const itemsTableContainerName = "ItemsTableContainer";

const descriptionProps: ResponsiveProps = {
  hideAtContainerBreakpoint: "sm",
  containerName: itemsTableContainerName,
};

const collectionProps: ResponsiveProps = {
  hideAtContainerBreakpoint: "xs",
  containerName: itemsTableContainerName,
};

export function MetricsTable({
  skeleton = false,
  metrics = [],
}: MetricsTableProps) {
  const [sortingOptions, setSortingOptions] = useState<SortingOptions>(
    DEFAULT_SORTING_OPTIONS,
  );

  const locale = useLocale();
  const sortedMetrics = sortMetrics(metrics, sortingOptions, locale);

  const handleSortingOptionsChange = skeleton ? undefined : setSortingOptions;

  return (
    <Table aria-label={skeleton ? undefined : t`Table of metrics`}>
      <thead>
        <tr>
          <SortableColumnHeader
            name="name"
            sortingOptions={sortingOptions}
            onSortingOptionsChange={handleSortingOptionsChange}
            style={{ paddingInlineStart: ".625rem" }}
            columnHeaderProps={{
              style: { paddingInlineEnd: ".5rem" },
            }}
          >
            {t`Name`}
          </SortableColumnHeader>
          <SortableColumnHeader
            name="collection"
            sortingOptions={sortingOptions}
            onSortingOptionsChange={handleSortingOptionsChange}
            style={{ paddingInlineStart: ".625rem" }}
            columnHeaderProps={{
              style: { paddingInlineEnd: ".5rem" },
            }}
          >
            {t`Collection`}
          </SortableColumnHeader>
          <SortableColumnHeader
            name="description"
            sortingOptions={sortingOptions}
            onSortingOptionsChange={handleSortingOptionsChange}
            style={{ paddingInlineStart: ".625rem" }}
            columnHeaderProps={{
              style: { paddingInlineEnd: ".5rem" },
            }}
          >
            {t`Description`}
          </SortableColumnHeader>
        </tr>
      </thead>
      <TBody>
        {skeleton ? (
          <Repeat times={7}>
            <MetricRow />
          </Repeat>
        ) : (
          sortedMetrics.map((metric: MetricResult) => (
            <MetricRow metric={metric} key={`${metric.model}-${metric.id}`} />
          ))
        )}
      </TBody>
    </Table>
  );
}

function MetricRow({ metric }: { metric?: MetricResult }) {
  const dispatch = useDispatch();

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!metric) {
        return;
      }

      // do not trigger click when selecting text
      const selection = document.getSelection();
      if (selection?.type === "Range") {
        event.stopPropagation();
        return;
      }

      const { id, name } = metric;
      const url = Urls.metric({ id, name });
      const subpathSafeUrl = Urls.getSubpathSafeUrl(url);

      // TODO:
      // trackMetricClick(metric.id);

      if ((event.ctrlKey || event.metaKey) && event.button === 0) {
        Urls.openInNewTab(subpathSafeUrl);
      } else {
        dispatch(push(url));
      }
    },
    [metric, dispatch],
  );

  return (
    <tr onClick={handleClick} tabIndex={0}>
      <NameCell metric={metric} />
      <CollectionCell metric={metric} />
      <DescriptionCell metric={metric} />
      <Columns.RightEdge.Cell />
    </tr>
  );
}

function SkeletonText() {
  return <Skeleton natural h="16.8px" />;
}

function stopPropagation(event: React.MouseEvent) {
  event.stopPropagation();
}

function NameCell({ metric }: { metric?: MetricResult }) {
  const headingId = `metric-${metric?.id ?? "dummy"}-heading`;
  const icon = getIcon(metric);

  return (
    <ItemNameCell data-testid="table-name" aria-labelledby={headingId}>
      <MaybeItemLink
        to={
          metric ? Urls.metric({ id: metric.id, name: metric.name }) : undefined
        }
        style={{
          // To align the icons with "Name" in the <th>
          paddingInlineStart: "1.4rem",
          paddingInlineEnd: ".5rem",
        }}
        onClick={stopPropagation}
      >
        <Icon
          size={16}
          {...icon}
          color={"var(--mb-color-brand)"}
          style={{ flexShrink: 0 }}
        />
        {metric ? (
          <EntityItem.Name
            name={metric?.name || ""}
            variant="list"
            id={headingId}
          />
        ) : (
          <SkeletonText />
        )}
      </MaybeItemLink>
    </ItemNameCell>
  );
}

function CollectionCell({ metric }: { metric?: MetricResult }) {
  const collectionName = metric?.collection
    ? getCollectionName(metric.collection)
    : t`Untitled collection`;

  const content = (
    <Flex gap="sm">
      <FixedSizeIcon name="folder" />
      <Box w="calc(100% - 1.5rem)">
        {metric ? (
          <EllipsifiedCollectionPath collection={metric.collection} />
        ) : (
          <SkeletonText />
        )}
      </Box>
    </Flex>
  );

  return (
    <td
      data-testid={`path-for-collection: ${collectionName}`}
      {...collectionProps}
    >
      {metric?.collection ? (
        <Link to={Urls.collection(metric.collection)} onClick={stopPropagation}>
          {content}
        </Link>
      ) : (
        content
      )}
    </td>
  );
}

function DescriptionCell({ metric }: { metric?: MetricResult }) {
  return (
    <td {...descriptionProps}>
      {metric ? (
        <EllipsifiedWithMarkdownTooltip>
          {getMetricDescription(metric) || ""}
        </EllipsifiedWithMarkdownTooltip>
      ) : (
        <SkeletonText />
      )}
    </td>
  );
}
