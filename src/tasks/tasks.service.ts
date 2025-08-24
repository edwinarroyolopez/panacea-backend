// src/tasks/tasks.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from 'src/firestore/firestore.service';
import { Task, TaskStatus } from './models/task.model';
import { addDaysISO, startOfTodayUTC } from 'src/utils/date.utils';

const TASKS = 'tasks';
const PLANS = 'plans';

type NewTask = { title: string; dueAt: string; scoreWeight: number };

@Injectable()
export class TasksService {
  constructor(private readonly db: FirestoreService) { }

  private toTask(id: string, data: FirebaseFirestore.DocumentData): Task {
    return {
      id,
      userId: data.userId,
      planId: data.planId,
      title: data.title,
      dueAt: data.dueAt,
      status: (data.status ?? TaskStatus.PENDING) as TaskStatus,
      scoreWeight: data.scoreWeight ?? 1,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      postponedCount: data.postponedCount ?? 0,
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

  private asDateYYYYMMDD(iso: string) {
    return iso.slice(0, 10);
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
        const dueDate = this.asDateYYYYMMDD(it.dueAt);
        const ref = col.doc();
        batch.set(ref, {
          userId,
          planId,
          title: it.title,
          dueAt: it.dueAt,
          dueDate,
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


  async todayOld(userId: string, dateYYYYMMDD?: string): Promise<Task[]> {
    const day = dateYYYYMMDD ?? new Date().toISOString().slice(0, 10);
    // index sugerido: (userId asc, dueDate asc, status asc)
    const q = await this.db
      .collection(TASKS)
      .where('userId', '==', userId)
      .where('dueDate', '==', day)
      .where('status', '!=', 'CANCELLED')
      .orderBy('dueDate', 'asc')
      .get();

    return q.docs.map((d) => this.toTask(d.id, d.data()));
  }


  async today(userId: string): Promise<Task[]> {
    // rango día local [00:00, 24:00) -> en ISO UTC
    const tz: string = 'America/Bogota';
    const now = new Date();
    const start = startOfTodayUTC(now, tz);
    const end = addDaysISO(start, 1);
    // ⚠️ Firestore pedirá índice compuesto: userId ==, status != DONE, dueAt range
    const q = await this.db
      .collection(TASKS)
      .where('userId', '==', userId)
      .where('status', 'in', [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]) // evita '!=' y ahorra índice
      .where('dueAt', '>=', start)
      .where('dueAt', '<', end)
      .orderBy('dueAt', 'asc')
      .get();

    return q.docs.map((d) => this.toTask(d.id, d.data()));
  }

  async postponeForUser(taskId: string, userId: string, days = 1): Promise<Task> {
    if (days < 1) throw new BadRequestException('days debe ser >= 1');

    const ref = this.db.collection(TASKS).doc(taskId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Task not found');

    const data = snap.data()!;
    if (data.userId && data.userId !== userId) {
      throw new ForbiddenException('Not your task');
    }

    // Base: si dueAt inválido o en pasado lejano, usa ahora mismo como referencia
    const prev = new Date(data.dueAt ?? Date.now());
    const base = isNaN(prev.getTime()) ? new Date() : prev;

    // Suma "days" manteniendo hora/min (UTC). Para fines prácticos está OK.
    const next = new Date(base.getTime());
    next.setUTCDate(next.getUTCDate() + days);

    const updatedAt = new Date().toISOString();
    await ref.update({
      dueAt: next.toISOString(),
      updatedAt,
      postponedCount: (data.postponedCount ?? 0) + 1,
    });

    const out = await ref.get();
    return this.toTask(out.id, out.data()!);
  }

}
