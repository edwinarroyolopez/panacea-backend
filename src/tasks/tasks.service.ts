// src/tasks/tasks.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from 'src/firestore/firestore.service';
import { Task, TaskStatus } from './models/task.model';

const TASKS = 'tasks';
const PLANS = 'plans';

type NewTask = { title: string; dueAt: string; scoreWeight: number };

@Injectable()
export class TasksService {
  constructor(private readonly db: FirestoreService) {}

  private toTask(id: string, data: FirebaseFirestore.DocumentData): Task {
    return {
      id,
      planId: data.planId,
      title: data.title,
      dueAt: data.dueAt,
      status: (data.status ?? TaskStatus.PENDING) as TaskStatus,
      scoreWeight: data.scoreWeight ?? 1,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  /** Valida que el plan pertenezca al user (asumimos que plan guarda userId). */
  private async assertPlanOwnership(planId: string, userId: string) {
    const pref = this.db.collection(PLANS).doc(planId);
    const psnap = await pref.get();
    if (!psnap.exists) throw new NotFoundException('Plan not found');
    const pdata = psnap.data()!;
    if (pdata.userId !== userId) throw new ForbiddenException('Not your plan');
    return pdata;
  }

  /** Crea/actualiza en bloque tareas para un plan del usuario. */
  async bulkCreateForUser(userId: string, planId: string, items: NewTask[]): Promise<Task[]> {
    await this.assertPlanOwnership(planId, userId);

    const now = new Date().toISOString();
    const col = this.db.collection(TASKS);

    // Batch si está disponible en tu wrapper
    const firestore = (this.db as any)['db'];
    if (firestore?.batch) {
      const batch = firestore.batch();
      for (const it of items) {
        const ref = col.doc();
        batch.set(ref, {
          userId,                // guardamos por seguridad (no es necesario exponerlo)
          planId,
          title: it.title,
          dueAt: it.dueAt,
          scoreWeight: it.scoreWeight,
          status: TaskStatus.PENDING,
          createdAt: now,
          updatedAt: now,
        });
      }
      await batch.commit();
    } else {
      for (const it of items) {
        await col.add({
          userId,
          planId,
          title: it.title,
          dueAt: it.dueAt,
          scoreWeight: it.scoreWeight,
          status: TaskStatus.PENDING,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Devuelve tareas ordenadas por dueAt (UX >)
    const q = await col.where('planId', '==', planId).orderBy('dueAt', 'asc').get();
    return q.docs.map((d) => this.toTask(d.id, d.data()));
  }

  /** Lista tareas de un goal del usuario (Plan 1:1 con goalId => planId = goalId). */
  async byGoalForUser(goalId: string, userId: string): Promise<Task[]> {
    await this.assertPlanOwnership(goalId, userId); // si tu planId == goalId
    const q = await this.db
      .collection(TASKS)
      .where('planId', '==', goalId)
      .orderBy('dueAt', 'asc')
      .get();

    return q.docs.map((d) => this.toTask(d.id, d.data()));
  }

  /** Completa una tarea validando que el plan sea del usuario. */
  async completeForUser(taskId: string, userId: string): Promise<Task> {
    const ref = this.db.collection(TASKS).doc(taskId);
    const s = await ref.get();
    if (!s.exists) throw new NotFoundException('Task not found');

    const data = s.data()!;
    await this.assertPlanOwnership(data.planId, userId);

    await ref.update({ status: TaskStatus.DONE, updatedAt: new Date().toISOString() });
    const u = await ref.get();
    return this.toTask(u.id, u.data()!);
  }
}
