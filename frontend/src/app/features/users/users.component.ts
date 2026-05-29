import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users.component.html',
   styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {

  users: any[] = [];
  searchTerm: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  role: string = '';
  confirmDeleteId: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role') || '';

    this.http.get('/api/users/').subscribe({
      next: (res: any) => {
        this.users = res;
      },
      error: (err) => {
        if (err.status !== 401) {
          this.errorMessage = err?.error?.detail || 'Erreur lors du chargement des utilisateurs';
        }
      }
    });
  }

  get isAdmin(): boolean {
    return localStorage.getItem('role') === 'ADMIN';
  }

  viewUser(user: any): void {
    this.router.navigate(['/users', user.id]);
  }

  editUser(user: any): void {
    this.router.navigate(['/users/edit', user.id]);
  }

  askDeleteUser(id: string): void {
    if (!this.isAdmin) {
      this.errorMessage = 'Accès refusé';
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.confirmDeleteId = id;
  }

  cancelDelete(): void {
    this.confirmDeleteId = null;
  }

  confirmDelete(): void {
    if (!this.confirmDeleteId) return;

    this.http.delete(`/api/users/${this.confirmDeleteId}`).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== this.confirmDeleteId);
        this.confirmDeleteId = null;
        this.successMessage = 'Utilisateur supprimé avec succès.';
      },
      error: (err) => {
        this.confirmDeleteId = null;
        if (err.status === 403) {
          this.errorMessage = "Vous n'avez pas le droit de supprimer cet utilisateur.";
            } else if (err.status === 400) {
          this.errorMessage = err.error?.detail || "Suppression impossible : cet utilisateur possède encore un ou plusieurs groupes.";
        } else if (err.status !== 401) {
          this.errorMessage = err.error?.detail || 'Erreur lors de la suppression.';
        }
      }
    });
  }

  createUser(): void {
    this.router.navigate(['/users/create']);
  }

  get filteredUsers() {
    return this.users.filter(user =>
      (user.lastname || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      (user.name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
