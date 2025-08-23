// src/firestore/firestore.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirestoreService implements OnModuleInit {
  private logger = new Logger(FirestoreService.name);
  private db: FirebaseFirestore.Firestore;

  onModuleInit() {
    const isEmu = !!process.env.FIRESTORE_EMULATOR_HOST;
    const projectId =
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      'panacea-dev';

    if (!admin.apps.length) {
      if (isEmu) {
        this.logger.log(`Using Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST} (projectId=${projectId})`);
        admin.initializeApp({ projectId });
      } else {
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        this.logger.log(`Initializing Firestore (projectId=${projectId}, creds=${credPath ? 'set' : 'MISSING'})`);
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
        });
      }
    }
    this.db = admin.firestore();
  }

  collection(name: string) { return this.db.collection(name); }
  async add(collection: string, data: any) { return this.db.collection(collection).add(data); }
  async getAll(collection: string) {
    const snap = await this.db.collection(collection).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}
