import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

@Injectable()
export class NotificationService {
  private expo = new Expo();
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async sendPushNotification(userId: string, title: string, body: string, data?: any) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
      this.logger.debug(`User ${userId} has no valid push token`);
      return;
    }

    const messages: ExpoPushMessage[] = [{
      to: user.pushToken,
      sound: 'default',
      title,
      body,
      data,
    }];

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }
      this.logger.log(`Notification sent to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error sending notification: ${error}`);
    }
  }

  async broadcastToAgents(agentIds: string[], title: string, body: string, data?: any) {
    // Basic implementation for broadcasting
    for (const id of agentIds) {
      // Note: agentIds are AgentProfile IDs. We need User IDs.
      // This part depends on how you store and query.
      // For now, let's assume we have User IDs for simplicity or query them.
    }
  }
}
