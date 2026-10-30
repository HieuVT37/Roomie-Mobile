import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigation } from "expo-router";
import {
  createListRequestGate,
  ListResponseError,
  mergeListItems,
  normalizeListResponse,
  runListRequest,
  sameListScope,
} from "./infinite-list-utils";

export interface InfiniteListOptions {
  enabled?: boolean;
}

function initialState(scope: readonly unknown[], enabled: boolean) {
  return {
    scope: [...scope],
    enabled,
    items: [] as any[],
    page: 1,
    pages: 1,
    loading: enabled,
    refreshing: false,
    loadingMore: false,
    error: "",
    errorCode: "",
  };
}

// Callers include query, tab and user identity in deps when those change the data.
export function useInfiniteList(
  fetchPage: (page: number) => Promise<unknown>,
  deps: readonly unknown[] = [],
  { enabled = true }: InfiniteListOptions = {},
) {
  const [state, setState] = useState(() => initialState(deps, enabled));
  const [requests] = useState(createListRequestGate);
  const fetchRef = useRef(fetchPage);

  // Reset before children receive data from the previous user/filter. This
  // guarded render adjustment avoids displaying an old list for one frame.
  if (!sameListScope(state.scope, deps) || state.enabled !== enabled) {
    setState(initialState(deps, enabled));
  }

  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  const load = useCallback(
    (nextPage: number, append: boolean, scope: readonly unknown[]) => {
      const update = (change: (current: typeof state) => typeof state) => {
        setState((current) =>
          current.enabled && sameListScope(current.scope, scope) ? change(current) : current,
        );
      };
      return runListRequest(requests, () => fetchRef.current(nextPage), {
        resolve: (response) => {
          const data = normalizeListResponse(response, nextPage);
          update((current) => ({
            ...current,
            items: append ? mergeListItems(current.items, data.items) : data.items,
            page: data.page,
            pages: data.pages,
            error: "",
            errorCode: "",
          }));
        },
        reject: (error) => {
          const err = error as any;
          const serverMessage = typeof err?.response?.data?.message === "string"
            ? err.response.data.message
            : "";
          const serverCode = typeof err?.response?.data?.code === "string"
            ? err.response.data.code
            : "";
          update((current) => ({
            ...current,
            errorCode: serverCode,
            error: err?.code === "ECONNABORTED"
              ? "Máy chủ đang khởi động, hãy kéo xuống để thử lại"
              : serverMessage ||
                (err instanceof ListResponseError ? err.message : "Không tải được danh sách"),
          }));
        },
        settled: () => update((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          loadingMore: false,
        })),
      });
    },
    [requests],
  );

  useEffect(() => {
    requests.invalidate();
    if (enabled) void load(1, false, deps);
    return () => requests.invalidate();
    // fetchPage is kept current separately; callers explicitly select reset deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, load, requests, ...deps]);

  const refresh = (): Promise<void> => {
    if (!enabled || state.loading || state.refreshing || state.loadingMore || requests.isBusy()) {
      return Promise.resolve();
    }
    setState((current) => ({ ...current, refreshing: true, error: "", errorCode: "" }));
    return load(1, false, state.scope);
  };

  const loadMore = () => {
    if (!enabled || state.loading || state.refreshing || state.loadingMore || requests.isBusy() || state.page >= state.pages) {
      return;
    }
    setState((current) => ({ ...current, loadingMore: true, error: "", errorCode: "" }));
    void load(state.page + 1, true, state.scope);
  };

  const { items, loading, refreshing, loadingMore, error, errorCode } = state;
  return { items, loading, refreshing, loadingMore, error, errorCode, refresh, loadMore };
}

// Bấm lại vào tab đang mở thì cuộn danh sách về đầu trang
export function useTabPressScrollTop(ref: React.RefObject<any>) {
  const navigation: any = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener?.("tabPress", () => {
      if (navigation.isFocused()) ref.current?.scrollToOffset?.({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation, ref]);
}
