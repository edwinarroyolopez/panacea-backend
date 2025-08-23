import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService } from 'src/firestore/firestore.service';
import { CreateGoalInput } from './dto/create-goal.input';
import { UpdateGoalStatusInput } from './dto/update-goal-status.input';
import { Goal, GoalDomain, GoalStatus } from './models/goal.model';

const COLLECTION = 'goals';

@Injectable()
export class GoalsService {
  constructor(private readonly db: FirestoreService) {}

  private toGoal(id: string, data: FirebaseFirestore.DocumentData): Goal {
    return {
      id,
      userId: data.userId,
      title: data.title,
      domain: data.domain as GoalDomain,
      target: data.target,
      status: (data.status ?? GoalStatus.ACTIVE) as GoalStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async upsert(userId: string, input: CreateGoalInput): Promise<Goal> {
    const now = new Date().toISOString();
    const doc = await this.db.collection(COLLECTION).add({
      userId,
      title: input.title,
      domain: input.domain,
      target: input.target ?? null,
      status: GoalStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
    const snap = await doc.get();
    return this.toGoal(snap.id, snap.data()!);
  }

  async findById(goalId: string): Promise<Goal> {
    const snap = await this.db.collection(COLLECTION).doc(goalId).get();
    if (!snap.exists) throw new NotFoundException('Goal not found');
    return this.toGoal(snap.id, snap.data()!);
  }

  async findByUser(userId: string): Promise<Goal[]> {
    const q = await this.db
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('status', '!=', 'deleted') // Firestore: este filtro requiere index compuesto si combinas con otros
      .get();

    return q.docs.map((d) => this.toGoal(d.id, d.data()));
  }

  async updateStatus(input: UpdateGoalStatusInput): Promise<Goal> {
    const ref = this.db.collection(COLLECTION).doc(input.goalId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Goal not found');

    const now = new Date().toISOString();
    await ref.update({ status: input.status, updatedAt: now });
    const updated = await ref.get();
    return this.toGoal(updated.id, updated.data()!);
  }

  async softDelete(goalId: string): Promise<boolean> {
    const ref = this.db.collection(COLLECTION).doc(goalId);
    const snap = await ref.get();
    if (!snap.exists) return true; // idempotente
    await ref.update({ status: 'deleted', updatedAt: new Date().toISOString() });
    return true;
  }
}
