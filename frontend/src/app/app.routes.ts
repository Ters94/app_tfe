import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () =>
     import('./features/auth/login/login.component')
     .then(m => m.LoginComponent) },
    {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component')
        .then(m => m.AdminComponent)
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
  path: 'users/create',
  loadComponent: () =>
    import('./features/users/user-form.component')
      .then(m => m.UserFormComponent)
}
];
