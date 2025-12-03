import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-modal-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (modal of alertService.modalAlerts(); track modal.id) {
      <div class="modal-overlay" (click)="onOverlayClick($event, modal.id)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header" [ngClass]="'header-' + modal.options.type">
            <h3 class="modal-title">{{ modal.options.title }}</h3>
            <button class="close-button" (click)="alertService.closeModal(modal.id)">×</button>
          </div>
          
          <div class="modal-body">
            <div class="modal-icon" [ngClass]="'icon-' + modal.options.type">
              @switch (modal.options.type) {
                @case ('success') {
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                }
                @case ('warning') {
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                }
                @case ('error') {
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                }
                @case ('info') {
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                }
              }
            </div>
            
            <div class="modal-message">{{ modal.options.message }}</div>
          </div>
          
          <div class="modal-footer">
            @if (modal.options.showCancel) {
              <button class="btn btn-secondary" (click)="alertService.cancelModal(modal.id)">
                {{ modal.options.cancelText }}
              </button>
            }
            <button class="btn btn-primary" [ngClass]="'btn-' + modal.options.type" (click)="alertService.confirmModal(modal.id)">
              {{ modal.options.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./modalAlertComponent.scss']
})
export class ModalAlertComponent {
  alertService = inject(AlertService);

  onOverlayClick(event: Event, modalId: number): void {
    this.alertService.closeModal(modalId);
  }
}