import { afterEach, describe, expect, it, vi } from "vitest";
import { dataProvider } from "./data-provider";

const fetchMock = vi.fn();

describe("dataProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  const mockResponse = (ok: boolean, body: unknown, status = 200) =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body),
    });

  it("getList - items/total 형태를 반환하면 그대로 매핑한다", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      fetchMock as unknown as typeof fetch
    );
    fetchMock.mockResolvedValue(
      mockResponse(true, { items: [{ id: "1" }], total: 1 })
    );

    const result = await dataProvider.getList({ resource: "apps" });

    expect(result.data[0]).toEqual({ id: "1" });
    expect(result.total).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/apps", {
      cache: "no-store",
    });
  });

  it("getOne - 404 응답 시 예외를 던진다", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      fetchMock as unknown as typeof fetch
    );
    fetchMock.mockResolvedValue(
      mockResponse(false, { message: "Not found" }, 404)
    );

    await expect(
      dataProvider.getOne({ resource: "apps", id: "missing" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("create - data 래퍼가 있으면 data를 추출한다", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      fetchMock as unknown as typeof fetch
    );
    fetchMock.mockResolvedValue(
      mockResponse(true, { data: { id: "new-app" } })
    );

    const result = await dataProvider.create({
      resource: "apps",
      variables: { name: "Test" },
    });

    expect(result.data).toEqual({ id: "new-app" });
  });
});
