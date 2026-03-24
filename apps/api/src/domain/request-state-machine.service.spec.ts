import { RequestStateMachineService } from './request-state-machine.service';
import { RequestStatus } from './enums/request-status.enum';
import { InvalidRequestStatusTransitionError } from '../common/errors/invalid-transition.error';

describe('RequestStateMachineService', () => {
  const sm = new RequestStateMachineService();

  it('allows the happy path', () => {
    const path: RequestStatus[] = [
      RequestStatus.Draft,
      RequestStatus.Pending,
      RequestStatus.Matched,
      RequestStatus.PickupStarted,
      RequestStatus.InProgress,
      RequestStatus.Completed,
      RequestStatus.Closed,
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(sm.canTransition(path[i], path[i + 1])).toBe(true);
      expect(() => sm.assertTransition(path[i], path[i + 1])).not.toThrow();
    }
  });

  it('rejects draft → matched', () => {
    expect(sm.canTransition(RequestStatus.Draft, RequestStatus.Matched)).toBe(
      false,
    );
    expect(() =>
      sm.assertTransition(RequestStatus.Draft, RequestStatus.Matched),
    ).toThrow(InvalidRequestStatusTransitionError);
  });

  it('allows cancellation from pending', () => {
    expect(
      sm.canTransition(RequestStatus.Pending, RequestStatus.Cancelled),
    ).toBe(true);
  });

  it('allows dispute resolution paths', () => {
    expect(
      sm.canTransition(RequestStatus.Disputed, RequestStatus.Completed),
    ).toBe(true);
  });
});
