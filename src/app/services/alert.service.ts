import { Injectable, signal } from '@angular/core';

export interface Alert {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface AlertModalOptions {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ModalAlert {
  id: number;
  options: AlertModalOptions;
  isVisible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertId = 0;
  private modalId = 0;
  
  // Existing alerts (toast-style)
  alerts = signal<Alert[]>([]);
  
  // ✅ NEW: Modal alerts for system notifications
  modalAlerts = signal<ModalAlert[]>([]);

  // Existing methods
  success(message: string, duration = 3000) {
    this.show('success', message, duration);
  }

  error(message: string, duration = 3000) {
    this.show('error', message, duration);
  }

  info(message: string, duration = 3000) {
    this.show('info', message, duration);
  }

  // ✅ NEW: Warning type for existing toast alerts
  warning(message: string, duration = 3000) {
    this.show('warning', message, duration);
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

  // ✅ NEW: Modal alert methods
  /**
   * Show modal alert for important notifications
   */
  showModal(options: AlertModalOptions): void {
    const id = ++this.modalId;
    const modalAlert: ModalAlert = {
      id,
      options: {
        confirmText: 'OK',
        cancelText: 'Cancel',
        showCancel: true,
        ...options
      },
      isVisible: true
    };

    this.modalAlerts.update(modals => [...modals, modalAlert]);
  }

  /**
   * Handle modal confirmation
   */
  confirmModal(modalId: number): void {
    this.modalAlerts.update(modals => {
      const modal = modals.find(m => m.id === modalId);
      if (modal?.options.onConfirm) {
        modal.options.onConfirm();
      }
      return modals.filter(m => m.id !== modalId);
    });
  }

  /**
   * Handle modal cancellation
   */
  cancelModal(modalId: number): void {
    this.modalAlerts.update(modals => {
      const modal = modals.find(m => m.id === modalId);
      if (modal?.options.onCancel) {
        modal.options.onCancel();
      }
      return modals.filter(m => m.id !== modalId);
    });
  }

  /**
   * Close modal without triggering callbacks
   */
  closeModal(modalId: number): void {
    this.modalAlerts.update(modals => modals.filter(m => m.id !== modalId));
  }

  /**
   * Clear all modal alerts
   */
  clearModals(): void {
    this.modalAlerts.set([]);
  }
}
