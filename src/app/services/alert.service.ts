import { Injectable, signal } from '@angular/core';

export interface Alert {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertId = 0;
  alerts = signal<Alert[]>([]);

  success(message: string, duration = 3000) {
    this.show('success', message, duration);
  }

  error(message: string, duration = 3000) {
    this.show('error', message, duration);
  }

  info(message: string, duration = 3000) {
    this.show('info', message, duration);
  }

  private show(type: Alert['type'], message: string, duration: number) {
    const id = ++this.alertId;
    const alert: Alert = { id, type, message };

    this.alerts.update(alerts => [...alerts, alert]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  remove(id: number) {
    this.alerts.update(alerts => alerts.filter(a => a.id !== id));
  }

  clear() {
    this.alerts.set([]);
  }
}
