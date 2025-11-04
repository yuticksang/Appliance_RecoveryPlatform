import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';
import '@angular/compiler'; // Enable JIT compilation for lazy-loaded components

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
