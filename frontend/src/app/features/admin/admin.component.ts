import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>Admin Dashboard</h1>

    <button (click)="goUsers()">Users</button>
    <button (click)="goGroups()">Groupes</button>
    <button (click)="goAudit()">Audit</button>
    <button (click)="logout()">Déconnexion</button>
  `
})
export class AdminComponent {

  constructor(private router: Router) {}

  goUsers() {
    this.router.navigate(['/users']);
  }

  goGroups() {
    this.router.navigate(['/groups']);
  }

  goAudit() {
    this.router.navigate(['/audit']);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }
}
