/**
 * DEBUG LOGGER - Protected logging system
 * Solo chi conosce la password può vedere i log
 */

const DEBUG_PASSWORD = 'Pallino79';
const DEBUG_KEY = 'nekuro_debug_enabled';

class DebugLogger {
  private enabled: boolean = false;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
  };

  constructor() {
    // Salva metodi console originali
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console)
    };

    // ✅ MOBILE FIX: Try-catch per localStorage (modalità privata)
    try {
      // Controlla se debug è già abilitato
      if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
        const stored = localStorage.getItem(DEBUG_KEY);
        if (stored === 'true') {
          this.enabled = true;
          this.showWelcomeMessage();
        } else {
          // Disabilita console.log per utenti normali
          this.disableLogs();
        }
      } else {
        // Se localStorage non disponibile, mantieni log abilitati (per debug mobile)
        this.enabled = true;
      }
    } catch (e) {
      // Silent fail - mantieni log abilitati se localStorage fallisce
      this.enabled = true;
    }
  }

  private disableLogs() {
    // Lascia solo error (importante per bug critici)
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    // console.error rimane attivo
  }

  private enableLogs() {
    // Ripristina console originale
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
  }

  private showWelcomeMessage() {
    this.originalConsole.log(`
╔════════════════════════════════════════════════════════╗
║          🔧 NeKuro Debug Mode ATTIVO                  ║
╚════════════════════════════════════════════════════════╝

Comandi disponibili:
  hideLog()        - Disattiva i log
  showLog('pwd')   - Riattiva i log (richiede password)
  clearDebug()     - Pulisci console

Logs: ✅ ATTIVI
    `);
  }

  /**
   * Abilita logging con password
   */
  showLog(password: string): void {
    if (password !== DEBUG_PASSWORD) {
      this.originalConsole.error('❌ Password errata');
      return;
    }

    this.enabled = true;
    // ✅ MOBILE FIX: Try-catch per localStorage
    try {
      if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
        localStorage.setItem(DEBUG_KEY, 'true');
      }
    } catch (e) {
      // Silent fail
    }
    this.enableLogs();
    this.showWelcomeMessage();
  }

  /**
   * Disabilita logging
   */
  hideLog(): void {
    this.enabled = false;
    // ✅ MOBILE FIX: Try-catch per localStorage
    try {
      if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
        localStorage.removeItem(DEBUG_KEY);
      }
    } catch (e) {
      // Silent fail
    }
    this.disableLogs();
    this.originalConsole.log('🔇 Debug logs disattivati');
  }

  /**
   * Pulisci console
   */
  clearDebug(): void {
    console.clear();
    if (this.enabled) {
      this.showWelcomeMessage();
    }
  }

  /**
   * Controlla se debug è abilitato
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
export const debugLogger = new DebugLogger();

// Esponi globalmente per uso in console
if (typeof window !== 'undefined') {
  (window as any).showLog = (pwd: string) => debugLogger.showLog(pwd);
  (window as any).hideLog = () => debugLogger.hideLog();
  (window as any).clearDebug = () => debugLogger.clearDebug();
}

export default debugLogger;

