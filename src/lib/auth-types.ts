import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    isSuperAdmin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: Role;
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
      isSuperAdmin?: boolean;
    };
  }
}
