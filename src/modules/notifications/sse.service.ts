import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SseEvent {
  type: string;
  data: Record<string, unknown>;
}

@Injectable()
export class SseService implements OnModuleDestroy {
  // Map adminId -> Set of Subject streams to support multiple connections (tabs/devices)
  private readonly connections = new Map<string, Set<Subject<MessageEvent>>>();

  addConnection(adminId: string): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    let subjects = this.connections.get(adminId);
    if (!subjects) {
      subjects = new Set();
      this.connections.set(adminId, subjects);
    }
    subjects.add(subject);
    console.log(`Connection added for admin: ${adminId}. Active connections: ${subjects.size}`);
    return subject;
  }

  removeConnection(adminId: string, subject: Subject<MessageEvent>): void {
    const subjects = this.connections.get(adminId);
    if (subjects) {
      subject.complete();
      subjects.delete(subject);
      if (subjects.size === 0) {
        this.connections.delete(adminId);
      }
    }
    console.log(`Connection removed for admin: ${adminId}. Remaining connections: ${subjects ? subjects.size : 0}`);
  }

  sendToAdmin(adminId: string, event: SseEvent): void {
    const subjects = this.connections.get(adminId);
    if (subjects) {
      const messageEvent = { data: JSON.stringify(event) } as MessageEvent;
      subjects.forEach((subject) => subject.next(messageEvent));
    }
  }

  broadcastToAllAdmins(event: SseEvent): void {
    const messageEvent = { data: JSON.stringify(event) } as MessageEvent;
    this.connections.forEach((subjects) => {
      subjects.forEach((subject) => subject.next(messageEvent));
    });
  }

  isOnline(adminId: string): boolean {
    const subjects = this.connections.get(adminId);
    return subjects ? subjects.size > 0 : false;
  }

  getOnlineAdminIds(): string[] {
    return Array.from(this.connections.keys());
  }

  onModuleDestroy(): void {
    this.connections.forEach((subjects) => {
      subjects.forEach((subject) => subject.complete());
    });
    this.connections.clear();
  }
}
