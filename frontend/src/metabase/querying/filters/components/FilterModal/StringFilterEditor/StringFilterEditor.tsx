import { useMemo, useState } from "react";
import { t } from "ttag";

import { getColumnIcon } from "metabase/common/utils/columns";
import {
  type OperatorType,
  useStringFilter,
} from "metabase/querying/filters/hooks/use-string-filter";
import { Grid, MultiAutocomplete } from "metabase/ui";
import type * as Lib from "metabase-lib";

import { StringFilterValuePicker } from "../../FilterValuePicker";
import { FilterOperatorPicker } from "../FilterOperatorPicker";
import { FilterTitle, HoverParent } from "../FilterTitle";
import { useFilterModalContext } from "../context";
import type { FilterEditorProps } from "../types";

export function StringFilterEditor({
  stageIndex,
  column,
  filter,
  onChange,
}: FilterEditorProps) {
  const { query, onInput } = useFilterModalContext();
  const columnIcon = useMemo(() => getColumnIcon(column), [column]);
  const [isFocused, setIsFocused] = useState(false);

  const {
    type,
    operator,
    availableOptions,
    values,
    options,
    getDefaultValues,
    getFilterClause,
    setOperator,
    setValues,
  } = useStringFilter({
    query,
    stageIndex,
    column,
    filter,
  });

  const handleOperatorChange = (newOperator: Lib.StringFilterOperator) => {
    const newValues = getDefaultValues(newOperator, values);
    setOperator(newOperator);
    setValues(newValues);
    onChange(getFilterClause(newOperator, newValues, options));
  };

  const handleInputChange = (newValues: string[]) => {
    setValues(newValues);
    if (isFocused) {
      onInput();
    } else {
      onChange(getFilterClause(operator, newValues, options));
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    onChange(getFilterClause(operator, values, options));
  };

  return (
    <HoverParent data-testid="string-filter-editor">
      <Grid grow>
        <Grid.Col span="auto">
          <FilterTitle
            stageIndex={stageIndex}
            column={column}
            columnIcon={columnIcon}
          >
            <FilterOperatorPicker
              value={operator}
              options={availableOptions}
              onChange={handleOperatorChange}
            />
          </FilterTitle>
        </Grid.Col>
        <Grid.Col span={4}>
          <StringValueInput
            query={query}
            stageIndex={stageIndex}
            column={column}
            values={values}
            type={type}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </Grid.Col>
      </Grid>
    </HoverParent>
  );
}

interface StringValueInputProps {
  query: Lib.Query;
  stageIndex: number;
  column: Lib.ColumnMetadata;
  values: string[];
  type: OperatorType;
  onChange: (values: string[]) => void;
  onFocus: () => void;
  onBlur: () => void;
}

function StringValueInput({
  query,
  stageIndex,
  column,
  values,
  type,
  onChange,
  onFocus,
  onBlur,
}: StringValueInputProps) {
  if (type === "exact") {
    return (
      <StringFilterValuePicker
        query={query}
        stageIndex={stageIndex}
        column={column}
        values={values}
        compact
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );
  }

  if (type === "partial") {
    return (
      <MultiAutocomplete
        data={[]}
        value={values}
        placeholder={t`Enter some text`}
        aria-label={t`Filter value`}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );
  }

  return null;
}
