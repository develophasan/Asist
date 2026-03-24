import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/live',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`client disconnected: ${client.id}`);
  }

  @SubscribeMessage('request:subscribe')
  subscribeRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { requestId: string },
  ) {
    const room = `request:${payload.requestId}`;
    client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage('request:unsubscribe')
  unsubscribeRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { requestId: string },
  ) {
    const room = `request:${payload.requestId}`;
    client.leave(room);
    return { ok: true, room };
  }

  emitRequestUpdate(requestId: string, event: unknown) {
    this.server.to(`request:${requestId}`).emit('request:update', event);
  }
}
