import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { FirestoreService } from 'src/firestore/firestore.service';
import { LlmService } from 'src/llm/llm.service';
import { GoalsService } from 'src/goals/goals.service';
import { OrchestratorService } from 'src/orchestrator/orchestrator.service';
import { ChatMessage, ChatRole } from './models/chat-message.model';
import { GoalDomain } from 'src/goals/models/goal.model';
import { PlansService } from 'src/plans/plans.service';
import { TasksService } from 'src/tasks/tasks.service';
import { Task } from 'src/tasks/models/task.model';

const AvailableDomains = [
    'sleep', 'weight', 'stress', 'nutrition', 'fitness', 'hydration', 'mindfulness', 'energy',
] as const;

const ClassificationSchema = z.object({
    // ampliamos intents y dominios
    intent: z.enum(['create_goal', 'link_goal', 'progress', 'adjust_plan', 'add_micro_tasks', 'postpone_today', 'other']),
    domain: z.enum(AvailableDomains).nullable().optional(),
    title: z.string().nullable().optional(),
    target: z.string().nullable().optional(),
    goalId: z.string().nullable().optional(),
});

@Injectable()
export class ChatService {
    private CHAT_COL = 'chat_logs';

    constructor(
        private readonly db: FirestoreService,
        private readonly llm: LlmService,
        private readonly goals: GoalsService,
        private readonly orch: OrchestratorService,
        private readonly plans: PlansService,
        private readonly tasks: TasksService,
    ) { }

    private toMsg(id: string, data: FirebaseFirestore.DocumentData): ChatMessage {
        return {
            id,
            userId: data.userId,
            role: data.role,
            text: data.text,
            goalId: data.goalId,
            planId: data.planId,
            createdAt: data.createdAt,
            effects: data.effects ?? null,
        };
    }

    async history(userId: string, goalId?: string, limit = 30) {
        const col = this.db.collection(this.CHAT_COL);
        let q = col.where('userId', '==', userId);
        if (goalId) q = q.where('goalId', '==', goalId);
        q = q.orderBy('createdAt', 'desc').limit(limit);

        const snap = await q.get();
        return snap.docs.map(d => this.toMsg(d.id, d.data())).reverse();
    }

    // util: hoy a hh:mm en ISO; si pasó, mueve a mañana
    private todayAtISO(hour: number, minute: number) {
        const now = new Date();
        const d = new Date(now);
        d.setHours(hour, minute, 0, 0);
        if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
        return d.toISOString();
    }

