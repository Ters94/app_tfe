import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-user-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.css']
})
export class UserDetailComponent implements OnInit {
  user: any = {};
  errorMessage: string = '';
  successMessage: string = '';
  ownedGroups: any[] = [];
  memberGroups: any[] = [];
  confirmDeleteId: string | null = null;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const role = localStorage.getItem('role');
    const currentUserId = localStorage.getItem('user_id');
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.router.navigate(['/users']);
      return;
    }

    if (role !== 'ADMIN' && id !== currentUserId) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.http.get(`/api/users/${id}`).subscribe({
      next: (res: any) => {
        this.user = res;
        if (role === 'ADMIN') {
          this.loadUserGroups(id);
        }
      },
      error: (err) => {
        if (err.status !== 401) {
          this.errorMessage = err?.error?.detail || 'Erreur lors du chargement';
        }
      }
    });
  }

  get isAdmin(): boolean {
    return localStorage.getItem('role') === 'ADMIN';
  }

  get isOwnProfile(): boolean {
    return localStorage.getItem('user_id') === this.user.id;
  }

  loadUserGroups(userId: string) {
    this.http.get<any>(`/api/users/${userId}/groups`).subscribe({
      next: (res) => {
        this.ownedGroups = res.owned_groups || [];
        this.memberGroups = res.member_groups || [];
      },
      error: () => {
        this.ownedGroups = [];
        this.memberGroups = [];
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  editUser(user: any): void {
    this.router.navigate(['/users/edit', this.user.id]);
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

        this.confirmDeleteId = null;
        this.router.navigate(['/users']);
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
}
