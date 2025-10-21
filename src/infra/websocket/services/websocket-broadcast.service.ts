import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { WebSocketMessage } from '../dto/websocket.dto';

// Import events
import {
  DepositConfirmedEvent,
  DepositCreditedEvent,
  DepositDetectedEvent,
} from '@/infra/messaging/events/deposit.events';
import {
  OrderCancelledEvent,
  OrderCreatedEvent,
  OrderExpiredEvent,
  OrderFilledEvent,
} from '@/infra/messaging/events/order.events';
import { TradeExecutedEvent } from '@/infra/messaging/events/trade.events';
import {
  BalanceCreditedEvent,
  BalanceDebitedEvent,
  BalanceLockedEvent,
  BalanceUnlockedEvent,
} from '@/infra/messaging/events/wallet.events';

@Injectable()
export class WebSocketBroadcastService implements OnModuleInit {
  private readonly logger = new Logger(WebSocketBroadcastService.name);
  private server: Server;

  onModuleInit() {
    this.logger.log('WebSocket Broadcast Service initialized');
  }

  setServer(server: Server): void {
    this.server = server;
    this.logger.log('WebSocket server attached to broadcast service');
  }

  /**
   * Broadcast message to a specific channel
   */
  private broadcast<T>(channel: string, event: string, data: T): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized, skipping broadcast');
      return;
    }

    const message: WebSocketMessage<T> = {
      event,
      channel,
      data,
      timestamp: Date.now(),
    };

    this.server.to(channel).emit(event, message);
    this.logger.debug(`Broadcast to ${channel}: ${event}`);
  }

  /**
   * Broadcast to multiple channels
   */
  private broadcastToChannels<T>(
    channels: string[],
    event: string,
    data: T,
  ): void {
    channels.forEach((channel) => this.broadcast(channel, event, data));
  }

  // ==================== ORDER EVENTS ====================

  @OnEvent('order.created')
  handleOrderCreated(event: OrderCreatedEvent): void {
    // Broadcast to user's private channel
    const userChannel = `user:${event.userId}:orders`;
    this.broadcast(userChannel, 'order.created', {
      orderId: event.orderId.toString(),
      userId: event.userId.toString(),
      tradingPairId: event.tradingPairId.toString(),
      type: event.type,
      side: event.side,
      quantity: event.quantity,
      price: event.price,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('order.filled')
  handleOrderFilled(event: OrderFilledEvent): void {
    const userChannel = `user:${event.userId}:orders`;
    this.broadcast(userChannel, 'order.filled', {
      orderId: event.orderId.toString(),
      userId: event.userId.toString(),
      tradingPairId: event.tradingPairId.toString(),
      filledQuantity: event.filledQuantity,
      price: event.price,
      totalFilled: event.totalFilled,
      isFullyFilled: event.isFilled,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('order.cancelled')
  handleOrderCancelled(event: OrderCancelledEvent): void {
    const userChannel = `user:${event.userId}:orders`;
    this.broadcast(userChannel, 'order.cancelled', {
      orderId: event.orderId.toString(),
      userId: event.userId.toString(),
      tradingPairId: event.tradingPairId.toString(),
      reason: event.reason,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('order.expired')
  handleOrderExpired(event: OrderExpiredEvent): void {
    const userChannel = `user:${event.userId}:orders`;
    this.broadcast(userChannel, 'order.expired', {
      orderId: event.orderId.toString(),
      userId: event.userId.toString(),
      tradingPairId: event.tradingPairId.toString(),
      timestamp: event.occurredAt,
    });
  }

  // ==================== TRADE EVENTS ====================

  @OnEvent('trade.executed')
  handleTradeExecuted(event: TradeExecutedEvent): void {
    // Broadcast to public trades channel for this pair
    const publicChannel = `trades:${event.tradingPairId}`;
    this.broadcast(publicChannel, 'trade', {
      tradeId: event.tradeId.toString(),
      tradingPairId: event.tradingPairId.toString(),
      price: event.price,
      quantity: event.quantity,
      timestamp: event.occurredAt,
    });

    // Broadcast to both users' private channels
    const makerChannel = `user:${event.makerUserId}:trades`;
    const takerChannel = `user:${event.takerUserId}:trades`;

    this.broadcast(makerChannel, 'trade.executed', {
      tradeId: event.tradeId.toString(),
      role: 'maker',
      price: event.price,
      quantity: event.quantity,
      fee: event.makerFee,
      timestamp: event.occurredAt,
    });

    this.broadcast(takerChannel, 'trade.executed', {
      tradeId: event.tradeId.toString(),
      role: 'taker',
      price: event.price,
      quantity: event.quantity,
      fee: event.takerFee,
      timestamp: event.occurredAt,
    });
  }

  // ==================== BALANCE EVENTS ====================

  @OnEvent('balance.credited')
  handleBalanceCredited(event: BalanceCreditedEvent): void {
    const userChannel = `user:${event.walletId}:balances`;
    this.broadcast(userChannel, 'balance.updated', {
      walletId: event.walletId.toString(),
      chainTokenId: event.chainTokenId.toString(),
      amount: event.amount,
      newBalance: event.newBalance,
      type: 'credit',
      reason: event.reason,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('balance.debited')
  handleBalanceDebited(event: BalanceDebitedEvent): void {
    const userChannel = `user:${event.walletId}:balances`;
    this.broadcast(userChannel, 'balance.updated', {
      walletId: event.walletId.toString(),
      chainTokenId: event.chainTokenId.toString(),
      amount: event.amount,
      newBalance: event.newBalance,
      type: 'debit',
      reason: event.reason,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('balance.locked')
  handleBalanceLocked(event: BalanceLockedEvent): void {
    const userChannel = `user:${event.walletId}:balances`;
    this.broadcast(userChannel, 'balance.locked', {
      walletId: event.walletId.toString(),
      chainTokenId: event.chainTokenId.toString(),
      amount: event.amount,
      newLockedBalance: event.newLockedBalance,
      reason: event.reason,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('balance.unlocked')
  handleBalanceUnlocked(event: BalanceUnlockedEvent): void {
    const userChannel = `user:${event.walletId}:balances`;
    this.broadcast(userChannel, 'balance.unlocked', {
      walletId: event.walletId.toString(),
      chainTokenId: event.chainTokenId.toString(),
      amount: event.amount,
      newLockedBalance: event.newLockedBalance,
      reason: event.reason,
      timestamp: event.occurredAt,
    });
  }

  // ==================== DEPOSIT EVENTS ====================

  @OnEvent('deposit.detected')
  handleDepositDetected(event: DepositDetectedEvent): void {
    const userChannel = `user:${event.walletId}:deposits`;
    this.broadcast(userChannel, 'deposit.detected', {
      depositId: event.depositId.toString(),
      walletId: event.walletId.toString(),
      chainTokenId: event.chainTokenId.toString(),
      amount: event.amount,
      txHash: event.txHash,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('deposit.confirmed')
  handleDepositConfirmed(event: DepositConfirmedEvent): void {
    const userChannel = `user:${event.walletId}:deposits`;
    this.broadcast(userChannel, 'deposit.confirmed', {
      depositId: event.depositId.toString(),
      walletId: event.walletId.toString(),
      chainTokenId: event.chainTokenId.toString(),
      amount: event.amount,
      txHash: event.txHash,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('deposit.credited')
  handleDepositCredited(event: DepositCreditedEvent): void {
    const userChannel = `user:${event.walletId}:deposits`;
    this.broadcast(userChannel, 'deposit.credited', {
      depositId: event.depositId.toString(),
      walletId: event.walletId.toString(),
      chainTokenId: event.chainTokenId.toString(),
      amount: event.amount,
      txHash: event.txHash,
      timestamp: event.occurredAt,
    });
  }

  // ==================== TICKER BROADCASTS ====================

  /**
   * Broadcast ticker update (called manually by ticker worker or service)
   */
  public broadcastTicker(symbol: string, ticker: any): void {
    const channel = `ticker:${symbol}`;
    this.broadcast(channel, 'ticker.update', ticker);
  }

  /**
   * Broadcast ticker for all pairs
   */
  public broadcastAllTickers(tickers: any[]): void {
    this.broadcast('ticker:all', 'tickers.update', tickers);
  }

  // ==================== ORDER BOOK BROADCASTS ====================

  /**
   * Broadcast order book update
   */
  public broadcastOrderBook(symbol: string, orderBook: any): void {
    const channel = `orderbook:${symbol}`;
    this.broadcast(channel, 'orderbook.update', orderBook);
  }

  // ==================== KLINE BROADCASTS ====================

  /**
   * Broadcast kline/candle update
   */
  public broadcastKline(symbol: string, interval: string, kline: any): void {
    const channel = `klines:${symbol}:${interval}`;
    this.broadcast(channel, 'kline.update', kline);
  }
}
