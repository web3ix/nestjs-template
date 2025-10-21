import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppWebSocketGateway } from './gateway/websocket.gateway';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { WebSocketBroadcastService } from './services/websocket-broadcast.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.secret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.expires'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AppWebSocketGateway, WebSocketBroadcastService, WsAuthGuard],
  exports: [WebSocketBroadcastService],
})
export class WebSocketModule {}
