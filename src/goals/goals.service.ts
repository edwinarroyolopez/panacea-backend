import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from 'src/firestore/firestore.service';
import { CreateGoalInput } from './dto/create-goal.input';
import { UpdateGoalStatusInput } from './dto/update-goal-status.input';
import { Goal, GoalDomain, GoalStatus } from './models/goal.model';

const COLLECTION = 'goals';
// Ajusta según tu enum (evita incluir DELETED)
const VISIBLE_STATUSES: string[] = [
  GoalStatus.ACTIVE,
  GoalStatus.PAUSED ?? 'PAUSED',
  GoalStatus.COMPLETED ?? 'COMPLETED',
];

@Injectable()
export class GoalsService {
  constructor(private readonly db: FirestoreService) { }

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

  /** Carga el doc y valida que pertenezca al user; lanza 404/403 si no. */
  private async getOwnedDoc(goalId: string, userId: string) {
    const ref = this.db.collection(COLLECTION).doc(goalId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Goal not found');
    const data = snap.data()!;
    if (data.userId !== userId) throw new ForbiddenException('Not your goal');
    return { ref, snap, data };
  }

  async upsert(userId: string, input: CreateGoalInput): Promise<Goal> {
    const now = new Date().toISOString();
    const ref = this.db.collection(COLLECTION).doc(); // id random
    await ref.set({
      userId,
      title: input.title,
      domain: input.domain,
      target: input.target ?? null,
      status: GoalStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
    const snap = await ref.get();
    return this.toGoal(snap.id, snap.data()!);
  }

  /** Obtiene un goal por id SOLO si pertenece al user y no está borrado. */
  async findByIdForUser(goalId: string, userId: string): Promise<Goal> {
    const { snap, data } = await this.getOwnedDoc(goalId, userId);
    if (data.status === GoalStatus.DELETED || data.status === 'DELETED' || data.status === 'DELETED') {
      throw new NotFoundException('Goal not found');
    }
    return this.toGoal(snap.id, data);
  }

  /** Lista goals del user, excluyendo borrados. Orden por reciente. */
  // async findByUser(userId: string): Promise<Goal[]> {
  //   const q = await this.db
  //     .collection(COLLECTION)
  //     .where('userId', '==', userId)
  //     // .where('status', 'in', VISIBLE_STATUSES) // ← estable; evita el operador !=
  //     .orderBy('createdAt', 'desc')            // ← necesitará índice (ya lo tienes)
  //     .get();

  //   return q.docs.map((d) => this.toGoal(d.id, d.data()));
  // }


  async findByUser(userId: string): Promise<Goal[]> {
    const q = await this.db
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('status', '!=', 'DELETED') // Firestore: este filtro requiere index compuesto si combinas con otros
      .get();

    return q.docs.map((d) => this.toGoal(d.id, d.data()));
  }

  /** Cambia estado validando owner. */
  async updateStatusForUser(userId: string, input: UpdateGoalStatusInput): Promise<Goal> {
    const { ref } = await this.getOwnedDoc(input.goalId, userId);
    const now = new Date().toISOString();
    await ref.update({ status: input.status, updatedAt: now });
    const snap = await ref.get();
    return this.toGoal(snap.id, snap.data()!);
  }

  /** Soft delete (marca como DELETED) validando owner. */
  async softDeleteForUser(goalId: string, userId: string): Promise<boolean> {
    const { ref } = await this.getOwnedDoc(goalId, userId);
    await ref.update({
      status: GoalStatus.DELETED ?? 'DELETED', // usa enum si lo tienes
      updatedAt: new Date().toISOString(),
    });
    return true;
  }
}
