import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/shared/app';
import { config } from './app/shared/app.config.server';

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(App, config, context);

export default bootstrap;
