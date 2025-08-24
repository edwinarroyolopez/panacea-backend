import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { FirestoreService } from 'src/firestore/firestore.service';
import { LlmService } from 'src/llm/llm.service';
import { GoalsService } from 'src/goals/goals.service';
import { OrchestratorService } from 'src/orchestrator/orchestrator.service';
import { ChatMessage, ChatRole } from './models/chat-message.model';
import { GoalDomain } from 'src/goals/models/goal.model';

const ClassificationSchema = z.object({
    intent: z.enum(['create_goal', 'link_goal', 'progress', 'other']),
    domain: z.enum(['sleep', 'weight', 'stress']).nullable().optional(),
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


    async process(text: string, userId: string, goalId?: string): Promise<ChatMessage> {
        // 1) Guarda mensaje del usuario
        const now = new Date().toISOString();
        const userDoc = await this.db.collection(this.CHAT_COL).add({
            userId, goalId: goalId ?? null, role: ChatRole.USER, text, createdAt: now,
        });
        console.log('[chat] saved user msg', { userId, goalId, id: userDoc.id });

        // 2) Clasificar intención con LLM (fallback a heurística)
        const prompt = `
            Eres un NLU para bienestar. Clasifica el mensaje del usuario en JSON:
            Campos:
            - intent: "create_goal" | "link_goal" | "progress" | "other"
            - domain: "sleep" | "weight" | "stress" | null
            - title: string | null       # ejemplo: "Dormir mejor"
            - target: string | null      # ejemplo: "Dormir 7.5h"
            - goalId: string | null      # si hace referencia explícita

            Usuario: "${text}"

            Responde SOLO JSON válido.
            `;
        let classification: z.infer<typeof ClassificationSchema> = { intent: 'other', domain: null, title: null, target: null, goalId: null };
        try {
            const raw = await this.llm.generateJson(prompt);
            const parsed = ClassificationSchema.safeParse(raw._raw ? raw : raw);
            if (parsed.success) classification = parsed.data;
        } catch { }

        // Fallback heurístico simple por si el LLM falla
        if (classification.intent === 'other') {
            const t = text.toLowerCase();
            if (t.includes('dormir') || t.includes('sueñ')) classification = { intent: 'create_goal', domain: 'sleep', title: 'Dormir mejor', target: null, goalId: null };
            if (t.includes('bajar de peso') || t.includes('adelgazar')) classification = { intent: 'create_goal', domain: 'weight', title: 'Bajar de peso', target: null, goalId: null };
            if (t.includes('estrés') || t.includes('estres') || t.includes('ansiedad')) classification = { intent: 'create_goal', domain: 'stress', title: 'Reducir estrés', target: null, goalId: null };
        }

        // 3) Ejecutar acción
        let assistantText = 'Te escucho. ¿Quieres que te ayude a crear un objetivo?';
        let planId: string | undefined;

        if (classification.intent === 'create_goal' && classification.domain) {
            // crea goal del usuario
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

            const tasks = (plan as any).tasks ?? [];
            const preview = tasks.slice(0, 3)
                .map((t: any) => `• ${t.title} (${new Date(t.dueAt).toLocaleString('es-CO')})`)
                .join('\n');

            assistantText = [
                `✅ Objetivo creado: **${goal.title}** (${goal.domain}).`,
                `🧠 Generé un plan inicial para esta semana.`,
                (plan as any).summary ? `Resumen: ${(plan as any).summary}` : '',
                preview ? `Primeras tareas:\n${preview}` : '',
                `Puedes decir "ajusta el plan" si está muy fácil/difícil.`,
            ].filter(Boolean).join('\n');
        }

        // 4) Guardar respuesta del asistente
        const assistantDoc = await this.db.collection(this.CHAT_COL).add({
            userId,
            goalId: goalId ?? null,
            planId: planId ?? null,
            role: ChatRole.ASSISTANT,
            text: assistantText,
            createdAt: new Date().toISOString(),
        });

        const assistantSnap = await assistantDoc.get();
        return this.toMsg(assistantSnap.id, assistantSnap.data()!);
    }
}
