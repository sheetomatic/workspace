import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({session:vi.fn(), organizations:vi.fn(), execute:vi.fn(), revalidate:vi.fn()}));
vi.mock("@/lib/require-session", () => ({requireSession:mocks.session}));
vi.mock("@/lib/db", () => ({prisma:{organization:{findMany:mocks.organizations},$executeRaw:mocks.execute}}));
vi.mock("next/cache", () => ({revalidatePath:mocks.revalidate}));
import { requireBannerAdmin } from "./marketing-banner-store";
import { saveWebsiteBanners } from "@/app/app/settings/banners/actions";
import { defaultBanners } from "./marketing-banners";
beforeEach(() => {vi.clearAllMocks();mocks.organizations.mockResolvedValue([{id:"primary",workspaceAppearance:{}}]);mocks.session.mockResolvedValue({organizationId:"primary",role:"ADMIN",isSuperAdmin:false});mocks.execute.mockResolvedValue(1);});
describe("website banner authorization and persistence", () => {
  it.each([{organizationId:"client",role:"OWNER"},{organizationId:"primary",role:"STAFF"}])("rejects unauthorized workspace users", async user => {
    mocks.session.mockResolvedValue({...user,isSuperAdmin:false});
    await expect(saveWebsiteBanners(defaultBanners,0)).rejects.toThrow("Website administrators only");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("allows primary admin and platform admin", async () => {
    await expect(requireBannerAdmin()).resolves.toMatchObject({id:"primary"});
    mocks.session.mockResolvedValue({organizationId:"client",role:"STAFF",isSuperAdmin:true});
    await expect(requireBannerAdmin()).resolves.toMatchObject({id:"primary"});
  });
  it("rejects ambiguous primary configuration", async () => {
    mocks.organizations.mockResolvedValue([{id:"one"},{id:"two"}]);
    await expect(requireBannerAdmin()).rejects.toThrow("single primary");
  });
  it("validates on server before writing", async () => {
    expect((await saveWebsiteBanners([{...defaultBanners[0],href:"javascript:alert(1)"}],0)).ok).toBe(false);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("checks version, updates only nested banner data and invalidates homepage", async () => {
    expect(await saveWebsiteBanners(defaultBanners,3)).toEqual({ok:true,version:4});
    const args=mocks.execute.mock.calls[0];
    expect(args[0].join("?")).toContain("jsonb_set");
    expect(args).toContain("primary");expect(args).toContain("3");
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });
  it("does not overwrite a concurrent edit", async () => {
    mocks.execute.mockResolvedValue(0);
    expect((await saveWebsiteBanners(defaultBanners,0)).ok).toBe(false);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