    async process(text: string, userId: string, goalId?: string): Promise<ChatMessage> {
        const now = new Date().toISOString();
        const userDoc = await this.db.collection(this.CHAT_COL).add({
            userId, goalId: goalId ?? null, role: ChatRole.USER, text, createdAt: now,
        });

        // ---------- NLU ----------
        const nluPrompt = `
Eres un NLU para bienestar. Devuelve SOLO JSON con:
{
  "intent": "create_goal" | "link_goal" | "progress" | "adjust_plan" | "add_micro_tasks" | "postpone_today" | "other",
  "domain": ${JSON.stringify(AvailableDomains)} | null,
  "title": string | null,
  "target": string | null,
  "goalId": string | null
}
Usuario: "${text}"
`;
        let classification: z.infer<typeof ClassificationSchema> = { intent: 'other', domain: null, title: null, target: null, goalId: null };
        try {
            const raw = await this.llm.generateJson(nluPrompt);
            const candidate = (typeof raw === 'string') ? JSON.parse(raw) : (raw?.data ?? raw?._raw ?? raw);
            const parsed = ClassificationSchema.safeParse(candidate);
            if (parsed.success) classification = parsed.data;
        } catch { }

        // Heurísticas españolas
        const t = text.toLowerCase();
        const hasAny = (...words: string[]) => words.some(w => t.includes(w));

        if (classification.intent === 'other') {
            if (hasAny('ajusta', 'ajustar', 'replan')) classification.intent = 'adjust_plan';
            if (hasAny('micro', 'micro-tarea', 'microtarea')) classification.intent = 'add_micro_tasks';
            if (hasAny('posponer', 'postpone')) classification.intent = 'postpone_today';

            if (!classification.domain) {
                if (hasAny('dormir', 'sueñ')) classification.domain = 'sleep';
                else if (hasAny('estrés', 'estres', 'ansiedad')) classification.domain = 'stress';
                else if (hasAny('bajar de peso', 'adelgazar', 'peso')) classification.domain = 'weight';
                else if (hasAny('nutric', 'dieta', 'aliment')) classification.domain = 'nutrition';
                else if (hasAny('ejerc', 'gym', 'entren')) classification.domain = 'fitness';
                else if (hasAny('agua', 'hidrat')) classification.domain = 'hydration';
                else if (hasAny('medit', 'respiración', 'respiracion', 'mindful')) classification.domain = 'mindfulness';
                else if (hasAny('energía', 'energia', 'cansancio', 'fatiga')) classification.domain = 'energy';
            }
            if (classification.intent === 'other' && classification.domain) {
                classification.intent = 'create_goal';
            }
        }

        // ---------- Acciones ----------
        let assistantText = 'Te escucho. ¿Quieres que te ayude a crear un objetivo?';
        let planId: string | undefined;
        const effects: Array<{ type: string; payload?: any }> = [];

        // 0) Necesitamos goalId para acciones contextuales
        const needGoal = (what: string) => `Para ${what}, primero selecciona un objetivo o crea uno.`;

        // CREATE GOAL + PLAN
        if (classification.intent === 'create_goal' && classification.domain) {
            const goal = await this.goals.upsert(userId, {
                title: classification.title ?? 'Objetivo de bienestar',
                domain: classification.domain as GoalDomain,
                target: classification.target ?? undefined,
            });
            goalId = goal.id;

            const plan = await this.orch.generatePlanForGoal(
                userId, goal.id, goal.title, goal.domain, goal.target ?? null,
            );
            planId = (plan as any).id ?? plan?.id;

            effects.push(
                { type: 'SET_CURRENT_GOAL', payload: { goalId } },
                { type: 'PLAN_CREATED', payload: { goalId, planId } },
                { type: 'NAVIGATE_TO_PLAN', payload: { goalId } }, 
                { type: 'REFRESH_SECTIONS', payload: { sections: ['PLAN', 'TASKS_TODAY'] } },
            );

            const tasks = (plan as any).tasks ?? [];
            const preview = tasks.slice(0, 3)
                .map((tt: any) => `• ${tt.title} (${new Date(tt.dueAt).toLocaleString('es-CO')})`)
                .join('\n');

            assistantText = [
                `✅ Objetivo creado: **${goal.title}** (${goal.domain}).`,
                `🧠 Generé un plan inicial para esta semana.`,
                (plan as any).summary ? `Resumen: ${(plan as any).summary}` : '',
                preview ? `Primeras tareas:\n${preview}` : '',
                `Puedes decir "ajusta el plan" si está muy fácil/difícil.`,
            ].filter(Boolean).join('\n');
        }

        // ADJUST PLAN (replan)
        else if (classification.intent === 'adjust_plan') {
            if (!goalId) {
                assistantText = needGoal('ajustar el plan');
            } else {
                const replanned = await this.orch.replan(userId, goalId);
                planId = replanned.id;
                effects.push(
                    { type: 'PLAN_UPDATED', payload: { goalId, planId } },
                    { type: 'REFRESH_SECTIONS', payload: { sections: ['PLAN', 'TASKS_TODAY'] } },
                );
                assistantText = '🔧 Ajusté tu plan para que sea más alcanzable esta semana.';
            }
        }

        // ADD MICRO TASKS (2–3 pequeñas hoy)
        else if (classification.intent === 'add_micro_tasks') {
            if (!goalId) {
                assistantText = needGoal('agregar micro-tareas');
            } else {
                const plan = await this.plans.findByGoal(goalId, userId);
                if (!plan) {
                    assistantText = 'Aún no tienes plan para este objetivo. Genera uno primero.';
                } else {
                    planId = plan.id;
                    const items = [
                        { title: 'Respiración 2 min', dueAt: this.todayAtISO(18, 0), scoreWeight: 1 },
                        { title: 'Vaso de agua', dueAt: this.todayAtISO(19, 0), scoreWeight: 1 },
                        { title: 'Estiramiento 3 min', dueAt: this.todayAtISO(21, 0), scoreWeight: 1 },
                    ];
                    const created = await this.tasks.bulkCreateForUser(userId, plan.id, items);
                    effects.push(
                        { type: 'TASKS_ADDED', payload: { goalId, planId: plan.id, items: created } },
                        { type: 'REFRESH_SECTIONS', payload: { sections: ['TASKS_TODAY'] } },
                    );
                    assistantText = `🧩 Añadí ${created.length} micro-tareas para hoy. ¡Vamos paso a paso!`;
                }
            }
        }

        // POSTPONE TODAY → TOMORROW
        else if (classification.intent === 'postpone_today') {
            if (!goalId) {
                assistantText = needGoal('posponer tareas');
            } else {
                const plan = await this.plans.findByGoal(goalId, userId);
                if (!plan) {
                    assistantText = 'No encontré plan para este objetivo.';
                } else {
                    // Trae tareas de este goal hoy (puedes optimizar en TasksService con un método directo)
                    const all = await this.tasks.byGoalForUser(goalId, userId);
                    const todayStr = new Date().toDateString();
                    const pendingToday = all.filter(t => t.status !== 'done' && new Date(t.dueAt).toDateString() === todayStr);
                    const moved: Task[] = [];
                    for (const tt of pendingToday) {
                        const newDate = new Date(tt.dueAt); newDate.setDate(newDate.getDate() + 1);
                        const updated = await this.tasks.postponeForUser(tt.id, userId, 1); // si tienes este método
                        moved.push(updated ?? { ...tt, dueAt: newDate.toISOString() });
                    }
                    effects.push(
                        { type: 'TASKS_POSTPONED', payload: { goalId, items: moved } },
                        { type: 'REFRESH_SECTIONS', payload: { sections: ['TASKS_TODAY'] } },
                    );
                    assistantText = moved.length
                        ? `⏭️ Moví ${moved.length} tarea(s) para mañana.`
                        : 'No encontré tareas pendientes para hoy.';
                }
            }
        }

        // 4) Guardar respuesta del asistente
        const assistantDoc = await this.db.collection(this.CHAT_COL).add({
            userId,
            role: ChatRole.ASSISTANT,
            text: assistantText,
            goalId: goalId ?? null,
            planId: planId ?? null,
            effects: effects.length ? effects : null,
            createdAt: new Date().toISOString(),
        });

        const assistantSnap = await assistantDoc.get();
        return this.toMsg(assistantSnap.id, assistantSnap.data()!);
    }
}
