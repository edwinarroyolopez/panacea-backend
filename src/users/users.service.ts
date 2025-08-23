// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { UpsertUserInput } from './dto/upsert-user.input';

@Injectable()
export class UsersService {
  private COL = 'users';
  constructor(private readonly db: FirestoreService) { }

  async findById(id: string) {
    const snap = await this.db.collection(this.COL).doc(id).get();
    if (!snap.exists) return null;
    const d = snap.data()!;
    return { id: snap.id, ...d };
  }

  async upsert(id: string, input: UpsertUserInput) {
    const now = new Date().toISOString();
    const ref = this.db.collection(this.COL).doc(id);
    await ref.set(
      { ...input, updatedAt: now, createdAt: (await ref.get()).exists ? undefined : now },
      { merge: true },
    );
    const doc = await ref.get();
    const d = doc.data()!;
    return { id: doc.id, ...d };
  }

  async findByEmail(email: string) {
    const q = await this.db.collection(this.COL).where('email', '==', email).limit(1).get();
    if (q.empty) return null;
    const doc = q.docs[0]; return { id: doc.id, ...doc.data() } as any;
  }

  async create(input: { email: string; name?: string; passwordHash?: string }) {
    const now = new Date().toISOString();
    const ref = this.db.collection(this.COL).doc(); // id random; o usa email como id
    await ref.set({ ...input, createdAt: now, updatedAt: now });
    const snap = await ref.get();
    return { id: snap.id, ...snap.data() } as any;
  }
}
