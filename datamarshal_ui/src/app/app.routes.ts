import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/admin',
    pathMatch: 'full'
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin-data/admin-data.routes').then(m => m.default)
  },
  {
    path: '**',
    redirectTo: '/admin'
  }
];
