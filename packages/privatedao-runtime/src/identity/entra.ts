import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AuthenticatedTenantPrincipal, WalletRole } from "../wallet-security.js";

export type EnterpriseRole = "maker" | "checker" | "approver" | "auditor" | "admin";

export interface EntraIdentityConfig {
  tenantId: string;
  audience: string;
  issuer?: string;
  jwksUri?: string;
  clockToleranceSeconds?: number;
}

export interface EnterprisePrincipal {
  issuer: string;
  tenantId: string;
  subject: string;
  objectId?: string;
  displayName?: string;
  username?: string;
  roles: readonly EnterpriseRole[];
  claims: Readonly<Record<string, unknown>>;
}

export interface TenantMembership {
  tenantId: string;
  directoryTenantId: string;
  subject: string;
  roles: readonly EnterpriseRole[];
  active: boolean;
}

export function toWalletPrincipal(principal: EnterprisePrincipal, membership: TenantMembership, organizationId: string, authenticatedAt = new Date().toISOString()): AuthenticatedTenantPrincipal {
  if (!membership.active) throw new EntraIdentityError("MEMBERSHIP_INACTIVE", "The PrivateDAO tenant membership is inactive.");
  if (!organizationId || organizationId !== membership.tenantId) throw new EntraIdentityError("TENANT_NOT_MAPPED", "The organization is not bound to the authenticated PrivateDAO tenant.");
  const roles: WalletRole[] = membership.roles.map((role) => role === "checker" ? "approver" : role);
  return {
    tenantId: membership.tenantId,
    organizationId,
    subjectId: principal.subject,
    roles,
    issuer: principal.issuer,
    authenticatedAt,
  };
}

export interface TenantMembershipStore {
  findMembership(input: { directoryTenantId: string; subject: string }): Promise<TenantMembership | undefined>;
}

export class EntraIdentityError extends Error {
  constructor(readonly code: "NOT_CONFIGURED" | "INVALID_TOKEN" | "TENANT_NOT_MAPPED" | "MEMBERSHIP_INACTIVE" | "ROLE_REQUIRED", message: string) {
    super(message);
    this.name = "EntraIdentityError";
  }
}

function issuerFor(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/v2.0`;
}

function jwksFor(tenantId: string, configured?: string): string {
  return configured || `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
}

function stringClaim(payload: JWTPayload, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function rolesFrom(payload: JWTPayload): EnterpriseRole[] {
  const values = Array.isArray(payload.roles) ? payload.roles : [];
  return values.filter((value): value is EnterpriseRole =>
    value === "maker" || value === "checker" || value === "approver" || value === "auditor" || value === "admin",
  );
}

export class EntraTokenVerifier {
  private readonly config: Required<Pick<EntraIdentityConfig, "tenantId" | "audience" | "clockToleranceSeconds">> & Pick<EntraIdentityConfig, "issuer" | "jwksUri">;
  private readonly keys;

  constructor(config: EntraIdentityConfig) {
    if (!config.tenantId || !config.audience) throw new EntraIdentityError("NOT_CONFIGURED", "Entra tenantId and audience are required.");
    this.config = {
      ...config,
      clockToleranceSeconds: config.clockToleranceSeconds ?? 60,
    };
    this.keys = createRemoteJWKSet(new URL(jwksFor(config.tenantId, config.jwksUri)));
  }

  async verifyBearerToken(authorizationHeader: string | undefined): Promise<EnterprisePrincipal> {
    const bearerPrefix = "bearer ";
    const token = authorizationHeader?.slice(0, bearerPrefix.length).toLowerCase() === bearerPrefix
      ? authorizationHeader.slice(bearerPrefix.length).trim()
      : undefined;
    if (!token) throw new EntraIdentityError("INVALID_TOKEN", "A Bearer token is required.");
    const issuer = this.config.issuer || issuerFor(this.config.tenantId);
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer,
        audience: this.config.audience,
        clockTolerance: this.config.clockToleranceSeconds,
      });
      const tenantId = stringClaim(payload, "tid");
      const subject = stringClaim(payload, "sub");
      if (tenantId !== this.config.tenantId || !subject) throw new Error("Token tenant or subject is invalid.");
      return {
        issuer,
        tenantId,
        subject,
        objectId: stringClaim(payload, "oid"),
        displayName: stringClaim(payload, "name"),
        username: stringClaim(payload, "preferred_username") || stringClaim(payload, "upn"),
        roles: rolesFrom(payload),
        claims: payload as Readonly<Record<string, unknown>>,
      };
    } catch {
      throw new EntraIdentityError("INVALID_TOKEN", "The Entra token could not be validated.");
    }
  }
}

export class EntraTenantAuthorizer {
  constructor(
    private readonly verifier: EntraTokenVerifier,
    private readonly memberships: TenantMembershipStore,
  ) {}

  async authorize(authorizationHeader: string | undefined, requiredRole?: EnterpriseRole): Promise<{ principal: EnterprisePrincipal; membership: TenantMembership }> {
    const principal = await this.verifier.verifyBearerToken(authorizationHeader);
    const membership = await this.memberships.findMembership({ directoryTenantId: principal.tenantId, subject: principal.subject });
    if (!membership) throw new EntraIdentityError("TENANT_NOT_MAPPED", "The Entra identity is not mapped to a PrivateDAO tenant.");
    if (!membership.active) throw new EntraIdentityError("MEMBERSHIP_INACTIVE", "The PrivateDAO tenant membership is inactive.");
    if (requiredRole && !membership.roles.includes(requiredRole) && !membership.roles.includes("admin")) {
      throw new EntraIdentityError("ROLE_REQUIRED", "The identity does not have the required PrivateDAO role.");
    }
    return { principal, membership };
  }
}

export class MapTenantMembershipStore implements TenantMembershipStore {
  constructor(private readonly records: readonly TenantMembership[]) {}

  async findMembership(input: { directoryTenantId: string; subject: string }): Promise<TenantMembership | undefined> {
    return this.records.find((record) => record.directoryTenantId === input.directoryTenantId && record.subject === input.subject);
  }
}
