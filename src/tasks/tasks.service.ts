import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService } from 'src/firestore/firestore.service';
import { Task, TaskStatus } from './models/task.model';

const TASKS = 'tasks';

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

  async bulkCreate(planId: string, items: Array<{title:string; dueAt:string; scoreWeight:number}>): Promise<Task[]> {
    const now = new Date().toISOString();
    const batch = (this.db as any)['db'].batch?.() ?? null; // opcional; sino, inserta en serie
    const col = this.db.collection(TASKS);

    if (batch) {
      items.forEach(it => {
        const ref = col.doc();
        batch.set(ref, { planId, status: TaskStatus.PENDING, createdAt: now, updatedAt: now, ...it });
      });
      await batch.commit();
      // leerlas:
      const q = await col.where('planId','==',planId).get();
      return q.docs.map(d => this.toTask(d.id, d.data()));
    } else {
      const out: Task[] = [];
      for (const it of items) {
        const doc = await col.add({ planId, status: TaskStatus.PENDING, createdAt: now, updatedAt: now, ...it });
        const snap = await doc.get();
        out.push(this.toTask(snap.id, snap.data()!));
      }
      return out;
    }
  }

  async byGoal(goalId: string): Promise<Task[]> {
    // primero hallamos plan
    const ps = await this.db.collection('plans').where('goalId','==',goalId).limit(1).get();
    if (ps.empty) return [];
    const planId = ps.docs[0].id;
    const q = await this.db.collection(TASKS).where('planId','==',planId).get();
    return q.docs.map(d => this.toTask(d.id, d.data()));
  }

  async complete(taskId: string): Promise<Task> {
    const ref = this.db.collection(TASKS).doc(taskId);
    const s = await ref.get();
    if (!s.exists) throw new NotFoundException('Task not found');
    await ref.update({ status: TaskStatus.DONE, updatedAt: new Date().toISOString() });
    const u = await ref.get();
    return this.toTask(u.id, u.data()!);
  }
}
