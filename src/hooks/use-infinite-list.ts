import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigation } from "expo-router";

// Danh sách phân trang: tải trang 1, kéo xuống để làm mới, cuộn tới cuối để tải thêm.
// fetchPage(page) phải trả về { items, page, pages } như API của server.
export function useInfiniteList(fetchPage: (page: number) => Promise<any>, deps: any[] = []) {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const reqId = useRef(0); // bỏ qua kết quả của request cũ khi đã có request mới hơn
  const moreBusy = useRef(false);
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  const load = useCallback(async (nextPage: number, replace: boolean) => {
    const id = ++reqId.current;
    try {
      const data = await fetchRef.current(nextPage);
      if (id !== reqId.current) return;
      setPage(data.page);
      setPages(data.pages);
      setItems((prev) => {
        if (replace) return data.items;
        const key = (i: any) => i.id ?? i.userId;
        const seen = new Set(prev.map(key));
        return [...prev, ...data.items.filter((i: any) => !seen.has(key(i)))];
      });
      setError("");
      setErrorCode("");
    } catch (err: any) {
      if (id !== reqId.current) return;
      if (replace) setItems([]);
      setErrorCode(err.response?.data?.code || "");
      setError(
        err.code === "ECONNABORTED"
          ? "Máy chủ đang khởi động, hãy kéo xuống để thử lại"
          : err.response?.data?.message || "Không tải được danh sách"
      );
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(1, true).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refresh = async () => {
    setRefreshing(true);
    await load(1, true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (moreBusy.current || loading || page >= pages) return;
    moreBusy.current = true;
    load(page + 1, false).finally(() => {
      moreBusy.current = false;
    });
  };

  return { items, loading, refreshing, error, errorCode, refresh, loadMore };
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
