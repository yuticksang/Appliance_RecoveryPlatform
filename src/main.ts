import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from './app/shared/app';
import { routes } from './app/shared/app.routes';

bootstrapApplication(App, {
  providers: [
    provideRouter(routes)
    // other providers...
  ]
});