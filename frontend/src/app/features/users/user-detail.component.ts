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
  ownedGroups: any[] = [];
  memberGroups: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const currentUserId = localStorage.getItem('user_id');
    const id = this.route.snapshot.paramMap.get('id');

    if (!token) {
      alert('Session expirée, reconnecte-toi');
      this.router.navigate(['/']);
      return;
    }

    if (!id) {
      alert('ID utilisateur introuvable');
      this.router.navigate(['/users']);
      return;
    }

    if (role !== 'ADMIN' && id !== currentUserId) {
  alert('Accès refusé');
  this.router.navigate(['/dashboard']);
  return;
}



    this.http.get(`http://localhost:8000/users/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res: any) => {
        this.user = res;

        if (role === 'ADMIN') {
          this.loadUserGroups(id);
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors du chargement';

        if (err.status === 401) {
          localStorage.removeItem('token');
          this.router.navigate(['/']);
        }
      }
    });
  }
  get isAdmin(): boolean {
  return localStorage.getItem('role') === 'ADMIN';

}
loadUserGroups(userId: string) {
  const token = localStorage.getItem('token');

  const headers = {
    Authorization: `Bearer ${token}`
  };

  this.http.get<any>(
    `http://127.0.0.1:8000/users/${userId}/groups`,
    { headers }
  ).subscribe({
    next: (res) => {
      this.ownedGroups = res.owned_groups || [];
      this.memberGroups = res.member_groups || [];
    },
    error: (err) => {
      console.error(err);
      this.ownedGroups = [];
      this.memberGroups = [];
    }
  });
}
  goBack(): void {
    this.router.navigate(['/users']);
  }

  editUser(): void {
    this.router.navigate(['/users/edit', this.user.id]);
  }
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    this.router.navigate(['/']);
  }
}
