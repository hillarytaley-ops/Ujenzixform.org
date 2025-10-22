// Generate and manage correlation IDs for request tracing
export class CorrelationIdManager {
  private static currentId: string | null = null;

  static generate(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `cid_${timestamp}_${randomPart}`;
  }

  static set(id: string): void {
    this.currentId = id;
  }

  static get(): string {
    if (!this.currentId) {
      this.currentId = this.generate();
    }
    return this.currentId;
  }

  static clear(): void {
    this.currentId = null;
  }

  static getHeaders(): Record<string, string> {
    return {
      'X-Correlation-ID': this.get(),
      'X-Request-ID': this.generate()
    };
  }
}

// Enhanced logging with correlation IDs
export const logWithCorrelation = (
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: any
) => {
  const correlationId = CorrelationIdManager.get();
  const timestamp = new Date().toISOString();
  
  const logData = {
    correlationId,
    timestamp,
    level,
    message,
    ...data
  };

  console[level](`[${correlationId}]`, message, logData);
  
  return logData;
};
