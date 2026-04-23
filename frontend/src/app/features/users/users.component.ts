import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {

  users: any[] = [];
  searchTerm: string = '';
  errorMessage: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      alert('Session expirée, reconnecte-toi');
      this.router.navigate(['/']);
      return;
    }

    this.http.get('http://localhost:8000/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res: any) => {
        this.users = res;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors du chargement des utilisateurs';

        if (err.status === 401) {
          localStorage.removeItem('token');
          this.router.navigate(['/']);
        }
      }
    });
  }

  viewUser(user: any): void {
    this.router.navigate(['/users', user.id]);
  }

  editUser(user: any): void {
    this.router.navigate(['/users/edit', user.id]);
  }

  deleteUser(id: number): void {
    const token = localStorage.getItem('token');

    if (!token) {
      alert('Session expirée, reconnecte-toi');
      this.router.navigate(['/']);
      return;
    }

    const confirmed = confirm('Voulez-vous vraiment supprimer cet utilisateur ?');
    if (!confirmed) return;

    this.http.delete(`http://localhost:8000/users/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== id);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors de la suppression';
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

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }
}