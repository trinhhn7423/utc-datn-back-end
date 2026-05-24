import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SseEvent {
  type: string;
  data: Record<string, unknown>;
}

@Injectable()
export class SseService implements OnModuleDestroy {
  // Map adminId -> Subject stream
  private readonly connections = new Map<string, Subject<MessageEvent>>();

  addConnection(adminId: string): Subject<MessageEvent> {
    // Close existing connection before creating new one
    this.removeConnection(adminId);

    const subject = new Subject<MessageEvent>();
    this.connections.set(adminId, subject);
    return subject;
  }

  removeConnection(adminId: string): void {
    const subject = this.connections.get(adminId);
    if (subject) {
      subject.complete();
      this.connections.delete(adminId);
    }
  }

  sendToAdmin(adminId: string, event: SseEvent): void {
    const subject = this.connections.get(adminId);
    if (subject) {
      subject.next({ data: JSON.stringify(event) } as MessageEvent);
    }
  }

  broadcastToAllAdmins(event: SseEvent): void {
    this.connections.forEach((subject) => {
      subject.next({ data: JSON.stringify(event) } as MessageEvent);
    });
  }

  isOnline(adminId: string): boolean {
    return this.connections.has(adminId);
  }

  getOnlineAdminIds(): string[] {
    return Array.from(this.connections.keys());
  }

  onModuleDestroy(): void {
    this.connections.forEach((subject) => subject.complete());
    this.connections.clear();
  }
}
