// Servicio global para manejar la hora simulada
// Usa localStorage en el cliente y headers HTTP para el servidor

// Variables globales para el servidor (se resetean entre requests)
let serverSimulatedTime: Date | null = null;

export class TimeService {
  private static isClient(): boolean {
    return typeof window !== 'undefined';
  }

  private static getFromLocalStorage(): { simulatedTime: string } | null {
    if (!this.isClient()) return null;
    
    try {
      const data = localStorage.getItem('simulatedTime');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  private static setToLocalStorage(data: { simulatedTime: string } | null) {
    if (!this.isClient()) return;
    
    try {
      if (data) {
        localStorage.setItem('simulatedTime', JSON.stringify(data));
      } else {
        localStorage.removeItem('simulatedTime');
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  // Método para establecer la hora simulada desde headers HTTP (para el servidor)
  static setFromHeaders(headers: Headers | { get: (name: string) => string | null }) {
    if (this.isClient()) return; // Solo funciona en el servidor
    
    const simulatedTimeHeader = headers.get('x-simulated-time');
    
    if (simulatedTimeHeader) {
      try {
        serverSimulatedTime = new Date(simulatedTimeHeader);
      } catch (error) {
        console.error('Error parsing simulation headers:', error);
        serverSimulatedTime = null;
      }
    } else {
      serverSimulatedTime = null;
    }
  }

  // Método para obtener headers con la hora simulada (para el cliente)
  static getSimulationHeaders(): Record<string, string> {
    if (!this.isClient()) return {};
    
    const data = this.getFromLocalStorage();
    if (data) {
      return {
        'x-simulated-time': data.simulatedTime
      };
    }
    return {};
  }

  static setSimulatedTime(time: Date | null) {
    if (time) {
      const data = {
        simulatedTime: time.toISOString()
      };
      
      if (this.isClient()) {
        this.setToLocalStorage(data);
      } else {
        // En el servidor, usar variables globales
        serverSimulatedTime = time;
      }
    } else {
      if (this.isClient()) {
        this.setToLocalStorage(null);
      } else {
        serverSimulatedTime = null;
      }
    }
  }

  static getCurrentTime(): Date {
    let simulatedTime: Date | null = null;

    if (this.isClient()) {
      const data = this.getFromLocalStorage();
      if (data) {
        simulatedTime = new Date(data.simulatedTime);
      }
    } else {
      // En el servidor, usar variables globales
      simulatedTime = serverSimulatedTime;
    }

    // Si hay hora simulada, usarla (estática, no avanza)
    if (simulatedTime) {
      return simulatedTime;
    }
    
    // Si no hay simulación, usar hora real
    return new Date();
  }

  static isSimulationMode(): boolean {
    if (this.isClient()) {
      return this.getFromLocalStorage() !== null;
    } else {
      return serverSimulatedTime !== null;
    }
  }

  static resetToRealTime() {
    if (this.isClient()) {
      this.setToLocalStorage(null);
    } else {
      serverSimulatedTime = null;
    }
  }

  static getSimulatedTime(): Date | null {
    if (this.isClient()) {
      const data = this.getFromLocalStorage();
      return data ? new Date(data.simulatedTime) : null;
    } else {
      return serverSimulatedTime;
    }
  }

  // Método para avanzar el tiempo simulado
  static advanceTime(minutes: number) {
    const currentSimulatedTime = this.getSimulatedTime();
    if (currentSimulatedTime) {
      const newTime = new Date(currentSimulatedTime.getTime() + minutes * 60 * 1000);
      this.setSimulatedTime(newTime);
    }
  }

  // Método para retroceder el tiempo simulado
  static rewindTime(minutes: number) {
    const currentSimulatedTime = this.getSimulatedTime();
    if (currentSimulatedTime) {
      const newTime = new Date(currentSimulatedTime.getTime() - minutes * 60 * 1000);
      this.setSimulatedTime(newTime);
    }
  }

  // Método para establecer una hora específica
  static setSpecificTime(hours: number, minutes: number, seconds: number = 0) {
    const now = new Date();
    const newTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
    this.setSimulatedTime(newTime);
  }

  // Método para obtener información de debug
  static getDebugInfo() {
    let simulatedTime: string | null = null;

    if (this.isClient()) {
      const data = this.getFromLocalStorage();
      simulatedTime = data?.simulatedTime || null;
    } else {
      simulatedTime = serverSimulatedTime?.toISOString() || null;
    }

    return {
      simulatedTime,
      currentRealTime: new Date().toISOString(),
      currentSimulatedTime: this.getCurrentTime().toISOString(),
      isSimulationMode: this.isSimulationMode(),
      isClient: this.isClient()
    };
  }
} 