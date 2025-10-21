import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsUser } from '../decorators/ws-user.decorator';
import {
  SubscribeDto,
  UnsubscribeDto,
  WebSocketChannel,
} from '../dto/websocket.dto';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { WebSocketBroadcastService } from '../services/websocket-broadcast.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
  namespace: '/ws',
})
export class AppWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);

  constructor(private readonly broadcastService: WebSocketBroadcastService) {}

  afterInit(server: Server) {
    this.broadcastService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Send welcome message
    client.emit('connected', {
      message: 'Connected to Maven Exchange WebSocket',
      timestamp: Date.now(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ==================== PUBLIC CHANNEL SUBSCRIPTIONS ====================

  @SubscribeMessage('subscribe')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeDto,
  ): Promise<void> {
    const { channel, symbol, interval } = data;

    try {
      let roomName: string;

      switch (channel) {
        case WebSocketChannel.TICKER:
          if (!symbol) {
            throw new Error('Symbol required for ticker channel');
          }
          roomName = symbol === 'all' ? 'ticker:all' : `ticker:${symbol}`;
          break;

        case WebSocketChannel.ORDERBOOK:
          if (!symbol) {
            throw new Error('Symbol required for orderbook channel');
          }
          roomName = `orderbook:${symbol}`;
          break;

        case WebSocketChannel.TRADES:
          if (!symbol) {
            throw new Error('Symbol required for trades channel');
          }
          roomName = `trades:${symbol}`;
          break;

        case WebSocketChannel.KLINES:
          if (!symbol || !interval) {
            throw new Error('Symbol and interval required for klines channel');
          }
          roomName = `klines:${symbol}:${interval}`;
          break;

        // Private channels require authentication
        case WebSocketChannel.USER_ORDERS:
        case WebSocketChannel.USER_TRADES:
        case WebSocketChannel.USER_BALANCES:
          throw new Error('Use subscribe.private for private channels');

        default:
          throw new Error(`Unknown channel: ${channel}`);
      }

      await client.join(roomName);
      this.logger.log(`Client ${client.id} subscribed to ${roomName}`);

      client.emit('subscribed', {
        channel,
        room: roomName,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Subscription error: ${error.message}`);
      client.emit('error', {
        message: error.message,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('unsubscribe')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UnsubscribeDto,
  ): Promise<void> {
    const { channel, symbol } = data;

    try {
      let roomName: string;

      switch (channel) {
        case WebSocketChannel.TICKER:
          roomName =
            symbol === 'all' || !symbol ? 'ticker:all' : `ticker:${symbol}`;
          break;
        case WebSocketChannel.ORDERBOOK:
          if (!symbol) throw new Error('Symbol required');
          roomName = `orderbook:${symbol}`;
          break;
        case WebSocketChannel.TRADES:
          if (!symbol) throw new Error('Symbol required');
          roomName = `trades:${symbol}`;
          break;
        default:
          throw new Error(`Unknown channel: ${channel}`);
      }

      await client.leave(roomName);
      this.logger.log(`Client ${client.id} unsubscribed from ${roomName}`);

      client.emit('unsubscribed', {
        channel,
        room: roomName,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Unsubscribe error: ${error.message}`);
      client.emit('error', {
        message: error.message,
        timestamp: Date.now(),
      });
    }
  }

  // ==================== PRIVATE CHANNEL SUBSCRIPTIONS ====================

  @SubscribeMessage('subscribe.private')
  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async handlePrivateSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeDto,
    @WsUser('id') userId: string,
  ): Promise<void> {
    const { channel } = data;

    try {
      let roomName: string;

      switch (channel) {
        case WebSocketChannel.USER_ORDERS:
          roomName = `user:${userId}:orders`;
          break;

        case WebSocketChannel.USER_TRADES:
          roomName = `user:${userId}:trades`;
          break;

        case WebSocketChannel.USER_BALANCES:
          roomName = `user:${userId}:balances`;
          break;

        default:
          throw new Error(`Unknown private channel: ${channel}`);
      }

      await client.join(roomName);
      this.logger.log(
        `Client ${client.id} (user ${userId}) subscribed to private channel ${roomName}`,
      );

      client.emit('subscribed', {
        channel,
        room: roomName,
        type: 'private',
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Private subscription error: ${error.message}`);
      client.emit('error', {
        message: error.message,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('unsubscribe.private')
  @UseGuards(WsAuthGuard)
  async handlePrivateUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UnsubscribeDto,
    @WsUser('id') userId: string,
  ): Promise<void> {
    const { channel } = data;

    try {
      let roomName: string;

      switch (channel) {
        case WebSocketChannel.USER_ORDERS:
          roomName = `user:${userId}:orders`;
          break;
        case WebSocketChannel.USER_TRADES:
          roomName = `user:${userId}:trades`;
          break;
        case WebSocketChannel.USER_BALANCES:
          roomName = `user:${userId}:balances`;
          break;
        default:
          throw new Error(`Unknown private channel: ${channel}`);
      }

      await client.leave(roomName);
      this.logger.log(
        `Client ${client.id} unsubscribed from private channel ${roomName}`,
      );

      client.emit('unsubscribed', {
        channel,
        room: roomName,
        type: 'private',
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Private unsubscribe error: ${error.message}`);
      client.emit('error', {
        message: error.message,
        timestamp: Date.now(),
      });
    }
  }

  // ==================== PING/PONG ====================

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
  }
}
