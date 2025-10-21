import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum WebSocketChannel {
  // Public channels
  TICKER = 'ticker',
  ORDERBOOK = 'orderbook',
  TRADES = 'trades',
  KLINES = 'klines',

  // Private channels
  USER_ORDERS = 'user.orders',
  USER_TRADES = 'user.trades',
  USER_BALANCES = 'user.balances',
}

export class SubscribeDto {
  @IsNotEmpty()
  @IsEnum(WebSocketChannel)
  channel: WebSocketChannel;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  interval?: string;
}

export class UnsubscribeDto {
  @IsNotEmpty()
  @IsEnum(WebSocketChannel)
  channel: WebSocketChannel;

  @IsOptional()
  @IsString()
  symbol?: string;
}

export interface WebSocketMessage<T = any> {
  event: string;
  channel: string;
  data: T;
  timestamp: number;
}
