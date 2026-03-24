import { Injectable } from '@nestjs/common';
import { RequestStatus } from './enums/request-status.enum';
import { InvalidRequestStatusTransitionError } from '../common/errors/invalid-transition.error';

const ALLOWED: ReadonlyMap<RequestStatus, readonly RequestStatus[]> = new Map([
  [RequestStatus.Draft, [RequestStatus.Pending]],
  [RequestStatus.Pending, [RequestStatus.Matched, RequestStatus.Cancelled]],
  [RequestStatus.Matched, [RequestStatus.PickupStarted, RequestStatus.Cancelled]],
  [
    RequestStatus.PickupStarted,
    [RequestStatus.InProgress, RequestStatus.Cancelled],
  ],
  [
    RequestStatus.InProgress,
    [
      RequestStatus.Completed,
      RequestStatus.Disputed,
      RequestStatus.Cancelled,
    ],
  ],
  [RequestStatus.Completed, [RequestStatus.Closed]],
  [RequestStatus.Closed, []],
  [RequestStatus.Cancelled, []],
  [RequestStatus.Disputed, [RequestStatus.InProgress, RequestStatus.Completed, RequestStatus.Closed]],
]);

@Injectable()
export class RequestStateMachineService {
  assertTransition(from: RequestStatus, to: RequestStatus): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidRequestStatusTransitionError(from, to);
    }
  }

  canTransition(from: RequestStatus, to: RequestStatus): boolean {
    if (from === to) {
      return true;
    }
    const next = ALLOWED.get(from);
    return next?.includes(to) ?? false;
  }

  getAllowedNextStates(from: RequestStatus): RequestStatus[] {
    return [...(ALLOWED.get(from) ?? [])];
  }
}
