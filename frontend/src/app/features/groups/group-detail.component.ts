import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-group-detail',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.css']
})
export class GroupDetailComponent implements OnInit {
  groupId: string | null = null;
  group: any = {};
  members: any[] = [];
  users: any[] = [];

  role: string = '';
  currentUserId: string = '';

  selectedUserId: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id');
    this.role = localStorage.getItem('role') || '';
    this.currentUserId = localStorage.getItem('userId') || '';

    if (!this.groupId) {
      this.router.navigate(['/groups']);
      return;
    }

    this.loadGroup();
    this.loadMembers();
    this.loadUsers();
  }

  get canManageMembers(): boolean {
    return this.role === 'ADMIN' || this.group.owner_id === this.currentUserId;
  }

  loadGroup(): void {
    const token = localStorage.getItem('token');

    this.http.get(`http://localhost:8000/groups/${this.groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.group = res;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors du chargement du groupe';
      }
    });
  }

  loadMembers(): void {
    const token = localStorage.getItem('token');

    this.http.get(`http://localhost:8000/groups/${this.groupId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.members = res;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Erreur lors du chargement des membres';
      }
    });
  }

  loadUsers(): void {
    const token = localStorage.getItem('token');

    this.http.get('http://localhost:8000/users/', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.users = res;
      },
      error: () => {
        this.users = [];
      }
    });
  }

  addMember(): void {
    if (!this.selectedUserId) {
      this.errorMessage = 'Veuillez sélectionner un utilisateur';
      return;
    }

    const token = localStorage.getItem('token');

    const payload = {
      user_id: this.selectedUserId,
      role: 'MEMBER'
    };

    this.http.post(`http://localhost:8000/groups/${this.groupId}/members`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.successMessage = 'Membre ajouté avec succès';
        this.errorMessage = '';
        this.selectedUserId = '';
        this.loadMembers();
      },
      error: (err) => {
        console.error(err);
        this.successMessage = '';
        this.errorMessage = err?.error?.detail || 'Erreur lors de l’ajout du membre';
      }
    });
  }

  removeMember(member: any): void {
    const confirmed = confirm('Voulez-vous supprimer ce membre du groupe ?');
    if (!confirmed) return;

    const token = localStorage.getItem('token');

    this.http.delete(`http://localhost:8000/groups/${this.groupId}/members/${member.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.successMessage = 'Membre supprimé avec succès';
        this.errorMessage = '';
        this.loadMembers();
      },
      error: (err) => {
        console.error(err);
        this.successMessage = '';
        this.errorMessage = err?.error?.detail || 'Erreur lors de la suppression du membre';
      }
    });
  }

  viewUser(member: any): void {
  if (!member.user_id) {
    this.errorMessage = "Utilisateur introuvable";
    return;
  }

  this.router.navigate(['/users', member.user_id]);
}
  goBack(): void {
    this.router.navigate(['/groups']);
  }
  logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('userId');
  this.router.navigate(['/']);
}
}
