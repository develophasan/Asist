import { RequestStatus } from '../../domain/enums/request-status.enum';

export class InvalidRequestStatusTransitionError extends Error {
  constructor(
    public readonly from: RequestStatus,
    public readonly to: RequestStatus,
  ) {
    super(`Invalid request status transition: ${from} → ${to}`);
    this.name = 'InvalidRequestStatusTransitionError';
  }
}
