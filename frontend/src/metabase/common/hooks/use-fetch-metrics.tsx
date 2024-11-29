import { skipToken, useSearchQuery } from "metabase/api";
import type { SearchRequest } from "metabase-types/api";

export const useFetchMetrics = (
  req:
    | (Partial<SearchRequest> & Pick<SearchRequest, "context">)
    | typeof skipToken,
) => {
  const modelsResult = useSearchQuery(
    req === skipToken
      ? req
      : {
          models: ["metric"],
          ...req,
        },
  );
  return modelsResult;
};
