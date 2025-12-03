import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertComponent } from './shared/alert/alert.component';
import { ModalAlertComponent } from './shared/modalAlert/modalAlertComponent';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    AlertComponent, 
    ModalAlertComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit {

  ngOnInit() {
    console.log('📢 Notification service initialized');
  }
}
