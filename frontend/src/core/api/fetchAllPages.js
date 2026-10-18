import axiosInstance from './axiosConfig';

/**
 * Reads every page of a paginated DRF endpoint.
 * StandardResultsSetPagination uses page_size=100 by default and allows up to 1000.
 */
export default async function fetchAllPages(url, params = {}) {
  const pageSize = Number(params.page_size) || 1000;
  const first = await axiosInstance.get(url, { params: { ...params, page_size: pageSize } });
  const payload = first.data;
  if (Array.isArray(payload)) return payload;

  const rows = [...(payload?.results || [])];
  const total = Number(payload?.count ?? rows.length);
  const pageCount = Math.ceil(total / pageSize);
  for (let page = 2; page <= pageCount; page += 1) {
    const response = await axiosInstance.get(url, { params: { ...params, page, page_size: pageSize } });
    rows.push(...(response.data?.results || []));
  }
  return rows;
}
