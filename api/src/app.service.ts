import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    firestore: { status: 'up' | 'down'; latency_ms?: number; error?: string };
    firebaseAdmin: { status: 'up' | 'down'; error?: string };
  };
  environment: string;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime = Date.now();

  constructor(private readonly config: ConfigService) {}

  async getHealth(): Promise<HealthStatus> {
    const services: HealthStatus['services'] = {
      firestore: { status: 'down' },
      firebaseAdmin: { status: 'down' },
    };

    // Check Firebase Admin SDK
    try {
      const apps = admin.apps;
      if (apps.length > 0) {
        services.firebaseAdmin.status = 'up';
      } else {
        services.firebaseAdmin.status = 'down';
        services.firebaseAdmin.error = 'No Firebase apps initialized';
      }
    } catch (error: any) {
      services.firebaseAdmin.status = 'down';
      services.firebaseAdmin.error = error.message;
    }

    // Check Firestore connectivity
    const firestoreStart = Date.now();
    try {
      const firestore = admin.firestore();
      // Simple connectivity check - listCollections is lightweight
      await firestore.listCollections().then(cols => {
        services.firestore.status = 'up';
        services.firestore.latency_ms = Date.now() - firestoreStart;
      }).catch(() => {
        services.firestore.status = 'down';
      });
    } catch (error: any) {
      services.firestore.status = 'down';
      services.firestore.error = error.message;
      services.firestore.latency_ms = Date.now() - firestoreStart;
    }

    // Determine overall status
    let status: HealthStatus['status'] = 'healthy';
    if (services.firestore.status === 'down' || services.firebaseAdmin.status === 'down') {
      status = 'unhealthy';
    } else if (
      (services.firestore.latency_ms && services.firestore.latency_ms > 1000) ||
      (services.firestore.latency_ms && services.firestore.latency_ms > 500)
    ) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      services,
      environment: this.config.get<string>('NODE_ENV') || 'development',
    };
  }
}
