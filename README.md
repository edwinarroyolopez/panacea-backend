
## Panacea


## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```



# GRAPHQL Queries - Mutations

query {
  tasksByGoal(goalId: "IYRvkWdlQLjsFJB530Le") {
    id title status dueAt
  }
}



mutation Gen {
  generatePlan(goalId: "IYRvkWdlQLjsFJB530Le") {
    id
    goalId
    summary
    recommendations
    weeklySchedule { day action }
    tasks { id title status dueAt scoreWeight }
  }
}





mutation CreateGoal {
  upsertGoal(input: { title: "Dormir mejor", domain: SLEEP, target: "Dormir 7.5h" }) {
    id
    title
    domain
    status
    createdAt
  }
}


mutation Ambient {
  sendChat(text: "Quiero dormir mejor, meta dormir 7.5h")
  {
    id
    text
    goalId
    planId
    createdAt
  }
}


{
  "data": {
    "sendChat": {
      "id": "dzrgCQ22UAugdnU3ySnm",
      "text": "✅ Objetivo creado: **Dormir mejor** (sleep).\n🧠 Generé un plan inicial para esta semana.\nResumen: Este plan de una semana está diseñado para ayudarte a mejorar la calidad de tu sueño y alcanzar un promedio de 7.5 horas de sueño por noche. Se centra en establecer hábitos saludables y crear un ambiente propicio para el descanso. Si experimentas problemas persistentes de sueño, consulta a un profesional de la salud.\nPrimeras tareas:\n• Reducir consumo de cafeína (11/3/2024, 10:00:00 a. m.)\n• Limitar tiempo de pantalla antes de dormir (15/3/2024, 8:00:00 p. m.)\n• Evaluar calidad del sueño diario (17/3/2024, 6:00:00 a. m.)\nPuedes decir “ajusta el plan” si está muy fácil/difícil.",
      "goalId": "xdi4cNTy9spjOhHqMNYi",
      "planId": "xktZmSK3rLsGN5ooacNU",
      "createdAt": "2025-08-23T01:45:16.085Z"
    }
  }
}



query {
  tasksByGoal(goalId: "PEG AQUI EL ID") {
    id title status dueAt
  }
}
