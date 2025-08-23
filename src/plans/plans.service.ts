import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService } from 'src/firestore/firestore.service';
import { Plan } from './models/plan.model';

const PLANS = 'plans';

@Injectable()
export class PlansService {
  constructor(private readonly db: FirestoreService) {}

  private toPlan(id: string, data: FirebaseFirestore.DocumentData): Plan {
    return {
      id,
      goalId: data.goalId,
      summary: data.summary,
      recommendations: data.recommendations ?? [],
      weeklySchedule: data.weeklySchedule ?? [],
    };
  }

  async create(goalId: string, payload: Omit<Plan, 'id'|'tasks'>): Promise<Plan> {
    const doc = await this.db.collection(PLANS).add({
      ...payload,
      goalId,
      createdAt: new Date().toISOString(),
    });
    const snap = await doc.get();
    return this.toPlan(snap.id, snap.data()!);
  }

  async findByGoal(goalId: string): Promise<Plan | null> {
    const q = await this.db.collection(PLANS).where('goalId','==',goalId).limit(1).get();
    if (q.empty) return null;
    const d = q.docs[0];
    return this.toPlan(d.id, d.data());
  }

  async findById(id: string): Promise<Plan> {
    const s = await this.db.collection(PLANS).doc(id).get();
    if (!s.exists) throw new NotFoundException('Plan not found');
    return this.toPlan(s.id, s.data()!);
  }
}
