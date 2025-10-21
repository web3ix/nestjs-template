# WebSocket Gateway

Real-time WebSocket communication for Maven Exchange. Provides live updates for market data, orders, trades, and balances.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Channels](#channels)
- [Authentication](#authentication)
- [Usage Examples](#usage-examples)
- [Events](#events)
- [Scaling](#scaling)
- [Client Implementation](#client-implementation)

---

## Overview

The WebSocket Gateway provides real-time bidirectional communication between the server and clients. It supports:

- **Public Channels**: Market data (tickers, orderbook, trades, klines)
- **Private Channels**: User-specific data (orders, balances, deposits)
- **Event-Driven**: Automatic broadcasts based on domain events
- **Scalable**: Redis adapter for multi-instance deployments
- **Authenticated**: JWT authentication for private channels

### Key Features

✅ Real-time ticker updates  
✅ Live order book changes  
✅ Instant trade notifications  
✅ User order status updates  
✅ Balance change notifications  
✅ Deposit confirmations  
✅ Room-based architecture  
✅ Horizontal scaling support

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket Clients                         │
│  (Web, Mobile, Trading Bots)                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              AppWebSocketGateway                           │
│  - Connection handling                                       │
│  - Subscribe/Unsubscribe                                    │
│  - Authentication                                            │
│  - Room management                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         WebSocketBroadcastService                            │
│  - Event listeners (@OnEvent)                               │
│  - Broadcast to rooms                                        │
│  - Message formatting                                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Domain Events                              │
│  - Order events (created, filled, cancelled)                │
│  - Trade events (executed)                                   │
│  - Balance events (credited, debited, locked)               │
│  - Deposit events (detected, confirmed, credited)           │
└─────────────────────────────────────────────────────────────┘
```

### Components

**1. AppWebSocketGateway**

- Main gateway class
- Handles WebSocket connections
- Manages subscriptions/unsubscriptions
- Routes messages to appropriate rooms

**2. WebSocketBroadcastService**

- Listens to domain events
- Broadcasts messages to subscribed clients
- Manages message formatting
- Provides manual broadcast methods

**3. WsAuthGuard**

- JWT authentication for WebSocket
- Extracts token from handshake
- Validates user identity
- Attaches user to socket context

**4. Room Architecture**

- Public rooms: `ticker:BTCUSDT`, `orderbook:BTCUSDT`, `trades:BTCUSDT`
- Private rooms: `user:123:orders`, `user:123:balances`, `user:123:deposits`

---

## Channels

### Public Channels (No Authentication Required)

#### 1. Ticker Channel

**Purpose**: Real-time 24h ticker statistics

**Room Format**: `ticker:{symbol}` or `ticker:all`

**Events**:

- `ticker.update`: Single pair ticker update
- `tickers.update`: All pairs ticker update

**Data Structure**:

```typescript
{
  symbol: "BTCUSDT",
  lastPrice: "45000.00",
  priceChange: "1500.00",
  priceChangePercent: "3.45",
  high24h: "46000.00",
  low24h: "43000.00",
  volume24h: "12500.50",
  quoteVolume24h: "562525000.00",
  openTime: 1234567890,
  closeTime: 1234654290
}
```

#### 2. Order Book Channel

**Purpose**: Live order book depth updates

**Room Format**: `orderbook:{symbol}`

**Events**:

- `orderbook.update`: Order book snapshot or delta

**Data Structure**:

```typescript
{
  symbol: "BTCUSDT",
  bids: [
    ["45000.00", "1.5"],
    ["44999.00", "2.3"]
  ],
  asks: [
    ["45001.00", "1.2"],
    ["45002.00", "0.8"]
  ],
  lastUpdateId: 12345
}
```

#### 3. Trades Channel

**Purpose**: Live trade stream

**Room Format**: `trades:{symbol}`

**Events**:

- `trade`: New trade executed

**Data Structure**:

```typescript
{
  tradeId: "uuid",
  symbol: "BTCUSDT",
  price: "45000.00",
  quantity: "1.5",
  timestamp: 1234567890
}
```

#### 4. Klines Channel

**Purpose**: Real-time candlestick/kline updates

**Room Format**: `klines:{symbol}:{interval}`

**Intervals**: `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`, `1M`

**Events**:

- `kline.update`: New or updated kline

**Data Structure**:

```typescript
{
  symbol: "BTCUSDT",
  interval: "1m",
  openTime: 1234567890,
  closeTime: 1234567950,
  open: "45000.00",
  high: "45100.00",
  low: "44900.00",
  close: "45050.00",
  volume: "125.50",
  quoteVolume: "5650000.00",
  trades: 450
}
```

---

### Private Channels (Authentication Required)

#### 1. User Orders Channel

**Purpose**: User's order status updates

**Room Format**: `user:{userId}:orders`

**Events**:

- `order.created`: New order placed
- `order.filled`: Order partially or fully filled
- `order.cancelled`: Order cancelled
- `order.expired`: Order expired

**Data Structures**:

**order.created**:

```typescript
{
  orderId: "uuid",
  userId: "uuid",
  tradingPairId: "uuid",
  type: "LIMIT",
  side: "BUY",
  quantity: "1.5",
  price: "45000.00",
  timestamp: 1234567890
}
```

**order.filled**:

```typescript
{
  orderId: "uuid",
  filledQuantity: "0.5",
  price: "45000.00",
  totalFilled: "1.0",
  isFullyFilled: false,
  timestamp: 1234567890
}
```

#### 2. User Trades Channel

**Purpose**: User's executed trades

**Room Format**: `user:{userId}:trades`

**Events**:

- `trade.executed`: Trade executed (maker or taker)

**Data Structure**:

```typescript
{
  tradeId: "uuid",
  role: "maker" | "taker",
  price: "45000.00",
  quantity: "1.5",
  fee: "0.001",
  timestamp: 1234567890
}
```

#### 3. User Balances Channel

**Purpose**: User's balance updates

**Room Format**: `user:{userId}:balances`

**Events**:

- `balance.updated`: Balance credited or debited
- `balance.locked`: Balance locked for order
- `balance.unlocked`: Locked balance released

**Data Structures**:

**balance.updated**:

```typescript
{
  walletId: "uuid",
  chainTokenId: "uuid",
  amount: "100.00",
  newBalance: "1100.00",
  type: "credit" | "debit",
  reason: "Trade settlement",
  timestamp: 1234567890
}
```

**balance.locked**:

```typescript
{
  walletId: "uuid",
  chainTokenId: "uuid",
  amount: "50.00",
  totalLocked: "150.00",
  reason: "Order placement",
  timestamp: 1234567890
}
```

#### 4. User Deposits Channel

**Purpose**: Deposit status updates

**Room Format**: `user:{userId}:deposits`

**Events**:

- `deposit.detected`: Deposit transaction detected
- `deposit.confirmed`: Deposit confirmed on blockchain
- `deposit.credited`: Deposit credited to balance

**Data Structures**:

**deposit.detected**:

```typescript
{
  depositId: "uuid",
  walletId: "uuid",
  chainTokenId: "uuid",
  amount: "100.00",
  txHash: "0x...",
  confirmations: 1,
  timestamp: 1234567890
}
```

**deposit.confirmed**:

```typescript
{
  depositId: "uuid",
  walletId: "uuid",
  amount: "100.00",
  txHash: "0x...",
  confirmations: 12,
  timestamp: 1234567890
}
```

---

## Authentication

### Public Channels

No authentication required. Anyone can subscribe to public channels.

### Private Channels

JWT authentication required. Token can be provided in three ways:

**1. Auth Object** (Recommended):

```javascript
const socket = io('ws://localhost:3000/ws', {
  auth: {
    token: 'your-jwt-token',
  },
});
```

**2. Query Parameters**:

```javascript
const socket = io('ws://localhost:3000/ws?token=your-jwt-token');
```

**3. Headers**:

```javascript
const socket = io('ws://localhost:3000/ws', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token',
  },
});
```

---

## Usage Examples

### JavaScript/TypeScript Client

#### Install Socket.IO Client

```bash
npm install socket.io-client
```

#### Connect and Subscribe to Public Channels

```typescript
import { io } from 'socket.io-client';

// Connect to WebSocket
const socket = io('ws://localhost:3000/ws');

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected to WebSocket:', data);
});

// Subscribe to ticker
socket.emit('subscribe', {
  channel: 'ticker',
  symbol: 'BTCUSDT',
});

// Listen for ticker updates
socket.on('ticker.update', (message) => {
  console.log('Ticker update:', message.data);
});

// Subscribe to order book
socket.emit('subscribe', {
  channel: 'orderbook',
  symbol: 'BTCUSDT',
});

// Listen for order book updates
socket.on('orderbook.update', (message) => {
  console.log('Order book update:', message.data);
});

// Subscribe to trades
socket.emit('subscribe', {
  channel: 'trades',
  symbol: 'BTCUSDT',
});

// Listen for trades
socket.on('trade', (message) => {
  console.log('New trade:', message.data);
});

// Subscribe to klines
socket.emit('subscribe', {
  channel: 'klines',
  symbol: 'BTCUSDT',
  interval: '1m',
});

// Listen for kline updates
socket.on('kline.update', (message) => {
  console.log('Kline update:', message.data);
});

// Unsubscribe
socket.emit('unsubscribe', {
  channel: 'ticker',
  symbol: 'BTCUSDT',
});
```

#### Subscribe to Private Channels (Authenticated)

```typescript
import { io } from 'socket.io-client';

// Connect with JWT token
const socket = io('ws://localhost:3000/ws', {
  auth: {
    token: 'your-jwt-token',
  },
});

// Subscribe to user orders
socket.emit('subscribe.private', {
  channel: 'user.orders',
});

// Listen for order updates
socket.on('order.created', (message) => {
  console.log('Order created:', message.data);
});

socket.on('order.filled', (message) => {
  console.log('Order filled:', message.data);
});

socket.on('order.cancelled', (message) => {
  console.log('Order cancelled:', message.data);
});

// Subscribe to user trades
socket.emit('subscribe.private', {
  channel: 'user.trades',
});

socket.on('trade.executed', (message) => {
  console.log('Trade executed:', message.data);
});

// Subscribe to user balances
socket.emit('subscribe.private', {
  channel: 'user.balances',
});

socket.on('balance.updated', (message) => {
  console.log('Balance updated:', message.data);
});

socket.on('balance.locked', (message) => {
  console.log('Balance locked:', message.data);
});

// Error handling
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

#### Ping/Pong for Connection Health

```typescript
setInterval(() => {
  socket.emit('ping');
}, 30000);

socket.on('pong', (data) => {
  console.log('Pong received:', data.timestamp);
});
```

---

## Events

### Connection Events

| Event          | Direction       | Description                            |
| -------------- | --------------- | -------------------------------------- |
| `connected`    | Server → Client | Connection established                 |
| `subscribed`   | Server → Client | Successfully subscribed to channel     |
| `unsubscribed` | Server → Client | Successfully unsubscribed from channel |
| `error`        | Server → Client | Error occurred                         |

### Public Channel Events

| Event              | Channel    | Description              |
| ------------------ | ---------- | ------------------------ |
| `ticker.update`    | ticker     | Single ticker update     |
| `tickers.update`   | ticker:all | All tickers update       |
| `orderbook.update` | orderbook  | Order book update        |
| `trade`            | trades     | New trade executed       |
| `kline.update`     | klines     | Kline/candlestick update |

### Private Channel Events

| Event               | Channel       | Description                 |
| ------------------- | ------------- | --------------------------- |
| `order.created`     | user.orders   | Order created               |
| `order.filled`      | user.orders   | Order filled (partial/full) |
| `order.cancelled`   | user.orders   | Order cancelled             |
| `order.expired`     | user.orders   | Order expired               |
| `trade.executed`    | user.trades   | Trade executed              |
| `balance.updated`   | user.balances | Balance credited/debited    |
| `balance.locked`    | user.balances | Balance locked              |
| `balance.unlocked`  | user.balances | Balance unlocked            |
| `deposit.detected`  | user.deposits | Deposit detected            |
| `deposit.confirmed` | user.deposits | Deposit confirmed           |
| `deposit.credited`  | user.deposits | Deposit credited            |

---

## Scaling

### Single Instance

The WebSocket Gateway works out of the box in single-instance mode.

### Multi-Instance with Redis Adapter

For horizontal scaling, enable the Redis adapter:

**1. Install Dependencies**:

```bash
npm install @socket.io/redis-adapter
```

**2. Configure Redis Adapter** (in `websocket.module.ts`):

```typescript
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// Create Redis clients
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

// In gateway afterInit
this.server.adapter(createAdapter(pubClient, subClient));
```

**3. Benefits**:

- Multiple WebSocket server instances
- Load balanced connections
- Shared state across instances
- Broadcast to all connected clients across servers

---

## Client Implementation

### React Example

```tsx
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function useWebSocket(token?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = io('ws://localhost:3000/ws', {
      auth: token ? { token } : undefined,
    });

    ws.on('connected', () => {
      setConnected(true);
    });

    ws.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [token]);

  return { socket, connected };
}

function TradingView({ symbol }: { symbol: string }) {
  const { socket, connected } = useWebSocket();
  const [ticker, setTicker] = useState<any>(null);
  const [orderBook, setOrderBook] = useState<any>(null);

  useEffect(() => {
    if (!socket || !connected) return;

    // Subscribe to ticker
    socket.emit('subscribe', { channel: 'ticker', symbol });
    socket.on('ticker.update', (msg) => setTicker(msg.data));

    // Subscribe to order book
    socket.emit('subscribe', { channel: 'orderbook', symbol });
    socket.on('orderbook.update', (msg) => setOrderBook(msg.data));

    return () => {
      socket.emit('unsubscribe', { channel: 'ticker', symbol });
      socket.emit('unsubscribe', { channel: 'orderbook', symbol });
    };
  }, [socket, connected, symbol]);

  return (
    <div>
      <div>Ticker: {ticker?.lastPrice}</div>
      <div>Bids: {orderBook?.bids?.length || 0}</div>
      <div>Asks: {orderBook?.asks?.length || 0}</div>
    </div>
  );
}
```

---

## Performance Considerations

### Message Rate Limiting

Consider implementing rate limiting for broadcasts:

```typescript
// Throttle ticker updates to 1 per second per symbol
private tickerThrottles = new Map<string, number>();

broadcastTicker(symbol: string, ticker: any) {
  const now = Date.now();
  const last = this.tickerThrottles.get(symbol) || 0;

  if (now - last < 1000) return; // Skip if less than 1 second

  this.tickerThrottles.set(symbol, now);
  this.broadcast(`ticker:${symbol}`, 'ticker.update', ticker);
}
```

### Connection Limits

Monitor and limit concurrent connections:

```typescript
afterInit(server: Server) {
  const maxConnections = 10000;

  server.on('connection', (socket) => {
    if (server.engine.clientsCount > maxConnections) {
      socket.disconnect();
    }
  });
}
```

### Memory Management

Clean up subscriptions on disconnect:

```typescript
handleDisconnect(client: Socket) {
  // Socket.IO automatically removes from rooms
  // Additional cleanup if needed
  client.removeAllListeners();
}
```

---

## Troubleshooting

### Connection Issues

**Problem**: Can't connect to WebSocket

**Solutions**:

1. Check CORS configuration
2. Verify port is accessible
3. Check firewall rules
4. Ensure WebSocket path is correct (`/ws`)

### Authentication Failures

**Problem**: "Unauthorized: Invalid token"

**Solutions**:

1. Verify JWT token is valid
2. Check token hasn't expired
3. Ensure correct secret in config
4. Confirm token is passed correctly (auth/query/headers)

### No Messages Received

**Problem**: Connected but not receiving updates

**Solutions**:

1. Verify subscription was successful (listen for `subscribed` event)
2. Check event listener names match
3. Ensure workers are running (they trigger events)
4. Verify symbol/channel names are correct

### Performance Issues

**Problem**: Slow or delayed messages

**Solutions**:

1. Enable Redis adapter for multi-instance
2. Implement message throttling
3. Reduce broadcast frequency
4. Optimize event handlers
5. Monitor server resources (CPU, memory, network)

---

## Summary

The WebSocket Gateway provides:

✅ Real-time market data streaming  
✅ Live user notifications  
✅ Event-driven architecture  
✅ Scalable with Redis adapter  
✅ Secure with JWT authentication  
✅ Easy client integration

For questions or issues, check the main project documentation or raise an issue on GitHub.
