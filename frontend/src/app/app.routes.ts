import { Routes } from '@angular/router';
import { AuditsComponent } from './features/audits/audits.component';
import { QueriesComponent } from './features/queries/queries.component';
import { QueryExecutionComponent } from './features/queries/query-execution.component';
import { QueryCreateComponent } from './features/queries/query-create.component';
import { DealsComponent } from './features/deals/deals.component';

export const routes: Routes = [
  { path: '', loadComponent: () =>
     import('./features/auth/login/login.component')
     .then(m => m.LoginComponent)
    },
     { path: 'queries',
       component: QueriesComponent },

      { path: 'queries/query-create',
        component: QueryCreateComponent },

      { path: 'queries/:id',
        component: QueryExecutionComponent },

      {path: 'audits',
        component: AuditsComponent},

      {path: 'audits/groups/:groupId',
        component: AuditsComponent },

      {path: 'deals',
        component: DealsComponent},

      { path: 'admin',
        loadComponent: () =>
      import('./features/admin/admin.component')
    .then(m => m.AdminComponent)
      },

  {
  path: 'groups',
  loadComponent: () =>
    import('./features/groups/groups.component').then(m => m.GroupsComponent)
},
  {
  path: 'dashboard',
  loadComponent: () =>
    import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
},
  {
    path: 'users/create',
    loadComponent: () =>
      import('./features/users/user-form.component')
        .then(m => m.UserFormComponent)
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./features/users/users.component')
        .then(m => m.UsersComponent)
  },
 {
  path: 'users/:id',
  loadComponent: () =>
    import('./features/users/user-detail.component')
      .then(m => m.UserDetailComponent)
},

{
  path: 'users/edit/:id',
  loadComponent: () =>
    import('./features/users/user-form.component')
      .then(m => m.UserFormComponent)
},
{
  path: 'change-password',
  loadComponent: () =>
    import('./features/users/change-password.component')
      .then(m => m.ChangePasswordComponent)
},
{
  path: 'groups/:id',
  loadComponent: () =>
    import('./features/groups/group-detail.component').then(m => m.GroupDetailComponent)
},
{
  path: 'groups/create',
  loadComponent: () =>
    import('./features/groups/group-create.component').then(m => m.GroupCreateComponent)
},
{
  path: 'groups/group-form/:id',
  loadComponent: () =>
    import('./features/groups/group-form.component').then(m => m.GroupFormComponent)
},
];
