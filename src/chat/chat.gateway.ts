import { OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserAuthService } from 'src/user-auth/user-auth/user-auth.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userAuthService: UserAuthService,
  ) {}

  @WebSocketServer()
  server: Server;

  onModuleInit() {
    this.intervalLog();
  }

  intervalLog() {
    setInterval(() => {
      // console.log('Current active users and their sockets:');
      for (const [userId, sockets] of this.userSockets.entries()) {
        console.log(`User ${userId} has ${sockets.size} active sockets`);
      }
    }, 10000); // Log every 10 seconds
  }

  // Зберігаємо сокети по userId
  private userSockets = new Map<string, Set<string>>();

  async handleConnection(client: Socket) {
    const auth = client.handshake.headers.authorization;
    const bearer = auth?.split(' ')[1];
    const payload = await this.jwtService.verify(bearer);

    const userId = payload?.sub;

    if (!userId) {
      client.disconnect();
      return;
    }

    const user = await this.userAuthService.findUserByAuthId(userId);

    client.data.userId = user.id;

    if (!this.userSockets.has(user.id)) {
      this.userSockets.set(user.id, new Set());
    }

    this.userSockets.get(user.id).add(client.id);

    console.log(`🟢 ${user.id} connected (${client.id})`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    console.log(`🔴 ${userId} disconnected`);
  }

  sendToUsers(userIds: string[], event: string, data: any) {
    // console.log(`Sending event "${event}" to users: ${userIds.join(', ')}`);
    for (const userId of userIds) {
      // console.log(`Processing user ${userId}`);
      const sockets = this.userSockets.get(userId);
      // console.log(`Sockets for user ${userId}:`, sockets);
      if (!sockets) continue;

      for (const socketId of sockets) {
        console.log(`Sending to socket ${socketId} for user ${userId}`);
        this.server.to(socketId).emit(event, data);
      }
    }
  }
}
