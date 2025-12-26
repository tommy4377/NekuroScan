# 🔧 Fix Build Command su Render

## Problema

Il build command su Render sta eseguendo `migrate-to-normalized.ts` che fallisce durante il build perché il database potrebbe non essere disponibile.

## Soluzione

### Opzione 1: Cambiare il Build Command su Render (Consigliato)

Nelle impostazioni del servizio backend su Render, cambia il **Build Command** da:

```
npm install && npx prisma generate && npx tsx migrate-to-normalized.ts
```

a:

```
npm install && npx prisma generate
```

### Opzione 2: Usare lo script build (Già configurato)

Il `package.json` ha già uno script `build` che esegue solo `npx prisma generate`.

Su Render, puoi usare come Build Command:

```
cd nekuroscan/backend && npm install && npm run build
```

### ⚠️ Importante

- **Lo script di migrazione** (`migrate-to-normalized.ts`) dovrebbe essere eseguito **manualmente** quando necessario, non durante ogni build
- **Il build** deve solo:
  1. Installare le dipendenze (`npm install`)
  2. Generare il Prisma Client (`npx prisma generate`)

### Come eseguire la migrazione manualmente (se necessaria)

Se devi eseguire la migrazione dei dati, puoi farlo:

1. Via Render Shell (se disponibile):
   ```bash
   cd nekuroscan/backend
   npx tsx migrate-to-normalized.ts
   ```

2. Oppure localmente con DATABASE_URL configurato:
   ```bash
   cd nekuroscan/backend
   npx tsx migrate-to-normalized.ts
   ```

## Modifiche apportate al codice

Ho reso lo script `migrate-to-normalized.ts` più resiliente:
- ✅ Esce silenziosamente se DATABASE_URL non è configurato
- ✅ Esce con successo (non fallisce il build) se la connessione al database non è disponibile
- ✅ Questo permette di mantenere lo script nel build command senza bloccare il deploy

Tuttavia, **è ancora consigliabile rimuovere lo script dal build command** per evitare tentativi di connessione inutili durante ogni build.

