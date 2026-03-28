import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  __resetFinanceAuditWriteQueueForTests,
  clearFinanceAuditEntries,
  getFinanceAuditEntries,
  markFinanceAuditFailure,
  markFinanceAuditSuccess,
  startFinanceAudit,
} from "@/lib/finance-audit";
import { SplitError } from "@/lib/errors";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "uuid-test"),
}));

describe("finance-audit", () => {
  beforeEach(() => {
    __resetFinanceAuditWriteQueueForTests();
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (AsyncStorage.setItem as jest.Mock).mockReset();
    (AsyncStorage.removeItem as jest.Mock).mockReset();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  it("records started and succeeded entries", async () => {
    const inMemory: any[] = [];
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async () =>
      inMemory.length ? JSON.stringify(inMemory) : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_k, value) => {
      inMemory.splice(0, inMemory.length, ...JSON.parse(value));
    });

    const context = await startFinanceAudit("expense_create", {
      groupId: "g1",
      amount: 1000,
      currency: "USD",
    });
    await markFinanceAuditSuccess(context, { entityId: "e1" });

    const entries = await getFinanceAuditEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      status: "started",
      action: "expense_create",
      groupId: "g1",
      amount: 1000,
      currency: "USD",
    });
    expect(entries[1]).toMatchObject({
      status: "succeeded",
      action: "expense_create",
      entityId: "e1",
    });
    expect(entries[0].operationId).toBe(entries[1].operationId);
    expect(entries[0].correlationId).toBe(entries[1].correlationId);
  });

  it("records failures with parsed api error code", async () => {
    const inMemory: any[] = [];
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async () =>
      inMemory.length ? JSON.stringify(inMemory) : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_k, value) => {
      inMemory.splice(0, inMemory.length, ...JSON.parse(value));
    });

    const context = await startFinanceAudit("settlement_delete", { entityId: "s1" });
    const err = new SplitError(
      { code: "ERR-302", category: "RESOURCE", message: "Version conflict", status: 409 },
      409
    );
    await markFinanceAuditFailure(context, err);

    const entries = await getFinanceAuditEntries();
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      status: "failed",
      action: "settlement_delete",
      errorCode: "ERR-302",
      errorMessage: "Version conflict",
    });
  });

  it("clears persisted audit entries", async () => {
    await clearFinanceAuditEntries();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/finance_audit_log");
  });

  it("serializes concurrent appends without dropping entries", async () => {
    const inMemory: any[] = [];
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async () =>
      inMemory.length ? JSON.stringify(inMemory) : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_k, value) => {
      inMemory.splice(0, inMemory.length, ...JSON.parse(value));
    });

    const tasks = Array.from({ length: 20 }, (_, idx) =>
      startFinanceAudit("expense_create", { groupId: `g${idx}` }, `op-${idx}`)
    );
    await Promise.all(tasks);

    const entries = await getFinanceAuditEntries();
    expect(entries).toHaveLength(20);
    expect(new Set(entries.map((entry) => entry.operationId)).size).toBe(20);
  });
});
