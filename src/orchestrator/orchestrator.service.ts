// src/orchestrator/orchestrator.service.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PlansService } from 'src/plans/plans.service';
import { TasksService } from 'src/tasks/tasks.service';
import { LlmService } from 'src/llm/llm.service';
import { GoalsService } from 'src/goals/goals.service';
import { Plan } from 'src/plans/models/plan.model';

const PlanSchemaV1 = z.object({
  summary: z.string(),
  recommendations: z.array(z.string()).min(3),
  weeklySchedule: z.array(z.object({ day: z.string(), action: z.string() })).min(5),
  tasks: z.array(z.object({
    title: z.string(),
    dueAt: z.string(),        // ISO
    scoreWeight: z.number().min(1).max(5),
  })).min(5),
});

type PlanGen = z.infer<typeof PlanSchemaV1>;

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly llm: LlmService,
    private readonly plans: PlansService,
    private readonly tasks: TasksService,
    private readonly goals: GoalsService,
  ) { }

  /**
   * Genera un plan para un goal del usuario (valida ownership).
   */
  async generatePlanForGoal(
    userId: string,
    goalId: string,
    goalTitle: string,
    domain: string,
    target?: string | null,
  ): Promise<Plan> {
    // 1) Asegura que el goal pertenece al usuario
    await this.goals.findByIdForUser(goalId, userId);

    // 2) Prompt al LLM
    const prompt = `
Eres un agente de bienestar para LATAM. Genera un plan de 1 semana para el objetivo:
- Dominio: ${domain}
- Título: ${goalTitle}
- Meta: ${target ?? 'N/A'}

Devuelve SOLO JSON con:
{
  "summary": string,
  "recommendations": string[],
  "weeklySchedule": [{ "day": "Lunes|Martes|...", "action": string }],
  "tasks": [{ "title": string, "dueAt": ISO8601, "scoreWeight": 1-5 }]
}

Reglas: sin diagnósticos médicos, seguro, incremental, basado en hábitos. Si hay señales de gravedad, recomendar consultar profesional.
`;

    const raw = await this.llm.generateJson(prompt);

    // Acepta tanto objeto como string JSON del modelo
    const candidate = typeof raw === 'string'
      ? JSON.parse(raw)
      // algunos wrappers devuelven { _raw: string, data: any }
      : (raw?.data ?? raw?._raw ?? raw);

    const parsed = PlanSchemaV1.safeParse(candidate);
    if (!parsed.success) {
      // Fallback defensivo
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const fallback: PlanGen = {
        summary: `Plan inicial para ${goalTitle}`,
        recommendations: ['Hidratarse', 'Rutina corta', 'Registro de sueño'],
        weeklySchedule: [
          { day: 'Lunes', action: 'Dormir a la misma hora' },
          { day: 'Martes', action: 'Evitar pantallas 60 min antes' },
          { day: 'Miércoles', action: 'Caminar 20 min tarde' },
          { day: 'Jueves', action: 'Respiración 5 min' },
          { day: 'Viernes', action: 'Registro de hábitos' },
        ],
        tasks: [
          { title: 'Apagar pantallas 60 min antes', dueAt: `${day}T21:00:00.000Z`, scoreWeight: 3 },
          { title: 'Respiración 5 min', dueAt: `${day}T21:30:00.000Z`, scoreWeight: 2 },
          { title: 'Registrar hora de sueño', dueAt: `${day}T22:00:00.000Z`, scoreWeight: 2 },
          { title: 'Caminar 20 min', dueAt: `${day}T17:00:00.000Z`, scoreWeight: 3 },
          { title: 'Evitar cafeína tarde', dueAt: `${day}T15:00:00.000Z`, scoreWeight: 1 },
        ],
      };
      return this.persist(userId, goalId, fallback);
    }

    return this.persist(userId, goalId, parsed.data);
  }

  /**
   * Persiste Plan (1:1 docId = goalId) + Tasks del usuario.
   */
  private async persist(userId: string, goalId: string, data: PlanGen) {
    // Plan: docId = goalId (idempotente, merge)
    const plan = await this.plans.create(userId, goalId, {
      summary: data.summary,
      recommendations: data.recommendations,
      weeklySchedule: data.weeklySchedule,
    });

    // Tasks: crea/actualiza en bloque, validando ownership
    // Implementa en TasksService: bulkCreateForUser(userId, plan.id, tasks)
    const tasks = await this.tasks.bulkCreateForUser(userId, plan.id, data.tasks);

    // Si tu type GraphQL Plan no expone tasks, este spread no afecta el schema
    return { ...plan, tasks } as Plan;
  }

  /**
   * Replanifica un goal del usuario (lee goal para enriquecer prompt).
   */
  async replan(userId: string, goalId: string): Promise<Plan> {
    const goal = await this.goals.findByIdForUser(goalId, userId);
    return this.generatePlanForGoal(userId, goal.id, goal.title, goal.domain, goal.target ?? null);
  }
}
