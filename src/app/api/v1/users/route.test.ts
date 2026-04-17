import { getUsers } from "@/actions/users";
import * as handler from "@/app/api/v1/users/route";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/actions/users", () => ({
  getUsers: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockGetUsers = vi.mocked(getUsers);

describe("/api/v1/users 계약", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null as never);

    const req = new NextRequest("http://localhost/api/v1/users");
    const res = await handler.GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ message: "Unauthorized" });
  });

  it("GET 200 with items/total", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    } as never);
    mockGetUsers.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    const req = new NextRequest(
      "http://localhost/api/v1/users?page=1&limit=20"
    );
    const res = await handler.GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("items");
    expect(json).toHaveProperty("total", 0);
  });

  it("GET applies filter params correctly", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    } as never);
    mockGetUsers.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    const req = new NextRequest(
      "http://localhost/api/v1/users?role=ADMIN&search=test"
    );
    await handler.GET(req);

    expect(mockGetUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          role: "ADMIN",
          search: "test",
        }),
      })
    );
  });

  it("GET applies sort params correctly", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    } as never);
    mockGetUsers.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    const req = new NextRequest(
      "http://localhost/api/v1/users?sortBy=name&sortOrder=asc"
    );
    await handler.GET(req);

    expect(mockGetUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: expect.objectContaining({
          sortBy: "name",
          sortOrder: "asc",
        }),
      })
    );
  });
});
