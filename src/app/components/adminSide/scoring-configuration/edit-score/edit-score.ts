import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-edit-score',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-score.html',
  styleUrl: './edit-score.scss',
})

export class EditScore {

  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
