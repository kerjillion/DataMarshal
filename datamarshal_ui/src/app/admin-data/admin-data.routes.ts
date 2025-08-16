import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell.component';

export const adminDataRoutes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      {
        path: ':schema/:table',
        component: AdminShellComponent
      }
    ]
  }
];

export default adminDataRoutes;
