import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/shared/app.config';
import { App } from './app/shared/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
