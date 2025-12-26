-- ============================================================================
-- 🆕 CREAZIONE NUOVE TABELLE NORMALIZZATE - NeKuroScan
-- ============================================================================
-- Esegui questo SQL nel tuo database (Supabase SQL Editor)
-- Per creare SOLO le tabelle normalizzate (quelle che userai ora)
-- ============================================================================

-- ============================================================================
-- 📦 TABELLA: favorites
-- Sostituisce user_favorites.favorites JSON
-- ============================================================================
CREATE TABLE IF NOT EXISTS "favorites" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "mangaUrl" VARCHAR(500) NOT NULL,
    "mangaTitle" VARCHAR(500) NOT NULL,
    "coverUrl" TEXT,
    "source" VARCHAR(50),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") 
        REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE ("userId", "mangaUrl")
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS "favorites_userId_idx" ON "favorites"("userId");
CREATE INDEX IF NOT EXISTS "favorites_mangaUrl_idx" ON "favorites"("mangaUrl");
CREATE INDEX IF NOT EXISTS "favorites_userId_addedAt_idx" ON "favorites"("userId", "addedAt" DESC);

COMMENT ON TABLE "favorites" IS 'Favoriti utente - normalizzati (sostituto di user_favorites JSON)';

-- ============================================================================
-- 📦 TABELLA: library_manga
-- Sostituisce user_library.reading/completed/dropped JSON
-- ============================================================================
CREATE TABLE IF NOT EXISTS "library_manga" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "mangaUrl" VARCHAR(500) NOT NULL,
    "mangaTitle" VARCHAR(500) NOT NULL,
    "coverUrl" TEXT,
    "source" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('reading', 'completed', 'dropped', 'plan_to_read')),
    "rating" INTEGER CHECK ("rating" >= 1 AND "rating" <= 10),
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "library_manga_userId_fkey" FOREIGN KEY ("userId") 
        REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE ("userId", "mangaUrl")
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS "library_manga_userId_status_idx" ON "library_manga"("userId", "status");
CREATE INDEX IF NOT EXISTS "library_manga_mangaUrl_status_idx" ON "library_manga"("mangaUrl", "status");
CREATE INDEX IF NOT EXISTS "library_manga_userId_updatedAt_idx" ON "library_manga"("userId", "updatedAt" DESC);

COMMENT ON TABLE "library_manga" IS 'Library utente - normalizzata (sostituto di user_library reading/completed/dropped JSON)';
COMMENT ON COLUMN "library_manga"."status" IS 'reading, completed, dropped, plan_to_read';
COMMENT ON COLUMN "library_manga"."rating" IS 'Opzionale: voto 1-10';

-- ============================================================================
-- 📦 TABELLA: history
-- Sostituisce user_library.history JSON
-- ============================================================================
CREATE TABLE IF NOT EXISTS "history" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "mangaUrl" VARCHAR(500) NOT NULL,
    "mangaTitle" VARCHAR(500) NOT NULL,
    "chapterUrl" VARCHAR(500),
    "chapterTitle" VARCHAR(200),
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "history_userId_fkey" FOREIGN KEY ("userId") 
        REFERENCES "user"("id") ON DELETE CASCADE
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS "history_userId_viewedAt_idx" ON "history"("userId", "viewedAt" DESC);
CREATE INDEX IF NOT EXISTS "history_userId_mangaUrl_idx" ON "history"("userId", "mangaUrl");

COMMENT ON TABLE "history" IS 'Cronologia letture - normalizzata (sostituto di user_library.history JSON)';

-- ============================================================================
-- 📦 TABELLA: reading_progress (già esistente, ma la ricreo se necessario)
-- Questa era già normalizzata, quindi non cambia
-- ============================================================================
CREATE TABLE IF NOT EXISTS "reading_progress" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "mangaUrl" VARCHAR(500) NOT NULL,
    "mangaTitle" VARCHAR(500) NOT NULL,
    "chapterIndex" INTEGER NOT NULL,
    "pageIndex" INTEGER NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reading_progress_userId_fkey" FOREIGN KEY ("userId") 
        REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE ("userId", "mangaUrl")
);

CREATE INDEX IF NOT EXISTS "reading_progress_userId_idx" ON "reading_progress"("userId");
CREATE INDEX IF NOT EXISTS "reading_progress_mangaUrl_idx" ON "reading_progress"("mangaUrl");
CREATE INDEX IF NOT EXISTS "reading_progress_updatedAt_idx" ON "reading_progress"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "reading_progress_userId_updatedAt_idx" ON "reading_progress"("userId", "updatedAt" DESC);

COMMENT ON TABLE "reading_progress" IS 'Progresso di lettura per capitolo';

-- ============================================================================
-- ✅ VERIFICA
-- ============================================================================

-- Esegui questa query per verificare che tutte le tabelle siano state create:
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('favorites', 'library_manga', 'history', 'reading_progress', 'user', 'user_profile', 'user_follows')
ORDER BY table_name;

-- ============================================================================
-- 🎉 FATTO!
-- ============================================================================
-- Ora hai SOLO le tabelle normalizzate:
-- ✅ favorites (invece di user_favorites JSON)
-- ✅ library_manga (invece di user_library reading/completed/dropped JSON)
-- ✅ history (invece di user_library.history JSON)
-- ✅ reading_progress (già esistente)
-- 
-- Il backend è stato modificato per usare queste tabelle.
-- Al primo login, gli utenti vedranno le loro liste vuote 
-- (perché non ci sono dati vecchi da migrare).
-- ============================================================================

