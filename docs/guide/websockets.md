# WebSockets

Real-time bidirectional communication using Socket.IO.

## Overview

The WebSocket module provides:
- **Real-time Updates**: Push updates to clients instantly
- **Bidirectional Communication**: Client and server can both initiate messages
- **Room Support**: Group clients into rooms for targeted broadcasts
- **Authentication**: Secure WebSocket connections
- **Scalability**: Redis adapter for multi-instance deployments

## Client Connection

### JavaScript/TypeScript

```typescript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token',
  },
})

socket.on('connect', () => {
  console.log('Connected to server')
})

socket.on('disconnect', () => {
  console.log('Disconnected from server')
})
```

## Authentication

WebSocket connections are authenticated using JWT tokens:

```typescript
const socket = io('http://localhost:3001', {
  auth: {
    token: accessToken,
  },
})
```

The server validates the token and attaches user information to the socket.

## Sending Messages

### From Client

```typescript
// Emit event to server
socket.emit('message', { text: 'Hello, server!' })

// Emit with acknowledgment
socket.emit('message', { text: 'Hello' }, (response) => {
  console.log('Server acknowledged:', response)
})
```

### From Server

```typescript
@WebSocketGateway()
export class ChatGateway {
  @WebSocketServer()
  server: Server

  sendToAll(message: string): void {
    this.server.emit('message', { text: message })
  }

  sendToUser(userId: string, message: string): void {
    this.server.to(userId).emit('message', { text: message })
  }
}
```

## Listening for Messages

### On Client

```typescript
socket.on('message', (data) => {
  console.log('Received:', data.text)
})

socket.on('notification', (data) => {
  console.log('Notification:', data)
})
```

### On Server

```typescript
@SubscribeMessage('message')
handleMessage(
  @MessageBody() data: MessageDto,
  @ConnectedSocket() client: Socket,
): void {
  console.log('Received from client:', data)
  client.emit('message', { text: 'Message received' })
}
```

## Rooms

### Join Room

```typescript
// Client
socket.emit('joinRoom', { roomId: 'room123' })

// Server
@SubscribeMessage('joinRoom')
handleJoinRoom(
  @MessageBody() data: { roomId: string },
  @ConnectedSocket() client: Socket,
): void {
  client.join(data.roomId)
  client.emit('joinedRoom', { roomId: data.roomId })
}
```

### Leave Room

```typescript
// Client
socket.emit('leaveRoom', { roomId: 'room123' })

// Server
@SubscribeMessage('leaveRoom')
handleLeaveRoom(
  @MessageBody() data: { roomId: string },
  @ConnectedSocket() client: Socket,
): void {
  client.leave(data.roomId)
}
```

### Broadcast to Room

```typescript
// Send to all clients in a room
this.server.to('room123').emit('notification', {
  text: 'New message in room',
})

// Send to all except sender
client.to('room123').emit('notification', {
  text: 'Another user joined',
})
```

## Use Cases

### Real-time Notifications

```typescript
@Injectable()
export class NotificationService {
  constructor(
    private readonly websocketBroadcast: WebsocketBroadcastService,
  ) {}

  async notifyUser(userId: string, notification: Notification): Promise<void> {
    await this.websocketBroadcast.sendToUser(userId, 'notification', notification)
  }
}
```

### Live Updates

```typescript
// Broadcast price updates
@EventHandler('price.updated')
async handlePriceUpdate(event: PriceUpdatedEvent): Promise<void> {
  await this.websocketBroadcast.broadcast('priceUpdate', {
    symbol: event.symbol,
    price: event.price,
  })
}
```

### Chat

```typescript
@SubscribeMessage('sendMessage')
async handleChatMessage(
  @MessageBody() data: ChatMessageDto,
  @ConnectedSocket() client: Socket,
): Promise<void> {
  // Save message
  const message = await this.chatService.saveMessage(data)

  // Broadcast to room
  this.server.to(data.roomId).emit('newMessage', message)
}
```

## Gateway Implementation

```typescript
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway {
  @WebSocketServer()
  server: Server

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): void {
    this.server.emit('message', payload)
  }

  afterInit(server: Server): void {
    console.log('WebSocket initialized')
  }

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`)
  }
}
```

## Getting Current User

```typescript
@SubscribeMessage('message')
handleMessage(
  @MessageBody() data: any,
  @WsUser() user: JwtPayloadType,
): void {
  console.log(`Message from user ${user.id}:`, data)
}
```

## Scalability

### Redis Adapter

For multi-instance deployments, use Redis adapter:

```typescript
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'

export class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options)

    const pubClient = new Redis(process.env.REDIS_URL)
    const subClient = pubClient.duplicate()

    server.adapter(createAdapter(pubClient, subClient))

    return server
  }
}
```

Enable in `main.ts`:

```typescript
app.useWebSocketAdapter(new RedisIoAdapter(app))
```

## Configuration

```env
# WebSocket port
WS_PORT=3001

# Redis for scaling
WS_REDIS_URL=redis://localhost:6379
```

## Testing WebSockets

```typescript
describe('WebSocket Gateway', () => {
  let gateway: AppGateway
  let socket: Socket

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AppGateway],
    }).compile()

    gateway = module.get<AppGateway>(AppGateway)

    socket = io('http://localhost:3001', {
      auth: { token: 'test-token' },
    })

    await new Promise((resolve) => {
      socket.on('connect', resolve)
    })
  })

  afterEach(() => {
    socket.disconnect()
  })

  it('should receive message', (done) => {
    socket.on('message', (data) => {
      expect(data.text).toBe('Hello')
      done()
    })

    socket.emit('message', { text: 'Hello' })
  })
})
```

## Best Practices

1. **Authenticate connections**: Always validate JWT tokens
2. **Use rooms**: Group related clients
3. **Handle disconnections**: Clean up resources
4. **Rate limiting**: Prevent abuse
5. **Validate payloads**: Use DTOs for validation
6. **Error handling**: Catch and handle errors gracefully

## Error Handling

```typescript
@SubscribeMessage('message')
handleMessage(client: Socket, payload: any): void {
  try {
    // Process message
    this.server.emit('message', payload)
  } catch (error) {
    client.emit('error', {
      message: 'Failed to process message',
    })
  }
}
```

## Next Steps

- [Messaging](/guide/messaging) - Event-driven architecture
- [Workers](/guide/workers) - Background jobs
- [Authentication](/guide/authentication) - WebSocket authentication
