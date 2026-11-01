import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AuthenticatedTenantPrincipal, WalletRole } from "../wallet-security.js";
import type { EnterprisePrincipal, EnterpriseRole, TenantMembership, TenantMembershipStore } from "./entra.js";

export interface CognitoIdentityConfig {
  userPoolId: string;
  issuer: string;
  audience: string;
  tokenUse?: "access" | "id";
  jwksUri?: string;
  clockToleranceSeconds?: number;
}

export class CognitoIdentityError extends Error {
  constructor(readonly code: "NOT_CONFIGURED" | "INVALID_TOKEN" | "TENANT_NOT_MAPPED" | "MEMBERSHIP_INACTIVE" | "ROLE_REQUIRED", message: string) {
    super(message);
    this.name = "CognitoIdentityError";
  }
}

function stringClaim(payload: JWTPayload, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function rolesFrom(payload: JWTPayload): EnterpriseRole[] {
  const values = Array.isArray(payload["https://privatedao.org/roles"])
    ? payload["https://privatedao.org/roles"]
    : Array.isArray(payload.roles) ? payload.roles : [];
  return values.filter((value): value is EnterpriseRole =>
    value === "maker" || value === "checker" || value === "approver" || value === "auditor" || value === "admin",
  );
}

export class CognitoTokenVerifier {
  private readonly config: Required<Pick<CognitoIdentityConfig, "userPoolId" | "issuer" | "audience" | "tokenUse" | "clockToleranceSeconds">> & Pick<CognitoIdentityConfig, "jwksUri">;
  private readonly keys;

  constructor(config: CognitoIdentityConfig) {
    if (!config.userPoolId || !config.issuer || !config.audience) {
      throw new CognitoIdentityError("NOT_CONFIGURED", "Cognito userPoolId, issuer, and audience are required.");
    }
    this.config = { ...config, tokenUse: config.tokenUse ?? "access", clockToleranceSeconds: config.clockToleranceSeconds ?? 60 };
    this.keys = createRemoteJWKSet(new URL(config.jwksUri || `${config.issuer.replace(/\/$/, "")}/.well-known/jwks.json`));
  }

  async verifyBearerToken(authorizationHeader: string | undefined): Promise<EnterprisePrincipal> {
    const prefix = "bearer ";
    const token = authorizationHeader?.slice(0, prefix.length).toLowerCase() === prefix
      ? authorizationHeader.slice(prefix.length).trim()
      : undefined;
    if (!token) throw new CognitoIdentityError("INVALID_TOKEN", "A Bearer token is required.");
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer: this.config.issuer,
        clockTolerance: this.config.clockToleranceSeconds,
        ...(this.config.tokenUse === "id" ? { audience: this.config.audience } : {}),
      });
      const tokenUse = stringClaim(payload, "token_use");
      if (tokenUse !== this.config.tokenUse) throw new Error("The Cognito token_use claim is invalid.");
      if (this.config.tokenUse === "access" && stringClaim(payload, "client_id") !== this.config.audience) {
        throw new Error("The Cognito access token client_id is invalid.");
      }
      const subject = stringClaim(payload, "sub");
      if (!subject) throw new Error("Token subject is missing.");
      return {
        issuer: this.config.issuer,
        tenantId: this.config.userPoolId,
        subject,
        displayName: stringClaim(payload, "name") || stringClaim(payload, "email"),
        username: stringClaim(payload, "email") || stringClaim(payload, "username"),
        roles: rolesFrom(payload),
        claims: payload as Readonly<Record<string, unknown>>,
      };
    } catch {
      throw new CognitoIdentityError("INVALID_TOKEN", "The Cognito token could not be validated.");
    }
  }
}

export class CognitoTenantAuthorizer {
  constructor(
    private readonly verifier: CognitoTokenVerifier,
    private readonly memberships: TenantMembershipStore,
  ) {}

  async authorize(authorizationHeader: string | undefined, requiredRole?: EnterpriseRole): Promise<{ principal: EnterprisePrincipal; membership: TenantMembership }> {
    const principal = await this.verifier.verifyBearerToken(authorizationHeader);
    const membership = await this.memberships.findMembership({ directoryTenantId: principal.tenantId, subject: principal.subject });
    if (!membership) throw new CognitoIdentityError("TENANT_NOT_MAPPED", "The Cognito identity is not mapped to a PrivateDAO tenant.");
    if (!membership.active) throw new CognitoIdentityError("MEMBERSHIP_INACTIVE", "The Cognito identity membership is inactive.");
    if (requiredRole && !membership.roles.includes(requiredRole) && !membership.roles.includes("admin")) {
      throw new CognitoIdentityError("ROLE_REQUIRED", "The Cognito identity does not have the required PrivateDAO role.");
    }
    return { principal, membership };
  }
}

export type CognitoWalletPrincipal = AuthenticatedTenantPrincipal & { roles: readonly WalletRole[] };
