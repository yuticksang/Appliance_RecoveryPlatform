import { Routes } from '@angular/router';
import { Dashboard } from './../components/dashboard/dashboard';
import { Layout } from '../shared/layout/layout';

export const routes: Routes = [

    {
        path: '',
        component: Layout,
        children: [
            { 
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: Dashboard
            }

            ]
    }
];
