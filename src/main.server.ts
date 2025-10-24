import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/main/app';
import { config } from './app/main/app.config.server';

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(App, config, context);

export default bootstrap;
