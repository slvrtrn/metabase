import type { SearchRequest, SearchResponse } from "metabase-types/api";

import { Api } from "./api";
import { provideSearchItemListTags } from "./tags";

export const searchApi = Api.injectEndpoints({
  endpoints: builder => ({
    search: builder.query<SearchResponse, SearchRequest>({
      query: ({ limit, offset, sort_column, sort_direction, ...body }) => ({
        method: "GET",
        url: "/api/search",
        params: { limit, offset, sort_column, sort_direction },
        body,
      }),
      providesTags: (response, error, { models }) =>
        provideSearchItemListTags(response?.data ?? [], models),
    }),
  }),
});

export const { useSearchQuery } = searchApi;
