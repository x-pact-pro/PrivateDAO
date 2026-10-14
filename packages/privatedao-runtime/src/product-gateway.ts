import type {
  CapabilityId,
  ExecutionContext,
  ExecutionIntent,
  ExecutionReceipt,
  PreparedExecution,
} from "./index.js";
import { findApplicationBinding } from "./application-bindings.js";
import { KernelError, PrivateDaoKernel } from "./kernel.js";
import type { ProtocolPermission, ProtocolRegistry, ProtocolRole } from "./protocol.js";

/**
 * Product-facing execution boundary. Authorization is checked before the
 * provider-neutral Kernel is allowed to prepare, submit, or read an action.
 */
export class ProductExecutionGateway {
  constructor(
    private readonly kernel: PrivateDaoKernel,
    private readonly protocols: ProtocolRegistry,
  ) {}

  prepare<TPayload, TUnsigned>(
    intent: ExecutionIntent<TPayload>,
    role: ProtocolRole,
  ): Promise<PreparedExecution<TUnsigned>> {
    this.authorize(intent.context, "execution.prepare", role);
    return this.kernel.prepare<TPayload, TUnsigned>(intent);
  }

  submit<TUnsigned>(prepared: PreparedExecution<TUnsigned>, signedPayload: TUnsigned, role: ProtocolRole): Promise<{ executionId: string; signatures: string[] }> {
    this.assertExecutionContext(prepared.executionId, prepared.intent.context);
    this.authorize(prepared.intent.context, "execution.submit", role);
    return this.kernel.submit(prepared.executionId, signedPayload);
  }

  status(execution: Pick<PreparedExecution<unknown>, "intent"> & { executionId: string }, role: ProtocolRole) {
    this.assertExecutionContext(execution.executionId, execution.intent.context);
    this.authorize(execution.intent.context, "execution.read", role);
    return this.kernel.status(execution.executionId);
  }

  receipt<TResult = unknown>(execution: Pick<PreparedExecution<unknown>, "intent"> & { executionId: string }, role: ProtocolRole): Promise<ExecutionReceipt<TResult>> {
    this.assertExecutionContext(execution.executionId, execution.intent.context);
    this.authorize(execution.intent.context, "receipt.read", role);
    return this.kernel.receipt<TResult>(execution.executionId);
  }

  private assertExecutionContext(executionId: string, supplied: ExecutionContext): void {
    const recorded = this.kernel.executionContext(executionId);
    const fields: Array<keyof ExecutionContext> = [
      "requestId",
      "idempotencyKey",
      "product",
      "capability",
      "organizationId",
      "actorId",
      "network",
      "provider",
      "policyHash",
    ];
    if (fields.some((field) => recorded[field] !== supplied[field])) {
      throw new KernelError("INVALID_INTENT", "Execution context does not match the context recorded at preparation time.", {
        executionId,
      });
    }
  }

  private authorize(context: ExecutionContext, permission: ProtocolPermission, role: ProtocolRole): void {
    this.assertApplicationBinding(context);
    const registration = this.protocols.resolve(context.capability);
    if (registration.product !== context.product) {
      throw new KernelError("INVALID_INTENT", "The protocol capability does not belong to the requested product.");
    }
    if (!this.protocols.authorize(context.capability, permission, role, registration.capability.version)) {
      throw new KernelError("INVALID_INTENT", `Role ${role} is not authorized for ${permission}.`, {
        capability: context.capability,
        product: context.product,
      });
    }
  }

  /**
   * The application ledger is a security boundary, not documentation. Only a
   * declared Kernel gateway lane may reach the provider; legacy and unbound
   * rows remain visible for migration but are fail-closed here.
   */
  private assertApplicationBinding(context: ExecutionContext): void {
    let binding;
    try {
      binding = findApplicationBinding(context.product, context.capability, context.network);
    } catch (error) {
      throw new KernelError("APPLICATION_BOUNDARY_VIOLATION", "The product capability has no application binding for this network.", {
        product: context.product,
        capability: context.capability,
        network: context.network,
        cause: error instanceof Error ? error.message : String(error),
      });
    }
    if (binding.mode !== "kernel-gateway") {
      throw new KernelError("APPLICATION_BOUNDARY_VIOLATION", "This capability is not executable through the Kernel gateway.", {
        product: context.product,
        capability: context.capability,
        network: context.network,
        mode: binding.mode,
        entrypoint: binding.entrypoint ?? null,
      });
    }
  }
}
