// src/plans/plans.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from 'src/firestore/firestore.service';
import { Plan } from './models/plan.model';

const PLANS = 'plans';
const GOALS = 'goals';

@Injectable()
export class PlansService {
  constructor(private readonly db: FirestoreService) { }

  private toPlan(id: string, data: FirebaseFirestore.DocumentData): Plan {
    return {
      id,
      goalId: data.goalId,
      summary: data.summary,
      recommendations: data.recommendations ?? [],
      weeklySchedule: data.weeklySchedule ?? [],
      // userId se guarda en Firestore para validaciones,
      // pero no lo exponemos si tu GraphQL Plan no lo define.
    };
  }

  /** Valida que el goal exista y pertenezca al user. */
  private async assertGoalOwnership(goalId: string, userId: string) {
    const gref = this.db.collection(GOALS).doc(goalId);
    const gsnap = await gref.get();
    if (!gsnap.exists) throw new NotFoundException('Goal not found');
    const gdata = gsnap.data()!;
    if (gdata.userId !== userId) throw new ForbiddenException('Not your goal');
    return gdata;
  }

  /** Crea un plan SOLO si el goal es del user; persiste userId en el plan. */
  async create(
    userId: string,
    goalId: string,
    payload: Pick<Plan, 'summary' | 'recommendations' | 'weeklySchedule'>
  ): Promise<Plan> {
    // 1) El goal debe ser del usuario
    await this.assertGoalOwnership(goalId, userId);

    // 2) Upsert del plan con id = goalId (1:1)
    const ref = this.db.collection(PLANS).doc(goalId);
    const now = new Date().toISOString();

    // preserva createdAt si ya existía
    const prev = await ref.get();
    const createdAt = prev.exists ? (prev.data()!.createdAt ?? now) : now;

    await ref.set(
      {
        userId,
        goalId,
        summary: payload.summary,
        recommendations: payload.recommendations ?? [],
        weeklySchedule: payload.weeklySchedule ?? [],
        createdAt,
        updatedAt: now,
      },
      { merge: true },
    );

    // 3) Devuelve el plan normalizado
    const snap = await ref.get();
    return this.toPlan(snap.id, snap.data()!);
  }

  /** Obtiene el plan por goal SOLO si el goal es del user. */
  async findByGoal(goalId: string, userId: string): Promise<Plan | null> {
    await this.assertGoalOwnership(goalId, userId);

    const q = await this.db
      .collection(PLANS)
      .where('goalId', '==', goalId)
      .limit(1)
      .get();

    if (q.empty) return null;
    const d = q.docs[0];
    return this.toPlan(d.id, d.data());
  }

  //   async findByGoals(goalId: string, userId:string): Promise<Plan | null> {
  //   const q = await this.db.collection(PLANS).where('goalId','==',goalId).limit(1).get();
  //   if (q.empty) return null;
  //   const d = q.docs[0];
  //   return this.toPlan(d.id, d.data());
  // }


  /** Obtiene un plan por id validando dueño (via userId en plan o dueño del goal). */
  async findById(id: string, userId: string): Promise<Plan> {
    const s = await this.db.collection(PLANS).doc(id).get();
    if (!s.exists) throw new NotFoundException('Plan not found');
    const data = s.data()!;

    // Ruta rápida: si el plan ya tiene userId, valida directo
    if (data.userId) {
      if (data.userId !== userId) throw new ForbiddenException('Not your plan');
    } else {
      // Backfill/compat: valida via goal
      await this.assertGoalOwnership(data.goalId, userId);
    }

    return this.toPlan(s.id, data);
  }
}
