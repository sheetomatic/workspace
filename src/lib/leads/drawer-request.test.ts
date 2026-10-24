import { afterEach, describe, expect, it, vi } from "vitest";
import { startDrawerRequest } from "./drawer-request";

afterEach(() => vi.useRealTimers());
describe("lead drawer request", () => {
  it("renders successful data", async () => {
    const success = vi.fn(), failure = vi.fn();
    startDrawerRequest(async () => ({id: "lead"}), success, failure);
    await vi.waitFor(() => expect(success).toHaveBeenCalledWith({id: "lead"}));
    expect(failure).not.toHaveBeenCalled();
  });
  it.each([null, new Error("private database detail")])("handles missing or failed data without leaking backend details", async value => {
    const success = vi.fn(), failure = vi.fn();
    startDrawerRequest(async () => {if(value instanceof Error) throw value; return value;}, success, failure);
    await vi.waitFor(() => expect(failure).toHaveBeenCalledOnce());
    expect(failure.mock.calls[0][0]).not.toContain("private database detail");
    expect(success).not.toHaveBeenCalled();
  });
  it("times out and ignores a late success", async () => {
    vi.useFakeTimers();const success = vi.fn(), failure = vi.fn();let finish!: (value: string) => void;
    startDrawerRequest(() => new Promise<string>(resolve => {finish=resolve;}), success, failure);
    await vi.advanceTimersByTimeAsync(15000);finish("late");await vi.advanceTimersByTimeAsync(1);
    expect(failure).toHaveBeenCalledOnce();expect(success).not.toHaveBeenCalled();
  });
  it("ignores a closed or switched lead and lets a retry succeed", async () => {
    vi.useFakeTimers();const success = vi.fn(), failure = vi.fn();
    const cancel = startDrawerRequest(async () => "old", success, failure);cancel();
    startDrawerRequest(async () => "new", success, failure);
    await vi.advanceTimersByTimeAsync(16000);
    expect(success).toHaveBeenCalledExactlyOnceWith("new");expect(failure).not.toHaveBeenCalled();
  });
});
